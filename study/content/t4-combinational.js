/* CECS 201 Study — section t4: Combinational Logic (Topic 4: Class 8 and Class 9, 7 lecture videos).
   Sources: every Topic_4/*.vtt transcript (cited as file#hh:mm:ss), a few later lectures that refer back to
   K-maps, and the hub's Final Exam page. Prime/essential prime implicants, POS by grouping 0s and static hazards
   are not in the mirrored lectures; they are marked supplemental. Schema and conventions: study/README.md.
   Every function used below is defined once in FN; its K-map groups are computed from the product terms, so a
   picture can never disagree with the expression next to it. */
(function () {
  'use strict';
  const Study = window.Study;
  const L = Study.logic;

  /* ---------------- sources ---------------- */
  const V = {
    c8v1: 'Topic_4/class8_video1.mp4.vtt',      // Top-Down Design (+ start of 2-variable K-maps)
    c8v2: 'Topic_4/class8_video2.mp4.vtt',      // K-Maps (1/3): 2-variable maps, grouping rules 1 and 2
    c8v3: 'Topic_4/class8_video3.mp4.vtt',      // K-Maps (2/3): misconceptions, rule 3 (powers of two)
    c8v4: 'Topic_4/class8_video4.mp4.vtt',      // K-Maps (3/3): 3-variable maps, wrap-around, two examples
    c9v1: 'Topic_4/class9_video1.mp4.vtt',      // 4-variable K-map: layout, regions, group size vs literals
    c9v2: 'Topic_4/class9_video2.mp4.vtt',      // K-Map Examples: two 4-variable examples, corners
    c9v3: 'Topic_4/class9_video3.mp4.vtt',      // Don't Care Conditions: knob and die examples
    c18v3: 'Topic_5/class18_video3.mp4.vtt',    // Topic 5: recap of top-down design; 5-variable K-maps not covered
    c14v3: 'Topic_5/class14_video3-v2.mp4.vtt', // Topic 5: priority-encoder K-maps ("if X is in the K-map …")
    c7v2: 'Topic_3/class7_video2.mp4.vtt',      // Topic 3: maxterms "not covered right now"
    gray: 'Topic_2/class4_video_2_binary_codes.mp4.vtt', // Topic 2: Gray code
    lab3: 'Lab_3/Vivdo_set_as_top.mp4.vtt',     // Lab 3: kmap and x_kmap modules
  };
  // course('c8v2 00:05:30', …) -> { type: 'course', refs: ['Topic_4/class8_video2.mp4.vtt#00:05:30', …] }
  const course = (...refs) => ({
    type: 'course',
    refs: refs.map(r => {
      const [k, t] = r.split(' ');
      if (!V[k]) throw new Error('t4-combinational: unknown video key ' + k);
      return V[k] + '#' + t;
    }),
  });
  const STD = 'standard logic-design material (e.g. Mano & Ciletti, Digital Design, ch. 3)';
  const supp = what => ({ type: 'supplemental', note: what + ': ' + STD + '; not stated in the mirrored Topic 4 lectures.' });
  const suppGuide = what => ({ type: 'supplemental', note: what + ' is listed on the hub’s Final Exam study page (Topic 4 points), but no mirrored lecture teaches it; the method here is ' + STD + '.' });
  const guide = what => ({ type: 'final-guide', note: 'From the hub’s Final Exam study page (Topic 4 drills): ' + what });
  const NS_LAB3 = 'Lab 3 handout: the functions the kmap and x_kmap modules implement are not mirrored here.';

  /* ---------------- functions used in this section (checked by the author's verifier: every sop/pos is
     equivalent to its minterm list and has the true minimum literal count) ---------------- */
  /*FN-BEGIN*/
  const X2 = ['x', 'y'], X3 = ['x', 'y', 'z'], A2 = ['A', 'B'], A3 = ['A', 'B', 'C'], A4 = ['A', 'B', 'C', 'D'];
  const FN = {
    y2:      { vars: ['I1', 'I0'], ms: [0, 1], sop: "I1'" },                          // Class 8 Video 2, example 1
    f2:      { vars: A2, ms: [0, 1, 3], sop: "A' + B" },                               // Class 8 Video 2, example 2
    a2:      { vars: A2, ms: [2, 3], sop: 'A' },
    b2:      { vars: A2, ms: [1, 3], sop: 'B' },
    or2:     { vars: A2, ms: [1, 2, 3], sop: 'A + B' },
    xor2:    { vars: A2, ms: [1, 2], sop: "A'B + AB'" },
    f1x:     { vars: X3, ms: [2, 3, 4, 5], sop: "x'y + xy'", pos: "(x + y)(x' + y')" },                         // Class 8 Video 4, example 1
    f2x:     { vars: X3, ms: [3, 4, 6, 7], sop: "yz + xz'", pos: "(x + z)(y + z')" },  // Class 8 Video 4, example 2
    zbar:    { vars: X3, ms: [0, 2, 4, 6], sop: "z'" },
    zodd:    { vars: X3, ms: [1, 3, 5, 7], sop: 'z' },
    zxy:     { vars: X3, ms: [0, 2, 4, 6, 7], sop: "z' + xy" },
    xbar:    { vars: X3, ms: [0, 1, 2, 3], sop: "x'" },
    cyc:     { vars: A3, ms: [0, 1, 2, 5, 6, 7], sop: "A'C' + AB + B'C" },               // two different minimal answers
    maj:     { vars: A3, ms: [3, 5, 6, 7], sop: 'AB + AC + BC', pos: '(A + B)(A + C)(B + C)' },
    prime3:  { vars: A3, ms: [2, 3, 5, 7], sop: "A'B + AC", pos: "(A + B)(A' + C)" },
    knob:    { vars: X2, ms: [1, 2], dc: [3], sop: 'x + y' },                          // Class 9 Video 3, knob
    knob0:   { vars: X2, ms: [1, 2], sop: "xy' + x'y" },                               // same, with X taken as 0
    die:     { vars: ['a', 'b', 'c'], ms: [4, 5, 6], dc: [0, 7], sop: 'a' },           // Class 9 Video 3, die
    dc3:     { vars: A3, ms: [1, 3, 5], dc: [7], sop: 'C' },
    dc3b:    { vars: A3, ms: [0, 4, 6], dc: [2, 5], sop: "C'" },
    ex1:     { vars: A4, ms: [0, 1, 2, 4, 5, 6, 8, 9, 12, 13, 14], sop: "C' + A'D' + BD'", pos: "(C' + D')(A' + B + C')" }, // Class 9 Video 2, example 1
    ex2:     { vars: A4, ms: [0, 1, 2, 6, 8, 9, 10], sop: "B'C' + B'D' + A'CD'" },     // Class 9 Video 2, example 2
    sizes:   { vars: A4, ms: [0, 1, 4, 5, 6, 14], sop: "A'C' + BCD'" },                // Class 9 Video 1 group examples
    corners: { vars: A4, ms: [0, 2, 8, 10], sop: "B'D'" },
    bd1:     { vars: A4, ms: [1, 3, 9, 11], sop: "B'D" },
    bonly:   { vars: A4, ms: [4, 5, 6, 7, 12, 13, 14, 15], sop: 'B' },
    abar:    { vars: A4, ms: [0, 1, 2, 3, 4, 5, 6, 7], sop: "A'" },
    cd:      { vars: A4, ms: [3, 7, 11, 15], sop: 'CD' },
    acac:    { vars: A4, ms: [0, 1, 4, 5, 10, 11, 14, 15], sop: "A'C' + AC" },
    bdbd:    { vars: A4, ms: [0, 2, 5, 7, 8, 10, 13, 15], sop: "B'D' + BD" },
    kq:      { vars: A4, ms: [0, 4, 5, 7, 13, 15], sop: "A'C'D' + BD" },
    k8:      { vars: A4, ms: [1, 3, 4, 5, 9, 11, 14, 15], sop: "B'D + A'BC' + ABC" },
    pi1:     { vars: A4, ms: [0, 1, 2, 5, 6, 7, 8, 9, 10, 14], sop: "B'C' + CD' + A'BD" },
    trap:    { vars: A4, ms: [1, 5, 6, 7, 11, 12, 13, 15], sop: "A'C'D + A'BC + ABC' + ACD" },
    dc2:     { vars: A4, ms: [1, 3, 7, 11, 15], dc: [0, 2, 5], sop: "CD + A'B'" },      // Final-exam drill: 4 variables, X's
    sega:    { vars: A4, ms: [0, 2, 3, 5, 6, 7, 8, 9], dc: [10, 11, 12, 13, 14, 15], sop: "A + C + BD + B'D'" }, // BCD → segment a
    segaNo:  { vars: A4, ms: [0, 2, 3, 5, 6, 7, 8, 9], sop: "A'C + A'BD + AB'C' + B'C'D'" },              // same, X's taken as 0
    bcd5:    { vars: A4, ms: [5, 6, 7, 8, 9], dc: [10, 11, 12, 13, 14, 15], sop: 'A + BD + BC' },   // BCD digit ≥ 5
  };
  // Hazard-free covers: NOT minimal on purpose (a redundant consensus term is added).
  const HZ = {
    f2x: { vars: X3, ms: [3, 4, 6, 7], expr: "yz + xz' + xy" },
    prime3: { vars: A3, ms: [2, 3, 5, 7], expr: "A'B + AC + BC" },
    xyz: { vars: X3, ms: [3, 4, 5, 7], expr: "xy' + yz + xz" },
  };
  /*FN-END*/

  /* ---------------- formatting + diagram helpers ---------------- */
  const mono = s => `<span class="mono">${s}</span>`;
  const pr = s => String(s).replace(/'/g, '′');          // display form of an expression in prose
  const sub = (s, b) => `${s}<sub>${b}</sub>`;
  const sig = ms => `Σm(${ms.join(', ')})`;
  const dsig = f => sig(f.ms) + (f.dc && f.dc.length ? ` + d(${f.dc.join(', ')})` : '');
  const table = (head, rows) =>
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
  const cellsOf = (term, vars) => L.minterms(term, vars);
  const grp = (vars, term, label) => ({ cells: cellsOf(term, vars), label: label || term });
  // K-map of a function from FN, with groups given as product terms: km(FN.ex1, ["C'", "A'D'", "BD'"])
  function km(f, terms, opts) {
    const spec = { kind: 'kmap', vars: f.vars, minterms: f.ms.slice() };
    if (f.dc && f.dc.length) spec.dontcares = f.dc.slice();
    if (terms && terms.length) spec.groups = terms.map(t => (Array.isArray(t) ? grp(f.vars, t[0], t[1]) : grp(f.vars, t)));
    if (opts && opts.idx) spec.showIndex = true;
    return spec;
  }
  // K-map of F' (its 1s are the 0s of F), used for POS: group the 0s of F.
  function kmComp(f, terms) {
    const n = 1 << f.vars.length, dc = f.dc || [];
    const zeros = [...Array(n).keys()].filter(m => !f.ms.includes(m) && !dc.includes(m));
    return km({ vars: f.vars, ms: zeros, dc }, terms);
  }
  // Blank layout map with the minterm number in every cell.
  const layout = vars => ({ kind: 'kmap', vars, minterms: [], showIndex: true });
  // boolexpr question body for a minimal SOP / POS of an FN function (maxLiterals = literal count of the verified minimum)
  function bq(f, form) {
    const ans = form === 'pos' ? f.pos : f.sop;
    const q = { type: 'boolexpr', vars: f.vars.slice(), minterms: f.ms.slice(), answer: ans, form: form || 'sop', maxLiterals: L.literalCount(ans) };
    if (f.dc && f.dc.length) q.dontcares = f.dc.slice();
    return q;
  }
  const ttOf = (f, name) => ({
    kind: 'truthtable', vars: f.vars, showIndex: true,
    outputs: [{ name: name || 'F', values: [...Array(1 << f.vars.length).keys()].map(m => (f.ms.includes(m) ? 1 : (f.dc || []).includes(m) ? 'x' : 0)) }],
  });

  // Circuits
  const CIRC_MAJ = { kind: 'circuit', inputs: ['A', 'B', 'C'], gates: [
    { id: 'g1', type: 'AND', in: ['A', 'B'] }, { id: 'g2', type: 'AND', in: ['A', 'C'] }, { id: 'g3', type: 'AND', in: ['B', 'C'] },
    { id: 'g4', type: 'OR', in: ['g1', 'g2', 'g3'] }], outputs: [{ name: 'P', from: 'g4' }] };
  const CIRC_PRIME = { kind: 'circuit', inputs: ['A', 'B', 'C'], gates: [
    { id: 'n1', type: 'NOT', in: ['A'] }, { id: 'g1', type: 'AND', in: ['n1', 'B'] }, { id: 'g2', type: 'AND', in: ['A', 'C'] },
    { id: 'g3', type: 'OR', in: ['g1', 'g2'] }], outputs: [{ name: 'P', from: 'g3' }] };
  const CIRC_HAZ = { kind: 'circuit', inputs: ['x', 'y', 'z'], gates: [
    { id: 'n1', type: 'NOT', in: ['z'] }, { id: 'g1', type: 'AND', in: ['y', 'z'] }, { id: 'g2', type: 'AND', in: ['x', 'n1'] },
    { id: 'g3', type: 'OR', in: ['g1', 'g2'] }], outputs: [{ name: 'F', from: 'g3' }] };
  const CIRC_HAZFIX = { kind: 'circuit', inputs: ['x', 'y', 'z'], gates: [
    { id: 'n1', type: 'NOT', in: ['z'] }, { id: 'g1', type: 'AND', in: ['y', 'z'] }, { id: 'g2', type: 'AND', in: ['x', 'n1'] },
    { id: 'g4', type: 'AND', in: ['x', 'y'] }, { id: 'g3', type: 'OR', in: ['g1', 'g2', 'g4'] }], outputs: [{ name: 'F', from: 'g3' }] };
  const CIRC_EX1 = { kind: 'circuit', inputs: ['A', 'B', 'C', 'D'], gates: [
    { id: 'nc', type: 'NOT', in: ['C'] }, { id: 'na', type: 'NOT', in: ['A'] }, { id: 'nd', type: 'NOT', in: ['D'] },
    { id: 'g1', type: 'AND', in: ['na', 'nd'] }, { id: 'g2', type: 'AND', in: ['B', 'nd'] },
    { id: 'g3', type: 'OR', in: ['nc', 'g1', 'g2'] }], outputs: [{ name: 'F', from: 'g3' }] };
  // Timing of the static-1 hazard in F = yz + xz' with x = y = 1 while z falls (inverter delay = 2 time slots).
  const TIMING_HAZ = { kind: 'timing', signals: [
    { name: 'z', wave: '11100000' }, { name: "z' (late)", wave: '00000111' },
    { name: 'yz', wave: '11100000' }, { name: "xz'", wave: '00000111' }, { name: 'F', wave: '11100111' }] };

  /* ---------------- subtopics ---------------- */
  const SUBTOPICS = [
    { id: 't4-topdown', title: 'Top-down design: word problem → truth table → expression → circuit' },
    { id: 't4-kmap-basics', title: 'K-map basics and 2-variable maps' },
    { id: 't4-grouping', title: 'Grouping rules and reading product terms' },
    { id: 't4-kmap3', title: '3-variable K-maps (Gray-code order, wrap-around)' },
    { id: 't4-kmap4', title: '4-variable K-maps (layout, group sizes, corners)' },
    { id: 't4-examples', title: 'Worked K-map examples' },
    { id: 't4-dontcares', title: 'Don’t-care conditions' },
    { id: 't4-implicants', title: 'Prime and essential prime implicants' },
    { id: 't4-pos', title: 'POS by grouping the 0s' },
    { id: 't4-hazards', title: 'Static hazards' },
  ];

  /* ---------------- lessons ---------------- */
  const LESSONS = [
    /* ---------- 1. Top-down design ---------- */
    { id: 't4-l1', subtopic: 't4-topdown', title: 'Top-down design: capture, then convert', minutes: 8,
      src: course('c8v1 00:00:21', 'c8v1 00:00:45', 'c8v1 00:01:31', 'c8v1 00:02:20', 'c8v1 00:02:34', 'c8v1 00:03:25', 'c18v3 00:00:21'),
      blocks: [
        { type: 'text', html: `<p>Everything in this course follows the <b>top-down design methodology</b>. It has two big steps:</p>
<ol><li><b>Capture</b> — describe the desired behaviour of the task <i>precisely</i>. For a combinational circuit you do this either in words (language) or with a truth table.</li>
<li><b>Convert</b> (also called <b>implement</b>) — go from that abstract, captured behaviour to an actual circuit.</li></ol>` },
        { type: 'text', html: `<p>How is the conversion done? Even if the behaviour was captured in words, you first translate it into a <b>truth table</b>. Then:</p>
<ol><li>truth table → <b>sum of minterms</b> (one minterm for every row where the output is 1),</li>
<li>sum of minterms → <b>sum of products</b>,</li>
<li><b>simplify</b> the expression — a simpler expression gives a more optimal circuit,</li>
<li>draw the <b>circuit</b>: one AND gate per product term, one OR gate to combine them.</li></ol>
<p>You already simplify with the <b>properties of Boolean algebra</b> (Topic 3). Topic 4 adds a second way: <b>K-maps</b>, a visual form of simplification that many people find easier than manipulating the algebra.</p>` },
        { type: 'callout', tone: 'note', html: `The “K” is a person’s name: the map is the <b>Karnaugh</b> map (the auto-captions spell it “Carnot”). Topic 5 recaps the same flow: describe the functionality → truth table → sum of minterms → K-map → minimal sum of products.` },
        { type: 'example', title: 'A word problem, start to finish (majority vote)',
          problem: `<p>Three judges A, B and C each press 1 for “pass”. The light P turns on when <b>at least two</b> judges vote pass. Design the circuit. <small class="muted">(This particular problem is a standard textbook example, supplemental to the lecture; the steps are the lecture’s method.)</small></p>`,
          steps: [
            '<b>Capture:</b> P = 1 exactly when two or three of A, B, C are 1.',
            '<b>Truth table:</b> the rows with two or more 1s are ABC = 011, 101, 110, 111, i.e. rows 3, 5, 6 and 7 (A is the most significant bit).',
            `<b>Sum of minterms:</b> P = ${sig(FN.maj.ms)} = A′BC + AB′C + ABC′ + ABC — four terms, 12 literals.`,
            '<b>Simplify with a K-map:</b> m7 is adjacent to m3, m5 and m6. Circle the pairs (m3, m7) → BC, (m5, m7) → AC and (m6, m7) → AB. Using m7 in three circles is allowed: every 1 has to be covered at least once.',
            `<b>Minimal SOP:</b> P = ${pr(FN.maj.sop)} — 6 literals instead of 12.`,
            '<b>Circuit:</b> three 2-input AND gates (AB, AC, BC) feeding one 3-input OR gate.',
          ],
          answer: `P = ${pr(FN.maj.sop)}` },
        { type: 'diagram', diagram: ttOf(FN.maj, 'P'), caption: 'Captured behaviour as a truth table: P = 1 in rows 3, 5, 6, 7.' },
        { type: 'diagram', diagram: km(FN.maj, ['BC', 'AC', 'AB']), caption: 'K-map of P: three overlapping pairs, all sharing m7.' },
        { type: 'diagram', diagram: CIRC_MAJ, caption: 'The implemented circuit: P = AB + AC + BC.' },
        { type: 'check', question: { type: 'mc', difficulty: 1, prompt: 'In the conversion step, what do you build right after the truth table?',
          choices: ['The sum of minterms', 'The gate-level circuit', 'The minimal sum of products', 'A Verilog testbench'], answer: 0,
          explanation: 'The lecture’s order is truth table → sum of minterms → sum of products → simplify → circuit. The minimal expression and the circuit come later.',
          src: course('c8v1 00:02:34') } },
        { type: 'check', question: { type: 'tf', difficulty: 1, prompt: 'If a design is captured in words, top-down design still turns that description into a truth table before simplifying.', answer: true,
          explanation: 'The lecture says that even if the description uses language, you translate it into a truth table, and the conversion starts from there.',
          src: course('c8v1 00:02:20') } },
      ] },

    /* ---------- 2. K-map basics ---------- */
    { id: 't4-l2', subtopic: 't4-kmap-basics', title: 'What a K-map is: 2-variable maps', minutes: 9,
      src: course('c8v1 00:04:14', 'c8v1 00:04:48', 'c8v1 00:05:48', 'c8v1 00:07:02', 'c8v2 00:00:32', 'c8v2 00:02:25', 'c8v2 00:04:10', 'c8v2 00:06:56', 'c8v2 00:07:34', 'c8v2 00:14:15'),
      blocks: [
        { type: 'text', html: `<p>A <b>K-map</b> is a grid with <b>one cell per minterm</b>. The cells are arranged so that any two <b>adjacent</b> cells differ in the value of <b>exactly one</b> variable. That is the property K-map simplification uses.</p>
<p>With two variables the map is a 2 × 2 square. For a function F(I1, I0), the variable on the <b>right</b> of the argument list (I0) labels the <b>columns</b> across the top. The variable on the <b>left</b> (I1) labels the <b>rows</b> down the side. Each cell sits where an I1 value meets an I0 value:</p>
${table(['Cell (I1 I0)', 'Minterm', 'Product term'], [['0 0', 'm0', 'I1′I0′'], ['0 1', 'm1', 'I1′I0'], ['1 0', 'm2', 'I1I0′'], ['1 1', 'm3', 'I1I0']])}` },
        { type: 'diagram', diagram: layout(['I1', 'I0']), caption: 'A blank 2-variable map with the minterm number in each cell. I1 labels the rows, I0 the columns.' },
        { type: 'text', html: `<p><b>Filling the map:</b> write the function’s output value in each cell. The instructor writes <b>only the 1s</b>; a blank cell means 0, so the map stays uncluttered.</p>
<p><b>Reading a group:</b> circle adjacent 1s. Then find the variable that keeps the same value in every circled cell. If that value is 0, write the variable complemented (I1′). If it is 1, write it plain (I1). A variable that changes inside the circle drops out.</p>` },
        { type: 'example', title: 'Example 1 (Class 8 Video 2): Y from a truth table',
          problem: 'Y(I1, I0) is 1 for inputs 00 and 01 and 0 otherwise. Simplify it with a K-map.',
          steps: [
            'Rows 00 and 01 are m0 and m1. Put a 1 in those two cells: both are in the top row (I1 = 0).',
            'm0 and m1 are adjacent. Circle them together.',
            'Inside the circle I0 changes (0 → 1), so I0 drops out. I1 stays 0, so it appears complemented: <b>I1′</b>.',
            'Check with algebra: I1′I0′ + I1′I0 = I1′(I0′ + I0) = I1′ · 1 = I1′.',
          ],
          answer: `Y = ${pr(FN.y2.sop)}` },
        { type: 'diagram', diagram: km(FN.y2, ["I1'"]), caption: 'Y: the two 1s of the top row form one group, I1′.' },
        { type: 'example', title: 'Example 2 (Class 8 Video 2): start from an expression',
          problem: `f2(A, B) = AB + A′B + A′B′. Simplify it.`,
          steps: [
            'Each product is a minterm: AB = m3 (11), A′B = m1 (01), A′B′ = m0 (00). Put 1s in those three cells (B labels the columns, A the rows).',
            'Circle m1 and m3, the right column. A changes and B stays 1, so the term is <b>B</b>.',
            'Circle m0 and m1, the top row. B changes and A stays 0, so the term is <b>A′</b>.',
            'm1 is inside both circles. That is allowed, because each 1 must be covered <i>at least</i> once. Two big circles beat a big one plus a lone m0.',
            'OR the product terms together.',
          ],
          answer: `f2 = ${pr(FN.f2.sop)}` },
        { type: 'diagram', diagram: km(FN.f2, ["A'", 'B']), caption: 'f2: two overlapping pairs, A′ (top row) and B (right column).' },
        { type: 'check', question: { type: 'numeric', difficulty: 1, prompt: 'In a 2-variable K-map of F(A, B), which minterm number is in the cell where row A = 1 meets column B = 0?', answer: 2,
          steps: ['Read the cell as AB = 10.', '10<sub>2</sub> = 2, so the cell holds m2.'],
          explanation: 'Each cell is the minterm whose bits are (row value, column value). Row 1, column 0 gives AB = 10, which is m2.', src: course('c8v1 00:06:22') } },
        { type: 'check', question: Object.assign(bq(FN.a2), { difficulty: 1, prompt: `Simplify F(A, B) = ${sig(FN.a2.ms)} with a K-map. Give a minimal SOP.`,
          steps: ['m2 (10) and m3 (11) are the bottom row, A = 1.', 'B changes inside the pair and drops out. A stays 1.', 'F = A.'],
          solutionDiagram: km(FN.a2, ['A']),
          explanation: 'The two 1s share A = 1 and differ only in B, so one pair covers both and gives the single literal A.', src: course('c8v2 00:05:30') }) },
      ] },

    /* ---------- 3. Grouping rules ---------- */
    { id: 't4-l3', subtopic: 't4-grouping', title: 'The three grouping rules and how to read a group', minutes: 9,
      src: course('c8v2 00:09:54', 'c8v2 00:10:55', 'c8v2 00:11:13', 'c8v2 00:13:06', 'c8v3 00:00:26', 'c8v3 00:01:42', 'c8v3 00:02:49', 'c9v1 00:06:39', 'c9v1 00:07:27', 'c9v1 00:08:58', 'c9v1 00:10:28', 'c9v1 00:12:08'),
      blocks: [
        { type: 'text', html: `<p>The lecture gives three rules for circling (“grouping”) the 1s:</p>
<ol><li><b>Cover every 1 at least once.</b> Each circle becomes one product term, and the product terms are ORed together. A 1 may sit inside several circles.</li>
<li><b>Use the largest possible circles, and as few of them as possible.</b> This is what makes the expression minimal.</li>
<li><b>Every circle holds a power of two cells:</b> 1, 2, 4, 8 or 16. Never 3, 5, 6, ….</li></ol>
<p>A circle may only join <b>adjacent</b> cells, which differ in exactly one variable. In standard terms (supplemental phrasing), a legal group is a rectangle of 2<sup>k</sup> cells, counting the wrap-around edges you will meet in 3- and 4-variable maps.</p>` },
        { type: 'text', html: `<p><b>Reading a circle:</b> look at every variable. A variable that keeps the <b>same</b> value in all cells of the circle stays in the term, primed if that value is 0 and plain if it is 1. A variable that <b>changes</b> inside the circle drops out.</p>` },
        { type: 'callout', tone: 'warn', html: `<b>Two misconceptions from Class 8 Video 3</b>, both on f2 = Σm(0, 1, 3):<br>• Circling m0 alone while m0 could join m1 in a pair breaks rule 2. The result is correct but not minimal.<br>• Putting all three 1s in one circle is wrong twice. Three is not a power of two, and m0 (00) and m3 (11) are diagonal: they differ in two variables, so they are not adjacent.` },
        { type: 'diagram', diagram: km(FN.f2, ["A'", 'B']), caption: 'The correct grouping of f2 = Σm(0, 1, 3): two overlapping pairs.' },
        { type: 'text', html: `<p><b>Bigger circle, fewer literals.</b> Each doubling of a circle removes one variable. In a 4-variable map (Class 9 Video 1):</p>
${table(['Cells in the circle', '1', '2', '4', '8', '16'], [['Literals in the term', '4', '3', '2', '1', '0 (F = 1)']])}
<p>In general, a circle of 2<sup>k</sup> cells in an n-variable map gives a term with n − k literals.</p>` },
        { type: 'example', title: 'Reading circles of different sizes (Class 9 Video 1)',
          problem: `The instructor’s two examples — a four-cell circle and a two-cell circle — placed in one map: F(A, B, C, D) = ${sig(FN.sizes.ms)}. Read each circle and give F.`,
          steps: [
            'Four cells m0, m1, m4, m5 (top-left square): A = 0 and C = 0 in all four, while B and D change → <b>A′C′</b> (2 literals).',
            'Two cells m6 and m14: B = 1, C = 1, D = 0 in both, while A changes → <b>BCD′</b> (3 literals).',
            'm14’s other neighbours (m10, m12, m15) are 0, so the pair m6–m14 is the largest circle that covers m14.',
            `F = ${pr(FN.sizes.sop)}.`,
          ],
          answer: `F = ${pr(FN.sizes.sop)}` },
        { type: 'diagram', diagram: km(FN.sizes, ["A'C'", "BCD'"]), caption: 'A four-cell circle (two literals) and a two-cell circle (three literals).' },
        { type: 'check', question: { type: 'mc', difficulty: 1, prompt: 'Which number of cells can <b>never</b> form one K-map group?',
          choices: ['6', '1', '2', '8'], answer: 0,
          explanation: 'Group sizes must be powers of two (1, 2, 4, 8, 16). Six is not a power of two. Cover those six 1s with overlapping groups of 4 and 2 instead.', src: course('c8v3 00:02:49') } },
        { type: 'check', question: { type: 'tf', difficulty: 1, prompt: 'A 1 that is already inside one circle may also be included in another circle.', answer: true,
          explanation: 'Rule 1 says every 1 must be covered <i>at least</i> once, so overlapping is allowed. Overlap is often what lets both circles be as large as possible, as with m1 in f2 = A′ + B.', src: course('c8v2 00:13:06') } },
      ] },

    /* ---------- 4. 3-variable K-maps ---------- */
    { id: 't4-l4', subtopic: 't4-kmap3', title: '3-variable K-maps and wrap-around', minutes: 10,
      src: course('c8v4 00:00:47', 'c8v4 00:01:24', 'c8v4 00:01:54', 'c8v4 00:03:33', 'c8v4 00:04:28', 'c8v4 00:06:29', 'c8v4 00:08:13', 'c8v4 00:09:41', 'c8v4 00:11:20', 'c8v4 00:13:20', 'gray 00:08:21'),
      blocks: [
        { type: 'text', html: `<p>For F(x, y, z), x is the most significant bit and z the least. Put <b>one</b> variable (x) down the side and <b>two</b> (y z) across the top. That gives 2 rows × 4 columns = 8 cells.</p>
<p><b>The little trick:</b> the columns are ordered <b>00, 01, 11, 10</b>, not 00, 01, 10, 11. Neighbouring cells may differ in only one variable. Going from 01 to 10 would change both y and z, so 11 comes first. This is the <b>Gray-code</b> order from Topic 2, where consecutive values differ in one bit.</p>` },
        { type: 'diagram', diagram: layout(X3), caption: 'Minterm numbers in a 3-variable map: top row 0 1 3 2, bottom row 4 5 7 6.' },
        { type: 'text', html: `<p>Because of that order, m2 sits in the <b>last</b> column (after m3), and so does m6 (after m7). The regions:</p>
${table(['Region', 'Cells'], [['x′ (x = 0)', 'top row: m0 m1 m3 m2'], ['x (x = 1)', 'bottom row: m4 m5 m7 m6'], ["y′", 'left two columns'], ['y', 'right two columns'], ['z', 'middle two columns'], ["z′", 'first <b>and</b> last columns']])}
<p><b>Fold the paper.</b> Roll the map into a tube so that its left edge meets its right edge. The first and last columns are then neighbours: they differ only in y. So m0–m2 and m4–m6 are adjacent pairs, even though they look far apart.</p>` },
        { type: 'example', title: 'Example 1 (Class 8 Video 4): F = Σm(2, 3, 4, 5)',
          problem: `Simplify f1(x, y, z) = ${sig(FN.f1x.ms)}.`,
          steps: [
            'Place the 1s: m2 (010) and m3 (011) are the top-right corner, m4 (100) and m5 (101) the bottom-left corner.',
            'Top-right pair: x = 0 and y = 1 in both, z changes → <b>x′y</b>.',
            'Bottom-left pair: x = 1 and y = 0 in both, z changes → <b>xy′</b>.',
            'Neither pair can grow into a group of four: the cells next to them are 0.',
          ],
          answer: `f1 = ${pr(FN.f1x.sop)}` },
        { type: 'callout', tone: 'warn', html: 'The captions of this example read “x′y or x′y′”. The instructor’s own reading of the bottom circle (x = 1, y = 0) gives <b>xy′</b>, and only xy′ covers m4 and m5.' },
        { type: 'diagram', diagram: km(FN.f1x, ["x'y", "xy'"]), caption: 'f1 = x′y + xy′.' },
        { type: 'example', title: 'Example 2 (Class 8 Video 4): a group across the edge',
          problem: `Simplify f2(x, y, z) = ${sig(FN.f2x.ms)}.`,
          steps: [
            'Place the 1s: m3 (top row, column 11), and m4, m7, m6 in the bottom row.',
            'm3 and m7 share y = 1 and z = 1, while x changes → <b>yz</b>.',
            'm4 (first column) and m6 (last column) look far apart, but the folded-paper edges are adjacent. Circling each one alone would not be minimal.',
            'Group m4 with m6: x = 1 and z = 0 in both, y changes → <b>xz′</b>.',
            'Every 1 is now covered. OR the terms.',
          ],
          answer: `f2 = ${pr(FN.f2x.sop)}` },
        { type: 'diagram', diagram: km(FN.f2x, ['yz', "xz'"]), caption: 'f2 = yz + xz′: the xz′ group wraps around from the first column to the last.' },
        { type: 'check', question: { type: 'numeric', difficulty: 1, prompt: 'In a 3-variable K-map of F(x, y, z), which minterm is in row x = 0, last column (yz = 10)?', answer: 2,
          steps: ['The cell is xyz = 010.', '010<sub>2</sub> = 2.'],
          explanation: 'The last column is yz = 10, because the columns run 00, 01, 11, 10. With x = 0 the cell is 010 = m2. That is why m2 appears after m3 in the top row.', src: course('c8v4 00:03:33') } },
        { type: 'check', question: Object.assign(bq(FN.zbar), { difficulty: 2, prompt: `Simplify F(x, y, z) = ${sig(FN.zbar.ms)}.`,
          steps: ['The 1s are m0, m2 (top row, first and last columns) and m4, m6 (bottom row, first and last columns).', 'The first and last columns are adjacent (wrap-around), so all four form one group of 4.', 'x and y change inside the group. z = 0 throughout → z′.'],
          solutionDiagram: km(FN.zbar, ["z'"]),
          explanation: 'The two outer columns together are exactly the z = 0 region. A group of 4 in a 3-variable map leaves 3 − 2 = 1 literal.', src: course('c8v4 00:06:06', 'c8v4 00:06:29') }) },
      ] },

    /* ---------- 5. 4-variable K-maps ---------- */
    { id: 't4-l5', subtopic: 't4-kmap4', title: '4-variable K-maps: layout, regions and corners', minutes: 10,
      src: course('c9v1 00:00:34', 'c9v1 00:01:22', 'c9v1 00:01:46', 'c9v1 00:02:23', 'c9v1 00:03:15', 'c9v1 00:04:31', 'c9v1 00:05:38', 'c9v2 00:09:56', 'c9v2 00:11:52', 'c18v3 00:01:46'),
      blocks: [
        { type: 'text', html: `<p>With four variables A, B, C, D, put <b>two variables on each side</b>: AB down the side and CD across the top. That gives a 4 × 4 map with 16 cells. Both the rows and the columns use the order <b>00, 01, 11, 10</b>.</p>` },
        { type: 'diagram', diagram: layout(A4), caption: 'Minterm numbers in a 4-variable map. Rows AB = 00, 01, 11, 10; columns CD = 00, 01, 11, 10.' },
        { type: 'text', html: `<p><b>Filling it in</b> needs the same “hops” as before. Along the top row: m0, m1, then fly over to the last column for m2, and back for m3. The second row is m4 m5 m7 m6. The third row is AB = 11 (m12 m13 m15 m14) and the bottom row is AB = 10 (m8 m9 m11 m10).</p>
<p>To check any cell, read A B C D as a binary number. Row 10, column 00 is 1000<sub>2</sub> = 2<sup>3</sup> = 8.</p>
${table(['Region', 'Where it is'], [["A′", 'top two rows'], ['A', 'bottom two rows'], ['B', 'middle two rows'], ["B′", 'top row + bottom row'], ["C′", 'left two columns'], ['C', 'right two columns'], ['D', 'middle two columns'], ["D′", 'first column + last column']])}` },
        { type: 'text', html: `<p><b>Two wrap-arounds.</b> As in the 3-variable map, the left and right edges are adjacent. A 4-variable map can also be folded the other way, so the <b>top and bottom edges are adjacent</b> too. For example, m0 (0000) and m8 (1000) differ only in A. As a result, the <b>four corners</b> m0, m2, m8, m10 form one group of four: B = 0 and D = 0 in all of them, giving B′D′.</p>` },
        { type: 'example', title: 'The four corners',
          problem: `Simplify F(A, B, C, D) = ${sig(FN.corners.ms)}.`,
          steps: [
            'The 1s are the four corner cells: m0 (0000), m2 (0010), m8 (1000), m10 (1010).',
            'Left–right wrap joins m0–m2 and m8–m10. Top–bottom wrap joins m0–m8 and m2–m10. Together they make one group of 4.',
            'A and C change inside the group. B = 0 and D = 0 throughout.',
            'A group of 4 in a 4-variable map has 2 literals: B′D′.',
          ],
          answer: `F = ${pr(FN.corners.sop)}` },
        { type: 'diagram', diagram: km(FN.corners, ["B'D'"]), caption: 'The four corners are one group: B′D′.' },
        { type: 'callout', tone: 'note', html: 'Five-variable K-maps exist, but the course does not cover them (Topic 5, Class 18 Video 3). For the five-input 1-bit comparator, the instructor derives the equations directly instead of drawing a 32-cell map.' },
        { type: 'check', question: { type: 'numeric', difficulty: 1, prompt: 'In a 4-variable K-map (AB rows, CD columns), which minterm sits in row AB = 11, column CD = 01?', answer: 13,
          steps: ['ABCD = 1101.', '8 + 4 + 0 + 1 = 13.'],
          explanation: 'Read the row bits then the column bits: 11 followed by 01 is 1101<sub>2</sub> = 13. Row 11 is the third row, holding m12 m13 m15 m14.', src: course('c9v1 00:02:51') } },
        { type: 'check', question: { type: 'tf', difficulty: 2, prompt: 'In a 4-variable K-map, m8 is adjacent to m0.', answer: true,
          explanation: 'm0 = 0000 and m8 = 1000 differ only in A. m0 is in the top row and m8 in the bottom row, and the top and bottom edges are adjacent (the map folds both ways).', src: course('c9v2 00:09:56') } },
      ] },

    /* ---------- 6. Worked examples ---------- */
    { id: 't4-l6', subtopic: 't4-examples', title: 'Worked 4-variable examples (Class 9 Video 2)', minutes: 11,
      src: course('c9v2 00:00:07', 'c9v2 00:01:30', 'c9v2 00:02:16', 'c9v2 00:03:27', 'c9v2 00:04:50', 'c9v2 00:05:52', 'c9v2 00:06:47', 'c9v2 00:08:15', 'c9v2 00:10:11', 'c9v2 00:11:52', 'c9v2 00:12:49'),
      blocks: [
        { type: 'text', html: `<p>A routine that matches how the instructor works:</p>
<ol><li>Draw the map carefully. It helps to write each minterm number in the corner of its cell <i>before</i> placing the 1s.</li>
<li>Look for the <b>largest</b> power-of-two group first.</li>
<li>Look for 1s that can be grouped <b>only one way</b>, because that group has to be in the answer.</li>
<li>For every 1 that is still uncovered, try the wrap-arounds (left–right, top–bottom, corners) to grow its circle.</li>
<li>Check that every 1 is covered, read each circle, and OR the terms.</li></ol>` },
        { type: 'example', title: `Example 1: F = ${sig(FN.ex1.ms)}`,
          problem: 'Minimise F(A, B, C, D).',
          steps: [
            'Place eleven 1s. The only 0s are m3, m7, m10, m11 and m15.',
            'The left two columns (CD = 00 and 01) are all 1s: eight cells. A, B and D change and C = 0 → <b>C′</b>.',
            'Still uncovered: m2, m6 (column CD = 10, top two rows) and m14 (column 10, row 11).',
            'm14: pair it with m6, and use the left–right wrap to add m4 and m12. In those four cells B = 1 and D = 0 → <b>BD′</b>.',
            'm2: the top-right 1 could pair with m6, but the larger choice uses the wrap with m0 and m4. In m0, m2, m4, m6, A = 0 and D = 0 → <b>A′D′</b>.',
            'All eleven 1s are covered.',
          ],
          answer: `F = ${pr(FN.ex1.sop)}` },
        { type: 'diagram', diagram: km(FN.ex1, ["C'", "BD'", "A'D'"]), caption: 'Example 1: an 8-cell group (C′) and two 4-cell groups that wrap around (BD′ and A′D′).' },
        { type: 'callout', tone: 'warn', html: 'The captions read the final answer as “A′D′ or B′D′ or C′”. The instructor’s own reading of the green circle was “B equal to 1 and D equal to 0”, which is <b>BD′</b>. B′D′ would claim m10, which is 0.' },
        { type: 'example', title: `Example 2: F = ${sig(FN.ex2.ms)}`,
          problem: 'Minimise F(A, B, C, D). This example also uses the top–bottom wrap.',
          steps: [
            'Place the 1s: m0 m1 m2 in the top row, m6 in the second row, m8 m9 m10 in the bottom row.',
            'm6 (0110) has only one neighbour that is 1, namely m2. The pair is the only way to cover m6: A = 0, C = 1, D = 0 → <b>A′CD′</b>.',
            'Top and bottom edges are adjacent, so m0, m1 (top row) and m8, m9 (bottom row) form a group of 4. In it B = 0 and C = 0 → <b>B′C′</b>.',
            'm10 is still uncovered. Instead of a small pair, take all <b>four corners</b> m0, m2, m8, m10: B = 0 and D = 0 → <b>B′D′</b>.',
            'All seven 1s are covered.',
          ],
          answer: `F = ${pr(FN.ex2.sop)}` },
        { type: 'diagram', diagram: km(FN.ex2, ["B'C'", "B'D'", "A'CD'"]), caption: 'Example 2: a top–bottom wrap (B′C′), the four corners (B′D′) and the pair for m6 (A′CD′).' },
        { type: 'callout', tone: 'note', html: 'The instructor first wrote B′C′ for the corners and then corrected it on screen: “This is not C′, it’s D′.” The captions also say “D is equal to zero” twice when listing what the corners share. The corners share <b>B = 0 and D = 0</b>.' },
        { type: 'check', question: Object.assign(bq(FN.bdbd), { difficulty: 2, prompt: `Minimise F(A, B, C, D) = ${sig(FN.bdbd.ms)} as a sum of products.`,
          steps: ['The 1s m5, m7, m13, m15 are the middle 2 × 2 square: B = 1, D = 1 → BD.', 'The 1s m0, m2, m8, m10 are the four corners: B = 0, D = 0 → B′D′.', 'F = B′D′ + BD (4 literals).'],
          solutionDiagram: km(FN.bdbd, ['BD', "B'D'"]),
          explanation: 'Two groups of four: the centre square and the four corners. No group of 8 exists, because each half of the map contains 0s.', src: course('c9v2 00:11:52') }) },
      ] },

    /* ---------- 7. Don't cares ---------- */
    { id: 't4-l7', subtopic: 't4-dontcares', title: 'Don’t-care conditions', minutes: 11,
      src: course('c9v3 00:00:05', 'c9v3 00:00:23', 'c9v3 00:01:15', 'c9v3 00:02:02', 'c9v3 00:02:34', 'c9v3 00:03:24', 'c9v3 00:04:23', 'c9v3 00:05:37', 'c9v3 00:07:00', 'c9v3 00:08:03', 'c9v3 00:09:12', 'c9v3 00:10:25', 'c9v3 00:11:26', 'c9v3 00:14:28', 'c9v3 00:15:24'),
      blocks: [
        { type: 'text', html: `<p>Sometimes a function is <b>incompletely specified</b>: some input combinations can never occur. For those inputs we do not care what the output is, so we write <b>X</b> (a <b>don’t-care</b>). This is not carelessness. It is extra freedom that can make the design smaller.</p>` },
        { type: 'example', title: 'The three-position knob (Class 9 Video 3)',
          problem: 'A knob has three positions: off, low and high. Two bits x y encode it as off = 00, low = 01, high = 10. Output F3 = 1 whenever the knob is on.',
          steps: [
            'Code 11 is never used, so the input xy = 11 can never appear.',
            'Truth table: 00 → 0, 01 → 1, 10 → 1, 11 → X.',
            'Labs and exams specify a function like this as three sets: F3 = 0 for {00}, F3 = 1 for {01, 10}, F3 = X for {11}.',
            'If you take X = 0, the two 1s (m1, m2) are diagonal and cannot be grouped: F3 = xy′ + x′y (4 literals).',
            'If you take X = 1, the bottom row (m2, m3) gives x and the right column (m1, m3) gives y: <b>F3 = x + y</b> (2 literals).',
          ],
          answer: `F3 = ${pr(FN.knob.sop)}` },
        { type: 'diagram', diagram: ttOf(FN.knob, 'F3'), caption: 'The knob’s truth table: row 3 (xy = 11) is a don’t-care.' },
        { type: 'diagram', diagram: km(FN.knob, ['x', 'y']), caption: 'Treating the X at m3 as 1 lets both pairs form: F3 = x + y.' },
        { type: 'text', html: `<p><b>The rule for X’s:</b> an X can be treated as 0 or as 1, whichever helps. <b>Cover an X only if it helps you make a larger circle around your 1s.</b> You do not have to circle every X. A circle made only of X’s would add a term without covering any 1, so never draw one.</p>` },
        { type: 'example', title: 'Rolling a die (Class 9 Video 3)',
          problem: 'A 3-bit value abc (a = MSB) is the number shown on a die. Output f4 = 1 when the number is 4 or more. Minimise f4.',
          steps: [
            'Numbers 4, 5, 6 → f4 = 1 (m4, m5, m6). Numbers 1, 2, 3 → f4 = 0.',
            'A die never shows 0 or 7, so m0 and m7 are don’t-cares.',
            'In the map, m4, m5, m6 and the X at m7 fill the bottom row (a = 1). Treat that X as 1 and circle the whole row: <b>f4 = a</b>.',
            'Without the X, you would need two product terms (e.g. ab′ + ac′), which is more complex.',
            'The X at m0 does not help any circle of 1s grow, so leave it out (it is treated as 0).',
          ],
          answer: `f4 = ${pr(FN.die.sop)}` },
        { type: 'diagram', diagram: km(FN.die, ['a']), caption: 'f4: the bottom row uses the X at m7. The X at m0 is left out.' },
        { type: 'callout', tone: 'note', html: `Textbooks write the same specification compactly as f4 = Σm(4, 5, 6) + d(0, 7), where d lists the don’t-cares. This notation is supplemental. The lecture writes the three sets (where F is 0, 1 and X).` },
        { type: 'callout', tone: 'exam', html: 'The lecture says this is practised in <b>Lab 3</b>: the Lab 3 video mentions a <span class="mono">kmap</span> module and an <span class="mono">x_kmap</span> module. The Lab 3 handout with the exact functions is not mirrored here. Topic 5 uses don’t-cares again in the priority-encoder K-maps.' },
        { type: 'check', question: Object.assign(bq(FN.dc3), { difficulty: 2, prompt: `Minimise F(A, B, C) = ${dsig(FN.dc3)}, where d(…) are don’t-cares.`,
          steps: ['The 1s m1, m3, m5 and the X at m7 are the middle two columns (C = 1).', 'Treat the X as 1: all four cells form one group of 4.', 'A and B change; C = 1 throughout → F = C.'],
          solutionDiagram: km(FN.dc3, ['C']),
          explanation: 'Using the X at m7 turns three 1s (which cannot form one group) into a group of four, so F = C. Without the X the best is A′C + B′C.', src: course('c9v3 00:14:28') }) },
        { type: 'check', question: { type: 'tf', difficulty: 1, prompt: 'Every X in a K-map has to be inside some circle.', answer: false,
          explanation: 'You circle an X only when it helps make a larger circle of 1s. In the die example the X at m0 is left out.', src: course('c9v3 00:08:03', 'c9v3 00:15:24') } },
      ] },

    /* ---------- 8. Exam drill: BCD to 7-segment ---------- */
    { id: 't4-l8', subtopic: 't4-dontcares', title: 'Exam drill: BCD to 7-segment, segment a', minutes: 8,
      src: guide('“BCD-to-7-segment decoder, K-map for segment a — mark 10–15 as don’t-cares, minimise the SOP.” The segment pattern is standard (supplemental).'),
      blocks: [
        { type: 'text', html: `<p>The Final Exam study page lists this drill. A BCD digit ABCD (A = MSB) only takes the values 0–9, so inputs 10–15 <b>never occur</b> and their outputs are don’t-cares.</p>
<p>Segment <b>a</b> is the top bar of the display. With the usual digit shapes, it is lit for 0, 2, 3, 5, 6, 7, 8, 9 and dark for 1 and 4. <small class="muted">(Supplemental assumption: 6 is drawn with its top bar. Some displays draw 6 without it, which changes the function.)</small></p>` },
        { type: 'diagram', diagram: ttOf(FN.sega, 'a'), caption: 'Segment a for BCD inputs. Rows 10–15 are don’t-cares (x).' },
        { type: 'example', title: 'Minimise segment a',
          problem: `a = ${dsig(FN.sega)}`,
          steps: [
            'Place 1s at m0, m2, m3, m5, m6, m7, m8, m9 and X’s at m10–m15.',
            'Bottom two rows (A = 1): m8, m9 plus the X’s m10–m15 give a group of 8 → <b>A</b>.',
            'Right two columns (C = 1): m2, m3, m6, m7 plus the X’s m10, m11, m14, m15 give a group of 8 → <b>C</b>.',
            'm5: group it with m7 and the X’s m13, m15, the middle square where B = 1, D = 1 → <b>BD</b>.',
            'm0: the four corners m0, m2, m8 and X m10 share B = 0, D = 0 → <b>B′D′</b>.',
            'Every 1 is now covered. All six X’s happen to sit inside the A group; each was used only because it made a group larger.',
            'Without the X’s, the best is four terms with 11 literals, e.g. A′C + A′BD + AB′C′ + B′C′D′.',
          ],
          answer: `a = ${pr(FN.sega.sop)}` },
        { type: 'diagram', diagram: km(FN.sega, ['A', 'C', 'BD', "B'D'"]), caption: 'Segment a: two groups of 8 and two groups of 4, all using don’t-cares.' },
        { type: 'check', question: { type: 'numeric', difficulty: 2, prompt: `How many literals are in the minimal SOP for segment a when the don’t-cares are used? (a = ${dsig(FN.sega)})`, answer: L.literalCount(FN.sega.sop),
          steps: [`Minimal SOP: a = ${pr(FN.sega.sop)}.`, 'Count the literals: A (1) + C (1) + BD (2) + B′D′ (2) = 6.'],
          explanation: 'The two 8-cell groups give one literal each, and the two 4-cell groups give two literals each. Treating the X’s as 0 instead would need 11 literals.', src: guide('BCD-to-7-segment drill, segment a.') } },
      ] },

    /* ---------- 9. Prime and essential prime implicants ---------- */
    { id: 't4-l9', subtopic: 't4-implicants', title: 'Prime implicants and essential prime implicants', minutes: 10,
      src: suppGuide('Prime vs essential prime implicants'),
      blocks: [
        { type: 'text', html: `<p>These words name what you have been doing with circles. <small class="muted">(Supplemental: the terms are not used in the mirrored lectures, but the Final Exam page lists them.)</small></p>
<ul><li><b>Implicant:</b> a product term that is 1 only where F is 1 (or X). In K-map terms, any legal circle.</li>
<li><b>Prime implicant (PI):</b> a circle that cannot be made any larger. It is not contained in a bigger legal circle.</li>
<li><b>Essential prime implicant (EPI):</b> a PI that is the <i>only</i> PI covering some 1. Every minimal SOP must contain it.</li></ul>` },
        { type: 'text', html: `<p><b>Procedure:</b></p><ol><li>Find all prime implicants: grow every circle until it cannot grow.</li><li>For each 1, count the PIs covering it. A 1 with exactly one PI makes that PI essential.</li><li>Take every EPI.</li><li>Cover any 1s that are left with as few, and as large, PIs as possible.</li></ol>
<p>The instructor uses this idea in Class 9 Video 2. Of m6 she says you “can’t make anything bigger” and “can’t get any alternative way to group” it, so its circle A′CD′ is an essential prime implicant.</p>` },
        { type: 'example', title: 'PIs of the Class 8 function f2 = Σm(3, 4, 6, 7)',
          problem: `List the prime implicants and essential prime implicants of f(x, y, z) = ${sig(FN.f2x.ms)}.`,
          steps: [
            'Largest circles: m3–m7 → yz; m4–m6 (wrap) → xz′; m6–m7 → xy. None can grow to four cells, so all three are PIs.',
            'm3 is covered only by yz, so yz is essential. m4 is covered only by xz′, so xz′ is essential.',
            'm6 and m7 are each covered by two PIs, so they do not make xy essential. xy is a PI but <b>not</b> essential.',
            'The EPIs yz and xz′ already cover m3, m4, m6 and m7, so xy is not needed.',
          ],
          answer: `PIs: yz, xz′, xy. EPIs: yz, xz′. Minimal f = ${pr(FN.f2x.sop)}` },
        { type: 'diagram', diagram: km(FN.f2x, ['yz', "xz'", 'xy']), caption: 'All three prime implicants. xy is not essential.' },
        { type: 'example', title: 'When EPIs are not enough',
          problem: `Minimise F(A, B, C, D) = ${sig(FN.pi1.ms)}.`,
          steps: [
            'Prime implicants: B′C′ (0, 1, 8, 9), B′D′ (0, 2, 8, 10), CD′ (2, 6, 10, 14), A′BD (5, 7), A′BC (6, 7), A′C′D (1, 5).',
            'm9 is covered only by B′C′, so B′C′ is essential. m14 is covered only by CD′, so CD′ is essential.',
            'After the EPIs, m5 and m7 are still uncovered.',
            'A′BD covers both in one term. A′C′D + A′BC would need two terms, so choose A′BD. B′D′ is a PI that is never needed.',
          ],
          answer: `F = ${pr(FN.pi1.sop)}` },
        { type: 'diagram', diagram: km(FN.pi1, ["B'C'", "CD'", "A'BD"]), caption: 'Two EPIs (B′C′, CD′) plus the one PI that finishes the cover (A′BD).' },
        { type: 'callout', tone: 'warn', html: `<b>The largest circle is not always needed.</b> In F = ${sig(FN.trap.ms)}, the quad BD (m5, m7, m13, m15) is the biggest prime implicant. But the four EPIs A′C′D, A′BC, ABC′ and ACD already cover all eight 1s, including the whole quad. Adding BD would only add literals. Take the essentials first.` },
        { type: 'diagram', diagram: km(FN.trap, ["A'C'D", "A'BC", "ABC'", 'ACD']), caption: `F = ${pr(FN.trap.sop)}: the four essential pairs cover the middle quad BD, so BD is not needed.` },
        { type: 'check', question: { type: 'numeric', difficulty: 2, prompt: `How many prime implicants does f(x, y, z) = ${sig(FN.f2x.ms)} have?`, answer: 3,
          steps: ['List the maximal circles: yz (m3, m7), xz′ (m4, m6 by wrap-around), xy (m6, m7).', 'No group of four exists, because each candidate quad contains a 0.', 'That gives 3 prime implicants.'],
          explanation: 'yz, xz′ and xy each cannot grow, so they are all prime. Only yz and xz′ are essential.', src: supp('Prime implicant counting') } },
      ] },

    /* ---------- 10. POS ---------- */
    { id: 't4-l10', subtopic: 't4-pos', title: 'Product of sums: group the 0s', minutes: 9,
      src: suppGuide('POS form by grouping the 0s'),
      blocks: [
        { type: 'text', html: `<p>The lectures minimise in <b>sum-of-products</b> form. Maxterms were explicitly left out: “something that is called a max term, but right now we are not going to cover that” (Topic 3, Class 7 Video 2). The Final Exam page still lists POS, so here is the standard method <small class="muted">(supplemental)</small>.</p>
<ol><li><b>Group the 0s</b> instead of the 1s, using the same rules: powers of two, adjacent cells, as large and as few as possible. X’s may be used as 0s.</li>
<li>Each group of 0s is a product term of <b>F′</b>, read the usual way.</li>
<li>Complement with De Morgan: F = (F′)′ turns every product into a sum and complements every literal.</li></ol>
<p><b>Shortcut:</b> read a group of 0s directly as a <b>sum term</b>, writing a variable that is 0 throughout as <b>plain</b> and one that is 1 throughout as <b>primed</b>. This is the opposite of SOP.</p>` },
        { type: 'example', title: 'POS of the Class 8 function f2 = Σm(3, 4, 6, 7)',
          problem: `Write f(x, y, z) = ${sig(FN.f2x.ms)} as a minimal product of sums.`,
          steps: [
            'The 0s are m0, m1, m2, m5.',
            'Group m0 with m2 (wrap-around): x = 0, z = 0 → F′ term x′z′, i.e. sum term (x + z).',
            'Group m1 with m5: y = 0, z = 1 → F′ term y′z, i.e. sum term (y + z′).',
            'F′ = x′z′ + y′z, so F = (x′z′ + y′z)′ = (x + z)(y + z′).',
            'Check: (x + z)(y + z′) = xy + xz′ + yz + zz′ = yz + xz′ + xy, and xy is the redundant consensus term, so this equals yz + xz′.',
          ],
          answer: `f = ${pr(FN.f2x.pos)}` },
        { type: 'diagram', diagram: kmComp(FN.f2x, ["x'z'", "y'z"]), caption: 'Map of F′: its 1s are the 0s of f. The groups x′z′ and y′z become the sum terms (x + z) and (y + z′).' },
        { type: 'example', title: 'POS of Class 9 Example 1',
          problem: `F(A, B, C, D) = ${sig(FN.ex1.ms)}. Find a minimal POS.`,
          steps: [
            'The 0s are m3, m7, m10, m11, m15.',
            'm3, m7, m15, m11 fill the CD = 11 column: C = 1, D = 1 → sum term (C′ + D′).',
            'm10 pairs with m11: A = 1, B = 0, C = 1 → sum term (A′ + B + C′).',
            'F = (C′ + D′)(A′ + B + C′), 5 literals, the same cost as the SOP C′ + A′D′ + BD′.',
          ],
          answer: `F = ${pr(FN.ex1.pos)}` },
        { type: 'diagram', diagram: kmComp(FN.ex1, ['CD', "AB'C"]), caption: 'Map of F′ for Example 1: the 0s of F, grouped as CD and AB′C.' },
        { type: 'check', question: Object.assign(bq(FN.prime3, 'pos'), { difficulty: 2, prompt: `P(A, B, C) = ${sig(FN.prime3.ms)} (the 3-bit prime detector). Give a minimal product of sums.`,
          steps: ['The 0s are m0, m1, m4, m6.', 'm0, m1: A = 0, B = 0 → (A + B).', 'm4, m6 (wrap): A = 1, C = 0 → (A′ + C).', 'P = (A + B)(A′ + C).'],
          solutionDiagram: kmComp(FN.prime3, ["A'B'", "AC'"]),
          explanation: 'Group the 0s, then write each group as a sum term with the opposite literals. Expanding (A + B)(A′ + C) gives A′B + AC + BC = A′B + AC, which matches the SOP.', src: supp('POS by grouping 0s') }) },
      ] },

    /* ---------- 11. Static hazards ---------- */
    { id: 't4-l11', subtopic: 't4-hazards', title: 'Static hazards and how a K-map shows them', minutes: 9,
      src: suppGuide('Static-1 hazards and the redundant cover term'),
      blocks: [
        { type: 'text', html: `<p>Real gates have delay. When one input changes, different paths through the circuit settle at different times, so the output can briefly show a wrong value, a <b>glitch</b>. <small class="muted">(Supplemental: hazards are not in the mirrored lectures. The Final Exam page lists them.)</small></p>
<ul><li><b>Static-1 hazard:</b> the output should stay 1, but drops to 0 for a moment.</li>
<li><b>Static-0 hazard:</b> the output should stay 0, but jumps to 1 for a moment (the POS counterpart).</li></ul>` },
        { type: 'example', title: 'The glitch in F = yz + xz′',
          problem: 'Take the Class 8 function F = yz + xz′. Hold x = 1 and y = 1, and let z fall from 1 to 0. What can happen?',
          steps: [
            'Before the change (xyz = 111, m7): yz = 1, so F = 1. After the change (110, m6): xz′ = 1, so F = 1. The output should stay 1.',
            'The yz AND gate turns off as soon as z falls.',
            'The xz′ AND gate can only turn on after the inverter has produced z′, which takes a little longer.',
            'For that short moment both AND gates output 0, so F glitches to 0. That is a static-1 hazard.',
          ],
          answer: 'A brief 0 on F while z falls with x = y = 1.' },
        { type: 'diagram', diagram: CIRC_HAZ, caption: 'F = yz + xz′. The z′ path goes through an extra inverter.' },
        { type: 'diagram', diagram: TIMING_HAZ, caption: 'z falls, but z′ only rises two time steps later. For those two steps both AND outputs are 0, so F drops to 0: a static-1 glitch.' },
        { type: 'text', html: `<p><b>On the K-map:</b> m7 and m6 are <b>adjacent 1s</b> in different groups (yz and xz′), and no group covers both. Every such pair marks a possible static-1 hazard for the single-input change between them.</p>
<p><b>The fix:</b> add the redundant group that covers the pair, here xy (m6, m7). F = yz + xz′ + xy has the same truth table (xy is the consensus term), and during the z change xy stays 1, so F stays 1. The circuit is no longer minimal, but it is <b>hazard-free</b>.</p>` },
        { type: 'diagram', diagram: km(FN.f2x, ['yz', "xz'", ['xy', 'xy (cover)']]), caption: 'Adding xy covers the adjacent pair m6–m7, which removes the hazard.' },
        { type: 'diagram', diagram: CIRC_HAZFIX, caption: 'Hazard-free version: F = yz + xz′ + xy.' },
        { type: 'callout', tone: 'note', html: 'Supplemental context: in a synchronous design, flip-flops sample signals only at clock edges, after glitches have died out. Hazards matter most when a signal is used immediately, e.g. as a clock, a reset or an asynchronous control.' },
        { type: 'check', question: { type: 'mc', difficulty: 2, prompt: 'F = A′B + AC. Which term should you add to remove its static-1 hazard?',
          choices: ['BC', "A'C", "AB'", "B'C"], answer: 0,
          explanation: 'm3 (011, covered by A′B) and m7 (111, covered by AC) are adjacent 1s that no single group covers. The group covering both has B = 1, C = 1, giving BC, the consensus term. A′C and AB′ are not implicants: A′C would make m1 a 1, and AB′ would make m4 a 1. B′C would make m1 a 1.', src: supp('Static-1 hazard repair with the consensus term') } },
        { type: 'check', question: { type: 'tf', difficulty: 2, prompt: 'Adding the redundant term xy to F = yz + xz′ changes F’s truth table.', answer: false,
          explanation: 'xy is the consensus of yz and xz′, so yz + xz′ + xy = yz + xz′ for every input. It changes the circuit’s timing behaviour (no glitch), not its logic function.', src: supp('Consensus theorem and hazard covers') } },
      ] },
  ];

  /* ---------------- flashcards ---------------- */
  const FLASHCARDS = [
    // top-down design
    { id: 't4-f1', subtopic: 't4-topdown', front: 'What are the two steps of <b>top-down design</b>?',
      back: '<b>Capture:</b> describe the desired behaviour precisely, in words or as a truth table.<br><b>Convert</b> (implement): turn the captured behaviour into a circuit.',
      src: course('c8v1 00:00:21', 'c8v1 00:00:45', 'c8v1 00:01:31') },
    { id: 't4-f2', subtopic: 't4-topdown', front: 'Top-down conversion: put the steps in order.',
      back: 'truth table → sum of minterms → sum of products → simplify (Boolean algebra or K-map) → circuit',
      src: course('c8v1 00:02:28', 'c8v1 00:02:34', 'c8v1 00:02:42', 'c8v1 00:02:46') },
    { id: 't4-f3', subtopic: 't4-topdown', front: 'Why simplify the expression before building the circuit?',
      back: 'A simpler expression gives a more optimal circuit: fewer and smaller gates for the same function.',
      src: course('c8v1 00:02:59') },
    { id: 't4-f4', subtopic: 't4-topdown', front: 'Name the two ways this course simplifies a Boolean expression.',
      back: '1. The properties (laws) of Boolean algebra (Topic 3).<br>2. <b>K-maps</b>, a visual form of simplification (Topic 4).',
      src: course('c8v1 00:03:06', 'c8v1 00:03:25', 'c8v1 00:03:49') },
    { id: 't4-f5', subtopic: 't4-topdown', front: 'A word problem has 3 inputs. How many rows does its truth table need, and which rows become minterms?',
      back: '2<sup>3</sup> = 8 rows. Each row where the output is 1 becomes one minterm of the sum of minterms.',
      src: course('c8v1 00:02:34', 'c18v3 00:01:14') },

    // K-map basics
    { id: 't4-f6', subtopic: 't4-kmap-basics', front: 'What is a K-map?',
      back: 'A <b>Karnaugh map</b>: a grid with one cell per minterm, arranged so that adjacent cells differ in exactly one variable. It is a visual way to simplify an expression.',
      src: course('c8v1 00:03:30', 'c8v1 00:03:49', 'c8v2 00:00:06', 'c8v2 00:01:02') },
    { id: 't4-f7', subtopic: 't4-kmap-basics', front: 'In a 2-variable K-map of F(I1, I0), which variable labels the columns and which the rows?',
      back: 'The right-hand variable (I0) goes across the top as the columns. The left-hand variable (I1) goes down the side as the rows.',
      backDiagram: layout(['I1', 'I0']), src: course('c8v1 00:04:48') },
    { id: 't4-f8', subtopic: 't4-kmap-basics', front: 'What do two <b>adjacent</b> K-map cells have in common?',
      back: 'All variables but one have the same value. Adjacent cells differ in the value of exactly one variable.',
      src: course('c8v2 00:00:32', 'c8v2 00:01:02') },
    { id: 't4-f9', subtopic: 't4-kmap-basics', front: 'What goes into the cells of a K-map, and what does a blank cell mean?',
      back: 'The function’s output value for that minterm. The instructor writes only the 1s; a blank cell is 0 by default.',
      src: course('c8v2 00:02:25', 'c8v2 00:02:36') },
    { id: 't4-f10', subtopic: 't4-kmap-basics', front: 'Write the product term for each cell of a 2-variable map F(I1, I0).',
      back: `${table(['Cell', 'Term'], [['m0 (00)', 'I1′I0′'], ['m1 (01)', 'I1′I0'], ['m2 (10)', 'I1I0′'], ['m3 (11)', 'I1I0']])}`,
      src: course('c8v1 00:05:54', 'c8v1 00:07:02', 'c8v1 00:07:40') },

    // grouping rules
    { id: 't4-f11', subtopic: 't4-grouping', front: 'K-map grouping <b>rule 1</b>',
      back: 'Cover every 1 at least once. Each circle gives one product term, and the terms are ORed. A 1 may be inside more than one circle.',
      src: course('c8v2 00:09:54', 'c8v2 00:10:55', 'c8v2 00:13:06') },
    { id: 't4-f12', subtopic: 't4-grouping', front: 'K-map grouping <b>rule 2</b>',
      back: 'Use the <b>largest</b> possible circles and the <b>fewest</b> of them. That is what makes the expression minimal.',
      src: course('c8v2 00:11:13', 'c8v3 00:00:26') },
    { id: 't4-f13', subtopic: 't4-grouping', front: 'K-map grouping <b>rule 3</b>',
      back: 'A circle always holds a power of two cells: 1, 2, 4, 8 or 16. Three (or six) is not allowed.',
      src: course('c8v3 00:02:49', 'c8v3 00:03:35') },
    { id: 't4-f14', subtopic: 't4-grouping', front: 'How do you read the product term of a circle?',
      back: 'Keep each variable that has the same value in every cell of the circle: primed if that value is 0, plain if it is 1. Variables that change inside the circle drop out.',
      src: course('c8v2 00:05:30', 'c9v1 00:10:00') },
    { id: 't4-f15', subtopic: 't4-grouping', front: '4-variable K-map: number of literals for a circle of 1, 2, 4, 8 and 16 cells?',
      back: `${table(['Cells', '1', '2', '4', '8', '16'], [['Literals', '4', '3', '2', '1', '— (F = 1)']])}Each doubling removes one variable.`,
      src: course('c9v1 00:06:39', 'c9v1 00:07:27', 'c9v1 00:08:58', 'c9v1 00:10:28', 'c9v1 00:12:08') },
    { id: 't4-f16', subtopic: 't4-grouping', front: 'Why does circling m0 and m1 of F(I1, I0) give just I1′? Show the algebra.',
      back: 'I1′I0′ + I1′I0 = I1′(I0′ + I0) = I1′ · 1 = I1′. The variable that changes inside the circle (I0) cancels out.',
      src: course('c8v2 00:06:56', 'c8v2 00:07:04') },
    { id: 't4-f17', subtopic: 't4-grouping', front: 'Can m0 and m3 of a 2-variable map be circled together?',
      back: 'No. They are diagonal: 00 and 11 differ in <b>two</b> variables, so they are not adjacent. (Circling m0, m1, m3 together also breaks the power-of-two rule.)',
      src: course('c8v3 00:01:42', 'c8v3 00:02:38') },

    // 3-variable maps
    { id: 't4-f18', subtopic: 't4-kmap3', front: 'In what order are the yz columns of a 3-variable K-map labelled, and why?',
      back: '<b>00, 01, 11, 10.</b> Neighbouring columns may differ in only one variable, so 11 comes before 10. This is Gray-code order.',
      src: course('c8v4 00:01:54', 'c8v4 00:03:19') },
    { id: 't4-f19', subtopic: 't4-kmap3', front: 'Where does each minterm sit in a 3-variable map F(x, y, z)?',
      back: 'Top row (x = 0): m0 m1 m3 m2.<br>Bottom row (x = 1): m4 m5 m7 m6.',
      backDiagram: layout(X3), src: course('c8v4 00:03:33', 'c8v4 00:04:01') },
    { id: 't4-f20', subtopic: 't4-kmap3', front: 'Which edges of a 3-variable K-map are adjacent?',
      back: 'The left and right edges. Fold the paper so the first column meets the last: m0–m2 and m4–m6 are neighbours.',
      src: course('c8v4 00:06:29', 'c8v4 00:07:12') },
    { id: 't4-f21', subtopic: 't4-kmap3', front: 'In a 3-variable map F(x, y, z), which cells make up the z = 0 region?',
      back: 'The first and the last column (yz = 00 and yz = 10): m0, m2, m4, m6. With wrap-around they form one group, z′.',
      src: course('c8v4 00:06:06', 'c8v4 00:06:29') },
    { id: 't4-f22', subtopic: 't4-kmap3', front: 'What is a Gray code, and where does it show up in K-maps?',
      back: 'A code in which consecutive values differ in exactly one bit. K-map rows and columns are labelled in Gray-code order (00, 01, 11, 10), so neighbouring cells differ in one variable.',
      src: course('gray 00:08:21', 'c8v4 00:01:54') },
    { id: 't4-f23', subtopic: 't4-kmap3', front: `Class 8 Video 4: minimise f(x, y, z) = ${sig(FN.f2x.ms)}.`,
      back: `f = ${pr(FN.f2x.sop)}. The pair m4–m6 is joined across the left/right edge.`,
      backDiagram: km(FN.f2x, ['yz', "xz'"]), src: course('c8v4 00:11:20', 'c8v4 00:14:09') },

    // 4-variable maps
    { id: 't4-f24', subtopic: 't4-kmap4', front: 'Lay out a 4-variable K-map: where does each minterm go?',
      back: 'AB labels the rows and CD the columns, both in the order 00, 01, 11, 10.<br>Rows: 0 1 3 2 / 4 5 7 6 / 12 13 15 14 / 8 9 11 10',
      backDiagram: layout(A4), src: course('c9v1 00:01:22', 'c9v1 00:01:46', 'c9v1 00:02:23', 'c9v1 00:02:51') },
    { id: 't4-f25', subtopic: 't4-kmap4', front: 'In a 4-variable map (AB rows, CD columns), where are the regions A, B, B′ and D′?',
      back: 'A: bottom two rows. B: middle two rows. B′: top and bottom rows. D′: first and last columns.',
      src: course('c9v1 00:04:31', 'c9v1 00:05:00', 'c9v1 00:05:56') },
    { id: 't4-f26', subtopic: 't4-kmap4', front: 'Which edges are adjacent in a 4-variable K-map?',
      back: 'Left–right <b>and</b> top–bottom (fold either way). So the four corners m0, m2, m8, m10 form one group: B′D′.',
      backDiagram: km(FN.corners, ["B'D'"]), src: course('c9v2 00:09:56', 'c9v2 00:11:52') },
    { id: 't4-f27', subtopic: 't4-kmap4', front: 'What does a circle around all 16 cells of a 4-variable map mean?',
      back: 'Every cell is 1, so the function is the constant F = 1, whatever A, B, C, D are.',
      src: course('c9v1 00:12:08') },
    { id: 't4-f28', subtopic: 't4-kmap4', front: 'How do you check which minterm a cell of a 4-variable map holds?',
      back: 'Read the row bits (AB) and then the column bits (CD) as one binary number. Row 10, column 00 is 1000<sub>2</sub> = 8.',
      src: course('c9v1 00:03:15') },
    { id: 't4-f29', subtopic: 't4-kmap4', front: 'Does the course use 5-variable K-maps?',
      back: 'No. They exist (as compound maps), but the course does not cover them. For the five-input 1-bit comparator in Topic 5, the equations are derived directly.',
      src: course('c18v3 00:01:46', 'c18v3 00:02:11') },

    // worked examples
    { id: 't4-f30', subtopic: 't4-examples', front: `Class 9 Example 1: minimise F = ${sig(FN.ex1.ms)}.`,
      back: `F = ${pr(FN.ex1.sop)}`, backDiagram: km(FN.ex1, ["C'", "BD'", "A'D'"]), src: course('c9v2 00:00:07', 'c9v2 00:05:52') },
    { id: 't4-f31', subtopic: 't4-examples', front: `Class 9 Example 2: minimise F = ${sig(FN.ex2.ms)}.`,
      back: `F = ${pr(FN.ex2.sop)}`, backDiagram: km(FN.ex2, ["B'C'", "B'D'", "A'CD'"]), src: course('c9v2 00:06:47', 'c9v2 00:12:49') },
    { id: 't4-f32', subtopic: 't4-examples', front: 'A tip for filling a 4-variable K-map without mistakes?',
      back: 'Write the minterm numbers (0, 1, 3, 2, …) in a little corner of each cell first, then place the 1s.',
      src: course('c9v2 00:01:30') },
    { id: 't4-f33', subtopic: 't4-examples', front: 'In Class 9 Example 2, why is m6 grouped as A′CD′ straight away?',
      back: 'm6 has only one neighbouring 1 (m2), so there is no larger or alternative circle. The instructor says you “can’t make anything bigger” for it. That circle has to be in the answer.',
      src: course('c9v2 00:08:15') },

    // don't cares
    { id: 't4-f34', subtopic: 't4-dontcares', front: 'What is a <b>don’t-care</b> (X) condition?',
      back: 'An input combination that can never occur, so its output does not matter. The function is <i>incompletely specified</i>.',
      src: course('c9v3 00:00:05', 'c9v3 00:00:23', 'c9v3 00:03:06') },
    { id: 't4-f35', subtopic: 't4-dontcares', front: 'How do you treat an X when grouping?',
      back: 'As 0 or as 1, whichever helps. Cover an X <b>only if it helps make a larger circle of 1s</b>. You do not have to circle every X.',
      src: course('c9v3 00:04:23', 'c9v3 00:08:03', 'c9v3 00:14:28', 'c14v3 00:02:57') },
    { id: 't4-f36', subtopic: 't4-dontcares', front: 'The knob example: off = 00, low = 01, high = 10, and 11 never occurs. F3 = 1 when on. Minimal F3?',
      back: `F3 = ${pr(FN.knob.sop)}, treating the X at 11 as 1. With X = 0 it would be xy′ + x′y.`,
      backDiagram: km(FN.knob, ['x', 'y']), src: course('c9v3 00:02:02', 'c9v3 00:06:13', 'c9v3 00:07:28') },
    { id: 't4-f37', subtopic: 't4-dontcares', front: 'The die example: f4 = 1 when the number is ≥ 4, and 0 and 7 never appear. Minimal f4(a, b, c)?',
      back: 'f4 = a. The bottom row uses the X at m7. The X at m0 is not used.',
      backDiagram: km(FN.die, ['a']), src: course('c9v3 00:09:12', 'c9v3 00:10:25', 'c9v3 00:11:58', 'c9v3 00:15:24') },
    { id: 't4-f38', subtopic: 't4-dontcares', front: 'How are incompletely specified functions written in the labs and exams?',
      back: 'As three sets of inputs: where F = 0, where F = 1, and where F = X. Textbooks also write Σm(…) + d(…), where d lists the don’t-cares (supplemental notation).',
      src: course('c9v3 00:03:24') },
    { id: 't4-f39', subtopic: 't4-dontcares', front: 'Should you ever draw a circle that contains only X’s?',
      back: 'No. Circles exist to cover 1s; X’s are only used to make a circle of 1s larger. A circle with only X’s adds a term that covers nothing you need.',
      src: course('c9v3 00:14:28') },
    { id: 't4-f40', subtopic: 't4-dontcares', front: 'Where do K-maps with don’t-cares come up in the labs?',
      back: 'Lab 3, which has a <span class="mono">kmap</span> module and an <span class="mono">x_kmap</span> module with testbenches. The exact functions are in the Lab 3 handout, which is not mirrored here.',
      src: course('c9v3 00:15:52', 'lab3 00:00:31', 'lab3 00:01:00'), needsSource: NS_LAB3 },
    { id: 't4-f41', subtopic: 't4-dontcares', front: `BCD → 7-segment: minimal SOP for segment a, with 10–15 as don’t-cares?`,
      back: `a = ${pr(FN.sega.sop)} (6 literals).`, backDiagram: km(FN.sega, ['A', 'C', 'BD', "B'D'"]),
      src: guide('BCD-to-7-segment decoder, K-map for segment a. The segment pattern (6 drawn with its top bar) is standard.') },

    // implicants
    { id: 't4-f42', subtopic: 't4-implicants', front: 'Define <b>implicant</b> and <b>prime implicant</b>.',
      back: '<b>Implicant:</b> a product term that is 1 only where F is 1 (or X), i.e. any legal circle.<br><b>Prime implicant:</b> a circle that cannot be made larger, i.e. not contained in a bigger legal circle.',
      src: suppGuide('Prime implicants') },
    { id: 't4-f43', subtopic: 't4-implicants', front: 'Define <b>essential prime implicant</b>.',
      back: 'A prime implicant that is the <i>only</i> one covering some 1. Every minimal SOP contains it.',
      src: suppGuide('Essential prime implicants') },
    { id: 't4-f44', subtopic: 't4-implicants', front: 'Minimisation procedure using prime implicants: four steps?',
      back: '1. Find all PIs.<br>2. Mark the EPIs (1s covered by only one PI).<br>3. Take every EPI.<br>4. Cover any remaining 1s with as few, and as large, PIs as possible.',
      src: suppGuide('The prime-implicant procedure') },
    { id: 't4-f45', subtopic: 't4-implicants', front: `Is the largest circle always in the minimal SOP? Think of F = ${sig(FN.trap.ms)}.`,
      back: `No. The quad BD is a prime implicant, but the four essential pairs already cover it: F = ${pr(FN.trap.sop)}.`,
      backDiagram: km(FN.trap, ["A'C'D", "A'BC", "ABC'", 'ACD']), src: supp('Redundant prime implicants') },

    // POS
    { id: 't4-f46', subtopic: 't4-pos', front: 'How do you get a minimal <b>POS</b> from a K-map?',
      back: 'Group the <b>0s</b> (X’s may be used). Each group is a term of F′. Complement with De Morgan, or read each group directly as a sum term: a variable that is 0 throughout is written plain, one that is 1 throughout is written primed.',
      src: suppGuide('POS by grouping the 0s') },
    { id: 't4-f47', subtopic: 't4-pos', front: `Minimal POS of f(x, y, z) = ${sig(FN.f2x.ms)}?`,
      back: `f = ${pr(FN.f2x.pos)}. The 0-groups are m0–m2 (x = 0, z = 0) and m1–m5 (y = 0, z = 1).`,
      backDiagram: kmComp(FN.f2x, ["x'z'", "y'z"]), src: supp('POS by grouping 0s') },
    { id: 't4-f48', subtopic: 't4-pos', front: 'A group of 0s has A = 1, B = 0 and C changing. Which sum term does it give?',
      back: '(A′ + B). A variable that is 1 throughout is primed, one that is 0 throughout is plain, and C drops out.',
      src: supp('Reading a group of 0s') },

    { id: 't4-f52', subtopic: 't4-pos', front: 'Do the mirrored lectures teach maxterms and POS minimisation?',
      back: 'No. Topic 3 (Class 7 Video 2) mentions that “there is something that is called a max term, but right now we are not going to cover that”, and points to the book. The POS method in this app is supplemental, included because the Final Exam page lists it.',
      src: course('c7v2 00:03:09') },
    // hazards
    { id: 't4-f49', subtopic: 't4-hazards', front: 'What is a <b>static-1 hazard</b>?',
      back: 'For a single input change, the output should stay 1 but briefly glitches to 0, because the paths through the circuit have unequal delays. (A static-0 hazard is the reverse: it should stay 0 but glitches to 1.)',
      src: suppGuide('Static hazards') },
    { id: 't4-f50', subtopic: 't4-hazards', front: 'How does a K-map show a possible static-1 hazard in an SOP circuit?',
      back: 'Two <b>adjacent 1s</b> sit in different groups, and no single group covers both.',
      src: suppGuide('Static-1 hazards on a K-map') },
    { id: 't4-f51', subtopic: 't4-hazards', front: 'How do you remove the static-1 hazard in F = yz + xz′?',
      back: 'Add the redundant term <b>xy</b>, which covers the adjacent pair m6–m7: F = yz + xz′ + xy. The function is the same, but there is no glitch when z changes with x = y = 1.',
      backDiagram: km(FN.f2x, ['yz', "xz'", ['xy', 'xy (cover)']]), src: suppGuide('The redundant cover term') },
  ];

  /* ---------------- questions ---------------- */
  const QUESTIONS = [
    /* ===== top-down design ===== */
    { id: 't4-q1', subtopic: 't4-topdown', type: 'mc', difficulty: 1, src: course('c8v1 00:00:45', 'c8v1 00:00:54'),
      prompt: 'In top-down design, what does the <b>capture</b> step produce?',
      choices: ['A precise description of the desired behaviour, in words or as a truth table', 'The gate-level circuit', 'The minimised Boolean expression', 'A K-map with the groups already circled'], answer: 0,
      explanation: 'Capture means describing the task’s desired behaviour precisely, and for combinational circuits that is done in language or with a truth table. Expressions, K-maps and gates all belong to the later <b>convert</b> (implement) step.' },
    { id: 't4-q2', subtopic: 't4-topdown', type: 'match', difficulty: 1, src: course('c8v1 00:02:28', 'c8v1 00:02:34', 'c8v1 00:02:42', 'c8v1 00:02:46'),
      prompt: 'Match each position in the top-down conversion to what you produce at that point.',
      pairs: [['1st', 'Truth table'], ['2nd', 'Sum of minterms'], ['3rd', 'Sum of products'], ['4th', 'Simplified expression (Boolean algebra or K-map)'], ['5th', 'Circuit (gates)']],
      explanation: 'The lecture’s order is: start from the truth table, write the sum of minterms, turn it into a sum of products, simplify (a simpler expression means a more optimal circuit), then implement the circuit.' },
    { id: 't4-q3', subtopic: 't4-topdown', type: 'tf', difficulty: 1, src: course('c8v1 00:01:31', 'c8v1 00:02:09'),
      prompt: 'Top-down design starts by wiring up gates and then works out what the resulting circuit does.', answer: false,
      explanation: 'It is the other way round. You first capture the desired behaviour, then convert that captured behaviour into a circuit (“from captured behaviour to circuit”).' },
    { id: 't4-q4', subtopic: 't4-topdown', type: 'short', normalize: 'list', difficulty: 2, src: supp('Majority-vote word problem (standard textbook example)'),
      prompt: 'Three judges A, B, C (A is the most significant bit) press 1 to vote “pass”. Output P = 1 when <b>at least two</b> vote pass. List the minterms of P, e.g. <kbd>1, 4, 6</kbd>.',
      accept: ['3, 5, 6, 7'],
      steps: ['Write the truth table and mark every row with two or more 1s.', 'ABC = 011 → 3, 101 → 5, 110 → 6, 111 → 7.', 'Rows 0, 1, 2, 4 have at most one 1, so P = 0 there.', 'P = Σm(3, 5, 6, 7).'],
      solutionDiagram: ttOf(FN.maj, 'P'),
      explanation: '“At least two” includes the row where all three vote pass (111 = 7). A common slip is to list only the “exactly two” rows 3, 5, 6.' },
    Object.assign(bq(FN.maj), { id: 't4-q5', subtopic: 't4-topdown', difficulty: 2, src: supp('Majority-vote word problem (standard textbook example)'),
      prompt: 'Continue the majority-vote design: P(A, B, C) = Σm(3, 5, 6, 7). Give a minimal sum of products.',
      steps: ['Place 1s at m3, m5, m6, m7. In the 3-variable map, m7 has m3, m5 and m6 as neighbours.', 'Pair m3–m7: B = 1, C = 1 → BC.', 'Pair m5–m7: A = 1, C = 1 → AC.', 'Pair m6–m7: A = 1, B = 1 → AB.', 'No group of 4 exists. P = AB + AC + BC (6 literals, down from 12 in the sum of minterms).'],
      solutionDiagram: km(FN.maj, ['BC', 'AC', 'AB']),
      explanation: 'Each 1 except m7 can join only m7, so there are three overlapping pairs. Reusing m7 in all three is allowed and keeps every circle as large as possible.' }),
    Object.assign(bq(FN.prime3), { id: 't4-q6', subtopic: 't4-topdown', difficulty: 3, src: supp('Prime-number detector word problem (standard textbook example)'),
      prompt: 'Word problem: N = ABC is a 3-bit unsigned number (A = MSB). Output P = 1 exactly when N is a <b>prime number</b>. Go from words to a minimal SOP for P(A, B, C).',
      steps: ['Capture: the primes from 0 to 7 are 2, 3, 5, 7. Note that 0 and 1 are not prime.', 'Truth table / minterms: P = Σm(2, 3, 5, 7).', 'K-map: m2 and m3 (top row, right two columns) share A = 0, B = 1 → A′B.', 'm5 and m7 (bottom row, middle columns) share A = 1, C = 1 → AC.', 'P = A′B + AC. The circuit is one inverter, two AND gates and an OR gate.'],
      solutionDiagram: km(FN.prime3, ["A'B", 'AC']),
      explanation: 'The pair m3–m7 (BC) is also a legal circle, but m3 and m7 are already covered by the two essential pairs, so adding BC only adds literals.' }),
    { id: 't4-q7', subtopic: 't4-topdown', type: 'numeric', difficulty: 1, src: supp('Majority-vote word problem (standard textbook example)'),
      prompt: 'Before simplifying, how many literals does the sum of minterms P = A′BC + AB′C + ABC′ + ABC contain?', answer: 12,
      steps: ['There are 4 minterms.', 'Each minterm of a 3-variable function has 3 literals.', '4 × 3 = 12 literals.'],
      explanation: 'Every minterm contains every variable once, primed or plain. The minimal form AB + AC + BC has only 6, which is why the simplify step is worth it.' },
    { id: 't4-q8', subtopic: 't4-topdown', type: 'mc', difficulty: 2, src: course('c8v3 00:02:38', 'c8v3 00:02:49'),
      prompt: 'A stair light L = 1 when <b>exactly one</b> of the two switches A, B is up. What does the K-map show?',
      choices: ['The two 1s (m1 and m2) are diagonal, so no pair can be circled: L = A′B + AB′ is already minimal SOP', 'The two 1s form a pair, so L = A', 'The two 1s form a pair, so L = B', 'All four cells are 1, so L = 1'], answer: 0,
      explanation: 'L = 1 for AB = 01 (m1) and 10 (m2). These cells differ in both variables, so they are not adjacent, the same situation as m0 and m3 in Class 8 Video 3. Each 1 is circled alone: L = A′B + AB′ (that is A ⊕ B). L = A or L = B would wrongly make m3 = 1.' },

    /* ===== K-map basics ===== */
    { id: 't4-q9', subtopic: 't4-kmap-basics', type: 'mc', difficulty: 1, src: course('c8v1 00:04:48'),
      prompt: 'In the instructor’s 2-variable K-map for F(I1, I0), which variable labels the <b>columns</b> across the top?',
      choices: ['I0, the variable on the right of the argument list', 'I1, the variable on the left of the argument list', 'Whichever variable has more 1s in the truth table', 'Neither: the columns are labelled with minterm numbers'], answer: 0,
      explanation: 'The lecture stresses that the right-hand variable (I0) goes across the top and the left-hand variable (I1) goes down the side. With this convention the cell number reads as (row bits)(column bits).' },
    { id: 't4-q10', subtopic: 't4-kmap-basics', type: 'boolexpr', difficulty: 1, vars: ['I1', 'I0'], minterms: [1], answer: "I1'I0", src: course('c8v1 00:07:12'),
      prompt: 'Write the product term (minterm) that describes cell m1 of the 2-variable map F(I1, I0).',
      steps: ['m1 is I1 I0 = 01.', 'I1 = 0, so it appears primed: I1′.', 'I0 = 1, so it appears plain: I0.', 'm1 = I1′I0.'],
      explanation: 'A minterm contains every variable: primed where its bit is 0 and plain where it is 1. In the lecture: “I1 prime, I0 without prime.”' },
    { id: 't4-q11', subtopic: 't4-kmap-basics', type: 'tf', difficulty: 1, src: course('c8v2 00:00:32', 'c8v2 00:01:02'),
      prompt: 'Any two adjacent cells of a K-map differ in the value of exactly one variable.', answer: true,
      explanation: 'This is the defining property of a K-map, and the 3- and 4-variable maps use the 00, 01, 11, 10 order to keep it. It is why two adjacent 1s combine into one shorter term.' },
    Object.assign(bq(FN.y2), { id: 't4-q12', subtopic: 't4-kmap-basics', difficulty: 2, src: course('c8v2 00:01:23', 'c8v2 00:04:10', 'c8v2 00:05:30'),
      prompt: 'Class 8 Video 2, example 1: simplify the function Y(I1, I0) given by this truth table.',
      diagram: ttOf(FN.y2, 'Y'),
      steps: ['Y = 1 for rows 00 and 01, which are m0 and m1.', 'Both are in the top row of the map (I1 = 0), so they are adjacent. Circle them.', 'I0 changes inside the circle and drops out. I1 = 0 throughout → I1′.', 'Y = I1′. (Algebra: I1′I0′ + I1′I0 = I1′(I0′ + I0) = I1′.)'],
      solutionDiagram: km(FN.y2, ["I1'"]),
      explanation: 'The two 1s differ only in I0, so I0 cancels and one literal remains.' }),
    Object.assign(bq(FN.f2), { id: 't4-q13', subtopic: 't4-kmap-basics', difficulty: 2, src: course('c8v2 00:07:34', 'c8v2 00:13:33', 'c8v2 00:14:15'),
      prompt: 'Class 8 Video 2, example 2: simplify f2(A, B) = AB + A′B + A′B′.',
      steps: ['AB = m3, A′B = m1, A′B′ = m0. Put 1s in those cells.', 'Circle m1 and m3 (right column): A changes, B = 1 → B.', 'Circle m0 and m1 (top row): B changes, A = 0 → A′.', 'm1 is used twice, which is allowed. f2 = A′ + B.'],
      solutionDiagram: km(FN.f2, ["A'", 'B']),
      explanation: 'Two overlapping pairs are better than a pair plus a single cell. Circling m0 alone would give A′B′ + B, which is correct but not minimal (3 literals instead of 2).' }),
    { id: 't4-q14', subtopic: 't4-kmap-basics', type: 'multi', difficulty: 2, src: course('c8v3 00:02:38', 'c8v3 00:02:49'),
      prompt: 'In a 2-variable K-map, which pairs of cells are <b>adjacent</b>? Select all that apply.',
      choices: ['m0 and m1', 'm0 and m2', 'm1 and m3', 'm2 and m3', 'm0 and m3', 'm1 and m2'], answers: [0, 1, 2, 3],
      explanation: 'Side-by-side cells differ in one bit: 00–01, 00–10, 01–11 and 10–11. The diagonal pairs m0–m3 (00, 11) and m1–m2 (01, 10) differ in both bits, so they are not adjacent.' },
    { id: 't4-q15', subtopic: 't4-kmap-basics', type: 'tf', difficulty: 1, src: course('c8v2 00:02:36', 'c8v2 00:02:39'),
      prompt: 'When filling a K-map you must write a 0 in every cell where the function is 0.', answer: false,
      explanation: 'The instructor writes only the 1s. Zeros are the default, so blank cells mean 0 and the map is not crowded. Writing the 0s is not wrong, just unnecessary.' },
    Object.assign(bq(FN.or2), { id: 't4-q16', subtopic: 't4-kmap-basics', difficulty: 1, src: course('c8v2 00:11:13', 'c8v2 00:13:06'),
      prompt: `Simplify F(A, B) = ${sig(FN.or2.ms)} with a 2-variable K-map.`,
      steps: ['1s at m1 (01), m2 (10) and m3 (11).', 'Bottom row m2–m3: A = 1 → A.', 'Right column m1–m3: B = 1 → B.', 'F = A + B (m3 is in both circles).'],
      solutionDiagram: km(FN.or2, ['A', 'B']),
      explanation: 'The largest circles here are pairs. Overlapping them on m3 covers all three 1s with two one-literal terms, which is the OR function.' }),

    /* ===== grouping rules ===== */
    { id: 't4-q17', subtopic: 't4-grouping', type: 'tf', difficulty: 1, src: course('c8v2 00:11:13'),
      prompt: 'Grouping rule 2 asks for the largest possible circles, and as few circles as possible.', answer: true,
      explanation: 'Larger circles mean fewer literals per term, and fewer circles mean fewer terms. Together they give the minimal SOP.' },
    { id: 't4-q18', subtopic: 't4-grouping', type: 'numeric', difficulty: 1, src: course('c9v1 00:08:58', 'c9v1 00:09:31'),
      prompt: 'In a 4-variable K-map, a circle of <b>4</b> cells gives a product term with how many literals?', answer: 2,
      steps: ['A group of 2<sup>k</sup> cells in an n-variable map leaves n − k literals.', 'Here n = 4 and 4 = 2<sup>2</sup>, so k = 2.', '4 − 2 = 2 literals (the lecture’s example: A′C′).'],
      explanation: 'Each doubling of the circle removes one variable: 1 cell → 4 literals, 2 → 3, 4 → 2, 8 → 1.' },
    { id: 't4-q19', subtopic: 't4-grouping', type: 'numeric', difficulty: 2, src: course('c8v4 00:09:41', 'c8v4 00:10:10'),
      prompt: 'In a <b>3-variable</b> K-map, a circle of 2 adjacent cells gives a product term with how many literals?', answer: 2,
      steps: ['n = 3 variables, and 2 = 2<sup>1</sup> cells, so k = 1.', 'The variable that changes between the two cells drops out.', '3 − 1 = 2 literals, e.g. x′y in Class 8 Video 4.'],
      explanation: 'Two adjacent cells differ in exactly one variable, which disappears, so 2 of the 3 variables remain.' },
    { id: 't4-q20', subtopic: 't4-grouping', type: 'mc', difficulty: 2, src: course('c8v4 00:13:20', 'c8v4 00:14:02'),
      prompt: 'In a 3-variable map F(x, y, z), a circle joins m4 and m6 across the left/right edge. Which product term does it give?',
      choices: ["xz'", 'xz', "x'z'", "yz'"], answer: 0,
      explanation: 'm4 = 100 and m6 = 110. x = 1 in both (plain x), z = 0 in both (z′), and y changes and drops out. So the term is xz′. The term xz would describe m5 and m7, and x′z′ would describe m0 and m2.' },
    { id: 't4-q21', subtopic: 't4-grouping', type: 'mc', difficulty: 2, src: course('c8v3 00:01:42', 'c8v3 00:02:49'),
      prompt: 'A student draws <b>one</b> loop around all three 1s of f2(A, B) = Σm(0, 1, 3). What is wrong with it?',
      choices: ['A loop must hold a power-of-two number of cells, and m0 and m3 are not even adjacent', 'Nothing is wrong: one loop means fewer terms, so it is better', 'The loop is fine, but its term must contain both A and B', 'Loops may only ever contain exactly two cells'], answer: 0,
      explanation: 'Class 8 Video 3 rejects this loop. Three is not a power of two, and m0 (00) and m3 (11) differ in two variables. The correct cover is two overlapping pairs, A′ + B. Loops of 1, 4, 8 or 16 cells are also allowed, so “exactly two” is false.' },
    { id: 't4-q22', subtopic: 't4-grouping', type: 'match', difficulty: 2, src: course('c9v1 00:06:39', 'c9v1 00:07:27', 'c9v1 00:08:58', 'c9v1 00:10:28', 'c9v1 00:12:08'),
      prompt: 'In a <b>4-variable</b> K-map, match each circle size to the number of literals in its product term.',
      pairs: [['1 cell', '4 literals'], ['2 cells', '3 literals'], ['4 cells', '2 literals'], ['8 cells', '1 literal'], ['16 cells', 'No literals: F = 1']],
      explanation: 'Each doubling removes one variable. One cell is a full minterm such as ABC′D′. Sixteen cells means every input gives 1, so F is the constant 1.' },
    { id: 't4-q23', subtopic: 't4-grouping', type: 'multi', difficulty: 3, src: course('c8v3 00:02:49', 'c9v1 00:04:31', 'c9v2 00:09:56'),
      prompt: 'Which of these cell sets are <b>legal</b> groups in a 4-variable K-map (AB rows, CD columns)? Select all that apply.',
      choices: ['{m0, m1, m3, m2}', '{m0, m2, m8, m10}', '{m5, m6, m7}', '{m3, m6}', '{m4, m5, m12, m13}', '{m1, m4}'], answers: [0, 1, 4],
      steps: ['{0, 1, 3, 2} is the whole top row: A = 0, B = 0 → legal (A′B′).', '{0, 2, 8, 10} is the four corners, joined by both wrap-arounds → legal (B′D′).', '{5, 6, 7} has 3 cells, which is not a power of two → illegal.', '{3, 6} = 0011 and 0110 differ in two bits → not adjacent, illegal.', '{4, 5, 12, 13}: rows 01 and 11 are neighbours, columns 00 and 01 are neighbours → a 2 × 2 square, legal (BC′).', '{1, 4} = 0001 and 0100 differ in two bits → illegal.'],
      explanation: 'A legal group has 2<sup>k</sup> cells forming a rectangle of neighbours, counting wrap-around. Every one of its cells shares the same values on the variables left in the term.' },
    { id: 't4-q24', subtopic: 't4-grouping', type: 'tf', difficulty: 1, src: course('c8v3 00:02:38', 'c8v3 00:02:49'),
      prompt: 'Two cells that touch only at a corner (diagonal neighbours) count as adjacent in a K-map.', answer: false,
      explanation: 'Diagonal cells differ in two variables, like m0 = 00 and m3 = 11 in Class 8 Video 3, so they cannot be grouped as a pair.' },
    { id: 't4-q25', subtopic: 't4-grouping', type: 'mc', difficulty: 3, src: course('c8v2 00:05:30', 'c9v2 00:09:56'),
      prompt: 'A circle in a 4-variable map contains m2, m3, m10 and m11. Which product term describes it?',
      choices: ["B'C", "A'B'C", 'BC', "B'CD"], answer: 0,
      steps: ['Write the cells in binary: m2 = 0010, m3 = 0011, m10 = 1010, m11 = 1011.', 'A takes both values → drops out. D takes both values → drops out.', 'B = 0 in all four → B′. C = 1 in all four → C.', 'Term: B′C.'],
      explanation: 'The group is the top and bottom rows in the right two columns, joined by the top–bottom wrap. A′B′C covers only m2 and m3, B′CD only m3 and m11, and BC is the 2 × 2 block m6, m7, m14, m15.' },

    /* ===== 3-variable maps ===== */
    { id: 't4-q26', subtopic: 't4-kmap3', type: 'mc', difficulty: 1, src: course('c8v4 00:01:54', 'c8v4 00:03:19'),
      prompt: 'How does the lecture order the yz columns of a 3-variable K-map, so that neighbouring columns differ in one variable?',
      choices: ['00, 01, 11, 10', '00, 01, 10, 11', '00, 11, 01, 10', '01, 10, 00, 11'], answer: 0,
      explanation: 'The “little trick”: after 01 comes 11, not 10, because 01 → 10 would change both y and z. In 00, 01, 11, 10 every step (including the wrap from 10 back to 00) changes one bit. The other orders each contain a two-bit jump (01 → 10, or 00 → 11).' },
    { id: 't4-q27', subtopic: 't4-kmap3', type: 'numeric', difficulty: 1, src: course('c8v4 00:04:01'),
      prompt: 'In a 3-variable map F(x, y, z), which minterm sits in row x = 1, <b>last</b> column (yz = 10)?', answer: 6,
      steps: ['Row x = 1 and column yz = 10 give xyz = 110.', '110<sub>2</sub> = 4 + 2 = 6.'],
      explanation: 'The bottom row reads m4, m5, m7, m6. The instructor “skips one cell” for 6 because of the 00, 01, 11, 10 column order.' },
    Object.assign(bq(FN.f1x), { id: 't4-q28', subtopic: 't4-kmap3', difficulty: 2, src: course('c8v4 00:08:13', 'c8v4 00:09:41', 'c8v4 00:10:18'),
      prompt: `Class 8 Video 4, example 1: minimise f1(x, y, z) = ${sig(FN.f1x.ms)}.`,
      steps: ['m2, m3 sit in the top-right corner. m4, m5 sit in the bottom-left corner.', 'Top-right pair: x = 0, y = 1 → x′y.', 'Bottom-left pair: x = 1, y = 0 → xy′.', 'f1 = x′y + xy′.'],
      solutionDiagram: km(FN.f1x, ["x'y", "xy'"]),
      explanation: 'Neither pair can grow, because the surrounding cells are 0. (The captions say “x′y′” for the second term, but x = 1, y = 0 gives xy′.)' }),
    Object.assign(bq(FN.f2x), { id: 't4-q29', subtopic: 't4-kmap3', difficulty: 2, src: course('c8v4 00:11:20', 'c8v4 00:12:32', 'c8v4 00:13:20', 'c8v4 00:14:09'),
      prompt: `Class 8 Video 4, example 2: minimise f2(x, y, z) = ${sig(FN.f2x.ms)}.`,
      steps: ['m3 and m7 share y = 1, z = 1 → yz.', 'm4 is in the first column and m6 in the last column. Those edges are adjacent (fold the paper).', 'm4–m6 share x = 1, z = 0 → xz′.', 'f2 = yz + xz′.'],
      solutionDiagram: km(FN.f2x, ['yz', "xz'"]),
      explanation: 'Circling m4 and m6 separately would not be minimal. The wrap-around pair is the larger circle.' }),
    Object.assign(bq(FN.zxy), { id: 't4-q30', subtopic: 't4-kmap3', difficulty: 2, src: course('c8v4 00:06:06', 'c8v4 00:06:29'),
      prompt: `Minimise F(x, y, z) = ${sig(FN.zxy.ms)}.`,
      steps: ['1s: m0, m2 (top row, outer columns), m4, m6 (bottom row, outer columns) and m7.', 'The outer columns wrap into one group of 4: x and y change, z = 0 → z′.', 'm7 is left. Pair it with m6: x = 1, y = 1 → xy.', 'F = z′ + xy (3 literals).'],
      solutionDiagram: km(FN.zxy, ["z'", 'xy']),
      explanation: 'm6 is reused in the xy pair so that m7 gets a 2-cell circle instead of being circled alone (which would give xyz).' }),
    Object.assign(bq(FN.cyc), { id: 't4-q31', subtopic: 't4-kmap3', difficulty: 3, src: course('c8v2 00:11:13', 'c8v4 00:06:29'),
      prompt: `Minimise F(A, B, C) = ${sig(FN.cyc.ms)}. (Careful: no group of 4 exists.)`,
      steps: ['1s: m0, m1, m2 in the top row and m5, m7, m6 in the bottom row. The 0s are m3 and m4.', 'Every 1 has exactly two neighbouring 1s, and every pair is a prime implicant: A′B′, A′C′ (m0–m2 wrap), B′C, AC, BC′ (m2–m6), AB.', 'Three pairs are enough if they do not overlap: A′C′ (m0, m2) + B′C (m1, m5) + AB (m6, m7).', 'F = A′C′ + B′C + AB (6 literals). The other ring, A′B′ + AC + BC′, is equally minimal.'],
      solutionDiagram: km(FN.cyc, ["A'C'", "B'C", 'AB']),
      explanation: 'This is a “cyclic” map: no prime implicant is essential, and two different 3-term covers are both minimal. Either one is accepted. Four pairs would also cover everything, but would not be minimal.' }),
    { id: 't4-q32', subtopic: 't4-kmap3', type: 'tf', difficulty: 1, src: course('c8v4 00:06:29', 'c8v4 00:07:12'),
      prompt: 'In a 3-variable K-map, cells m0 and m2 are adjacent.', answer: true,
      explanation: 'm0 = 000 is in the first column and m2 = 010 in the last. They differ only in y, and the left and right edges are adjacent once you fold the paper.' },
    { id: 't4-q33', subtopic: 't4-kmap3', type: 'short', normalize: 'list', difficulty: 2, src: course('c8v4 00:03:33', 'c8v4 00:04:28'),
      prompt: 'List the minterms shown in this 3-variable K-map, e.g. <kbd>1, 4, 6</kbd>.',
      diagram: km(FN.zxy, []),
      accept: [FN.zxy.ms.join(', ')],
      steps: ['The top row (x = 0) reads m0 m1 m3 m2, and the bottom row (x = 1) reads m4 m5 m7 m6.', 'Read off every cell holding a 1, using those positions.', `The 1s are at ${FN.zxy.ms.join(', ')}.`],
      explanation: 'The common slip is to read the last column as m3/m7. Because of the 00, 01, 11, 10 order, the last column is yz = 10, which holds m2 and m6.' },
    { id: 't4-q34', subtopic: 't4-kmap3', type: 'mc', difficulty: 2, src: course('c8v4 00:06:06', 'c8v4 00:06:29'),
      prompt: 'Which product term covers exactly the four cells in the <b>first and last</b> columns of a 3-variable map F(x, y, z)?',
      choices: ["z'", 'z', "y'", "x'"], answer: 0,
      explanation: 'The first column is yz = 00 and the last is yz = 10. z = 0 in both while x and y take both values, so the term is z′. The middle columns are z, the left two columns are y′, and the top row is x′.' },

    /* ===== 4-variable maps ===== */
    { id: 't4-q35', subtopic: 't4-kmap4', type: 'numeric', difficulty: 1, src: course('c9v1 00:02:51', 'c9v1 00:03:15'),
      prompt: 'In a 4-variable K-map (AB rows, CD columns), which minterm sits in row AB = 11, column CD = 10?', answer: 14,
      steps: ['Row bits then column bits: ABCD = 1110.', '8 + 4 + 2 + 0 = 14.'],
      explanation: 'Row 11 is the third row (m12 m13 m15 m14), and column 10 is the last column, so the cell is m14.' },
    { id: 't4-q36', subtopic: 't4-kmap4', type: 'mc', difficulty: 1, src: course('c9v1 00:02:23', 'c9v1 00:02:51'),
      prompt: 'In the 4-variable map, which row holds m8, m9, m11, m10?',
      choices: ['The bottom (fourth) row, AB = 10', 'The third row, AB = 11', 'The second row, AB = 01', 'The top row, AB = 00'], answer: 0,
      explanation: 'The rows run AB = 00, 01, 11, 10. Minterms 8–11 have AB = 10, so they are in the bottom row. The third row (AB = 11) holds m12–m15, which is the “hop” the instructor points out.' },
    Object.assign(bq(FN.corners), { id: 't4-q37', subtopic: 't4-kmap4', difficulty: 2, src: course('c9v2 00:09:56', 'c9v2 00:11:52', 'c9v2 00:12:49'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.corners.ms)}.`,
      steps: ['m0, m2, m8, m10 are the four corners of the map.', 'Left–right and top–bottom wrap-around make the four corners one group of 4.', 'A and C change. B = 0 and D = 0 → B′D′.'],
      solutionDiagram: km(FN.corners, ["B'D'"]),
      explanation: 'This is the instructor’s “really funky” four-corner group from Class 9 Video 2.' }),
    Object.assign(bq(FN.bonly), { id: 't4-q38', subtopic: 't4-kmap4', difficulty: 1, src: course('c9v1 00:05:00', 'c9v1 00:10:28'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.bonly.ms)}.`,
      steps: ['The 1s fill the two middle rows (AB = 01 and 11): 8 cells.', 'A, C and D all change. B = 1 throughout.', 'A group of 8 leaves 1 literal: F = B.'],
      solutionDiagram: km(FN.bonly, ['B']),
      explanation: 'The middle two rows are the B = 1 region. Eight cells in a 4-variable map give a single literal.' }),
    Object.assign(bq(FN.bd1), { id: 't4-q39', subtopic: 't4-kmap4', difficulty: 2, src: course('c9v2 00:09:56', 'c9v2 00:10:11'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.bd1.ms)}.`,
      steps: ['m1, m3 are in the top row (middle columns). m9, m11 are in the bottom row (middle columns).', 'The top and bottom rows are adjacent (fold the map), so the four cells form a group.', 'A and C change. B = 0 and D = 1 → B′D.'],
      solutionDiagram: km(FN.bd1, ["B'D"]),
      explanation: 'Without the top–bottom wrap you would write two pairs, A′B′D + AB′D (6 literals), instead of B′D (2 literals).' }),
    { id: 't4-q40', subtopic: 't4-kmap4', type: 'mc', difficulty: 2, src: course('c9v1 00:05:38', 'c9v1 00:05:56'),
      prompt: 'A circle covers m3, m7, m15, m11, the whole CD = 11 column. Which product term is it?',
      choices: ['CD', "C'D'", 'AC', 'BD'], answer: 0,
      explanation: 'A and B take every value down the column and drop out. C = 1 and D = 1 in every cell, so the term is CD. C′D′ is the first column, AC is the bottom-right 2 × 2, and BD is the centre 2 × 2.' },
    { id: 't4-q41', subtopic: 't4-kmap4', type: 'numeric', difficulty: 2, src: course('c9v1 00:08:58', 'c9v1 00:09:31'),
      prompt: 'How many cells of a 4-variable K-map does the product term A′C cover?', answer: 4,
      steps: ['A′C fixes two variables (A = 0, C = 1).', 'The other two variables, B and D, are free: 2 × 2 = 4 combinations.', 'Cells: m2, m3, m6, m7 (top two rows, right two columns).'],
      explanation: 'A term with k literals in an n-variable map covers 2<sup>n − k</sup> cells. Here 2<sup>4 − 2</sup> = 4.' },
    { id: 't4-q42', subtopic: 't4-kmap4', type: 'tf', difficulty: 2, src: course('c9v2 00:09:56', 'c9v2 00:11:52'),
      prompt: 'In a 4-variable K-map, m2 and m8 are adjacent, because both are corner cells.', answer: false,
      explanation: 'm2 = 0010 and m8 = 1000 differ in two variables (A and C), so they are diagonal corners. Each corner is adjacent to the two corners it shares an edge with through wrap-around: m2 is adjacent to m0 and m10. All four corners together still form a legal group of 4 (B′D′).' },
    Object.assign(bq(FN.acac), { id: 't4-q43', subtopic: 't4-kmap4', difficulty: 3, src: course('c9v1 00:05:38', 'c9v2 00:09:56'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.acac.ms)}.`,
      steps: ['Top two rows (A = 0), left two columns (C = 0): m0, m1, m4, m5 → A′C′.', 'Bottom two rows (A = 1), right two columns (C = 1): m15, m14, m11, m10 → AC.', 'No other 1s remain. F = A′C′ + AC (4 literals).'],
      solutionDiagram: km(FN.acac, ["A'C'", 'AC']),
      explanation: 'Two 2 × 2 squares in opposite quadrants. They do not touch, so they cannot merge into a group of 8. F is the XNOR of A and C.' }),
    { id: 't4-q44', subtopic: 't4-kmap4', type: 'multi', difficulty: 2, src: course('c9v1 00:08:58'),
      prompt: 'Which of these product terms describe a group of exactly <b>4</b> cells in a 4-variable K-map? Select all that apply.',
      choices: ["A'C'", 'BD', "B'", 'ACD', "CD'", "A'B'C'D'"], answers: [0, 1, 4],
      explanation: 'In a 4-variable map a 4-cell group has 2 literals: A′C′, BD and CD′. B′ has 1 literal (8 cells), ACD has 3 (2 cells), and A′B′C′D′ has 4 (1 cell).' },

    /* ===== worked examples ===== */
    Object.assign(bq(FN.ex1), { id: 't4-q45', subtopic: 't4-examples', difficulty: 2, src: course('c9v2 00:00:07', 'c9v2 00:02:16', 'c9v2 00:03:27', 'c9v2 00:04:50', 'c9v2 00:05:52'),
      prompt: `Class 9 Video 2, example 1: minimise F(A, B, C, D) = ${sig(FN.ex1.ms)}.`,
      steps: ['The left two columns are all 1s: an 8-cell group, C = 0 → C′.', 'm14 pairs with m6 and wraps around to m12 and m4: B = 1, D = 0 → BD′.', 'm2 wraps around to m0 and joins m4, m6: A = 0, D = 0 → A′D′.', 'F = C′ + A′D′ + BD′ (5 literals).'],
      solutionDiagram: km(FN.ex1, ["C'", "BD'", "A'D'"]),
      explanation: 'Each of the three groups is as large as it can be, and each is the only group covering some 1 (m1 for C′, m2 for A′D′, m14 for BD′). The captions say “B′D′”, but the instructor reads the green circle as B = 1, D = 0.' }),
    Object.assign(bq(FN.ex2), { id: 't4-q46', subtopic: 't4-examples', difficulty: 3, src: course('c9v2 00:06:47', 'c9v2 00:08:15', 'c9v2 00:10:11', 'c9v2 00:11:52', 'c9v2 00:12:49'),
      prompt: `Class 9 Video 2, example 2: minimise F(A, B, C, D) = ${sig(FN.ex2.ms)}.`,
      steps: ['m6 has a single neighbouring 1, m2: A = 0, C = 1, D = 0 → A′CD′.', 'Top–bottom wrap: m0, m1, m8, m9 → B = 0, C = 0 → B′C′.', 'm10 joins the four corners m0, m2, m8, m10 → B = 0, D = 0 → B′D′.', 'F = B′C′ + B′D′ + A′CD′ (7 literals).'],
      solutionDiagram: km(FN.ex2, ["B'C'", "B'D'", "A'CD'"]),
      explanation: 'Both wrap-arounds are needed: B′C′ uses the top–bottom wrap, and the corner group B′D′ uses both. Without them, the bottom-row 1s m8, m9, m10 could only be covered by smaller groups with more literals. The instructor first wrote C′ for the corners and corrected it to D′.' }),
    { id: 't4-q47', subtopic: 't4-examples', type: 'mc', difficulty: 1, src: course('c9v2 00:02:16', 'c9v2 00:03:03'),
      prompt: `In Class 9 Example 1, F = ${sig(FN.ex1.ms)}, which product term describes the <b>largest</b> circle?`,
      choices: ["C'", "A'D'", "BD'", "D'"], answer: 0,
      explanation: 'The eight cells of the two left columns share only C = 0, so the term is C′ (eight cells → one literal). A′D′ and BD′ are 4-cell groups. D′ (the outer columns) is not a legal group here, because it would include m10, which is 0.' },
    { id: 't4-q48', subtopic: 't4-examples', type: 'mc', difficulty: 3, src: course('c9v2 00:04:28', 'c9v2 00:05:52'),
      prompt: `The captions of Class 9 Video 2 give Example 1’s answer (F = ${sig(FN.ex1.ms)}) as “A′D′ + B′D′ + C′”. Why can that not be right?`,
      choices: ['B′D′ is the four-corner group, which includes m10, a 0 of this function', 'B′D′ has too many literals to be part of a minimal SOP', 'Corners can never be grouped in a K-map', 'The captions are right; B′D′ and BD′ cover the same cells'], answer: 0,
      explanation: 'B′D′ covers m0, m2, m8, m10, and m10 is 0 here, so that expression would output 1 where F = 0. The circle the instructor drew (m4, m6, m12, m14) has B = 1 and D = 0: <b>BD′</b>. Corner groups are legal in general (Example 2 uses one).' },
    Object.assign(bq(FN.k8), { id: 't4-q49', subtopic: 't4-examples', difficulty: 3, src: course('c9v2 00:08:15', 'c9v2 00:09:56'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.k8.ms)}.`,
      steps: ['m1, m3, m9, m11 (middle columns of the top and bottom rows) wrap top–bottom: B = 0, D = 1 → B′D.', 'm4 has only one neighbouring 1, m5: A = 0, B = 1, C = 0 → A′BC′.', 'm14 has only one neighbouring 1, m15: A = 1, B = 1, C = 1 → ABC.', 'All eight 1s are covered: F = B′D + A′BC′ + ABC (8 literals).'],
      solutionDiagram: km(FN.k8, ["B'D", "A'BC'", 'ABC']),
      explanation: 'Start with the 1s that can be grouped only one way (m4, m14), plus the big wrap-around quad. The pairs A′C′D (m1, m5) and ACD (m11, m15) are also prime, but every 1 they cover is already covered.' }),
    Object.assign(bq(FN.kq), { id: 't4-q50', subtopic: 't4-examples', difficulty: 3, src: course('c9v2 00:08:15'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.kq.ms)}.`,
      steps: ['m5, m7, m13, m15 form the centre 2 × 2: B = 1, D = 1 → BD.', 'm0 has only one neighbouring 1, m4 (m1, m2, m8 are 0): A = 0, C = 0, D = 0 → A′C′D′.', 'Every 1 is now covered: F = A′C′D′ + BD (5 literals).'],
      solutionDiagram: km(FN.kq, ["A'C'D'", 'BD']),
      explanation: 'A′BC′ (m4, m5) is also a legal pair, but using it for m4 would still leave m0 needing A′C′D′. A′C′D′ covers both m0 and m4 in one term.' }),
    Object.assign(bq(FN.sizes), { id: 't4-q51', subtopic: 't4-examples', difficulty: 2, src: course('c9v1 00:08:00', 'c9v1 00:09:31'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.sizes.ms)}.`,
      steps: ['m0, m1, m4, m5 are the top-left 2 × 2: A = 0, C = 0 → A′C′.', 'm14’s only neighbouring 1 is m6. The pair shares B = 1, C = 1, D = 0 → BCD′.', 'F = A′C′ + BCD′.'],
      solutionDiagram: km(FN.sizes, ["A'C'", "BCD'"]),
      explanation: 'These are the instructor’s 4-cell and 2-cell examples from Class 9 Video 1. A′BD′ (m4, m6) is also a pair, but it does not cover m14, so BCD′ is still needed. With BCD′ present, A′BD′ is redundant.' }),
    { id: 't4-q52', subtopic: 't4-examples', type: 'short', normalize: 'list', difficulty: 2, src: course('c9v2 00:08:15', 'c9v2 00:08:47'),
      prompt: `In Class 9 Example 2 (F = ${sig(FN.ex2.ms)}), which minterms does the circle A′CD′ cover?`,
      accept: [cellsOf("A'CD'", A4).join(', ')],
      steps: ['A′CD′ fixes A = 0, C = 1, D = 0. Only B is free.', 'B = 0 → 0010 = m2. B = 1 → 0110 = m6.', 'The circle covers m2 and m6.'],
      explanation: 'A three-literal term in a 4-variable map covers 2<sup>4−3</sup> = 2 cells. It is the only circle that can cover m6.' },

    /* ===== don't cares ===== */
    { id: 't4-q53', subtopic: 't4-dontcares', type: 'mc', difficulty: 1, src: course('c9v3 00:00:23', 'c9v3 00:03:06'),
      prompt: 'When is an output marked as a <b>don’t-care</b> (X)?',
      choices: ['When that input combination can never occur, so the output value does not matter', 'When the output is 0 for that input', 'When the output must be 1 for that input', 'When the input produces two different outputs'], answer: 0,
      explanation: 'Don’t-cares come from incompletely specified functions: some input values are impossible (like knob code 11, or a die showing 0 or 7). Output 0 and output 1 are ordinary specified values.' },
    { id: 't4-q54', subtopic: 't4-dontcares', type: 'tf', difficulty: 1, src: course('c9v3 00:14:28'),
      prompt: 'A K-map circle may consist only of X’s.', answer: false,
      explanation: 'You cover an X only if it helps make a larger circle around your 1s. A circle of only X’s covers no 1, so it would add a useless term.' },
    Object.assign(bq(FN.knob), { id: 't4-q55', subtopic: 't4-dontcares', difficulty: 2, src: course('c9v3 00:02:02', 'c9v3 00:02:34', 'c9v3 00:07:00', 'c9v3 00:07:28'),
      prompt: 'Class 9 Video 3, the knob: off = 00, low = 01, high = 10, and 11 never occurs. F3(x, y) = 1 when the knob is on. Give a minimal SOP, using the don’t-care.',
      diagram: ttOf(FN.knob, 'F3'),
      steps: ['F3 = 1 at m1 (01) and m2 (10). The X is at m3 (11).', 'Treat the X as 1: bottom row m2–m3 → x. Right column m1–m3 → y.', 'F3 = x + y.'],
      solutionDiagram: km(FN.knob, ['x', 'y']),
      explanation: 'With the X taken as 0, m1 and m2 are diagonal and the answer would be xy′ + x′y. Using the X gives two 1-literal terms.' }),
    Object.assign(bq(FN.die), { id: 't4-q56', subtopic: 't4-dontcares', difficulty: 2, src: course('c9v3 00:09:12', 'c9v3 00:10:25', 'c9v3 00:11:26', 'c9v3 00:11:58'),
      prompt: 'Class 9 Video 3, the die: abc (a = MSB) is the number shown on a die. f4 = 1 when the number is 4 or more. Give a minimal SOP for f4(a, b, c).',
      steps: ['f4 = 1 for 4, 5, 6 (m4, m5, m6) and f4 = 0 for 1, 2, 3.', 'A die never shows 0 or 7, so m0 and m7 are X.', 'The bottom row m4, m5, m7(X), m6 is a group of 4: a = 1 → a.', 'f4 = a. The X at m0 is left out.'],
      solutionDiagram: km(FN.die, ['a']),
      explanation: 'Using the X at m7 completes the a = 1 row. Without it the best is ab′ + ac′ (two terms), which the lecture shows is more complex.' }),
    { id: 't4-q57', subtopic: 't4-dontcares', type: 'mc', difficulty: 2, src: course('c9v3 00:14:28', 'c9v3 00:15:24'),
      prompt: 'In the die example (f4 = 1 for 4, 5, 6, and X at m0 and m7), why does the instructor leave the X at m0 <b>out</b> of every circle?',
      choices: ['Including it would not make any circle of 1s larger, because the single group a already covers every 1', 'Don’t-cares in the top row are never allowed in a circle', 'An X must always be treated as 0', 'm0 is not adjacent to any 1'], answer: 0,
      explanation: 'The rule is to cover an X only if it helps you make a larger area for a circle that has 1s. After circling the bottom row (a), every 1 is covered, so pulling in m0 would only add a term (b′c′ with m4). m0 is adjacent to m4, so the last choice is false. Position in the map does not matter, and an X can be treated as 1 when that helps.' },
    { id: 't4-q58', subtopic: 't4-dontcares', type: 'numeric', difficulty: 2, src: course('c9v3 00:06:13', 'c9v3 00:06:40'),
      prompt: 'In the knob example, if you treat the X (input 11) as <b>0</b>, how many literals does the minimal SOP for F3(x, y) have?', answer: 4,
      steps: ['With X = 0 the 1s are m1 (01) and m2 (10) only.', 'They are diagonal, so no pair exists, and each is circled alone.', 'F3 = x′y + xy′: 2 + 2 = 4 literals.'],
      explanation: 'Treating the X as 1 instead gives F3 = x + y with 2 literals. That is why the lecture says the X helps very much.' },
    Object.assign(bq(FN.sega), { id: 't4-q59', subtopic: 't4-dontcares', difficulty: 3, src: guide('BCD-to-7-segment decoder: K-map for segment a with 10–15 as don’t-cares. The segment pattern (6 drawn with its top bar) is standard.'),
      prompt: `BCD to 7-segment drill: segment a is lit for digits 0, 2, 3, 5, 6, 7, 8, 9 and dark for 1 and 4. Inputs 10–15 never occur. Give a minimal SOP for a(A, B, C, D): a = ${dsig(FN.sega)}.`,
      steps: ['A group of 8: m8, m9 and the X’s m10–m15 (A = 1) → A.', 'A group of 8: m2, m3, m6, m7 with the X’s m10, m11, m14, m15 (C = 1) → C.', 'm5 with m7 and the X’s m13, m15 (B = 1, D = 1) → BD.', 'm0 with m2, m8 and the X at m10 (the four corners: B = 0, D = 0) → B′D′.', 'a = A + C + BD + B′D′ (6 literals).'],
      solutionDiagram: km(FN.sega, ['A', 'C', 'BD', "B'D'"]),
      explanation: 'The don’t-cares let two groups grow to 8 cells. If the X’s were all 0, the minimum would be 11 literals, e.g. A′C + A′BD + AB′C′ + B′C′D′.' }),
    Object.assign(bq(FN.bcd5), { id: 't4-q60', subtopic: 't4-dontcares', difficulty: 3, src: supp('BCD digit ≥ 5 detector with don’t-cares (standard example)'),
      prompt: `A BCD digit ABCD (only 0–9 occur) drives F = 1 when the digit is 5 or more. Give a minimal SOP: F = ${dsig(FN.bcd5)}.`,
      steps: ['A = 1 rows: m8, m9 plus the X’s m10–m15 form a group of 8 → A.', 'm5, m7 with the X’s m13, m15 (B = 1, D = 1) → BD.', 'm6, m7 with the X’s m14, m15 (B = 1, C = 1) → BC.', 'F = A + BD + BC (5 literals).'],
      solutionDiagram: km(FN.bcd5, ['A', 'BD', 'BC']),
      explanation: 'Each group uses X’s to double its size. Without the don’t-cares you would need terms such as AB′C′ for 8 and 9, and A′BD for 5 and 7.' }),
    { id: 't4-q61', subtopic: 't4-dontcares', type: 'multi', difficulty: 3, src: guide('“K-map with 2 don’t-cares, 4 variables — justify which don’t-care assignments yield the simplest cover.” (This instance has three.)'),
      prompt: `F(A, B, C, D) = ${dsig(FN.dc2)}. Which of these are <b>minimal</b> SOP answers? Select all that apply.`,
      choices: ["CD + A'B'", "CD + A'D", "CD + A'B'D", "CD + B'D", "A'B' + A'D + CD"], answers: [0, 1],
      steps: ['CD (m3, m7, m11, m15) is essential: it is the only prime implicant covering m11 and m15.', 'Only m1 is left. Its largest circles are A′B′ (m0, m1, m2, m3, using the X’s at m0 and m2) and A′D (m1, m3, m5, m7, using the X at m5).', 'Either one finishes the cover with 2 literals, so both CD + A′B′ and CD + A′D are minimal (4 literals).', 'CD + A′B′D is correct but has 5 literals. A′B′ + A′D + CD has a redundant term (6 literals).', 'B′D includes m9 (1001), a 0 of F, so CD + B′D is wrong.'],
      solutionDiagram: km(FN.dc2, ['CD', "A'B'"]),
      explanation: 'The choice of which X’s to use is the whole point. Treating m0, m2 as 1 (and m5 as 0) gives A′B′. Treating m5 as 1 (and m0, m2 as 0) gives A′D. Both are equally simple.' },
    Object.assign(bq(FN.dc3b), { id: 't4-q62', subtopic: 't4-dontcares', difficulty: 2, src: course('c9v3 00:14:28'),
      prompt: `Minimise F(A, B, C) = ${dsig(FN.dc3b)}.`,
      steps: ['1s at m0, m4, m6. X’s at m2 and m5.', 'Treat the X at m2 as 1: m0, m2, m4, m6 are the outer columns (C = 0), a group of 4 → C′.', 'The X at m5 does not help any circle, so leave it out.', 'F = C′.'],
      solutionDiagram: km(FN.dc3b, ["C'"]),
      explanation: 'Using m2 turns the 1s into a full wrap-around quad. Including m5 would need a second circle that covers no new 1, so it is ignored.' }),
    { id: 't4-q63', subtopic: 't4-dontcares', type: 'match', difficulty: 2, src: course('c9v3 00:04:23', 'c9v3 00:08:03', 'c9v3 00:14:28'),
      prompt: 'Match each kind of cell to how you treat it when minimising an SOP.',
      pairs: [['An X that lets a circle of 1s grow larger', 'Treat it as 1 and include it'], ['An X that no circle of 1s needs', 'Leave it out (treat it as 0)'], ['A cell holding 0', 'Never inside any circle'], ['A cell holding 1', 'Inside at least one circle']],
      explanation: 'Every 1 must be covered (rule 1), and 0s must never be covered. X’s are flexible: include them only when it helps.' },
    { id: 't4-q64', subtopic: 't4-dontcares', type: 'tf', difficulty: 2, src: course('c9v1 00:00:18', 'c9v3 00:04:23'),
      prompt: 'Using don’t-cares can never make the minimal SOP <i>larger</i> than treating every X as 0.', answer: true,
      explanation: 'Treating all X’s as 0 is one of the allowed choices. Having the freedom to use some X’s as 1 can only keep the cost the same or reduce it. The knob drops from 4 literals to 2, and the die from two terms to one.' },

    /* ===== prime and essential prime implicants ===== */
    { id: 't4-q65', subtopic: 't4-implicants', type: 'mc', difficulty: 1, src: suppGuide('Essential prime implicants'),
      prompt: 'What is an <b>essential</b> prime implicant?',
      choices: ['A prime implicant that is the only one covering at least one 1 of the function', 'Any prime implicant with the fewest literals', 'The largest circle in the K-map', 'A circle that covers only don’t-cares'], answer: 0,
      explanation: 'Essential means some 1 has no other prime implicant covering it, so every minimal SOP must include it. Size alone does not make a PI essential: the largest circle can even be unnecessary.' },
    { id: 't4-q66', subtopic: 't4-implicants', type: 'numeric', difficulty: 2, src: supp('Prime implicant counting'),
      prompt: `How many prime implicants does P(A, B, C) = ${sig(FN.prime3.ms)} have?`, answer: 3,
      steps: ['Maximal circles: m2–m3 → A′B; m5–m7 → AC; m3–m7 → BC.', 'No group of 4 exists (every quad containing these cells also contains a 0).', 'That makes 3 prime implicants.'],
      solutionDiagram: km(FN.prime3, ["A'B", 'AC', 'BC']),
      explanation: 'All three pairs are prime because none can grow. Only A′B and AC are essential; BC is the consensus term.' },
    { id: 't4-q67', subtopic: 't4-implicants', type: 'numeric', difficulty: 2, src: supp('Essential prime implicant counting'),
      prompt: `How many <b>essential</b> prime implicants does P(A, B, C) = ${sig(FN.prime3.ms)} have?`, answer: 2,
      steps: ['The PIs are A′B (m2, m3), AC (m5, m7) and BC (m3, m7).', 'm2 is covered only by A′B, so A′B is essential. m5 is covered only by AC, so AC is essential.', 'Every 1 that BC covers (m3, m7) is also covered by another PI, so BC is not essential.', 'That makes 2 essential PIs.'],
      explanation: 'P = A′B + AC uses exactly the two essential PIs. BC is redundant for the function, though it is the term you would add to remove a static hazard.' },
    { id: 't4-q68', subtopic: 't4-implicants', type: 'multi', difficulty: 3, src: supp('Finding essential prime implicants'),
      prompt: `For F(A, B, C, D) = ${sig(FN.pi1.ms)}, which of these are <b>essential</b> prime implicants? Select all that apply.`,
      choices: ["B'C'", "CD'", "A'BD", "B'D'", "A'BC", "A'C'D"], answers: [0, 1],
      steps: ['Prime implicants: B′C′, B′D′, CD′, A′BD, A′BC, A′C′D.', 'm9 (1001) is covered only by B′C′, so it is essential. m14 (1110) is covered only by CD′, so it is essential.', 'Check the rest: m5 is covered by A′BD and A′C′D, and m7 by A′BD and A′BC, so none of those three is essential. Every cell of B′D′ is also covered by B′C′ or CD′.', 'After the EPIs, choose A′BD for m5 and m7: F = B′C′ + CD′ + A′BD.'],
      solutionDiagram: km(FN.pi1, ["B'C'", "CD'", "A'BD"]),
      explanation: 'A PI is essential only if some 1 has no other PI covering it. A′BD ends up in the minimal answer, but it is a choice, not a necessity: A′C′D + A′BC would also cover m5 and m7, at higher cost.' },
    { id: 't4-q69', subtopic: 't4-implicants', type: 'tf', difficulty: 3, src: supp('Redundant prime implicants'),
      prompt: `For F(A, B, C, D) = ${sig(FN.trap.ms)}, the quad BD (m5, m7, m13, m15) must appear in every minimal SOP, because it is the largest group.`, answer: false,
      steps: ['Essential PIs: A′C′D (only cover of m1), A′BC (only cover of m6), ABC′ (only cover of m12), ACD (only cover of m11).', 'Together they cover m1, m5, m6, m7, m11, m12, m13, m15, which is every 1.', 'BD covers nothing new, so it is not in the minimal SOP.'],
      solutionDiagram: km(FN.trap, ["A'C'D", "A'BC", "ABC'", 'ACD']),
      explanation: `The minimal SOP is ${pr(FN.trap.sop)} (12 literals). Adding BD would give 14. Take the essential PIs first, then fill gaps; do not start with the biggest circle.` },
    Object.assign(bq(FN.trap), { id: 't4-q70', subtopic: 't4-implicants', difficulty: 3, src: supp('Essential-first minimisation'),
      prompt: `Minimise F(A, B, C, D) = ${sig(FN.trap.ms)}. (Hint: find the essential prime implicants first.)`,
      steps: ['m1 has one neighbouring 1, m5 → A′C′D. m6 has one, m7 → A′BC. m12 has one, m13 → ABC′. m11 has one, m15 → ACD.', 'These four EPIs cover all eight 1s, including m5, m7, m13, m15.', 'F = A′C′D + A′BC + ABC′ + ACD (12 literals).'],
      solutionDiagram: km(FN.trap, ["A'C'D", "A'BC", "ABC'", 'ACD']),
      explanation: 'The tempting quad BD is a prime implicant, but it is redundant here. An answer that includes BD has more literals than the minimum and is graded as not minimal.' }),
    { id: 't4-q71', subtopic: 't4-implicants', type: 'match', difficulty: 1, src: suppGuide('Implicant terminology'),
      prompt: 'Match each term to its meaning.',
      pairs: [['Implicant', 'A product term that is 1 only where F is 1 (or X)'], ['Prime implicant', 'An implicant that cannot be enlarged into a bigger legal group'], ['Essential prime implicant', 'The only prime implicant covering some 1'], ['Cover', 'A set of implicants that together include every 1 of F']],
      explanation: 'A minimal SOP is a cover made of prime implicants: all the essential ones, plus as few others as needed.' },
    { id: 't4-q72', subtopic: 't4-implicants', type: 'mc', difficulty: 3, src: supp('Prime implicants with don’t-cares'),
      prompt: 'Die example: f4(a, b, c) = Σm(4, 5, 6) + d(0, 7). Which of these is a <b>prime implicant that is not essential</b>?',
      choices: ["b'c'", 'a', "ab'", "ac'"], answer: 0,
      steps: ['With the X’s available, the maximal circles are a (m4, m5, m6, X7) and b′c′ (X0, m4).', 'a is the only PI covering m5 and m6, so it is essential.', 'b′c′ covers m4, which a also covers, so b′c′ is prime but not essential.', 'ab′ and ac′ are contained in a, so they are not prime.'],
      solutionDiagram: km(FN.die, ['a', "b'c'"]),
      explanation: 'With don’t-cares, a prime implicant may include X cells (b′c′ uses the X at m0). It is still only needed if it covers a 1 that nothing else covers.' },
    { id: 't4-q73', subtopic: 't4-implicants', type: 'tf', difficulty: 1, src: suppGuide('Essential prime implicants'),
      prompt: 'Every essential prime implicant appears in every minimal SOP of the function.', answer: true,
      explanation: 'An EPI is the only prime implicant covering some 1. A minimal SOP can be built from prime implicants only, so it must include that EPI or leave the 1 uncovered.' },
    { id: 't4-q74', subtopic: 't4-implicants', type: 'numeric', difficulty: 3, src: supp('Prime implicant counting'),
      prompt: `How many prime implicants does F(A, B, C, D) = ${sig(FN.k8.ms)} have?`, answer: 5,
      steps: ['Quad: m1, m3, m9, m11 → B′D.', 'Pairs that cannot grow: m4–m5 → A′BC′; m14–m15 → ABC; m1–m5 → A′C′D; m11–m15 → ACD.', 'No other circle is maximal, so there are 5 prime implicants.', 'Essential: B′D (m3, m9), A′BC′ (m4), ABC (m14). Not essential: A′C′D, ACD.'],
      solutionDiagram: km(FN.k8, ["B'D", "A'BC'", 'ABC', "A'C'D", 'ACD']),
      explanation: `Only 3 of the 5 are needed: F = ${pr(FN.k8.sop)}.` },

    /* ===== POS ===== */
    { id: 't4-q75', subtopic: 't4-pos', type: 'mc', difficulty: 1, src: suppGuide('POS by grouping the 0s'),
      prompt: 'To read a minimal <b>product of sums</b> from a K-map, which cells do you group?',
      choices: ['The 0s (don’t-cares may be used as 0s)', 'The 1s, exactly as for SOP', 'Only the don’t-cares', 'Diagonal pairs of 1s'], answer: 0,
      explanation: 'Grouping the 0s gives the SOP of F′. Complementing it with De Morgan gives F as a product of sums.' },
    Object.assign(bq(FN.f2x, 'pos'), { id: 't4-q76', subtopic: 't4-pos', difficulty: 2, src: supp('POS by grouping 0s'),
      prompt: `Give a minimal <b>product of sums</b> for f(x, y, z) = ${sig(FN.f2x.ms)}.`,
      steps: ['The 0s are m0, m1, m2, m5.', 'm0–m2 (wrap): x = 0, z = 0 → (x + z).', 'm1–m5: y = 0, z = 1 → (y + z′).', 'f = (x + z)(y + z′).'],
      solutionDiagram: kmComp(FN.f2x, ["x'z'", "y'z"]),
      explanation: 'The map shows F′, whose 1s are the 0s of f. Its groups x′z′ and y′z become the sum terms (x + z) and (y + z′). This POS costs 4 literals, the same as the SOP yz + xz′.' }),
    Object.assign(bq(FN.ex1, 'pos'), { id: 't4-q77', subtopic: 't4-pos', difficulty: 3, src: supp('POS by grouping 0s'),
      prompt: `Give a minimal product of sums for Class 9 Example 1, F(A, B, C, D) = ${sig(FN.ex1.ms)}.`,
      steps: ['The 0s are m3, m7, m10, m11, m15.', 'm3, m7, m15, m11 = the CD = 11 column: C = 1, D = 1 → (C′ + D′).', 'm10 pairs with m11: A = 1, B = 0, C = 1 → (A′ + B + C′).', 'F = (C′ + D′)(A′ + B + C′).'],
      solutionDiagram: kmComp(FN.ex1, ['CD', "AB'C"]),
      explanation: 'F′ = CD + AB′C, so by De Morgan F = (C′ + D′)(A′ + B + C′), 5 literals.' }),
    { id: 't4-q78', subtopic: 't4-pos', type: 'mc', difficulty: 2, src: supp('Reading a group of 0s'),
      prompt: 'In a 3-variable map F(x, y, z), the 0s at m0 and m1 are grouped. Which <b>sum term</b> does that group contribute to the POS?',
      choices: ['(x + y)', "(x' + y')", "x'y'", '(x + y + z)'], answer: 0,
      explanation: 'm0 = 000 and m1 = 001: x = 0 and y = 0 throughout, z changes. For a 0-group, 0 means plain, so the sum term is (x + y). Check: x + y is 0 exactly when x = y = 0, i.e. at m0 and m1. x′y′ is the corresponding term of F′, not of F. (x + y + z) covers only m0.' },
    { id: 't4-q79', subtopic: 't4-pos', type: 'tf', difficulty: 1, src: supp('Reading a group of 0s'),
      prompt: 'When you read a group of <b>0s</b> as a sum term, a variable that is 1 throughout the group appears <b>complemented</b>.', answer: true,
      explanation: 'The sum term must be 0 on that group. A variable that is 1 there has to appear as its complement (which is 0) so the whole sum can be 0. This is the opposite of reading a group of 1s.' },
    Object.assign(bq(FN.maj, 'pos'), { id: 't4-q80', subtopic: 't4-pos', difficulty: 2, src: supp('POS by grouping 0s'),
      prompt: 'Majority function P(A, B, C) = Σm(3, 5, 6, 7): give a minimal product of sums.',
      steps: ['The 0s are m0, m1, m2, m4.', 'm0–m1: A = 0, B = 0 → (A + B).', 'm0–m2: A = 0, C = 0 → (A + C).', 'm0–m4: B = 0, C = 0 → (B + C).', 'P = (A + B)(A + C)(B + C).'],
      solutionDiagram: kmComp(FN.maj, ["A'B'", "A'C'", "B'C'"]),
      explanation: 'The 0s mirror the 1s: m0 is next to each of the other three 0s. The POS also has 6 literals, the same cost as AB + AC + BC.' }),
    Object.assign(bq(FN.f1x, 'pos'), { id: 't4-q81', subtopic: 't4-pos', difficulty: 2, src: supp('POS by grouping 0s'),
      prompt: `Class 8 example f1(x, y, z) = ${sig(FN.f1x.ms)}: give a minimal product of sums.`,
      steps: ['The 0s are m0, m1 (top-left) and m7, m6 (bottom-right).', 'm0–m1: x = 0, y = 0 → (x + y).', 'm7–m6: x = 1, y = 1 → (x′ + y′).', 'f1 = (x + y)(x′ + y′).'],
      solutionDiagram: kmComp(FN.f1x, ["x'y'", 'xy']),
      explanation: 'Expanding gives xx′ + xy′ + x′y + yy′ = x′y + xy′, which matches the SOP. Both forms describe x ⊕ y with 4 literals.' }),

    /* ===== static hazards ===== */
    { id: 't4-q82', subtopic: 't4-hazards', type: 'mc', difficulty: 1, src: suppGuide('Static hazards'),
      prompt: 'What is a <b>static-1 hazard</b>?',
      choices: ['When one input changes, the output should stay 1 but briefly drops to 0', 'The output is permanently stuck at 1', 'The output should change from 0 to 1 but changes late', 'Two outputs are 1 at the same time'], answer: 0,
      explanation: '“Static” means the output should not change, and “1” is the value it should hold. The glitch comes from unequal path delays, for example through an inverter.' },
    { id: 't4-q83', subtopic: 't4-hazards', type: 'tf', difficulty: 1, src: suppGuide('Static hazards'),
      prompt: 'A circuit can have a static hazard even though its Boolean expression is logically correct.', answer: true,
      explanation: 'Hazards are a timing effect. The expression gives the right steady-state value for every input, but during a transition the gates do not all switch at the same instant.' },
    { id: 't4-q84', subtopic: 't4-hazards', type: 'mc', difficulty: 2, src: suppGuide('Static-1 hazards on a K-map'),
      prompt: 'F = yz + xz′ is built from AND/OR gates and one inverter. Which single input change can cause a static-1 glitch?',
      choices: ['z changes while x = 1 and y = 1', 'x changes while y = 1 and z = 1', 'y changes while x = 1 and z = 0', 'z changes while x = 0 and y = 1'], answer: 0,
      steps: ['A static-1 hazard needs two adjacent 1-cells covered by different groups, with no group covering both.', 'z changing with x = y = 1 moves between m7 (yz) and m6 (xz′), which are in different groups → hazard.', 'x changing with y = z = 1 moves between m3 and m7, both in yz → safe. y changing with x = 1, z = 0 moves between m4 and m6, both in xz′ → safe.', 'z changing with x = 0, y = 1 moves between m2 (0) and m3 (1). The output really changes, so it is not a static hazard.'],
      solutionDiagram: km(FN.f2x, ['yz', "xz'"]),
      explanation: 'During the z transition, yz switches off before xz′ (delayed by the inverter) switches on, so F dips to 0.' },
    { id: 't4-q85', subtopic: 't4-hazards', type: 'mc', difficulty: 2, src: suppGuide('The redundant cover term'),
      prompt: 'Which term should be added to F = yz + xz′ to remove its static-1 hazard?',
      choices: ['xy', "x'y", "yz'", 'xz'], answer: 0,
      explanation: 'The adjacent 1s m6 (110) and m7 (111) must share one group. Their common literals are x = 1, y = 1, giving xy (the consensus of yz and xz′). x′y, yz′ and xz are not implicants of F: each would turn a 0 of F (m2, m2 and m5 respectively) into a 1.' },
    { id: 't4-q86', subtopic: 't4-hazards', type: 'mc', difficulty: 3, src: suppGuide('Static-1 hazards on a K-map'),
      prompt: 'F = xy′ + yz. Which input change can cause a static-1 glitch, and which term fixes it?',
      choices: ['y changes while x = 1, z = 1; add xz', 'z changes while x = 1, y = 1; add xy', 'x changes while y = 1, z = 1; add yz', 'y changes while x = 1, z = 0; add xz′'], answer: 0,
      steps: [`F = ${sig(HZ.xyz.ms)}: xy′ covers m4, m5 and yz covers m3, m7.`, 'Adjacent 1s in different groups: m5 (101) and m7 (111), which differ in y.', 'Their common literals are x = 1, z = 1, so add xz: F = xy′ + yz + xz.', 'The other changes either stay inside one group (m3–m7) or actually change the output (m7–m6 and m4–m6, since m6 is 0).'],
      solutionDiagram: km({ vars: HZ.xyz.vars, ms: HZ.xyz.ms }, ["xy'", 'yz', ['xz', 'xz (cover)']]),
      explanation: 'xz is the consensus of xy′ and yz. It leaves the truth table unchanged and holds F at 1 while y switches.' },
    { id: 't4-q87', subtopic: 't4-hazards', type: 'tf', difficulty: 2, src: suppGuide('Hazard-free covers'),
      prompt: 'A hazard-free SOP is always also a minimal SOP.', answer: false,
      explanation: 'Removing a static-1 hazard usually means adding a redundant term. For example, yz + xz′ + xy is hazard-free but has 6 literals, while the minimal yz + xz′ has 4.' },
    { id: 't4-q88', subtopic: 't4-hazards', type: 'mc', difficulty: 3, src: suppGuide('Static-0 hazards in POS circuits'),
      prompt: 'For a <b>POS</b> (OR-AND) circuit, which K-map pattern warns of a possible <b>static-0</b> hazard?',
      choices: ['Two adjacent 0s that lie in different 0-groups, with no single 0-group covering both', 'Two adjacent 1s covered by the same group', 'Any don’t-care cell next to a 0', 'A 0-group that wraps around an edge of the map'], answer: 0,
      explanation: 'This is the dual of the SOP rule. When the input moves between those two 0-cells, one sum term rises to 1 before the other falls to 0, so the output can briefly pulse to 1. The fix is the dual too: add the sum term that covers both 0s. Wrap-around groups are ordinary adjacency and cause no hazard by themselves.' },
  ];

  /* ---------------- practice generators (unlimited computed drills) ---------------- */
  const PRACTICE = [
    { gen: 'canonicalSop', label: 'Top-down step: minterm list → canonical sum of minterms', subtopic: 't4-topdown' },
    { gen: 'exprMinterms', label: 'Fill a K-map: which minterms does an expression cover?', subtopic: 't4-kmap-basics' },
    { gen: 'kmapMinimize', label: '3-variable K-map → minimal SOP', subtopic: 't4-kmap3', params: { vars: 3, dontcares: false } },
    { gen: 'kmapMinimize', label: '4-variable K-map → minimal SOP', subtopic: 't4-kmap4', params: { vars: 4, dontcares: false } },
    { gen: 'kmapMinimize', label: 'Mixed 4-variable K-map drill (like the Class 9 examples)', subtopic: 't4-examples', params: { vars: 4, dontcares: false } },
    { gen: 'kmapMinimize', label: '3-variable K-map with don’t-cares', subtopic: 't4-dontcares', params: { vars: 3, dontcares: true } },
    { gen: 'kmapMinimize', label: '4-variable K-map with don’t-cares (final-exam drill)', subtopic: 't4-dontcares', params: { vars: 4, dontcares: true } },
    { gen: 'primeImplicants', label: 'Count the prime and essential prime implicants', subtopic: 't4-implicants' },
  ];

  /* ---------------- register ---------------- */
  Study.registerSection({
    id: 't4', order: 4,
    title: 'Combinational Logic',
    short: 'Combinational',
    hub: '../#topic-4',
    summary: 'Top-down design from a word problem to a circuit, and K-map minimisation: 2-, 3- and 4-variable maps in Gray-code order, grouping rules, wrap-around, worked examples and don’t-cares. Supplemental: prime and essential prime implicants, POS by grouping 0s, and static hazards.',
    finalWeight: 7,
    sources: [
      { file: V.c8v1, title: 'Class 8 Video 1: Top-Down Design (also starts the 2-variable K-map)' },
      { file: V.c8v2, title: 'Class 8 Video 2: K-Maps (1/3), 2-variable examples and grouping rules 1–2' },
      { file: V.c8v3, title: 'Class 8 Video 3: K-Maps (2/3), misconceptions and rule 3 (powers of two)' },
      { file: V.c8v4, title: 'Class 8 Video 4: K-Maps (3/3), 3-variable maps, wrap-around, two examples' },
      { file: V.c9v1, title: 'Class 9 Video 1: 4-variable K-Map (layout, regions, group size vs literals)' },
      { file: V.c9v2, title: 'Class 9 Video 2: K-Map Examples (two 4-variable examples, four corners)' },
      { file: V.c9v3, title: 'Class 9 Video 3: Don’t Care Conditions (knob and die examples)' },
      { file: V.c18v3, title: 'Topic 5, Class 18 Video 3: recap of top-down design; 5-variable K-maps are not covered' },
      { file: V.c14v3, title: 'Topic 5, Class 14 Video 3: priority-encoder K-maps (using X’s only when they help)' },
      { file: V.c7v2, title: 'Topic 3, Class 7 Video 2: maxterms are explicitly not covered' },
      { file: V.gray, title: 'Topic 2, Class 4 Video 2: Gray code (consecutive values differ in one bit)' },
      { file: V.lab3, title: 'Lab 3 video: the kmap and x_kmap modules' },
    ],
    gaps: [
      'Prime and essential prime implicants, POS minimisation by grouping 0s, and static hazards are listed on the hub’s Final Exam study page, but none of the mirrored lectures teaches them. Topic 3 says maxterms are “not covered right now”. These three subtopics are supplemental (standard material, e.g. Mano & Ciletti ch. 3), and every item in them is marked that way.',
      'The Lab 3 handout is not mirrored. The Lab 3 video names a kmap module and an x_kmap (don’t-care) module, but the functions they implement are unknown. The Lab 3 flashcard is flagged as needing that source.',
      'The Class 8 Video 4 quiz and the in-class K-map practice the lectures mention (“let’s do quiz and let’s practice more in class”) are not recorded, so no quiz questions are reproduced here.',
      'Bottom-up design is named in the hub’s module notes, but the Topic 4 transcript never mentions it. This section teaches only the top-down methodology the lecture describes.',
      'Several auto-caption garbles are corrected from the instructor’s own reasoning. Class 8 Video 4 example 1 is captioned “x′y or x′y′”; the correct answer is x′y + xy′. Class 9 Video 2 example 1 is captioned “A′D′ or B′D′ or C′”; the correct answer is BD′, not B′D′. The four-corner group in Class 9 Video 2 is captioned “D is equal to zero” twice; the corners share B = 0 and D = 0. The don’t-care video says the knob’s third code is “0, 1, 0” (it is 10) and gives the K-map value at 00 as 1 (the truth table says 0). The map is called “Carnot” for Karnaugh.',
      'The worked word problems (majority vote, prime detector, stair light, BCD ≥ 5) and most practice functions are standard examples, not lecture examples. Each is labelled where it appears. The BCD-to-7-segment segment-a drill comes from the Final Exam page and assumes 6 is drawn with its top bar.',
    ],
    subtopics: SUBTOPICS,
    lessons: LESSONS,
    flashcards: FLASHCARDS,
    questions: QUESTIONS,
    practice: PRACTICE,
  });
})();
