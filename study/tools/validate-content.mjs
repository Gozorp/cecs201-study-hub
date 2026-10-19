#!/usr/bin/env node
// Validate study content: schema, ids, sources, answer keys, diagrams and generators.
//   node study/tools/validate-content.mjs                 # everything
//   node study/tools/validate-content.mjs --section t2    # report only one section (others still load)
//   node study/tools/validate-content.mjs --gen-samples 50   # generated questions per generator (default 25)
//   node study/tools/validate-content.mjs --extra /tmp/draft/t2-numbers.js [--extra more.js]
//        load draft content files from anywhere, in order, after content/ (a draft replaces the content/ file with the same name)
// Exit code 1 if any error. Warnings never fail the run.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const STUDY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(STUDY, '..');
const args = process.argv.slice(2);
const onlySection = args.includes('--section') ? args[args.indexOf('--section') + 1] : null;
const genSamples = args.includes('--gen-samples') ? Number(args[args.indexOf('--gen-samples') + 1]) : 25;
const extras = args.map((a, i) => (a === '--extra' ? path.resolve(args[i + 1]) : null)).filter(Boolean);

const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

// ---------- load scripts into a sandbox that looks like a browser window ----------
const ctx = { console, Math, JSON, Date, Number, String, Array, Object, Set, Map, RegExp, Error, SyntaxError, parseInt, parseFloat, isFinite, isNaN };
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
vm.createContext(ctx);
function load(rel, required) {
  const file = path.join(STUDY, rel);
  if (!fs.existsSync(file)) { if (required) err(rel, 'missing'); return false; }
  try { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: rel }); return true; }
  catch (e) { err(rel, 'failed to load: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); return false; }
}
load('js/core.js', true);
load('js/logic.js', true);
const haveDiagrams = load('js/diagrams.js', false);
const haveGenNum = load('js/gen-numbers.js', false);
const haveGenLogic = load('js/gen-logic.js', false);
const ORDER = ['t1-intro.js', 't2-numbers.js', 't3-boolean.js', 't4-combinational.js', 't5-datapath.js', 't6-sequential.js', 't7-fsm.js', 'labs-1-4.js', 'labs-5-8.js', 'final.js'];
const contentDir = path.join(STUDY, 'content');
const present = fs.existsSync(contentDir) ? fs.readdirSync(contentDir).filter(f => f.endsWith('.js')) : [];
const replaced = new Set(extras.map(e => path.basename(e)));
for (const f of [...ORDER.filter(f => present.includes(f)), ...present.filter(f => !ORDER.includes(f)).sort()]) if (!replaced.has(f)) load('content/' + f, false);
for (const e of extras) {
  try { vm.runInContext(fs.readFileSync(e, 'utf8'), ctx, { filename: e }); }
  catch (x) { err(path.basename(e), 'failed to load: ' + (x.stack || x.message).split('\n').slice(0, 3).join(' | ')); }
}
const missingFiles = ORDER.filter(f => !present.includes(f) && !replaced.has(f));
if (missingFiles.length) warn('content', 'not written yet: ' + missingFiles.join(', '));

const Study = ctx.Study;
const L = Study.logic;

// ---------- constants from the README ----------
const SECTION_IDS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 'labs', 'final'];
const GENERATORS = {
  t2: ['positional', 'bin2dec', 'dec2bin', 'bin2hex', 'hex2bin', 'bin2oct', 'oct2bin', 'hex2dec', 'dec2hex', 'unsignedAdd', 'unsignedSub', 'binaryMultiply', 'signMagnitude', 'onesComplement', 'twosNegate', 'twos2dec', 'dec2twos', 'twosRange', 'signedAdd', 'signedSub', 'bcd', 'parity', 'gray', 'ascii'],
  t3: ['evalExpr', 'exprMinterms', 'canonicalSop', 'demorgan', 'truthTableFill'],
  t4: ['kmapMinimize', 'primeImplicants'],
  t5: ['muxSelect', 'decoderOutput', 'priorityEncoder', 'rippleAdd', 'comparator', 'addSub'],
  t6: ['srLatch', 'dffTrace', 'shiftRegister', 'counterSeq', 'registerLoad'],
  t7: ['fsmTrace', 'stateBits'],
};
const ALL_GENS = Object.values(GENERATORS).flat();
const DIAGRAM_KINDS = ['truthtable', 'kmap', 'gate', 'circuit', 'fsm', 'timing', 'component', 'bits', 'arith'];
const BLOCK_TYPES = ['text', 'callout', 'example', 'diagram', 'code', 'check'];
const QTYPES = ['mc', 'multi', 'tf', 'match', 'short', 'numeric', 'boolexpr'];
const ALLOWED_TAGS = new Set('p b strong i em code sub sup br ul ol li span small kbd pre table thead tbody tr th td'.split(' '));

// ---------- helpers ----------
const vttDuration = new Map();
function vttLength(rel) {
  if (vttDuration.has(rel)) return vttDuration.get(rel);
  const file = path.join(REPO, rel);
  let secs = null;
  if (fs.existsSync(file)) {
    const ts = [...fs.readFileSync(file, 'utf8').matchAll(/(\d{2}):(\d{2}):(\d{2})\.\d{3}\s*-->\s*(\d{2}):(\d{2}):(\d{2})/g)];
    const last = ts[ts.length - 1];
    secs = last ? (+last[4]) * 3600 + (+last[5]) * 60 + (+last[6]) : 0;
  }
  vttDuration.set(rel, secs);
  return secs;
}
function checkHtml(where, s) {
  if (typeof s !== 'string') return;
  for (const m of s.matchAll(/<\/?\s*([a-zA-Z0-9]+)([^>]*)>/g)) {
    const tag = m[1].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) err(where, `tag <${tag}> not allowed`);
    if (/\son\w+\s*=/i.test(m[2])) err(where, 'inline event handler not allowed');
    if (/\sstyle\s*=/i.test(m[2])) warn(where, 'inline style attribute — prefer classes');
    const cls = /class\s*=\s*"([^"]*)"/.exec(m[2]);
    if (cls) for (const c of cls[1].split(/\s+/).filter(Boolean)) if (!['ovl', 'mono', 'muted'].includes(c)) warn(where, `class "${c}" is not one of ovl, mono, muted`);
  }
  if (/<script|javascript:/i.test(s)) err(where, 'script content not allowed');
}
function checkSrc(where, src) {
  if (!src || typeof src !== 'object') return err(where, 'missing src');
  if (!['course', 'supplemental', 'final-guide', 'generated'].includes(src.type)) return err(where, `src.type "${src.type}" invalid`);
  if (src.type === 'course') {
    if (!Array.isArray(src.refs) || !src.refs.length) return err(where, 'course src needs refs');
    for (const ref of src.refs) {
      const m = /^([A-Za-z0-9_./-]+\.vtt)(?:#(\d{2}):(\d{2}):(\d{2}))?$/.exec(ref);
      if (!m) { err(where, `bad ref "${ref}" (want Folder/file.vtt#hh:mm:ss)`); continue; }
      const len = vttLength(m[1]);
      if (len === null) { err(where, `ref file not found: ${m[1]}`); continue; }
      if (m[2]) {
        const t = (+m[2]) * 3600 + (+m[3]) * 60 + (+m[4]);
        if (t > len + 5) err(where, `ref timestamp ${m[2]}:${m[3]}:${m[4]} is past the end of ${m[1]} (${Math.floor(len / 60)}:${String(len % 60).padStart(2, '0')})`);
      } else warn(where, `ref ${ref} has no #hh:mm:ss timestamp`);
    }
  } else if (!src.note && src.type !== 'generated') warn(where, `${src.type} src should have a note`);
}
function checkDiagram(where, spec) {
  if (!spec || typeof spec !== 'object') return err(where, 'diagram must be an object');
  if (!DIAGRAM_KINDS.includes(spec.kind)) return err(where, `diagram kind "${spec.kind}" unknown`);
  if (spec.kind === 'truthtable') for (const o of spec.outputs || []) if (o.expr) { try { L.parseBool(o.expr); } catch (e) { err(where, `truthtable expr "${o.expr}": ${e.message}`); } }
  if (haveDiagrams && Study.diagrams) {
    try {
      const probs = Study.diagrams.validate ? Study.diagrams.validate(spec) : [];
      for (const p of probs || []) err(where, 'diagram: ' + p);
      const html = Study.diagrams.render(spec);
      if (typeof html !== 'string' || !html.length) err(where, 'diagram rendered empty');
      else if (/dg-error/.test(html)) err(where, 'diagram rendered an error box');
    } catch (e) { err(where, 'diagram render threw: ' + e.message); }
  }
}
// The input that should grade as correct for a question.
function keyFor(q) {
  switch (q.type) {
    case 'mc': return q.answer;
    case 'tf': return q.answer;
    case 'multi': return q.answers;
    case 'match': return q.pairs.map((_, i) => i);
    case 'short': return q.accept[0];
    case 'numeric': return String(q.answer);
    case 'boolexpr': return q.answer !== undefined ? q.answer : L.mintermsToSOP(q.minterms, q.vars);
  }
}
const normChoice = s => String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
function checkQuestion(where, q, { needId = true, sec } = {}) {
  if (needId && !q.id) err(where, 'question missing id');
  if (!QTYPES.includes(q.type)) return err(where, `type "${q.type}" invalid`);
  if (![1, 2, 3].includes(q.difficulty)) err(where, 'difficulty must be 1, 2 or 3');
  if (!q.prompt || typeof q.prompt !== 'string') err(where, 'missing prompt');
  if (!q.explanation || typeof q.explanation !== 'string') err(where, 'missing explanation');
  for (const k of ['prompt', 'explanation']) checkHtml(where + '.' + k, q[k]);
  if (q.steps !== undefined) {
    if (!Array.isArray(q.steps) || !q.steps.length) err(where, 'steps must be a non-empty array');
    else q.steps.forEach((s, i) => checkHtml(`${where}.steps[${i}]`, s));
  } else if (['numeric', 'boolexpr'].includes(q.type) || (q.type === 'short' && q.normalize && q.normalize !== 'text')) {
    warn(where, 'calculation question without steps');
  }
  if (q.diagram) checkDiagram(where + '.diagram', q.diagram);
  if (q.solutionDiagram) checkDiagram(where + '.solutionDiagram', q.solutionDiagram);
  if (sec && q.subtopic && !sec._subs.has(q.subtopic)) err(where, `subtopic "${q.subtopic}" not in section`);
  switch (q.type) {
    case 'mc': case 'multi': {
      if (!Array.isArray(q.choices) || q.choices.length < 2 || q.choices.length > 6) err(where, 'choices must have 2–6 items');
      else {
        const seen = new Set(q.choices.map(normChoice));
        if (seen.size !== q.choices.length) err(where, 'duplicate choices');
        q.choices.forEach((c, i) => { checkHtml(`${where}.choices[${i}]`, c); if (/all of the above|none of the above/i.test(c)) warn(where, '"all/none of the above" breaks when choices are shuffled'); });
      }
      if (q.type === 'mc' && !(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < (q.choices || []).length)) err(where, 'answer index out of range');
      if (q.type === 'multi' && !(Array.isArray(q.answers) && q.answers.length && q.answers.every(a => Number.isInteger(a) && a >= 0 && a < (q.choices || []).length) && new Set(q.answers).size === q.answers.length)) err(where, 'answers invalid');
      break;
    }
    case 'tf': if (typeof q.answer !== 'boolean') err(where, 'tf answer must be true/false'); break;
    case 'match': {
      if (!Array.isArray(q.pairs) || q.pairs.length < 3 || q.pairs.length > 6) { err(where, 'match needs 3–6 pairs'); break; }
      if (!q.pairs.every(p => Array.isArray(p) && p.length === 2 && p.every(x => typeof x === 'string' && x.trim()))) { err(where, 'each pair must be [left, right]'); break; }
      if (new Set(q.pairs.map(p => normChoice(p[0]))).size !== q.pairs.length) err(where, 'duplicate left items');
      if (new Set(q.pairs.map(p => normChoice(p[1]))).size !== q.pairs.length) err(where, 'duplicate right items');
      q.pairs.forEach((p, i) => { checkHtml(`${where}.pairs[${i}][0]`, p[0]); checkHtml(`${where}.pairs[${i}][1]`, p[1]); });
      break;
    }
    case 'short': {
      if (!Array.isArray(q.accept) || !q.accept.length || !q.accept.every(a => typeof a === 'string' && a.trim())) { err(where, 'accept must be a non-empty array of strings'); break; }
      if (q.normalize && !['text', 'binary', 'octal', 'decimal', 'hex', 'list'].includes(q.normalize)) err(where, `normalize "${q.normalize}" invalid`);
      if (q.normalize === 'list') for (const a of q.accept) if (L.parseList(a) === null) err(where, `accept "${a}" is not a number list`);
      const base = { binary: 2, octal: 8, decimal: 10, hex: 16 }[q.normalize];
      if (base) for (const a of q.accept) if (L.normDigits(a, base) === null) err(where, `accept "${a}" is not valid ${q.normalize}`);
      break;
    }
    case 'numeric': if (typeof q.answer !== 'number' || !isFinite(q.answer)) err(where, 'numeric answer must be a number'); break;
    case 'boolexpr': {
      if (!Array.isArray(q.vars) || !q.vars.length || new Set(q.vars).size !== q.vars.length) { err(where, 'vars must be a non-empty unique array'); break; }
      if (q.answer === undefined && !Array.isArray(q.minterms)) { err(where, 'boolexpr needs answer or minterms'); break; }
      const n = 1 << q.vars.length;
      for (const k of ['minterms', 'dontcares']) if (q[k] && !q[k].every(m => Number.isInteger(m) && m >= 0 && m < n)) err(where, `${k} out of range for ${q.vars.length} vars`);
      if (q.answer !== undefined) {
        try {
          const vs = L.varsOf(L.parseBool(q.answer));
          const bad = vs.filter(v => !q.vars.map(x => x.toUpperCase()).includes(v.toUpperCase()));
          if (bad.length) err(where, `answer uses variables not in vars: ${bad.join(', ')}`);
          if (q.minterms) {
            const eq = L.equivalent(q.answer, L.mintermsToSOP(q.minterms, q.vars), { vars: q.vars, dontcares: q.dontcares });
            if (!eq.equal) err(where, 'answer and minterms disagree');
          }
        } catch (e) { err(where, `answer "${q.answer}" does not parse: ${e.message}`); }
      }
      if (q.form && !['sop', 'pos'].includes(q.form)) err(where, 'form must be sop or pos');
      break;
    }
  }
  // the answer key must grade as correct
  try {
    const res = L.check(q, keyFor(q));
    if (!res.valid || !res.correct) err(where, `answer key does not grade as correct (${res.message || 'invalid'})`);
  } catch (e) { err(where, 'checking the key threw: ' + e.message); }
}

// ---------- walk sections ----------
const ids = new Map();
const claim = (id, where) => { if (!id) return; if (ids.has(id)) err(where, `duplicate id "${id}" (also ${ids.get(id)})`); else ids.set(id, where); if (!/^[a-z0-9-]+$/.test(id)) err(where, `id "${id}" must be [a-z0-9-]`); };
const report = [];
for (const sec of Study.sections) {
  const W = `[${sec.id}]`;
  if (!SECTION_IDS.includes(sec.id)) err(W, 'unknown section id');
  for (const k of ['title', 'short', 'summary', 'hub']) if (!sec[k]) err(W, `missing ${k}`);
  if (sec.short && sec.short.length > 14) warn(W, 'short title longer than 14 chars');
  if (!Array.isArray(sec.subtopics) || !sec.subtopics.length) err(W, 'needs subtopics');
  sec._subs = new Set();
  for (const st of sec.subtopics || []) { claim(st.id, `${W} subtopic`); if (!st.title) err(`${W} ${st.id}`, 'subtopic needs title'); sec._subs.add(st.id); }
  for (const s of sec.sources || []) if (!fs.existsSync(path.join(REPO, s.file))) err(`${W} sources`, `file not found: ${s.file}`);
  const per = {}; sec.subtopics?.forEach(st => { per[st.id] = { l: 0, f: 0, q: 0, p: 0 }; });
  for (const [i, l] of (sec.lessons || []).entries()) {
    const w = `${W} lesson ${l.id || '#' + i}`;
    claim(l.id, w); checkSrc(w, l.src);
    if (!l.title) err(w, 'missing title');
    if (!sec._subs.has(l.subtopic)) err(w, `subtopic "${l.subtopic}" not in section`); else per[l.subtopic].l++;
    if (!Array.isArray(l.blocks) || !l.blocks.length) { err(w, 'needs blocks'); continue; }
    l.blocks.forEach((b, j) => {
      const bw = `${w} block ${j}`;
      if (!BLOCK_TYPES.includes(b.type)) return err(bw, `block type "${b.type}" invalid`);
      if (b.type === 'text' || b.type === 'callout') { if (!b.html) err(bw, 'missing html'); checkHtml(bw, b.html); }
      if (b.type === 'callout' && !['tip', 'warn', 'exam', 'note'].includes(b.tone)) err(bw, 'callout tone invalid');
      if (b.type === 'example') { if (!Array.isArray(b.steps) || !b.steps.length) err(bw, 'example needs steps'); [b.problem, b.answer, ...(b.steps || [])].forEach(s => checkHtml(bw, s)); }
      if (b.type === 'diagram') checkDiagram(bw, b.diagram);
      if (b.type === 'code' && typeof b.code !== 'string') err(bw, 'code block needs code');
      if (b.type === 'check') { if (!b.question) err(bw, 'check needs question'); else { if (b.question.id) claim(b.question.id, bw); checkQuestion(bw, Object.assign({ subtopic: l.subtopic }, b.question), { needId: false, sec }); } }
    });
  }
  for (const [i, f] of (sec.flashcards || []).entries()) {
    const w = `${W} card ${f.id || '#' + i}`;
    claim(f.id, w); checkSrc(w, f.src);
    if (!f.front || !f.back) err(w, 'needs front and back');
    checkHtml(w + '.front', f.front); checkHtml(w + '.back', f.back);
    if (f.frontDiagram) checkDiagram(w + '.frontDiagram', f.frontDiagram);
    if (f.backDiagram) checkDiagram(w + '.backDiagram', f.backDiagram);
    if (!sec._subs.has(f.subtopic)) err(w, `subtopic "${f.subtopic}" not in section`); else per[f.subtopic].f++;
  }
  for (const [i, q] of (sec.questions || []).entries()) {
    const w = `${W} question ${q.id || '#' + i}`;
    claim(q.id, w); checkSrc(w, q.src);
    checkQuestion(w, q, { sec });
    if (sec._subs.has(q.subtopic)) per[q.subtopic].q++;
  }
  for (const [i, p] of (sec.practice || []).entries()) {
    const w = `${W} practice ${p.gen || '#' + i}`;
    if (!ALL_GENS.includes(p.gen)) { err(w, `generator "${p.gen}" is not in the catalogue`); continue; }
    if (!sec._subs.has(p.subtopic)) err(w, `subtopic "${p.subtopic}" not in section`); else per[p.subtopic].p++;
    if (!p.label) err(w, 'needs label');
    if ((haveGenNum || haveGenLogic) && !Study.gen.has(p.gen)) warn(w, 'generator not implemented yet');
  }
  for (const [st, c] of Object.entries(per)) if (!c.l && !c.q && !c.f) warn(W, `subtopic ${st} has no lessons, cards or questions`);
  report.push({ id: sec.id, subtopics: sec.subtopics?.length || 0, lessons: sec.lessons?.length || 0, cards: sec.flashcards?.length || 0, questions: sec.questions?.length || 0, practice: sec.practice?.length || 0,
    course: [...(sec.lessons || []), ...(sec.flashcards || []), ...(sec.questions || [])].filter(x => x.src?.type === 'course').length,
    supplemental: [...(sec.lessons || []), ...(sec.flashcards || []), ...(sec.questions || [])].filter(x => x.src?.type === 'supplemental').length,
    types: Object.entries((sec.questions || []).reduce((a, q) => (a[q.type] = (a[q.type] || 0) + 1, a), {})).map(([k, v]) => `${k}:${v}`).join(' ') });
}

// ---------- generators ----------
const genReport = [];
if (haveGenNum || haveGenLogic) {
  for (const id of ALL_GENS) {
    const def = Study.gen.get(id);
    if (!def) { warn('[gen]', `${id} not implemented`); continue; }
    for (const k of ['title', 'section', 'description']) if (!def[k]) err(`[gen ${id}]`, `missing ${k}`);
    if (!GENERATORS[def.section] || !GENERATORS[def.section].includes(id)) err(`[gen ${id}]`, `section "${def.section}" does not match the catalogue`);
    let ok = 0;
    for (let s = 1; s <= genSamples; s++) {
      const w = `[gen ${id} seed ${s}]`;
      try {
        const q = Study.gen.make(id, s * 7919);
        checkQuestion(w, q, { needId: true });
        if (!q.steps) err(w, 'generated question has no steps');
        const again = Study.gen.make(id, s * 7919);
        if (JSON.stringify(again) !== JSON.stringify(q)) err(w, 'not deterministic for the same seed');
        const back = Study.gen.fromId(q.id);
        if (!back || back.prompt !== q.prompt) err(w, 'fromId(id) does not recreate the question');
        ok++;
      } catch (e) { err(w, 'make threw: ' + e.message); }
    }
    genReport.push(`${id}:${ok}/${genSamples}`);
  }
  for (const g of Study.gen.list()) if (!ALL_GENS.includes(g.id)) warn('[gen]', `${g.id} registered but not in the catalogue`);
}

// ---------- output ----------
const filt = list => onlySection ? list.filter(m => m.startsWith(`[${onlySection}]`) || (onlySection === 'gen' && m.startsWith('[gen'))) : list;
const E = filt(errors), Wn = filt(warnings);
console.log('Section  subt lessons cards questions practice | course suppl | question types');
for (const r of report) if (!onlySection || r.id === onlySection) console.log(`${r.id.padEnd(8)} ${String(r.subtopics).padStart(4)} ${String(r.lessons).padStart(7)} ${String(r.cards).padStart(5)} ${String(r.questions).padStart(9)} ${String(r.practice).padStart(8)} | ${String(r.course).padStart(6)} ${String(r.supplemental).padStart(5)} | ${r.types}`);
if (genReport.length && (!onlySection || onlySection === 'gen')) console.log('generators: ' + genReport.join(' '));
console.log(`diagrams.js ${haveDiagrams ? 'loaded' : 'absent'}; generators ${haveGenNum || haveGenLogic ? 'loaded' : 'absent'}`);
if (Wn.length) { console.log(`\n${Wn.length} warning(s):`); for (const w of Wn.slice(0, 200)) console.log('  ⚠ ' + w); if (Wn.length > 200) console.log(`  … ${Wn.length - 200} more`); }
if (E.length) { console.log(`\n${E.length} error(s):`); for (const e of E.slice(0, 300)) console.log('  ✗ ' + e); if (E.length > 300) console.log(`  … ${E.length - 300} more`); process.exit(1); }
console.log('\nOK — no errors.');
