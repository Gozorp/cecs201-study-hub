/* CECS 201 Study — Boolean expressions, number formats and answer checking.
   Pure functions; also loaded by tools/validate-content.mjs under Node. */
(function () {
  'use strict';
  const Study = (window.Study = window.Study || {});

  /* ================= Boolean expressions =================
     Notation accepted (matches the course: A' or a bar for NOT):
       NOT  : postfix '  ’  ′, prefix ! ~ ¬, or a combining overline (A̅)
       AND  : juxtaposition (AB), ·  *  &  ∧  .
       XOR  : ⊕  ^          XNOR: ⊙
       OR   : +  |  ∨
       constants 0 and 1; parentheses.
     Variables are one letter plus optional digits (A, b, Q0, x12), so "AB" means A·B.
     Precedence: NOT > AND > XOR/XNOR > OR. */

  const T = { VAR: 'var', CONST: 'const', AND: 'and', OR: 'or', XOR: 'xor', XNOR: 'xnor', NOT: 'not', POSTNOT: 'postnot', LP: '(', RP: ')' };

  function tokenize(src) {
    const s = String(src).normalize('NFC');
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[A-Za-z]/.test(c)) {
        let j = i + 1;
        while (j < s.length && /[0-9]/.test(s[j])) j++;
        let name = s.slice(i, j);
        toks.push({ t: T.VAR, v: name, pos: i });
        i = j;
        // combining overline / macron right after a variable = NOT
        while (s[i] === '̅' || s[i] === '̄') { toks.push({ t: T.POSTNOT, pos: i }); i++; }
        continue;
      }
      if (c === '0' || c === '1') { toks.push({ t: T.CONST, v: Number(c), pos: i }); i++; continue; }
      if ("'’′".includes(c)) { toks.push({ t: T.POSTNOT, pos: i }); i++; continue; }
      if ('!~¬'.includes(c)) { toks.push({ t: T.NOT, pos: i }); i++; continue; }
      if ('·*&∧.⋅•'.includes(c)) { toks.push({ t: T.AND, pos: i }); i++; continue; }
      if ('+|∨'.includes(c)) { toks.push({ t: T.OR, pos: i }); i++; continue; }
      if ('⊕^'.includes(c)) { toks.push({ t: T.XOR, pos: i }); i++; continue; }
      if (c === '⊙') { toks.push({ t: T.XNOR, pos: i }); i++; continue; }
      if (c === '(' || c === '[') { toks.push({ t: T.LP, pos: i }); i++; continue; }
      if (c === ')' || c === ']') { toks.push({ t: T.RP, pos: i }); i++; continue; }
      throw new SyntaxError(`Unexpected character "${c}" at position ${i + 1}`);
    }
    return toks;
  }

  function parseBool(src) {
    const toks = tokenize(src);
    if (!toks.length) throw new SyntaxError('Expression is empty');
    let k = 0;
    const peek = () => toks[k];
    const startsPrimary = tok => tok && (tok.t === T.VAR || tok.t === T.CONST || tok.t === T.LP || tok.t === T.NOT);
    function parseOr() {
      let left = parseXor();
      while (peek() && peek().t === T.OR) { k++; left = { op: 'or', a: left, b: parseXor() }; }
      return left;
    }
    function parseXor() {
      let left = parseAnd();
      while (peek() && (peek().t === T.XOR || peek().t === T.XNOR)) {
        const op = peek().t === T.XOR ? 'xor' : 'xnor'; k++;
        left = { op, a: left, b: parseAnd() };
      }
      return left;
    }
    function parseAnd() {
      let left = parseUnary();
      while (peek() && (peek().t === T.AND || startsPrimary(peek()))) {
        if (peek().t === T.AND) k++;
        left = { op: 'and', a: left, b: parseUnary() };
      }
      return left;
    }
    function parseUnary() {
      const tok = peek();
      if (!tok) throw new SyntaxError('Expression ends unexpectedly');
      if (tok.t === T.NOT) { k++; return { op: 'not', a: parseUnary() }; }
      let p = parsePrimary();
      while (peek() && peek().t === T.POSTNOT) { k++; p = { op: 'not', a: p }; }
      return p;
    }
    function parsePrimary() {
      const tok = peek();
      if (!tok) throw new SyntaxError('Expression ends unexpectedly');
      if (tok.t === T.VAR) { k++; return { op: 'var', name: tok.v }; }
      if (tok.t === T.CONST) { k++; return { op: 'const', v: tok.v }; }
      if (tok.t === T.LP) {
        k++;
        const e = parseOr();
        if (!peek() || peek().t !== T.RP) throw new SyntaxError('Missing closing parenthesis');
        k++;
        return e;
      }
      if (tok.t === T.POSTNOT) throw new SyntaxError(`A ' must follow a variable or a closing parenthesis (position ${tok.pos + 1})`);
      throw new SyntaxError(`Unexpected operator at position ${tok.pos + 1}`);
    }
    const ast = parseOr();
    if (k < toks.length) {
      const t = toks[k];
      throw new SyntaxError(t.t === T.RP ? `Unmatched ")" at position ${t.pos + 1}` : `Unexpected symbol at position ${t.pos + 1}`);
    }
    return ast;
  }

  function evalBool(ast, env) {
    switch (ast.op) {
      case 'var': {
        if (!(ast.name in env)) throw new Error('Unknown variable ' + ast.name);
        return env[ast.name] ? 1 : 0;
      }
      case 'const': return ast.v;
      case 'not': return evalBool(ast.a, env) ? 0 : 1;
      case 'and': return evalBool(ast.a, env) & evalBool(ast.b, env);
      case 'or': return evalBool(ast.a, env) | evalBool(ast.b, env);
      case 'xor': return evalBool(ast.a, env) ^ evalBool(ast.b, env);
      case 'xnor': return (evalBool(ast.a, env) ^ evalBool(ast.b, env)) ? 0 : 1;
    }
    throw new Error('Bad AST node ' + ast.op);
  }

  const natCmp = (x, y) => x.localeCompare(y, 'en', { numeric: true, sensitivity: 'base' }) || (x < y ? -1 : x > y ? 1 : 0);
  function varsOf(ast, set = new Set()) {
    if (ast.op === 'var') set.add(ast.name);
    else if (ast.a) { varsOf(ast.a, set); if (ast.b) varsOf(ast.b, set); }
    return [...set].sort(natCmp);
  }

  const toAst = e => (typeof e === 'string' ? parseBool(e) : e);
  // Case-insensitive variable matching: rename variables to the spelling used in `vars`.
  function canonVars(ast, vars) {
    const map = new Map(vars.map(v => [v.toUpperCase(), v]));
    const walk = n => {
      if (n.op === 'var') return { op: 'var', name: map.get(n.name.toUpperCase()) || n.name };
      if (n.op === 'const') return n;
      return n.b ? { op: n.op, a: walk(n.a), b: walk(n.b) } : { op: n.op, a: walk(n.a) };
    };
    return walk(ast);
  }

  // Row index i encodes inputs with vars[0] as the most significant bit (course convention: A is the MSB).
  function envForRow(vars, i) {
    const env = {}, n = vars.length;
    vars.forEach((v, j) => { env[v] = (i >> (n - 1 - j)) & 1; });
    return env;
  }

  function truthTable(expr, vars) {
    const ast = toAst(expr);
    vars = vars || varsOf(ast);
    const rows = [];
    for (let i = 0; i < (1 << vars.length); i++) {
      const env = envForRow(vars, i);
      rows.push({ index: i, inputs: vars.map(v => env[v]), out: evalBool(ast, env) });
    }
    return { vars, rows };
  }

  function minterms(expr, vars) {
    return truthTable(expr, vars).rows.filter(r => r.out).map(r => r.index);
  }

  // Equivalent on every row except don't-cares. Variables outside `vars` make it non-equivalent.
  function equivalent(a, b, opts = {}) {
    let A = toAst(a), B = toAst(b);
    let vars = opts.vars;
    if (vars) { A = canonVars(A, vars); B = canonVars(B, vars); }
    else vars = [...new Set([...varsOf(A), ...varsOf(B)])].sort(natCmp);
    const extra = [...varsOf(A), ...varsOf(B)].filter(v => !vars.includes(v));
    if (extra.length) return { equal: false, unknownVars: [...new Set(extra)] };
    const dc = new Set(opts.dontcares || []);
    for (let i = 0; i < (1 << vars.length); i++) {
      if (dc.has(i)) continue;
      const env = envForRow(vars, i);
      if (evalBool(A, env) !== evalBool(B, env)) return { equal: false, counterexample: { index: i, env } };
    }
    return { equal: true };
  }

  function literalCount(expr) {
    const ast = toAst(expr);
    let n = 0;
    (function walk(x) { if (x.op === 'var') n++; else if (x.a) { walk(x.a); if (x.b) walk(x.b); } })(ast);
    return n;
  }

  const isLiteral = n => n.op === 'var' || (n.op === 'not' && n.a.op === 'var');
  const flatten = (n, op) => (n.op === op ? [...flatten(n.a, op), ...flatten(n.b, op)] : [n]);
  function isSOP(expr) {
    const ast = toAst(expr);
    return flatten(ast, 'or').every(t => flatten(t, 'and').every(l => isLiteral(l) || l.op === 'const'));
  }
  function isPOS(expr) {
    const ast = toAst(expr);
    return flatten(ast, 'and').every(t => flatten(t, 'or').every(l => isLiteral(l) || l.op === 'const'));
  }

  // Pretty-print with course notation: A'B + C, (A + B)', A ⊕ B.
  function formatBool(expr) {
    const ast = toAst(expr);
    const prec = { or: 1, xor: 2, xnor: 2, and: 3, not: 4, var: 5, const: 5 };
    function f(n, parent) {
      let s;
      switch (n.op) {
        case 'var': s = n.name; break;
        case 'const': s = String(n.v); break;
        case 'not': s = (n.a.op === 'var' || n.a.op === 'const' || n.a.op === 'not') ? f(n.a, 4) + "'" : '(' + f(n.a, 0) + ")'"; break;
        case 'and': s = f(n.a, 3) + f(n.b, 3); break;
        case 'or': s = f(n.a, 1) + ' + ' + f(n.b, 1); break;
        case 'xor': s = f(n.a, 2) + ' ⊕ ' + f(n.b, 2.5); break;
        case 'xnor': s = f(n.a, 2) + ' ⊙ ' + f(n.b, 2.5); break;
      }
      return prec[n.op] < parent ? '(' + s + ')' : s;
    }
    return f(ast, 0);
  }

  // Canonical sum of minterms, e.g. vars [A,B,C], [1,3] -> "A'B'C + A'BC"
  function mintermsToSOP(ms, vars) {
    if (!ms.length) return '0';
    return ms.slice().sort((a, b) => a - b).map(m => vars.map((v, j) => ((m >> (vars.length - 1 - j)) & 1) ? v : v + "'").join('')).join(' + ');
  }

  /* ================= Number formats ================= */
  const stripSpaces = s => String(s).trim().replace(/[\s_,]/g, '');
  function normDigits(s, base) {
    let t = stripSpaces(s);
    if (!t) return null;
    let neg = false;
    if (t[0] === '-' || t[0] === '+') { neg = t[0] === '-'; t = t.slice(1); }
    if (base === 2) t = t.replace(/^0b/i, '').replace(/(₂|\(2\)|_2|b)$/i, '');
    if (base === 16) t = t.replace(/^0x/i, '').replace(/^\$/, '').replace(/(₁₆|\(16\)|_16|h)$/i, '');
    if (base === 8) t = t.replace(/^0o/i, '').replace(/(₈|\(8\)|_8|o)$/i, '');
    if (base === 10) t = t.replace(/(₁₀|\(10\)|_10|d)$/i, '');
    t = t.toUpperCase();
    const digits = '0123456789ABCDEF'.slice(0, base);
    const re = new RegExp('^[' + digits + ']+(\\.[' + digits + ']+)?$');
    if (!re.test(t)) return null;
    return (neg ? '-' : '') + t;
  }
  const stripLeadingZeros = t => {
    const neg = t[0] === '-';
    let u = neg ? t.slice(1) : t;
    u = u.replace(/^0+(?=[0-9A-F])/, '');
    return (neg ? '-' : '') + u;
  };
  function normText(s) {
    return String(s).normalize('NFKC').toLowerCase()
      .replace(/[‘’′]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-')
      .replace(/\s+/g, ' ').trim()
      .replace(/^["'(]+|["'.,;:!?)]+$/g, '').trim();
  }
  // "Σm(1, 3, 5)", "m 1 3 5", "{5,1,3}" -> [1, 3, 5] (sorted, de-duplicated); null if anything else is present
  function parseList(s) {
    const t = String(s).replace(/Σ|∑|sum|m|M|\(|\)|\{|\}|\[|\]/g, ' ').trim();
    if (!t) return [];
    if (!/^[\d\s,;]+$/.test(t)) return null;
    return [...new Set(t.split(/[\s,;]+/).filter(Boolean).map(Number))].sort((a, b) => a - b);
  }
  function parseNumber(s) {
    const t = stripSpaces(s).replace(/^\+/, '');
    if (!/^-?(\d+(\.\d*)?|\.\d+)(e-?\d+)?$/i.test(t)) return null;
    return Number(t);
  }

  /* ================= Answer checking =================
     check(question, input) -> { valid, correct, message?, expected? }
     valid:false means the input couldn't be read (e.g. a syntax error); the UI should let the student fix it
     rather than counting it as wrong. */
  function check(q, input) {
    switch (q.type) {
      case 'mc': return { valid: input !== null && input !== undefined, correct: Number(input) === q.answer };
      case 'tf': return { valid: typeof input === 'boolean', correct: input === q.answer };
      case 'multi': {
        if (!Array.isArray(input)) return { valid: false, correct: false };
        const a = new Set(q.answers), b = new Set(input.map(Number));
        return { valid: true, correct: a.size === b.size && [...a].every(x => b.has(x)) };
      }
      case 'match': {
        // input[i] = index into q.pairs of the right-hand item chosen for left item i
        if (!Array.isArray(input) || input.length !== q.pairs.length) return { valid: false, correct: false, message: 'Match every item first.' };
        const wrong = input.map((r, i) => (Number(r) === i ? null : i)).filter(x => x !== null);
        return { valid: true, correct: wrong.length === 0, wrong };
      }
      case 'numeric': {
        const x = parseNumber(input);
        if (x === null) return { valid: false, correct: false, message: 'Enter a number.' };
        return { valid: true, correct: Math.abs(x - q.answer) <= (q.tolerance || 0) + 1e-9, expected: String(q.answer) };
      }
      case 'short': return checkShort(q, input);
      case 'boolexpr': return checkBool(q, input);
    }
    return { valid: false, correct: false, message: 'Unknown question type ' + q.type };
  }

  function checkShort(q, input) {
    const mode = q.normalize || 'text';
    const raw = String(input == null ? '' : input);
    if (!raw.trim()) return { valid: false, correct: false, message: 'Type an answer first.' };
    if (mode === 'list') {
      const u = parseList(raw);
      if (u === null) return { valid: false, correct: false, message: 'Type whole numbers separated by commas, e.g. 1, 3, 5.' };
      const same = a => { const v = parseList(a); return v !== null && v.length === u.length && v.every((x, i) => x === u[i]); };
      return { valid: true, correct: q.accept.some(same), expected: q.accept[0] };
    }
    if (mode === 'text') {
      const u = normText(raw);
      return { valid: true, correct: q.accept.some(a => normText(a) === u), expected: q.accept[0] };
    }
    const base = { binary: 2, octal: 8, decimal: 10, hex: 16 }[mode];
    if (!base) return { valid: false, correct: false, message: 'Unknown normalize mode ' + mode };
    let u = normDigits(raw, base);
    const name = { 2: 'binary digits (0/1)', 8: 'octal digits (0–7)', 10: 'a decimal number', 16: 'hex digits (0–9, A–F)' }[base];
    if (u === null) return { valid: false, correct: false, message: `That doesn't look like ${name}.` };
    const lz = q.leadingZeros || (q.width ? 'exact' : 'ignore');
    if (q.width && u.replace('-', '').replace('.', '').length !== q.width) {
      return { valid: true, correct: false, message: `The answer should be exactly ${q.width} digits wide.`, expected: q.accept[0] };
    }
    const norm = x => { const n = normDigits(x, base); return n === null ? null : (lz === 'ignore' ? stripLeadingZeros(n) : n); };
    u = lz === 'ignore' ? stripLeadingZeros(u) : u;
    return { valid: true, correct: q.accept.some(a => norm(a) === u), expected: q.accept[0] };
  }

  function checkBool(q, input) {
    const raw = String(input == null ? '' : input);
    if (!raw.trim()) return { valid: false, correct: false, message: 'Type an expression first.' };
    let ast;
    try { ast = parseBool(raw); } catch (e) { return { valid: false, correct: false, message: e.message }; }
    const vars = q.vars;
    ast = canonVars(ast, vars);
    const unknown = varsOf(ast).filter(v => !vars.includes(v));
    if (unknown.length) return { valid: false, correct: false, message: `Use only the variables ${vars.join(', ')} (found ${unknown.join(', ')}).` };
    const ref = q.answer !== undefined ? q.answer : mintermsToSOP(q.minterms, vars);
    const eq = equivalent(ast, canonVars(toAst(ref), vars), { vars, dontcares: q.dontcares });
    const expected = formatBool(ref);
    if (!eq.equal) {
      const env = eq.counterexample.env;
      const where = vars.map(v => v + '=' + env[v]).join(', ');
      return { valid: true, correct: false, expected, message: `Not equivalent: at ${where} your expression gives ${evalBool(ast, env)}.` };
    }
    if (q.form === 'sop' && !isSOP(ast)) return { valid: true, correct: false, expected, message: 'Equivalent, but not written as a sum of products.' };
    if (q.form === 'pos' && !isPOS(ast)) return { valid: true, correct: false, expected, message: 'Equivalent, but not written as a product of sums.' };
    if (q.maxLiterals && literalCount(ast) > q.maxLiterals) {
      return { valid: true, correct: false, expected, message: `Equivalent, but not minimal: ${literalCount(ast)} literals (minimal is ${q.maxLiterals}).` };
    }
    return { valid: true, correct: true, expected };
  }

  /* ================= Number helpers shared by generators ================= */
  const toBase = (n, base, width = 0) => { let s = Math.abs(n).toString(base).toUpperCase(); while (s.length < width) s = '0' + s; return (n < 0 ? '-' : '') + s; };
  const twos = (value, bits) => toBase(((value % (1 << bits)) + (1 << bits)) % (1 << bits), 2, bits);   // pattern for a signed value
  const fromTwos = (pattern) => { const n = pattern.length, u = parseInt(pattern, 2); return pattern[0] === '1' ? u - (1 << n) : u; };

  Study.logic = {
    parseBool, evalBool, varsOf, truthTable, minterms, equivalent, literalCount, isSOP, isPOS, formatBool, mintermsToSOP,
    envForRow, normDigits, normText, parseNumber, parseList, stripLeadingZeros, check, toBase, twos, fromTwos,
  };
})();
