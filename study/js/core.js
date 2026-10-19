/* CECS 201 Study — core namespace, registries and small utilities.
   Classic script (no modules) so the app also works when opened from disk. */
(function () {
  'use strict';
  const Study = (window.Study = window.Study || {});

  /* ---------- Content registry ---------- */
  // Each content file calls Study.registerSection({...}); see study/README.md for the schema.
  Study.sections = [];
  Study.registerSection = function (section) {
    if (!section || !section.id) throw new Error('registerSection: section.id is required');
    if (Study.sections.some(s => s.id === section.id)) throw new Error('registerSection: duplicate section id ' + section.id);
    Study.sections.push(section);
    Study.sections.sort((a, b) => (a.order || 0) - (b.order || 0));
  };
  Study.section = id => Study.sections.find(s => s.id === id) || null;
  // Add subtopics/lessons/cards/questions/practice/sources/gaps to an already registered section (used by labs-5-8.js).
  Study.extendSection = function (id, more) {
    const sec = Study.section(id);
    if (!sec) throw new Error('extendSection: no section ' + id + ' (check script order)');
    for (const key of ['subtopics', 'lessons', 'flashcards', 'questions', 'practice', 'sources', 'gaps']) {
      if (more[key]) sec[key] = (sec[key] || []).concat(more[key]);
    }
  };

  /* ---------- Seeded random numbers (generated questions are reproducible from their seed) ---------- */
  Study.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    const next = () => {                       // mulberry32
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = {
      next,
      int: (min, max) => min + Math.floor(next() * (max - min + 1)),   // inclusive
      bool: (p = 0.5) => next() < p,
      pick: arr => arr[Math.floor(next() * arr.length)],
      shuffle: arr => {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      },
      sample: (arr, n) => r.shuffle(arr).slice(0, n),
    };
    return r;
  };
  Study.randomSeed = () => (Math.floor(Math.random() * 2147483646) + 1);

  /* ---------- Generator registry ---------- */
  // Study.gen.register('bin2dec', { title, section, description, difficulty, params, make(rng, params) -> question })
  // make() returns a question object in the same shape as authored questions (without id).
  Study.gen = {
    _reg: Object.create(null),
    register(id, def) {
      if (this._reg[id]) throw new Error('gen.register: duplicate generator ' + id);
      if (typeof def.make !== 'function') throw new Error('gen.register: ' + id + ' needs make()');
      this._reg[id] = Object.assign({ id }, def);
    },
    has(id) { return !!this._reg[id]; },
    get(id) { return this._reg[id] || null; },
    list() { return Object.values(this._reg); },
    make(id, seed, params) {
      const def = this._reg[id];
      if (!def) throw new Error('Unknown generator ' + id);
      const p = Object.assign({}, def.params || {}, params || {});
      const q = def.make(Study.rng(seed), p);
      q.id = 'g:' + id + ':' + seed + (params && Object.keys(params).length ? ':' + JSON.stringify(params) : '');
      q.generated = { gen: id, seed, params: params || {} };
      if (!q.section) q.section = def.section;
      if (!q.src) q.src = { type: 'generated', note: 'Practice problem generated from course methods; answer and steps are computed.' };
      if (!q.difficulty) q.difficulty = def.difficulty || 2;
      return q;
    },
    random(id, params) { return this.make(id, Study.randomSeed(), params); },
    // Recreate a generated question from its id (used by mistake review).
    fromId(qid) {
      const m = /^g:([^:]+):(\d+)(?::(.*))?$/.exec(qid);
      if (!m || !this._reg[m[1]]) return null;
      let params;
      try { params = m[3] ? JSON.parse(m[3]) : undefined; } catch (e) { params = undefined; }
      return this.make(m[1], Number(m[2]), params);
    },
  };

  /* ---------- Small utilities ---------- */
  Study.util = {
    escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    shuffle(arr) { return Study.rng(Study.randomSeed()).shuffle(arr); },
    clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); },
    pad(s, n, ch = '0') { s = String(s); while (s.length < n) s = ch + s; return s; },
  };
})();
