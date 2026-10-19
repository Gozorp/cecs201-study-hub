/* CECS 201 Study — Section t7: Finite State Machines.
   Sources: all 12 mirrored Topic 7 videos (Class 21: FSM definition, Moore visual representation, Moore operation,
   Mealy operation; Class 22: FSM examples #1 and #2; Class 23: state encoding, timing for an FSM; Class 24: FSM
   implementation 1/2, 2/2 and the untitled third video (K-maps for the next-state and output logic); Class 25: FSM
   issues, a partial upload that stops at 4:52), plus the two Lab 8 Verilog FSM videos where they restate the
   three-block structure, reset and default cases.
   Not in the mirrored lectures: sequence detectors, state minimization and the vending-machine drill (all listed on
   the hub's Final Exam page), Mealy timing details, and the rest of the FSM-issues lecture. That material is marked
   supplemental or final-guide and listed in gaps.
   Every state diagram, state table, trace, timing diagram and K-map below is generated from one machine definition
   (MACHINES), so prompts, keys, steps and pictures cannot disagree. Equations were checked by truth table and every
   maxLiterals by an exact minimizer (scratch verify script). */
(function () {
  'use strict';
  const Study = window.Study;
  const L = Study.logic;

  /* ---------- transcripts ---------- */
  const F = {
    def: 'Topic_7/class25_video1.mp4.vtt',   // Class 21 V1: FSM definition (six-tuple)
    vis: 'Topic_7/class25_video2.mp4.vtt',   // Class 21 V2: Moore visual representation (state transition diagram)
    op: 'Topic_7/class25_video3.mp4.vtt',    // Class 21 V3: Moore operation (pulse machine, clock assumption)
    mea: 'Topic_7/class25_video4.mp4.vtt',   // Class 21 V4: Mealy operation (two examples, counting outgoing edges)
    ex1: 'Topic_7/class26_video1.mp4.vtt',   // Class 22 V1: Example #1, LO/HI machine
    ex2: 'Topic_7/class26_video2.mp4.vtt',   // Class 22 V2: Example #2, holiday light display S T U
    enc: 'Topic_7/class27_video1.mp4.vtt',   // Class 23 V1: state encoding: binary, Gray, one-hot
    tim: 'Topic_7/class27_video2.mp4.vtt',   // Class 23 V2: Moore block diagram, Tclk and output timing
    im1: 'Topic_7/class28_video1.mp4.vtt',   // Class 24 V1: implementation (1/2): analyse the toggle FSM with a timing diagram
    im2: 'Topic_7/class28_video2.mp4.vtt',   // Class 24 V2: implementation (2/2): encoding + state transition/output table
    im3: 'Topic_7/class28_video3.mp4.vtt',   // Class 24 V3 (untitled): K-maps for NS1, NS0 and toggle
    iss: 'Topic_7/class29_video1.mp4.vtt',   // Class 25 V1: FSM issues; PARTIAL upload, ends 04:52
    lab8a: 'Lab_8/Verilog_FSM_01.mp4.vtt',   // Lab 8: Moore FSM = state register + next-state logic + output logic
    lab8b: 'Lab_8/Verilog_FSM_02.mp4.vtt',   // Lab 8: reset to all zeros, default case, unused states
  };
  // c('def 00:02:43', 'vis 00:03:27') -> course source with refs
  const c = (...refs) => ({ type: 'course', refs: refs.map(r => { const [k, t] = r.split(' '); if (!F[k]) throw new Error('t7: bad ref ' + r); return F[k] + '#' + t; }) });
  const sup = note => ({ type: 'supplemental', note });
  const fg = note => ({ type: 'final-guide', note });

  const N_SEQ = 'Sequence detectors (overlapping vs non-overlapping) are standard FSM design material (e.g. Mano & Ciletti, Digital Design, Ch. 5; Harris & Harris, Digital Design and Computer Architecture, §3.4). The hub’s Final Exam page lists them, including a “101 non-overlapping Mealy” drill; no mirrored Topic 7 lecture works one.';
  const N_MIN = 'State minimization (merging equivalent states) is standard textbook material (Mano & Ciletti, Digital Design, state reduction). The hub’s Final Exam page lists it for Topic 7; no mirrored lecture covers it.';
  const N_MT = 'Mealy output timing (the output follows input changes between clock edges, can glitch, and a Mealy machine often needs fewer states) is standard textbook material (Harris & Harris §3.4.3). The lecture only says Mealy machines behave differently in time and points to the book’s simulation.';
  const N_VEND = 'Vending-machine FSM from the hub’s Final Exam drill list (states = cents inserted, inputs nickel/dime, outputs dispense/return). The 15¢ price, state names and the “one dispense cycle” assumption are this app’s choices.';
  const N_IMPL = 'Applies the lecture’s method (state table → K-maps → D flip-flop inputs) to another machine; worked out for this app and checked by truth table.';
  const N_ISS = 'Class 25 Video 1 (FSM Issues) is a partial upload that stops at 4:52. Unused state codes, reset into a valid state and default transitions are standard material (Mano & Ciletti; Harris & Harris), not from the mirrored lecture.';
  const N_FLOW = 'Design flow as listed on the hub’s Final Exam page (word problem → state diagram → state table → state assignment → next-state K-maps → flip-flop input equations → output equations); each step is taught in the Topic 7 videos.';
  const N_PRAC = 'Practice problem written for this app with the lecture’s method; the answer is computed from the machine definition.';
  const N_FFCNT = 'General flip-flop count (⌈log₂ N⌉ for binary or Gray, N for one-hot) extends the lecture’s five-state example; standard material.';
  const N_ONEHOTRST = 'Standard design consequence of the lecture’s one-hot code (S0 = 00001): clearing every flip-flop gives 00000, which is not a valid one-hot state, so the start state’s flip-flop must be preset instead. Not stated in the lecture.';
  const N_TNUM = 'Numbers made up for practice; the formula is the lecture’s.';

  /* ---------- small HTML helpers ---------- */
  const tbl = (head, rows) =>
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
  const m = s => `<span class="mono">${s}</span>`;

  /* ---------- FSM machinery ----------
     A machine: { type: 'moore'|'mealy', inputs: [parser var names], show?: [display names], states: [names],
                  out: { state: output } (Moore), initial, edges: [{ from, to, on: Boolean condition over inputs,
                  label?: display condition, out?: Mealy output, full?: whole Mealy label }], dc?: env => bool (impossible inputs) }
     Inputs for one step are given as a string of bits in input order (e.g. '1', or '10' for N=1, D=0). */
  const sid = name => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const envOf = (M, sym) => { const env = {}; M.inputs.forEach((v, i) => { env[v] = Number(sym[i]); }); return env; };
  const edgeFor = (M, s, sym) => M.edges.find(e => e.from === s && L.evalBool(L.parseBool(e.on), envOf(M, sym)) === 1);
  // run: states[0] = initial, states[k] = state after rising edge k; Moore outs[k] = output in states[k];
  // Mealy outs[k] = output during cycle k while input k is applied (before edge k+1).
  function run(M, seq) {
    const states = [M.initial], outs = [];
    let s = M.initial;
    for (const sym of seq) {
      const e = edgeFor(M, s, sym);
      if (M.type === 'mealy') outs.push(e ? e.out : '?');
      s = e ? e.to : s;
      states.push(s);
    }
    return { states, outs: M.type === 'moore' ? states.map(x => M.out[x]) : outs };
  }
  function fsmDiagram(M, layout) {
    return {
      kind: 'fsm', type: M.type, initial: sid(M.initial), layout: layout || M.layout || 'circle',
      states: M.states.map(n => (M.type === 'moore' ? { id: sid(n), label: n, output: M.out[n] } : { id: sid(n), label: n })),
      transitions: M.edges.map(e => ({ from: sid(e.from), to: sid(e.to), label: M.type === 'mealy' ? (e.full || (e.label || e.on) + '/' + e.out) : (e.label || e.on) })),
    };
  }
  // Timing diagram of a run. Two characters per clock cycle; CLK rises at index 2k (edge k = 1..N).
  // Inputs change at the falling edge before the edge that samples them; state and Moore outputs change at rising edges;
  // a Mealy output is recomputed from (state, input) at every character, so it can change mid-cycle.
  function fsmTiming(M, seq, opts = {}) {
    const N = seq.length, len = 2 * N + 2;
    const clk = '00' + '10'.repeat(N);
    const r = run(M, seq);
    const stateAt = i => r.states[Math.floor(i / 2)];
    const inAt = i => seq[Math.min(N - 1, Math.max(0, Math.ceil(i / 2) - 1))];
    const signals = [{ name: 'CLK', wave: clk }];
    M.inputs.forEach((v, j) => {
      let w = '';
      for (let i = 0; i < len; i++) w += N ? inAt(i)[j] : '0';
      signals.push({ name: (M.show || M.inputs)[j], wave: w });
    });
    if (opts.bus !== false) {
      let w = '', prev = null; const data = [];
      for (let i = 0; i < len; i++) { const s = stateAt(i); if (s !== prev) { w += '='; data.push(s); prev = s; } else w += '.'; }
      signals.push({ name: 'state', wave: w, data });
    }
    const outNames = opts.outNames || [M.outName || 'out'];
    outNames.forEach((name, j) => {
      let w = '';
      for (let i = 0; i < len; i++) {
        const s = stateAt(i);
        const o = M.type === 'moore' ? M.out[s] : (edgeFor(M, s, inAt(i)) || {}).out;
        w += String(o).replace(/[^01]/g, '')[j] || 'x';
      }
      signals.push({ name, wave: w });
    });
    const bus = signals.find(s => s.data);
    const spec = { kind: 'timing', edges: true, signals };
    if (bus) spec.data = bus.data.slice();   // the one bus signal's values, also given at the top level
    return spec;
  }
  // Trace table: one row per rising edge
  function traceTable(M, seq, opts = {}) {
    const r = run(M, seq);
    const inName = (M.show || M.inputs).join('');
    const outName = opts.outName || M.outName || 'out';
    if (M.type === 'moore') {
      if (!M.inputs.length) {
        const rows = [['start', M.initial, r.outs[0]]].concat(seq.map((x, k) => [String(k + 1), r.states[k + 1], r.outs[k + 1]]));
        return tbl(['rising edge', 'state after edge', outName], rows);
      }
      const rows = [['start', '–', M.initial, r.outs[0]]].concat(seq.map((x, k) => [String(k + 1), x, r.states[k + 1], r.outs[k + 1]]));
      return tbl(['rising edge', inName + ' at edge', 'state after edge', outName + ' (in that state)'], rows);
    }
    const rows = seq.map((x, k) => [String(k + 1), r.states[k], x, r.outs[k], r.states[k + 1]]);
    return tbl(['cycle', 'state', inName, outName + ' (just before the edge)', 'state after the edge'], rows);
  }
  // Encoded state table: rows over (state code, input) in truth-table order; columns current bits | inputs | next bits | outputs
  function encTable(M, enc, o) {
    const nb = o.cur.length, ni = M.inputs.length, rows = [];
    for (let i = 0; i < (1 << (nb + ni)); i++) {
      const bits = i.toString(2).padStart(nb + ni, '0');
      const code = bits.slice(0, nb), sym = bits.slice(nb);
      const s = Object.keys(enc).find(k => enc[k] === code);
      if (!s) { rows.push([...code, ...sym, ...o.next.map(() => 'x'), ...o.outs.map(() => 'x')].map(x => `<span class="muted">${x}</span>`)); continue; }
      const e = edgeFor(M, s, sym);
      const nxt = e ? enc[e.to] : 'x'.repeat(nb);
      const outv = M.type === 'moore' ? M.out[s] : e.out;
      rows.push([...code, ...sym, ...nxt, ...String(outv).replace(/[^01]/g, '')]);
    }
    return tbl([...o.cur, ...(M.show || M.inputs), ...o.next, ...o.outs], rows);
  }
  // Minterms (and unused-code don't cares) of next-state bit j / output bit j, variable order = current bits then inputs
  function encMinterms(M, enc, nb, what, j) {
    const ni = M.inputs.length, ms = [], dcs = [];
    for (let i = 0; i < (1 << (nb + ni)); i++) {
      const bits = i.toString(2).padStart(nb + ni, '0');
      const code = bits.slice(0, nb), sym = bits.slice(nb);
      const s = Object.keys(enc).find(k => enc[k] === code);
      if (!s) { dcs.push(i); continue; }
      const e = edgeFor(M, s, sym);
      const v = what === 'next' ? enc[e.to][j] : String(M.type === 'moore' ? M.out[s] : e.out).replace(/[^01]/g, '')[j];
      if (v === '1') ms.push(i);
    }
    return { ms, dcs };
  }
  // K-map spec; group expressions are written with parser names (SR1 -> Q1, SR0 -> Q0), labels are display text
  function kmap(vars, ms, dcs, groups) {
    const pv = vars.map(v => v.replace(/^SR/, 'Q'));
    const spec = { kind: 'kmap', vars, minterms: ms };
    if (dcs && dcs.length) spec.dontcares = dcs;
    if (groups && groups.length) spec.groups = groups.map(([label, expr]) => ({ cells: L.minterms(expr, pv), label }));
    return spec;
  }
  // Step-by-step narration of a run (used for worked examples and question steps)
  const symText = (M, sym) => (!M.inputs.length ? 'no input to check' : M.inputs.length === 1 ? `${(M.show || M.inputs)[0]} = ${sym}` : (M.show || M.inputs).map((v, i) => `${v} = ${sym[i]}`).join(', '));
  const arrowText = (M, e) => (M.type === 'mealy' ? (e.full || (e.label || e.on) + '/' + e.out) : (e.label || e.on));
  function traceSteps(M, seq, o = {}) {
    const r = run(M, seq), outName = o.outName || M.outName || 'out', steps = [];
    if (M.type === 'moore') {
      steps.push(`Start in the initial state ${M.initial}: ${outName} = ${r.outs[0]}.`);
      seq.forEach((x, k) => {
        const e = edgeFor(M, r.states[k], x);
        steps.push(`Edge ${k + 1}: in ${r.states[k]} with ${symText(M, x)}, take the arrow labelled “${arrowText(M, e)}” → ${r.states[k + 1]}; ${outName} = ${r.outs[k + 1]}.`);
      });
    } else {
      seq.forEach((x, k) => {
        const e = edgeFor(M, r.states[k], x);
        steps.push(`Cycle ${k + 1}: in ${r.states[k]} with ${symText(M, x)}, the arrow “${arrowText(M, e)}” gives ${outName} = ${r.outs[k]} now; the next rising edge moves to ${r.states[k + 1]}.`);
      });
    }
    return steps;
  }
  const seqStr = seq => seq.join(', ');
  const outStr = outs => outs.join('');

  /* ---------- the machines ---------- */
  const B = (from, to, on, label, out, full) => ({ from, to, on, label, out, full });
  // Class 21 V2/V3: Moore "pulse" machine; input IN (parser name A), arrows labelled with IN's value
  const PULSE = { type: 'moore', inputs: ['A'], show: ['IN'], states: ['S0', 'S1'], out: { S0: '0', S1: '1' }, initial: 'S0', layout: 'line',
    edges: [B('S0', 'S0', "A'", '0'), B('S0', 'S1', 'A', '1'), B('S1', 'S0', '1', '0, 1')] };
  // Class 22 V1: Example #1, LO/HI
  const LOHI = { type: 'moore', inputs: ['A'], states: ['LO', 'HI'], out: { LO: '0', HI: '1' }, initial: 'LO', layout: 'line',
    edges: [B('LO', 'LO', "A'"), B('LO', 'HI', 'A'), B('HI', 'HI', 'A'), B('HI', 'LO', "A'")] };
  // Class 22 V2: Example #2, holiday lights; outputs S T U (S = MSB); no inputs
  const LIGHTS = { type: 'moore', inputs: [], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '000', S1: '101', S2: '010', S3: '111' }, initial: 'S0',
    edges: [B('S0', 'S1', '1', 'always'), B('S1', 'S2', '1', 'always'), B('S2', 'S3', '1', 'always'), B('S3', 'S0', '1', 'always')] };
  // Class 24: the toggle FSM; input A, output toggle
  const TOGGLE = { type: 'moore', inputs: ['A'], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '0', S1: '1', S2: '1', S3: '0' }, initial: 'S0', outName: 'toggle',
    edges: [B('S0', 'S0', "A'", '0'), B('S0', 'S1', 'A', '1'), B('S1', 'S1', 'A', '1'), B('S1', 'S2', "A'", '0'),
      B('S2', 'S2', "A'", '0'), B('S2', 'S3', 'A', '1'), B('S3', 'S3', 'A', '1'), B('S3', 'S0', "A'", '0')] };
  const TOGGLE_ENC = { S0: '00', S1: '01', S2: '10', S3: '11' };
  // Class 21 V4: Mealy example 1 (closest to the Moore pulse machine)
  const MEALY1 = { type: 'mealy', inputs: ['A'], show: ['IN'], states: ['S0', 'S1'], initial: 'S0', layout: 'line',
    edges: [B('S0', 'S0', "A'", '0', '0'), B('S0', 'S1', 'A', '1', '0'), B('S1', 'S0', '1', '', '1', '0/1, 1/1')] };
  // Supplemental machines
  // rising-edge detectors (output 1 once each time X goes 0 -> 1)
  const EDGE_MOORE = { type: 'moore', inputs: ['X'], states: ['S0', 'S1', 'S2'], out: { S0: '0', S1: '1', S2: '0' }, initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0'), B('S0', 'S1', 'X', '1'), B('S1', 'S2', 'X', '1'), B('S1', 'S0', "X'", '0'), B('S2', 'S2', 'X', '1'), B('S2', 'S0', "X'", '0')] };
  const EDGE_MEALY = { type: 'mealy', inputs: ['X'], states: ['S0', 'S1'], initial: 'S0', outName: 'Z', layout: 'line',
    edges: [B('S0', 'S0', "X'", '0', '0'), B('S0', 'S1', 'X', '1', '1'), B('S1', 'S1', 'X', '1', '0'), B('S1', 'S0', "X'", '0', '0')] };
  // "11" detectors (overlapping)
  const D11_MOORE = { type: 'moore', inputs: ['X'], states: ['S0', 'S1', 'S2'], out: { S0: '0', S1: '0', S2: '1' }, initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0'), B('S0', 'S1', 'X', '1'), B('S1', 'S2', 'X', '1'), B('S1', 'S0', "X'", '0'), B('S2', 'S2', 'X', '1'), B('S2', 'S0', "X'", '0')] };
  const D11_MEALY = { type: 'mealy', inputs: ['X'], states: ['S0', 'S1'], initial: 'S0', outName: 'Z', layout: 'line',
    edges: [B('S0', 'S0', "X'", '0', '0'), B('S0', 'S1', 'X', '1', '0'), B('S1', 'S1', 'X', '1', '1'), B('S1', 'S0', "X'", '0', '0')] };
  // "101" detectors
  const D101_MOORE_OV = { type: 'moore', inputs: ['X'], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '0', S1: '0', S2: '0', S3: '1' }, initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0'), B('S0', 'S1', 'X', '1'), B('S1', 'S1', 'X', '1'), B('S1', 'S2', "X'", '0'),
      B('S2', 'S0', "X'", '0'), B('S2', 'S3', 'X', '1'), B('S3', 'S1', 'X', '1'), B('S3', 'S2', "X'", '0')] };
  const D101_MOORE_NO = { type: 'moore', inputs: ['X'], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '0', S1: '0', S2: '0', S3: '1' }, initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0'), B('S0', 'S1', 'X', '1'), B('S1', 'S1', 'X', '1'), B('S1', 'S2', "X'", '0'),
      B('S2', 'S0', "X'", '0'), B('S2', 'S3', 'X', '1'), B('S3', 'S1', 'X', '1'), B('S3', 'S0', "X'", '0')] };
  const D101_MEALY_NO = { type: 'mealy', inputs: ['X'], states: ['S0', 'S1', 'S2'], initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0', '0'), B('S0', 'S1', 'X', '1', '0'), B('S1', 'S1', 'X', '1', '0'), B('S1', 'S2', "X'", '0', '0'),
      B('S2', 'S0', "X'", '0', '0'), B('S2', 'S0', 'X', '1', '1')] };
  const D101_MEALY_OV = { type: 'mealy', inputs: ['X'], states: ['S0', 'S1', 'S2'], initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S0', "X'", '0', '0'), B('S0', 'S1', 'X', '1', '0'), B('S1', 'S1', 'X', '1', '0'), B('S1', 'S2', "X'", '0', '0'),
      B('S2', 'S0', "X'", '0', '0'), B('S2', 'S1', 'X', '1', '1')] };
  const ENC3 = { S0: '00', S1: '01', S2: '10' };            // 11 unused
  // parity checker: Z = 1 while an odd number of 1s has been seen
  const PARITY = { type: 'moore', inputs: ['X'], states: ['EVEN', 'ODD'], out: { EVEN: '0', ODD: '1' }, initial: 'EVEN', outName: 'Z', layout: 'line',
    edges: [B('EVEN', 'EVEN', "X'", '0'), B('EVEN', 'ODD', 'X', '1'), B('ODD', 'ODD', "X'", '0'), B('ODD', 'EVEN', 'X', '1')] };
  // 2-bit up/down counter as a Moore FSM (output = count), U = 1 up, U = 0 down
  const UPDOWN = { type: 'moore', inputs: ['U'], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '00', S1: '01', S2: '10', S3: '11' }, initial: 'S0',
    edges: [0, 1, 2, 3].flatMap(i => [B('S' + i, 'S' + ((i + 1) % 4), 'U', '1'), B('S' + i, 'S' + ((i + 3) % 4), "U'", '0')]) };
  // Gray-code sequence with enable E: S0 -> S1 -> S2 -> S3 -> S0 while E = 1, hold while E = 0; Z = 1 in S3
  const GRAYEN = { type: 'moore', inputs: ['E'], states: ['S0', 'S1', 'S2', 'S3'], out: { S0: '0', S1: '0', S2: '0', S3: '1' }, initial: 'S0', outName: 'Z',
    edges: [0, 1, 2, 3].flatMap(i => [B('S' + i, 'S' + ((i + 1) % 4), 'E', '1'), B('S' + i, 'S' + i, "E'", '0')]) };
  const GRAY_ENC = { S0: '00', S1: '01', S2: '11', S3: '10' };
  // Vending machine (final-guide drill): 15 cents; inputs N (nickel), D (dime), never both; outputs Disp, Ret
  const VEND = { type: 'moore', inputs: ['N', 'D'], states: ['C0', 'C5', 'C10', 'C15', 'C20'], initial: 'C0',
    out: { C0: '00', C5: '00', C10: '00', C15: '10', C20: '11' }, dc: env => env.N === 1 && env.D === 1,
    edges: [B('C0', 'C0', "N'D'"), B('C0', 'C5', "ND'"), B('C0', 'C10', "N'D"),
      B('C5', 'C5', "N'D'"), B('C5', 'C10', "ND'"), B('C5', 'C15', "N'D"),
      B('C10', 'C10', "N'D'"), B('C10', 'C15', "ND'"), B('C10', 'C20', "N'D"),
      B('C15', 'C0', '1', 'always'), B('C20', 'C0', '1', 'always')] };
  // State minimization example (5 states -> 3)
  const MIN5 = { type: 'moore', inputs: ['X'], states: ['A', 'B', 'C', 'D', 'E'], out: { A: '0', B: '0', C: '1', D: '0', E: '1' }, initial: 'A', outName: 'Z',
    edges: [B('A', 'A', "X'", '0'), B('A', 'B', 'X', '1'), B('B', 'D', "X'", '0'), B('B', 'C', 'X', '1'), B('C', 'A', "X'", '0'), B('C', 'E', 'X', '1'),
      B('D', 'A', "X'", '0'), B('D', 'B', 'X', '1'), B('E', 'D', "X'", '0'), B('E', 'E', 'X', '1')] };
  const MIN3 = { type: 'moore', inputs: ['X'], states: ['AD', 'B', 'CE'], out: { AD: '0', B: '0', CE: '1' }, initial: 'AD', outName: 'Z',
    edges: [B('AD', 'AD', "X'", '0'), B('AD', 'B', 'X', '1'), B('B', 'AD', "X'", '0'), B('B', 'CE', 'X', '1'), B('CE', 'AD', "X'", '0'), B('CE', 'CE', 'X', '1')] };
  // FSM issues (Class 25): S0 with conditions A -> stay, B -> S1 (broken) and the fixed version
  const ISS_BAD = { type: 'moore', inputs: ['A', 'B'], states: ['S0', 'S1'], out: { S0: '0', S1: '1' }, initial: 'S0', layout: 'line',
    edges: [B('S0', 'S0', 'A'), B('S0', 'S1', 'B'), B('S1', 'S0', '1', 'always')] };
  const ISS_FIX = { type: 'moore', inputs: ['A', 'B'], states: ['S0', 'S1'], out: { S0: '0', S1: '1' }, initial: 'S0', layout: 'line',
    edges: [B('S0', 'S0', "A + B'"), B('S0', 'S1', "A'B"), B('S1', 'S0', '1', 'always')] };

  // Shared traces (computed once; used by lessons, cards and questions)
  const PULSE_SEQ = ['0', '1', '0', '1', '1', '0'];
  const LOHI_SEQ = ['0', '0', '1', '1', '1', '1', '0', '0'];      // the sequence narrated in Class 22 V1
  const TOGGLE_SEQ = ['1', '1', '0', '0', '1', '1', '0'];         // follows the Class 24 V1 walk-through
  const LIGHT_SEQ = ['', '', '', '', '', ''];
  const EDGE_SEQ = ['0', '1', '1', '1', '0', '1', '0'];

  /* ---------- derived results used in lessons ---------- */
  const rPulse = run(PULSE, PULSE_SEQ), rLohi = run(LOHI, LOHI_SEQ), rTog = run(TOGGLE, TOGGLE_SEQ), rLights = run(LIGHTS, LIGHT_SEQ);
  const afterEdges = r => r.outs.slice(1);                         // Moore outputs after edges 1..N
  const edgeCompare = () => {
    const mo = fsmTiming(EDGE_MOORE, EDGE_SEQ, { bus: false, outNames: ['Z (Moore)'] });
    const me = fsmTiming(EDGE_MEALY, EDGE_SEQ, { bus: false, outNames: ['Z (Mealy)'] });
    return { kind: 'timing', edges: true, signals: [mo.signals[0], mo.signals[1], mo.signals[2], me.signals[2]] };
  };
  const NS1_KMAP = kmap(['SR1', 'SR0', 'A'], encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 0).ms, [], [["SR1·SR0′", "Q1Q0'"], ['SR1·A', 'Q1A'], ["SR1′·SR0·A′", "Q1'Q0A'"]]);
  const NS0_KMAP = kmap(['SR1', 'SR0', 'A'], encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 1).ms, [], [['A', 'A']]);
  const TOG_KMAP = kmap(['SR1', 'SR0', 'A'], encMinterms(TOGGLE, TOGGLE_ENC, 2, 'out', 0).ms, [], [["SR1·SR0′", "Q1Q0'"], ["SR1′·SR0", "Q1'Q0"]]);
  const TOG_TABLE = encTable(TOGGLE, TOGGLE_ENC, { cur: ['SR1', 'SR0'], next: ['NS1', 'NS0'], outs: ['toggle'] });
  const D101_TABLE = encTable(D101_MEALY_NO, ENC3, { cur: ['Q1', 'Q0'], next: ['N1', 'N0'], outs: ['Z'] });
  const D101_N1 = encMinterms(D101_MEALY_NO, ENC3, 2, 'next', 0), D101_N0 = encMinterms(D101_MEALY_NO, ENC3, 2, 'next', 1), D101_Z = encMinterms(D101_MEALY_NO, ENC3, 2, 'out', 0);
  const NS1_CIRCUIT = { kind: 'circuit', inputs: ['SR1', 'SR0', 'A'],
    gates: [{ id: 'n1', type: 'NOT', in: ['SR1'] }, { id: 'n0', type: 'NOT', in: ['SR0'] }, { id: 'na', type: 'NOT', in: ['A'] },
      { id: 'g1', type: 'AND', in: ['SR1', 'n0'] }, { id: 'g2', type: 'AND', in: ['SR1', 'A'] }, { id: 'g3', type: 'AND', in: ['n1', 'SR0', 'na'] },
      { id: 'g4', type: 'OR', in: ['g1', 'g2', 'g3'] }],
    outputs: [{ name: 'NS1', from: 'g4' }] };
  const minTable = M => tbl(['state', 'next if X = 0', 'next if X = 1', 'Z'], M.states.map(s => [s, edgeFor(M, s, '0').to, edgeFor(M, s, '1').to, M.out[s]]));

  const lessons = [
    /* ---------------- t7-definition ---------------- */
    { id: 't7-l1', subtopic: 't7-definition', title: 'What a finite state machine is', minutes: 6,
      src: c('def 00:00:23', 'def 00:00:32', 'def 00:01:04', 'def 00:01:37', 'def 00:02:43', 'def 00:03:26', 'def 00:05:21', 'def 00:06:18', 'def 00:06:39', 'def 00:07:04'),
      blocks: [
        { type: 'text', html: `<p>A <b>finite state machine (FSM)</b> is a <b>model of computation</b>. At any moment the machine is in one of a finite number of <b>states</b>; at each step it moves to a next state that depends on its current state and its inputs. To do that it must remember which state it is in, so an FSM needs <b>memory</b>. That is why this topic comes right after registers.</p>
<p>Where FSMs are used (the lecture's list):</p>
<ul><li><b>Control-intensive</b> hardware: circuits that check some status and then decide the next step. Data-intensive circuits, which mostly process data, are the opposite kind.</li>
<li><b>Network protocols</b>: lots of data is moved, but deciding when and how to transfer it and how to check for errors is control.</li>
<li>Theory of computation and languages, compilers, and property verification and testing.</li></ul>
<p>In CECS 201 the focus is <b>designing digital hardware with FSMs</b>.</p>` },
        { type: 'text', html: `<p>Formally, an FSM is a <b>six-tuple</b> FSM = (I, O, S, f, h, S<sub>0</sub>):</p>
${tbl(['part', 'meaning'], [
    ['I', 'set of inputs I<sub>0</sub>, I<sub>1</sub>, …, I<sub>n</sub>. It can hold just one input, or even be empty (a borderline case).'],
    ['O', 'set of outputs O<sub>0</sub>, …, O<sub>m</sub>'],
    ['S', 'set of states S<sub>0</sub>, …, S<sub>l</sub>'],
    ['f', '<b>next-state function</b> f: S × I → S. For every state and every input it gives the next state.'],
    ['h', '<b>output function</b>. Moore: h: S → O, so each state gives the output. Mealy: h: S × I → O, so each combination of state and input gives the output.'],
    ['S<sub>0</sub>', '<b>initial state</b>: one designated state where the FSM always starts. Its name does not matter.']])}` },
        { type: 'callout', tone: 'note', html: 'There are two kinds of FSM, <b>Moore</b> (output from the state only) and <b>Mealy</b> (output from the state and the input). The course concentrates on <b>Moore</b> machines; Mealy machines are introduced so you recognise them when you see them elsewhere.' },
        { type: 'example', title: 'Write the six-tuple of a two-state machine',
          problem: 'The next two lectures use a machine with one input IN, one 1-bit output, and states S0 and S1. In S0 the output is 0 and in S1 it is 1. From S0, IN = 0 stays in S0 and IN = 1 goes to S1. From S1 the machine always returns to S0. It starts in S0. Write each part of the six-tuple.',
          steps: ['I = {IN}: one binary input.', 'O = {out}: one 1-bit output.', 'S = {S0, S1}.',
            'f has one entry per (state, input) pair, so 2 states × 2 input values = 4 entries: f(S0, 0) = S0, f(S0, 1) = S1, f(S1, 0) = S0, f(S1, 1) = S0.',
            'h (Moore, from the state only): h(S0) = 0, h(S1) = 1.', 'The initial state is S0.'],
          answer: 'FSM = ({IN}, {out}, {S0, S1}, f, h, S0) with f and h as listed' },
        { type: 'diagram', diagram: fsmDiagram(PULSE), caption: 'The same machine drawn as a state transition diagram (next lesson). Circles are the states with the Moore output inside, the arrows are f, and the arc from nowhere marks the initial state S0.' },
        { type: 'check', question: { id: 't7-l1-c1', type: 'mc', difficulty: 1, src: c('def 00:05:21', 'def 00:05:48'),
          prompt: 'In FSM = (I, O, S, f, h, S<sub>0</sub>), what does <b>f</b> describe?',
          choices: ['The next state, for every combination of current state and input', 'The output produced in each state', 'The set of all states', 'The clock frequency of the state register'], answer: 0,
          explanation: 'f is the next-state function S × I → S. The output is h, the set of states is S, and the clock is not part of the six-tuple.' } },
        { type: 'check', question: { id: 't7-l1-c2', type: 'tf', difficulty: 1, src: c('def 00:03:56'),
          prompt: 'The set of inputs I of an FSM is allowed to be empty.', answer: true,
          explanation: 'True. The lecture calls zero inputs an extreme, borderline case. The holiday-lights example later in this topic has no inputs at all: it simply steps on every clock edge.' } },
      ] },

    /* ---------------- t7-moore ---------------- */
    { id: 't7-l2', subtopic: 't7-moore', title: 'Drawing a Moore machine: the state transition diagram', minutes: 6,
      src: c('vis 00:00:56', 'vis 00:01:40', 'vis 00:02:41', 'vis 00:02:57', 'vis 00:03:27', 'vis 00:04:06', 'vis 00:04:22', 'vis 00:05:00', 'vis 00:06:26', 'vis 00:07:34'),
      blocks: [
        { type: 'text', html: `<p>FSMs are much easier to understand in graphical form, as a <b>state transition diagram</b>. For a <b>Moore</b> machine, where the output depends only on the state:</p>
<ul><li>Each <b>circle</b> is one state, with its name inside.</li>
<li>The <b>output is written inside the circle</b>, because it depends on the state alone.</li>
<li>An <b>arc that comes from nowhere</b> into a state marks the <b>initial state</b>. Some books draw a <b>double circle</b> instead.</li>
<li>The <b>arrows (edges)</b> are the transitions. Each is labelled with the <b>input condition</b> that takes it: either the literal (IN′ or IN) or the input value (0 or 1). The two styles mean the same thing.</li></ul>` },
        { type: 'text', html: `<p><b>Many outputs.</b> If the outputs don't fit inside the circle, list them next to the state, e.g. O0 = 0, O1 = 1, O3 = 010 (an output can be several bits). The <b>default output is always 0</b>, so to save writing you list <b>only the outputs that are 1</b> in that state.</p>` },
        { type: 'example', title: 'Draw the lecture’s two-state Moore machine',
          problem: 'One input IN and one 1-bit output. In S0 the output is 0; in S1 it is 1. From S0: on IN = 0 stay, on IN = 1 go to S1. From S1: go back to S0 whatever IN is. S0 is the initial state.',
          steps: ['Draw two circles, S0 and S1. Write 0 inside S0 and 1 inside S1 (Moore outputs).', 'Draw an arc from nowhere into S0: it is the initial state.',
            'From S0: a self-loop labelled 0 (or IN′), and an arrow to S1 labelled 1 (or IN).', 'From S1: one arrow back to S0 labelled 0, 1, since both input values lead there.',
            'Self-check: every state has outgoing arrows covering both values of IN.'],
          answer: 'The diagram below' },
        { type: 'diagram', diagram: fsmDiagram(PULSE), caption: 'Moore machine: outputs inside the states (S0 → 0, S1 → 1). Arrow labels are values of IN. The arc from nowhere marks S0 as the initial state.' },
        { type: 'callout', tone: 'tip', html: 'For a one-input machine the lecture uses both label styles, IN′/IN and 0/1. Pick one and use it consistently on a diagram.' },
        { type: 'check', question: { id: 't7-l2-c1', type: 'mc', difficulty: 1, src: c('vis 00:02:57'),
          prompt: 'In a <b>Moore</b> state transition diagram, where is the output written?',
          choices: ['Inside (or right next to) the state circle', 'On each arrow, after a slash', 'Only on the arc that marks the initial state', 'Nowhere: Moore machines have no outputs'], answer: 0,
          explanation: 'A Moore output depends only on the state, so it belongs to the state. Writing input/output on the arrows is the Mealy convention.' } },
        { type: 'check', question: { id: 't7-l2-c2', type: 'mc', difficulty: 2, src: c('vis 00:05:00', 'vis 00:05:22'),
          prompt: 'A Moore machine has outputs O0, O1 and O2. Next to one state only “O2 = 1” is written. What are O0 and O1 in that state?',
          choices: ['Both 0', 'Both 1', 'Unknown (don’t care)', 'The same as in the previous state'], answer: 0,
          explanation: 'The default output is 0, and the lecture recommends writing only the outputs that are 1. Any output not listed is 0.' } },
      ] },

    { id: 't7-l3', subtopic: 't7-moore', title: 'How a Moore FSM runs, edge by edge', minutes: 6,
      src: c('op 00:00:08', 'op 00:00:45', 'op 00:01:30', 'op 00:02:14', 'op 00:02:44', 'op 00:03:35', 'op 00:03:51', 'op 00:04:20', 'op 00:06:05'),
      blocks: [
        { type: 'text', html: `<p><b>Operation.</b> Start in the initial state, where the FSM produces that state's output. It waits for a value on the input. Depending on that value it moves to the next state and produces the new state's output. Then it waits again. The transition is always based on the value of the input.</p>
<p>Often not said, but assumed: <b>a clock is running</b>. On each <b>positive (rising) edge</b> the FSM samples the input and, based on it, makes its transition. Between edges nothing changes. (The lecture notes that not every FSM works this way; some have inputs and no clock. In this course they are clocked.)</p>` },
        { type: 'example', title: 'Trace the pulse machine', problem: `Start in S0. IN at the six rising edges: ${seqStr(PULSE_SEQ)}. Give the state and the output after each edge.`,
          steps: traceSteps(PULSE, PULSE_SEQ), answer: `out after edges 1–6 = ${outStr(afterEdges(rPulse))}` },
        { type: 'text', html: traceTable(PULSE, PULSE_SEQ) },
        { type: 'diagram', diagram: fsmTiming(PULSE, PULSE_SEQ), caption: 'Timing view of the same trace. IN changes between edges; at each rising edge of CLK the state, and with it the Moore output, may change. Each 1 seen on IN gives one clock cycle of out = 1.' },
        { type: 'text', html: '<p><b>What does it do?</b> The lecture: this FSM generates a <b>short pulse</b> (1 for one clock cycle) every time it finds that the input is 1. From the diagram you can also see that S1 always goes back to S0, so if IN stays 1 the output alternates 1, 0, 1, 0, …</p>' },
        { type: 'check', question: { id: 't7-l3-c1', type: 'short', difficulty: 2, src: sup(N_PRAC), normalize: 'binary', width: 4,
          prompt: 'Pulse machine, starting in S0. IN at four rising edges: 1, 1, 0, 1. Type out after each edge as a 4-bit string (first edge first).',
          accept: [outStr(afterEdges(run(PULSE, ['1', '1', '0', '1'])))], steps: traceSteps(PULSE, ['1', '1', '0', '1']),
          explanation: 'Follow one arrow per edge. S1 always returns to S0, so the second 1 does not keep the output high.' } },
        { type: 'check', question: { id: 't7-l3-c2', type: 'tf', difficulty: 2, src: c('op 00:03:51', 'tim 00:03:21'),
          prompt: 'In a clocked Moore FSM, if the input changes in the middle of a clock cycle, the output changes right away.', answer: false,
          explanation: 'False. A Moore output depends only on the state, and the state changes only at a rising edge, when the input is sampled. The output follows one output-logic delay after that edge.' } },
      ] },

    /* ---------------- t7-mealy ---------------- */
    { id: 't7-l4', subtopic: 't7-mealy', title: 'Mealy machines: outputs on the arrows', minutes: 8,
      src: c('mea 00:00:06', 'mea 00:00:29', 'mea 00:01:13', 'mea 00:01:34', 'mea 00:02:29', 'mea 00:02:49', 'mea 00:03:25', 'mea 00:03:45', 'mea 00:04:35', 'mea 00:05:04'),
      blocks: [
        { type: 'text', html: `<p>In a <b>Mealy</b> FSM the output function h uses the <b>combination of state and input</b>: the output depends on both. So the output can't be written inside a circle. Instead each arrow is labelled <b>input/output</b>. For example ${m('1/0')} means “if the input is 1, output 0 and take this arrow.”</p>` },
        { type: 'example', title: 'Mealy example 1 (as close as possible to the Moore pulse machine)',
          problem: 'S0 is initial. In S0: on input 0, output 0 and stay; on input 1, output 0 and go to S1. In S1: on input 0 output 1, on input 1 output 1, and go back to S0.',
          steps: ['S0 has two outgoing arrows: a self-loop 0/0 and an arrow 1/0 to S1.', 'From S1 both inputs give output 1 and lead to S0, so one arrow can carry both labels: 0/1, 1/1.',
            'Behaviour: output 1 during the cycle after a 1 was accepted, like the Moore pulse machine. The lecture warns that a Mealy machine is slightly different with respect to time and points to the simulation in the textbook.'],
          answer: 'The diagram below' },
        { type: 'diagram', diagram: fsmDiagram(MEALY1), caption: 'Mealy example 1. Nothing is written inside the states; each arrow carries input/output.' },
        { type: 'text', html: '<p><b>Mealy example 2</b> looks very similar, but in S0 an input of 1 <b>outputs 1 immediately</b> as the machine moves to S1. Out of S1 there are <b>two different arrows</b>, because on input 0 the output is 1 and on input 1 the output is 0. Different outputs need different labels.</p>' },
        { type: 'callout', tone: 'exam', html: '<b>Self-check the lecture repeats “over and over”:</b> with <i>n</i> binary input variables, every state needs <b>2<sup>n</sup> outgoing edges</b>: 2 for one input, 8 for three inputs. Some can be self-loops. Count them. The meaning: <b>in every state, define where to go for every input.</b> (States can have any name, S0 or “call”; the rule is the same.)' },
        { type: 'text', html: `<p><b>Moore vs Mealy in time</b> (supplemental: standard textbook material).</p>
${tbl(['', 'Moore', 'Mealy'], [
    ['output depends on', 'current state only', 'current state and current input'],
    ['drawn', 'inside the state circle', 'on the arrow: input/output'],
    ['output changes', 'only after a clock edge changes the state', 'as soon as the input changes, even between clock edges'],
    ['states needed', 'usually more', 'often fewer'],
    ['risk', 'output stable for the whole cycle', 'output can glitch or show short (transient) values while the input settles']])}` },
        { type: 'diagram', diagram: fsmDiagram(EDGE_MOORE), caption: 'Supplemental: a Moore rising-edge detector (Z = 1 for one cycle after X goes from 0 to 1) needs 3 states.' },
        { type: 'diagram', diagram: fsmDiagram(EDGE_MEALY), caption: 'The Mealy version needs only 2 states: S0 = “last X was 0”, S1 = “last X was 1”. The 1 is produced on the arrow S0 → S1.' },
        { type: 'diagram', diagram: edgeCompare(), caption: 'Same X into both machines. The Mealy Z goes high as soon as X rises (mid-cycle) and drops at the next rising edge, when the machine reaches S1. The Moore Z goes high only at the edge that samples X = 1, and stays high for one full cycle.' },
        { type: 'check', question: { id: 't7-l4-c1', type: 'mc', difficulty: 1, src: c('mea 00:01:13', 'mea 00:02:57'),
          prompt: 'On a Mealy diagram, the arrow from S1 to S0 is labelled <span class="mono">0/1</span>. What does it mean?',
          choices: ['In S1, if the input is 0, the output is 1 and the next state is S0', 'In S1 the output is 0; on input 1 the machine goes to S0', 'S1 outputs 0 and S0 outputs 1', 'On input 0 or input 1 the machine goes to S0'], answer: 0,
          explanation: 'A Mealy label is input/output: the condition before the slash and the output produced along that arrow after it.' } },
        { type: 'check', question: { id: 't7-l4-c2', type: 'numeric', difficulty: 1, src: c('mea 00:04:35', 'mea 00:04:43'),
          prompt: 'An FSM has three binary input variables. How many outgoing edges (one per input combination) must you account for in each state?', answer: 8,
          steps: ['Each binary variable has 2 values.', 'Three variables give 2 × 2 × 2 = 2<sup>3</sup> = 8 combinations.', 'Each combination needs a defined transition: 8 outgoing edges (some may be self-loops, or combined on one arrow).'],
          explanation: 'The lecture: three input variables give 2<sup>3</sup> = 8 outgoing edges per state.' } },
      ] },

    /* ---------------- t7-examples ---------------- */
    { id: 't7-l5', subtopic: 't7-examples', title: 'FSM Example #1: the LO/HI machine', minutes: 7,
      src: c('ex1 00:00:19', 'ex1 00:00:44', 'ex1 00:01:51', 'ex1 00:02:56', 'ex1 00:04:37', 'ex1 00:05:07', 'ex1 00:05:30', 'ex1 00:07:14', 'ex1 00:09:20'),
      blocks: [
        { type: 'text', html: '<p><b>Problem (lecture).</b> Draw the state transition diagram of a Moore FSM with one input <b>A</b>, one output <b>out</b>, and two states, <b>LO</b> (low) and <b>HI</b> (high). If A = 0 the machine goes to, or stays in, LO; if A = 1 it goes to, or stays in, HI. In LO, out = 0; in HI, out = 1.</p>' },
        { type: 'example', title: 'Build the diagram',
          problem: 'Turn the description into a state transition diagram.',
          steps: ['How many states? The problem gives them: two, LO and HI.', 'Which is the starting state? Not given, so it is a <b>design decision</b>: make LO the start (arc from nowhere into LO).',
            'One input variable has two values, so each state needs <b>two outgoing edges</b>.', 'LO: on A′ (or “0”) stay in LO; on A go to HI. Check: LO has two outgoing edges.',
            'HI: on A stay in HI; on A′ go to LO.', 'Don’t forget the outputs (the lecture admits it almost did). Moore, so write out = 0 inside LO and out = 1 inside HI.'],
          answer: 'The diagram below' },
        { type: 'diagram', diagram: fsmDiagram(LOHI), caption: 'Example #1. LO is the chosen start state; the arrows are labelled with the literal of A.' },
        { type: 'example', title: '“Play a little game”: trace it', problem: `The lecture's narration: start in LO, then A = ${seqStr(LOHI_SEQ)} at successive rising edges.`,
          steps: traceSteps(LOHI, LOHI_SEQ), answer: `out after each edge = ${outStr(afterEdges(rLohi))}` },
        { type: 'diagram', diagram: fsmTiming(LOHI, LOHI_SEQ), caption: 'Only the value of A at a positive clock edge matters. The state, and so out, changes only at those edges. out repeats A one clock later.' },
        { type: 'callout', tone: 'note', html: '<b>Preview of state encoding</b> (lecture side note). LO and HI must be stored in binary. Sometimes the state code can <b>equal the output</b> the state produces; then no extra logic is needed to generate the output. Here, with LO = 0 and HI = 1, out is just the state bit, and the next state is just A. (Derived here: the machine is one D flip-flop with D = A.)' },
        { type: 'check', question: { id: 't7-l5-c1', type: 'short', difficulty: 2, src: sup(N_PRAC), normalize: 'binary', width: 5,
          prompt: 'LO/HI machine, starting in LO. A at five rising edges: 1, 0, 0, 1, 1. Type out after each edge (5 bits, first edge first).',
          accept: [outStr(afterEdges(run(LOHI, ['1', '0', '0', '1', '1'])))], steps: traceSteps(LOHI, ['1', '0', '0', '1', '1']),
          explanation: 'Each edge moves the machine to HI if A = 1 and to LO if A = 0, so out after each edge equals the A sampled at that edge.' } },
        { type: 'check', question: { id: 't7-l5-c2', type: 'mc', difficulty: 2, src: c('ex1 00:00:44', 'ex1 00:07:14'),
          prompt: 'In words, what does the LO/HI machine do?',
          choices: ['out equals the value A had at the most recent rising clock edge', 'out is 1 for exactly one clock cycle after A becomes 1', 'out changes value every time A is 1', 'out is always the complement of A'], answer: 0,
          explanation: 'A = 1 at an edge puts the machine in HI (out = 1); A = 0 puts it in LO (out = 0). So out is A sampled at the last edge: A delayed by one clock. The one-cycle pulse is the earlier pulse machine; toggling is the Class 24 toggle machine.' } },
      ] },

    { id: 't7-l6', subtopic: 't7-examples', title: 'FSM Example #2: the holiday light display', minutes: 6,
      src: c('ex2 00:00:05', 'ex2 00:00:16', 'ex2 00:00:24', 'ex2 00:00:43', 'ex2 00:01:31', 'ex2 00:01:46', 'ex2 00:02:21', 'ex2 00:02:39', 'ex2 00:03:09', 'ex2 00:03:29'),
      blocks: [
        { type: 'text', html: '<p><b>Problem (lecture).</b> A Moore FSM controls a holiday light display through three signals <b>S, T, U</b>. Each transition happens on the clock, and at every transition the display changes. The desired sequence (STU) is <span class="mono">000, 101, 010, 111</span>, and then it starts over: 000, 101, ….</p>' },
        { type: 'example', title: 'Design the diagram',
          problem: 'How many states, what are their outputs, and what labels go on the arrows?',
          steps: ['Each state is assigned one combination of the light switches. The sequence has four different outputs before it repeats, so there are <b>4 states</b>, S0–S3.',
            'Bit order: the leftmost (most significant) bit is S, then T, then U.', 'The start state isn’t given in the problem, so choose S0 (lights 000).',
            'Moore outputs inside the states: S0 = 000, S1 = 101, S2 = 010, S3 = 111.',
            'What does a transition consult? <b>Nothing.</b> There is no input; on each positive clock edge the machine moves on: S0 → S1 → S2 → S3 → back to S0.'],
          answer: '4 states in a ring, with outputs 000, 101, 010, 111' },
        { type: 'diagram', diagram: fsmDiagram(LIGHTS), caption: 'Example #2. “always” = no input condition: the move happens at every rising clock edge. Outputs are STU.' },
        { type: 'diagram', diagram: fsmTiming(LIGHTS, LIGHT_SEQ, { outNames: ['S', 'T', 'U'] }), caption: 'Six rising edges: the display steps 000 → 101 → 010 → 111 → 000 → 101 → 010.' },
        { type: 'callout', tone: 'warn', html: 'This is the corner case of the definition: the set of inputs I is <b>empty</b>, so each state has exactly one outgoing arrow. (At 4:00 the narration says the machine wraps around to “S1 again”, but the required sequence starts over at 000, which is S0.)' },
        { type: 'callout', tone: 'note', html: '<b>Supplemental: implementing it</b> (worked out for this app with the Class 24 method). With binary codes S0 = 00, S1 = 01, S2 = 10, S3 = 11 the next state is a 2-bit counter: D1 = Q1 ⊕ Q0 and D0 = Q0′. The outputs need no gates: S = Q0, T = Q1, U = Q0 (check: 00 → 000, 01 → 101, 10 → 010, 11 → 111).' },
        { type: 'check', question: { id: 't7-l6-c1', type: 'short', difficulty: 2, src: c('ex2 00:00:43', 'ex2 00:03:51'), normalize: 'binary', width: 3,
          prompt: 'The display starts in S0 (000). What does it show (STU) after <b>5</b> rising edges?', accept: [run(LIGHTS, ['', '', '', '', '']).outs[5]],
          steps: traceSteps(LIGHTS, ['', '', '', '', ''], { outName: 'STU' }),
          explanation: 'The four-state ring repeats every 4 edges, so 5 edges land in the same state as 1 edge: S1 = 101.' } },
        { type: 'check', question: { id: 't7-l6-c2', type: 'numeric', difficulty: 1, src: c('ex2 00:01:12', 'ex2 00:01:31'),
          prompt: 'How many states does the holiday-light FSM need?', answer: 4,
          steps: ['List the desired outputs before the sequence repeats: 000, 101, 010, 111.', 'One state per desired light combination: 4 states.'],
          explanation: 'Each state is assigned one combination of S, T, U, and there are four distinct combinations in the cycle.' } },
      ] },

    /* ---------------- t7-encoding ---------------- */
    { id: 't7-l7', subtopic: 't7-encoding', title: 'State encoding: binary, Gray and one-hot', minutes: 9,
      src: c('enc 00:00:22', 'enc 00:01:17', 'enc 00:01:52', 'enc 00:02:21', 'enc 00:02:54', 'enc 00:03:42', 'enc 00:04:45', 'enc 00:05:00', 'enc 00:06:34', 'enc 00:07:12', 'enc 00:07:55', 'enc 00:08:12', 'enc 00:09:17', 'enc 00:09:37', 'tim 00:00:59'),
      blocks: [
        { type: 'text', html: '<p>So far states have had names: S0, S1, …, LO, HI. In hardware the current state is stored in a <b>state register</b> of n bits, so every state needs a binary code. Choosing the codes is <b>state encoding</b>, also called <b>state assignment</b>. The lecture’s example has five states, S0–S4:</p>' + tbl(['state', 'binary', 'Gray', 'one-hot'], [['S0', '000', '000', '00001'], ['S1', '001', '001', '00010'], ['S2', '010', '011', '00100'], ['S3', '011', '010', '01000'], ['S4', '100', '110', '10000']].map(r => r.map((x, i) => (i ? m(x) : x)))) + '<p class="muted">The Gray codes for S2–S4 are the standard reflected Gray code; the lecture builds them on the board one bit-flip at a time.</p>' },
        { type: 'example', title: 'How many bits for five states?',
          problem: 'What is the minimum number of bits (flip-flops) for 5 states in each encoding?',
          steps: ['2 bits give only 2<sup>2</sup> = 4 codes: not enough for 5 states.', '3 bits give 2<sup>3</sup> = 8 codes ≥ 5, so <b>binary needs 3 bits</b>, and 8 − 5 = 3 codes stay unused.',
            'Gray code uses the same number of bits as binary: 3.', '<b>One-hot</b> uses one bit per state: <b>5 bits</b>.',
            'General rule (supplemental): binary or Gray needs ⌈log<sub>2</sub> N⌉ bits for N states; one-hot needs N.'],
          answer: '3 bits (binary or Gray), 5 bits (one-hot)' },
        { type: 'text', html: `<p><b>Binary</b> is the most straightforward: S0 = 000, S1 = 001, …. Any five different codes would work, but it is customary to give the <b>start state S0 the all-zeros code</b>. The reason is reset: a reset clears every bit of the state register, which puts the FSM in its starting state.</p>
<p><b>Gray</b>: consecutive codes differ in <b>exactly one bit</b>. If the machine steps S0 → S1 → S2 → S3 → S4 over and over (forwards or backwards), only one flip-flop changes per step. Every bit flip consumes power, so this is <b>energy efficient</b>. (The lab assignment uses Gray encoding.)</p>
<p><b>One-hot</b>: exactly <b>one bit is 1</b> in each state (bit i for state S<sub>i</sub>), so five states need five bits. The states are very clearly defined: a code such as ${m('00011')} can only be an <b>erroneous state</b>.</p>
<p>The next lecture adds that the encoding also changes the <b>complexity of the next-state logic</b>: one encoding can give much simpler logic, another many more gates.</p>` },
        { type: 'callout', tone: 'warn', html: '<b>Supplemental:</b> in one-hot the start state is S0 = 00001, not all zeros. A reset that clears every flip-flop gives 00000, which is not a valid one-hot state, so with one-hot the start state’s flip-flop must be <b>set</b> (preset) at reset instead.' },
        { type: 'example', title: 'Why Gray saves power: count bit flips around a 4-state cycle',
          problem: 'A 4-state machine cycles S0 → S1 → S2 → S3 → S0. Count the total bit flips per full cycle in binary (00, 01, 10, 11) and in Gray (00, 01, 11, 10).',
          steps: ['Binary: 00→01 flips 1 bit, 01→10 flips 2, 10→11 flips 1, 11→00 flips 2. Total 6.', 'Gray: 00→01 flips 1, 01→11 flips 1, 11→10 flips 1, 10→00 flips 1. Total 4.', 'Fewer flips means less switching power, which is the lecture’s argument for Gray codes.'],
          answer: 'binary 6 flips, Gray 4 flips' },
        { type: 'check', question: { id: 't7-l7-c1', type: 'short', difficulty: 1, src: c('enc 00:08:12', 'enc 00:08:49'), normalize: 'binary', width: 5,
          prompt: 'Five states are one-hot encoded as in the lecture (S0 = 00001, bit i is 1 for S<sub>i</sub>). Type the code for <b>S2</b>.', accept: ['00100'],
          steps: ['One-hot: bit i is 1 for state S<sub>i</sub>; bit 0 is the rightmost.', 'S2 → bit 2 is 1, all others 0: 00100.'],
          explanation: 'Exactly one 1, in position 2 (counting from 0 at the right).' } },
        { type: 'check', question: { id: 't7-l7-c2', type: 'numeric', difficulty: 2, src: sup(N_FFCNT), answer: 4,
          prompt: 'How many flip-flops does a <b>binary</b>-encoded FSM with <b>9</b> states need?',
          steps: ['3 bits give 2<sup>3</sup> = 8 codes &lt; 9: not enough.', '4 bits give 2<sup>4</sup> = 16 ≥ 9.', 'So ⌈log<sub>2</sub> 9⌉ = 4 flip-flops.'],
          explanation: 'Binary needs the smallest n with 2<sup>n</sup> ≥ number of states. (One-hot would need 9.)' } },
        { type: 'check', question: { id: 't7-l7-c3', type: 'short', difficulty: 2, src: c('enc 00:05:00', 'enc 00:05:40'), normalize: 'binary', width: 3,
          prompt: 'With the 3-bit Gray encoding in the table, what is the code for <b>S3</b>?', accept: ['010'],
          steps: ['Gray sequence: 000, 001, 011, 010, 110, ….', 'S0 = 000, S1 = 001, S2 = 011, S3 = 010 (one bit differs from S2’s 011).'],
          explanation: 'In Gray code each code differs from the previous one in exactly one bit: 011 → 010 flips only the last bit.' } },
      ] },

    /* ---------------- t7-timing ---------------- */
    { id: 't7-l8', subtopic: 't7-timing', title: 'Inside a Moore FSM: three blocks and the clock period', minutes: 9,
      src: c('tim 00:01:32', 'tim 00:01:46', 'tim 00:02:01', 'tim 00:02:14', 'tim 00:02:42', 'tim 00:02:58', 'tim 00:03:53', 'tim 00:04:20', 'tim 00:04:43', 'tim 00:05:01', 'tim 00:06:19', 'tim 00:07:12', 'tim 00:08:31', 'tim 00:09:02', 'tim 00:09:58', 'tim 00:10:52', 'lab8a 00:00:19'),
      blocks: [
        { type: 'text', html: `<p>Drawn as hardware, a <b>Moore FSM</b> has three blocks:</p>
<ol><li><b>Next-state logic</b> (combinational): the function f. Its inputs are the external inputs <i>and</i> the current state, fed back from the state register. Its output is the next state.</li>
<li><b>State register</b> (sequential, connected to the clock): holds the current state. It is usually more than one bit wide, one D flip-flop per bit. At each rising edge it loads the next state.</li>
<li><b>Moore output logic</b> (combinational): the function h. Its <b>only</b> input is the current state.</li></ol>
<p>So an FSM is a group of combinational and sequential circuits. Lab 8 writes exactly these three blocks in Verilog.</p>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'register', label: 'state register', inputs: ['next state'], outputs: ['current state'], clock: true }, caption: 'The state register: next state in, current state out, loaded at each rising clock edge. The current state feeds back into the next-state logic and forward into the output logic.' },
        { type: 'text', html: `<p><b>Timing parameters</b> (from the registers lectures):</p>
<ul><li><b>T<sub>setup</sub></b>: how long <i>before</i> the clock edge the D input must be stable for the value to be captured correctly.</li>
<li><b>T<sub>hold</sub></b>: how long <i>after</i> the edge D must stay stable.</li>
<li><b>T<sub>cq</sub></b> (clock-to-Q): time from the rising edge until the register output changes.</li></ul>
<p>Assumption in the lecture: T<sub>hold</sub> and T<sub>cq</sub> are both measured after the edge, and T<sub>cq</sub> is the longer one. Also given: <b>T<sub>next,max</sub></b>, the maximum propagation delay (critical path) of the next-state logic, and <b>T<sub>out,moore</sub></b>, the maximum delay of the output logic. Wire delays are negligible unless stated.</p>` },
        { type: 'example', title: 'Minimum clock period',
          problem: 'Tcq = 2 ns, Tnext,max = 5 ns, Tsetup = 1 ns. What is the minimum clock period, and the maximum clock frequency?',
          steps: ['Follow the loop that must finish within one cycle. After a rising edge the register output changes after T<sub>cq</sub>.', 'The new state ripples through the next-state logic: T<sub>next,max</sub>.',
            'The result must reach the register T<sub>setup</sub> <i>before</i> the next edge.', 'T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub> = 2 + 5 + 1 = 8 ns.',
            'f<sub>max</sub> = 1 / 8 ns = 125 MHz. (The numbers are made up for practice; the formula is the lecture’s.)'],
          answer: 'Tclk,min = 8 ns, fmax = 125 MHz' },
        { type: 'example', title: 'When is the output valid?',
          problem: 'Same machine, with Tout,moore = 3 ns. How long after a rising edge is the output valid?',
          steps: ['The output depends only on the state register.', 'Wait T<sub>cq</sub> for the new state to appear, then T<sub>out,moore</sub> through the output logic.', 'T<sub>cq</sub> + T<sub>out,moore</sub> = 2 + 3 = 5 ns after the edge.'],
          answer: '5 ns after each rising edge' },
        { type: 'callout', tone: 'warn', html: 'The clock may be <b>longer</b> than the minimum. If it is <b>shorter</b>, the next state does not arrive a setup time before the edge, and the register can capture a wrong or unstable value (the lecture mentions <b>metastability</b>).' },
        { type: 'callout', tone: 'note', html: 'A very similar computation exists for Mealy machines, but the lecture says it is not in the scope of the class this year.' },
        { type: 'check', question: { id: 't7-l8-c1', type: 'numeric', difficulty: 2, src: sup(N_TNUM), answer: 7.5, tolerance: 0.01,
          prompt: 'A Moore FSM has Tcq = 1 ns, Tnext,max = 6 ns and Tsetup = 0.5 ns. What is the minimum clock period in ns?',
          steps: ['T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub>.', '= 1 + 6 + 0.5 = 7.5 ns.'],
          explanation: 'All three delays lie on the loop from one rising edge to the next: register output, next-state logic, setup of the register.' } },
        { type: 'check', question: { id: 't7-l8-c2', type: 'mc', difficulty: 1, src: c('tim 00:04:20', 'tim 00:08:19'),
          prompt: 'Which timing parameter does <b>not</b> appear in the lecture’s minimum clock period formula for a Moore FSM?',
          choices: ['T<sub>hold</sub>', 'T<sub>cq</sub>', 'T<sub>setup</sub>', 'T<sub>next,max</sub>'], answer: 0,
          explanation: 'T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub>. Hold time is measured after the edge, and with the assumption T<sub>cq</sub> &gt; T<sub>hold</sub> it does not limit the period.' } },
      ] },

    { id: 't7-l9', subtopic: 't7-timing', title: 'Analysing an FSM with a timing diagram: the toggle machine', minutes: 7,
      src: c('im1 00:01:53', 'im1 00:02:16', 'im1 00:02:45', 'im1 00:03:57', 'im1 00:04:51', 'im1 00:06:02', 'im1 00:06:54', 'im1 00:07:41', 'im1 00:08:10', 'im1 00:08:33'),
      blocks: [
        { type: 'text', html: '<p>Here the problem goes the opposite way from usual: we are <b>given</b> an FSM and must figure out what it does. The machine has four states S0–S3, one input <b>A</b> and one Moore output <b>toggle</b>. The tool is a timing diagram: dashed lines mark the positive clock edges, and under A we list the state and toggle for every cycle.</p>' },
        { type: 'diagram', diagram: fsmDiagram(TOGGLE), caption: 'The Class 24 toggle FSM. Outputs: S0 → 0, S1 → 1, S2 → 1, S3 → 0. Arrow labels are values of A.' },
        { type: 'example', title: 'Trace it', problem: `Start in S0. A at the rising edges: ${seqStr(TOGGLE_SEQ)} (the pattern of the lecture’s walk-through).`,
          steps: traceSteps(TOGGLE, TOGGLE_SEQ), answer: `toggle after each edge = ${outStr(afterEdges(rTog))}` },
        { type: 'diagram', diagram: fsmTiming(TOGGLE, TOGGLE_SEQ), caption: 'A is sampled at each rising edge of CLK; the state and toggle change only at those edges.' },
        { type: 'text', html: '<p><b>What does it do?</b> Look at where toggle changes: at the edge where the machine first sees A = 1 after A was 0, that is, at each <b>positive edge of A</b>. Then it keeps its value until the next positive edge of A. So toggle<sub>new</sub> = toggle<sub>old</sub>′ on every positive edge of A. It changes <b>twice as slowly</b> as A does.</p>' },
        { type: 'check', question: { id: 't7-l9-c1', type: 'short', difficulty: 2, src: sup(N_PRAC), normalize: 'binary', width: 4,
          prompt: 'Toggle FSM, starting in S0. A at four rising edges: 1, 0, 1, 0. Type toggle after each edge (4 bits).',
          accept: [outStr(afterEdges(run(TOGGLE, ['1', '0', '1', '0'])))], steps: traceSteps(TOGGLE, ['1', '0', '1', '0'], { outName: 'toggle' }),
          explanation: 'Every second change of A from 0 to 1 brings toggle back: two positive edges of A give 0 → 1 → 0.' } },
        { type: 'check', question: { id: 't7-l9-c2', type: 'numeric', difficulty: 3, src: sup(N_PRAC),
          prompt: 'Toggle FSM, starting in S0 (toggle = 0). A at six rising edges: 1, 0, 1, 0, 1, 0. How many times does toggle change value?',
          answer: (() => { const o = run(TOGGLE, ['1', '0', '1', '0', '1', '0']).outs; let n = 0; for (let i = 1; i < o.length; i++) if (o[i] !== o[i - 1]) n++; return n; })(),
          steps: traceSteps(TOGGLE, ['1', '0', '1', '0', '1', '0'], { outName: 'toggle' }).concat(['toggle went 0 → 1 → 1 → 0 → 0 → 1 → 1: it changed at edges 1, 3 and 5, three times, once per positive edge of A.']),
          explanation: 'toggle flips once for every positive edge of A, and this A has three 0 → 1 changes (counting the first 1 after the initial S0).' } },
      ] },

    /* ---------------- t7-implement ---------------- */
    { id: 't7-l10', subtopic: 't7-implement', title: 'From state diagram to state table', minutes: 8,
      src: c('im2 00:00:21', 'im2 00:00:40', 'im2 00:00:58', 'im2 00:01:38', 'im2 00:02:04', 'im2 00:03:08', 'im2 00:04:00', 'im2 00:05:43', 'im2 00:07:05', 'im2 00:08:36', 'im2 00:09:07', 'im2 00:10:45'),
      blocks: [
        { type: 'text', html: '<p>Goal: build the next-state logic and the Moore output logic for the toggle FSM.</p><p><b>Step 1, state encoding.</b> Use simple binary: S0 = 00, S1 = 01, S2 = 10, S3 = 11. Each state is two bits stored in the <b>state register SR</b>: bit <b>SR1</b> and bit <b>SR0</b>. These bits hold the <i>current</i> state.</p>' },
        { type: 'text', html: '<p><b>Step 2, the state transition and output table</b>: a “glorified truth table.” The left side lists the inputs of the next-state logic: the state-register bits SR1 SR0 and the external input A. Fill in all 2<sup>3</sup> = 8 combinations as in any truth table. Each <b>pair of rows is one state</b>: rows 0–1 are S0, 2–3 are S1, 4–5 are S2, 6–7 are S3. The right side holds the next state <b>NS1 NS0</b>, read from the diagram, and the output <b>toggle</b>.</p>' + TOG_TABLE },
        { type: 'example', title: 'Fill the next-state columns (lecture order)',
          problem: 'Use the state diagram to fill NS1 NS0 for each row.',
          steps: ['S0 (00), A = 0: stay in S0 → 00. S0, A = 1: go to S1 → 01.', 'S1 (01), A = 0: go to S2 → 10. S1, A = 1: stay in S1 → 01.',
            'S2 (10), A = 0: stay in S2 → 10. S2, A = 1: go to S3 → 11.', 'S3 (11), A = 0: back to S0 → 00. S3, A = 1: stay in S3 → 11. (The narration at 7:05 says “stay in state 2” here, but the diagram and the trace keep the machine in S3, code 11.)'],
          answer: 'NS1 NS0 = 00, 01, 10, 01, 10, 11, 00, 11 (rows 0–7)' },
        { type: 'example', title: 'Fill the output column',
          problem: 'Fill toggle for each row.',
          steps: ['The output logic’s only inputs are the state-register bits, so toggle depends only on the current state, the left part of the row.', 'S0 → 0, S1 → 1, S2 → 1, S3 → 0, no matter what A is.', 'So each pair of rows gets the same toggle value: 0 0, 1 1, 1 1, 0 0.'],
          answer: 'toggle = 0, 0, 1, 1, 1, 1, 0, 0' },
        { type: 'callout', tone: 'warn', html: '<b>The “super common mistake”</b> the lecture flags in red: writing the output from the next-state columns. The Moore output depends only on SR1 and SR0 (the current state). The next state depends on everything on the left side: SR1, SR0 and A.' },
        { type: 'check', question: { id: 't7-l10-c1', type: 'short', difficulty: 2, src: c('im2 00:06:54'), normalize: 'binary', width: 2,
          prompt: 'In the toggle FSM’s table, row SR1 SR0 A = 1 0 1. What is NS1 NS0?', accept: [TOGGLE_ENC[edgeFor(TOGGLE, 'S2', '1').to]],
          steps: ['SR1 SR0 = 10 is state S2.', 'From S2 with A = 1 the arrow goes to S3.', 'S3 is encoded 11, so NS1 NS0 = 11.'],
          explanation: 'Decode the current state, follow the arrow for the input value, then encode the destination.' } },
        { type: 'check', question: { id: 't7-l10-c2', type: 'mc', difficulty: 2, src: c('im2 00:08:36', 'im2 00:10:23'),
          prompt: 'Which columns of the table does the output <b>toggle</b> depend on?',
          choices: ['SR1 and SR0 only', 'SR1, SR0 and A', 'NS1 and NS0', 'A only'], answer: 0,
          explanation: 'In a Moore machine the output logic sees only the state register. Using NS1 NS0 is the lecture’s “super common mistake”; including A would make it a Mealy output.' } },
      ] },

    { id: 't7-l11', subtopic: 't7-implement', title: 'Next-state and output equations: K-maps and D flip-flops', minutes: 9,
      src: c('im3 00:00:08', 'im3 00:00:41', 'im3 00:01:27', 'im3 00:01:50', 'im3 00:02:23', 'im3 00:02:34', 'im3 00:03:52', 'im3 00:04:15', 'im3 00:04:40', 'im3 00:05:27', 'im3 00:06:11', 'im3 00:06:20', 'im3 00:06:52', 'tim 00:02:20'),
      blocks: [
        { type: 'text', html: '<p>The next-state function splits into one function per bit: <b>NS1</b> = f<sub>1</sub>(SR1, SR0, A) and <b>NS0</b> = f<sub>0</sub>(SR1, SR0, A). The output function is <b>toggle</b> = h(SR1, SR0). For each one, read the minterms from the table, put them on a K-map and minimize.</p>' },
        { type: 'example', title: 'NS1',
          problem: 'NS1 is 1 in rows (minterms) 2, 4, 5 and 7. Minimize.',
          steps: ['Mark minterms 2, 4, 5, 7 on a 3-variable map (zeros don’t have to be written).', 'Minterm 2 (SR1 SR0 A = 010) cannot be grouped with any other 1 → SR1′·SR0·A′.',
            'Minterms 4 and 5 group → SR1·SR0′.', 'Minterms 5 and 7 group → SR1·A.', 'NS1 = SR1·SR0′ + SR1·A + SR1′·SR0·A′.'],
          answer: 'NS1 = SR1·SR0′ + SR1·A + SR1′·SR0·A′' },
        { type: 'diagram', diagram: NS1_KMAP, caption: 'NS1: two pairs and one lonely minterm (2).' },
        { type: 'example', title: 'NS0',
          problem: 'NS0 is 1 in minterms 1, 3, 5, 7. Minimize.',
          steps: ['Minterms 1, 3, 5, 7 are exactly the cells where A = 1.', 'One group of four → NS0 = A.', 'Check by eye: the NS0 column of the table repeats the A column.'],
          answer: 'NS0 = A' },
        { type: 'diagram', diagram: NS0_KMAP, caption: 'NS0 = A: one group of four.' },
        { type: 'example', title: 'toggle',
          problem: 'The lecture puts toggle on the same 3-variable map. It is 1 in minterms 2, 3, 4, 5. Minimize.',
          steps: ['Minterms 2, 3 (SR1 SR0 = 01, either A) group → SR1′·SR0.', 'Minterms 4, 5 (SR1 SR0 = 10, either A) group → SR1·SR0′.', 'toggle = SR1·SR0′ + SR1′·SR0, which equals SR1 ⊕ SR0. A drops out, as it must for a Moore output.'],
          answer: 'toggle = SR1·SR0′ + SR1′·SR0' },
        { type: 'diagram', diagram: TOG_KMAP, caption: 'toggle: A drops out of both groups.' },
        { type: 'text', html: '<p><b>Putting it together.</b> NS1 and NS0 are implemented inside the next-state logic block; toggle replaces the output-logic box. The state register is built from D flip-flops (the block diagram shows one D/Q pair per bit). Since a D flip-flop’s Q takes D at the rising edge, each flip-flop input is simply the next-state bit: <b>D1 = NS1, D0 = NS0</b>.</p>' },
        { type: 'diagram', diagram: NS1_CIRCUIT, caption: 'Next-state logic for NS1 as gates. NS0 is just the wire A.' },
        { type: 'callout', tone: 'exam', html: 'The hub’s Final Exam page: Topic 7 is “always a multi-part design question: word problem → state diagram → state table → next-state logic → output logic.” Use D flip-flops: <b>D = next-state expression directly</b>.' },
        { type: 'check', question: { id: 't7-l11-c1', type: 'boolexpr', difficulty: 2, src: c('im3 00:04:15'), vars: ['Q1', 'Q0', 'A'], answer: 'A', maxLiterals: 1,
          prompt: 'Write the minimal expression for NS0 of the toggle FSM. Type SR1 as <b>Q1</b> and SR0 as <b>Q0</b>.',
          steps: ['NS0 = 1 in minterms 1, 3, 5, 7.', 'Those are the four cells with A = 1: one group of four.', 'NS0 = A.'],
          explanation: 'Every state’s NS0 equals A: S0 → S1 (01) on A, S1 → S2 (10) on A′, and so on. The low bit of the next code always matches A.' } },
        { type: 'check', question: { id: 't7-l11-c2', type: 'short', difficulty: 2, src: c('im3 00:01:34', 'im3 00:02:03'), normalize: 'list',
          prompt: 'List the minterms (SR1 SR0 A order) where NS1 = 1.', accept: [encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 0).ms.join(', ')],
          steps: ['Read the NS1 column row by row: rows 0–7 give 0, 0, 1, 0, 1, 1, 0, 1.', 'NS1 = 1 in rows 2, 4, 5, 7.'],
          explanation: 'The row number is the minterm number, with SR1 as the most significant bit.' } },
      ] },

    /* ---------------- t7-issues ---------------- */
    { id: 't7-l12', subtopic: 't7-issues', title: 'FSM issues: exactly one outgoing condition must be true', minutes: 7,
      src: c('iss 00:00:36', 'iss 00:00:54', 'iss 00:01:25', 'iss 00:02:03', 'iss 00:02:33', 'iss 00:02:51', 'iss 00:03:15', 'iss 00:03:45', 'iss 00:04:25', 'lab8b 00:06:19'),
      blocks: [
        { type: 'text', html: '<p><b>The rule.</b> In any state, at any given time, <b>exactly one outgoing condition must be true</b>. That has two halves:</p><ol><li><b>Define all possible paths</b> from each state: for every input combination some outgoing condition is true, so the FSM always knows where to go next.</li><li><b>No ambiguity</b>: two conditions are never true at the same time.</li></ol><p>A good one-input example: in S0, on A stay in S0, on A′ go to S1. A and A′ cover both values and never overlap.</p>' },
        { type: 'example', title: 'The lecture’s two-input problem',
          problem: 'Inputs A and B. From S0: “stay on A, go to S1 on B.” What goes wrong, and how do you fix it?',
          steps: ['List the input combinations: AB, AB′, A′B, A′B′ (2<sup>2</sup> = 4).', '<b>AB = 11</b>: both A and B are true, so the FSM is told to stay and to leave at the same time: conflicting requirements.',
            '<b>AB = 00</b>: neither condition is true, so we don’t know where to go.', 'AB = 10 (stay) and AB = 01 (go to S1) are fine.',
            'Fix (the lecture’s): keep A → stay; go to S1 on <b>A′B</b>; stay on <b>A′B′</b>. The two “stay” conditions combine to A + A′B′ = A + B′.',
            'Check: (A + B′)·(A′B) = 0, so they are mutually exclusive; (A + B′) + A′B = 1, so every case is covered.'],
          answer: 'stay on A + B′, go to S1 on A′B' },
        { type: 'diagram', diagram: fsmDiagram(ISS_BAD), caption: 'Broken: in S0, AB = 11 makes both arrows true and AB = 00 makes neither true.' },
        { type: 'diagram', diagram: fsmDiagram(ISS_FIX), caption: 'Fixed: the conditions A + B′ and A′B are mutually exclusive and together cover all four input combinations.' },
        { type: 'text', html: '<p><b>How to check any state.</b> For every pair of outgoing conditions, their AND must be 0. The OR of all of them must be 1. With n inputs you can also simply test all 2<sup>n</sup> combinations: in each one, exactly one condition must be 1.</p>' },
        { type: 'callout', tone: 'warn', html: 'The FSM Issues video is a <b>partial upload</b> that stops at 4:52, after this example, so the rest of that lecture isn’t available. <b>Supplemental</b>, standard practice: with binary encoding some codes are <b>unused</b> (5 states in 3 bits leave 3). Make sure the machine can’t get stuck in one: reset into the start state, and in Verilog give the case statement a <b>default</b>. Lab 8 does this for the state that is “by some accident or mistake none of these.”' },
        { type: 'check', question: { id: 't7-l12-c1', type: 'mc', difficulty: 2, src: c('iss 00:03:15'),
          prompt: 'In state S0 the outgoing conditions are A (stay) and B (go to S1). For which input combination are <b>two</b> conditions true at once?',
          choices: ['AB = 11', 'AB = 00', 'AB = 01', 'AB = 10'], answer: 0,
          explanation: 'A = 1 and B = 1 make both conditions true, so the machine is told to stay and to leave. At AB = 00 neither is true, which is the other problem.' } },
        { type: 'check', question: { id: 't7-l12-c2', type: 'tf', difficulty: 2, src: sup('Applies the lecture’s rule (exactly one outgoing condition true, all paths defined) to another condition set; checked by truth table.'),
          prompt: 'For a state with inputs A and B, the outgoing conditions {AB, A′B′} are a valid (complete and unambiguous) set.', answer: false,
          explanation: 'They never overlap, but they are not all-inclusive: AB = 01 and AB = 10 make neither condition true, so the next state is undefined.' } },
      ] },

    /* ---------------- t7-seqdet ---------------- */
    { id: 't7-l13', subtopic: 't7-seqdet', title: 'Sequence detectors: overlapping vs non-overlapping', minutes: 10, src: sup(N_SEQ),
      blocks: [
        { type: 'callout', tone: 'note', html: '<b>Supplemental lesson.</b> No mirrored lecture works a sequence detector. The hub’s Final Exam page lists them as a common FSM pattern and includes the drill “101 non-overlapping, Mealy, with D flip-flops”, solved below with the lecture’s method.' },
        { type: 'text', html: `<p>A <b>sequence detector</b> watches a serial input X, one bit per rising edge, and raises Z when the most recent bits match a pattern. Each state stands for <b>how much of the pattern has been matched so far</b>.</p>
<ul><li><b>Overlapping</b>: the end of one match may be reused as the start of the next. Pattern 101 in ${m('1010101')} is found at bits 3, 5 and 7: <b>3</b> detections.</li>
<li><b>Non-overlapping</b>: after a match the search starts fresh with the next bit. The same input gives matches at bits 3 and 7 only: <b>2</b> detections.</li></ul>` },
        { type: 'example', title: 'Moore detector for 101 (overlapping)',
          problem: 'Design the states and arrows.',
          steps: ['S0: nothing useful seen. S1: last bit is 1. S2: last two bits are 10. S3: last three bits are 101, so Z = 1 (Moore output inside S3).',
            'S0: on 1 → S1; on 0 stay.', 'S1: on 0 → S2; on 1 stay in S1 (the newest 1 can still start 101).', 'S2: on 1 → S3 (match); on 0 → S0 (100 contains no useful prefix).',
            'S3 (overlapping): the final 1 can start a new match. On 0 → S2 (we now have “10”); on 1 → S1.',
            'Non-overlapping version: only S3’s 0-arrow changes, to S0, because the 1 of the match may not be reused. (S3 on 1 → S1 is the same in both: that new 1 is a fresh start.)'],
          answer: '4 states; Z = 1 only in S3' },
        { type: 'diagram', diagram: fsmDiagram(D101_MOORE_OV), caption: 'Moore 101 detector, overlapping. Z (inside each state) is 1 only in S3.' },
        { type: 'example', title: 'Final-guide drill: 101 non-overlapping, Mealy, D flip-flops',
          problem: 'Draw the state diagram, write the state table, and derive the next-state and output equations.',
          steps: ['A Mealy machine produces Z on the arrow, so it needs no “match” state: S0 (nothing), S1 (seen 1), S2 (seen 10). 3 states instead of 4.',
            'S0: 0/0 stay, 1/0 → S1. S1: 1/0 stay, 0/0 → S2. S2: 0/0 → S0; <b>1/1 → S0</b> (non-overlapping: start fresh after the match).',
            'Encode S0 = 00, S1 = 01, S2 = 10. Code 11 is unused, so its rows are don’t-cares.', 'Write the table (below) with Q1 Q0 X on the left and N1 N0 Z on the right.',
            'N1 = 1 only in row 010, plus don’t-cares 110 and 111 → <b>N1 = Q0·X′</b>.', 'N0 = 1 in rows 001 and 011 → <b>N0 = Q1′·X</b>.',
            'Z = 1 only in row 101, plus don’t-care 111 → <b>Z = Q1·X</b>.', 'With D flip-flops: D1 = Q0·X′, D0 = Q1′·X.'],
          answer: 'D1 = Q0X′, D0 = Q1′X, Z = Q1X' },
        { type: 'diagram', diagram: fsmDiagram(D101_MEALY_NO), caption: 'Mealy 101 detector, non-overlapping. The detection arrow 1/1 returns to S0.' },
        { type: 'text', html: D101_TABLE + '<p class="muted">Grey rows: unused code 11 (don’t-cares).</p>' },
        { type: 'diagram', diagram: kmap(['Q1', 'Q0', 'X'], D101_N1.ms, D101_N1.dcs, [["Q0·X′", "Q0X'"]]), caption: 'N1 = Q0·X′ (uses the don’t-care at 110).' },
        { type: 'diagram', diagram: kmap(['Q1', 'Q0', 'X'], D101_N0.ms, D101_N0.dcs, [["Q1′·X", "Q1'X"]]), caption: 'N0 = Q1′·X.' },
        { type: 'diagram', diagram: kmap(['Q1', 'Q0', 'X'], D101_Z.ms, D101_Z.dcs, [['Q1·X', 'Q1X']]), caption: 'Z = Q1·X (uses the don’t-care at 111). It contains the input X: a Mealy output.' },
        { type: 'text', html: '<p><b>Overlapping Mealy version:</b> the arrow S2 —1/1→ goes to <b>S1</b> instead of S0, because the final 1 starts a new match. Then N0 becomes 1 in rows 001, 011 and 101, which simplifies to N0 = X.</p>' },
        { type: 'check', question: { id: 't7-l13-c1', type: 'short', difficulty: 2, src: sup(N_SEQ), normalize: 'binary', width: 5,
          prompt: 'Moore 101 detector, overlapping (diagram above), starting in S0. X = 1, 0, 1, 0, 1 at five rising edges. Type Z after each edge (5 bits).',
          accept: [outStr(afterEdges(run(D101_MOORE_OV, [...'10101'])))], steps: traceSteps(D101_MOORE_OV, [...'10101']),
          explanation: 'Overlapping: after the first 101 the last 1 is reused, so the next “01” completes a second match at edge 5.' } },
        { type: 'check', question: { id: 't7-l13-c2', type: 'numeric', difficulty: 2, src: sup(N_SEQ), answer: 2,
          prompt: 'How many times does a <b>non-overlapping</b> 101 detector report a match on the input 1010101?',
          steps: ['Bits 1–3 = 101 → match #1; start fresh at bit 4.', 'Bit 4 = 0 (no progress), bit 5 = 1 (seen 1), bit 6 = 0 (seen 10), bit 7 = 1 → match #2.', 'Total: 2.'],
          explanation: 'Overlapping would find 3 matches (bits 3, 5, 7), because the 1 that ends one match also starts the next.' } },
      ] },

    /* ---------------- t7-minimize ---------------- */
    { id: 't7-l14', subtopic: 't7-minimize', title: 'State minimization: merging equivalent states', minutes: 8, src: sup(N_MIN),
      blocks: [
        { type: 'callout', tone: 'note', html: '<b>Supplemental lesson.</b> The hub’s Final Exam page lists state minimization for Topic 7: “merge equivalent states (same outputs, same next-states for every input).” No mirrored lecture covers it; this is the standard textbook method.' },
        { type: 'text', html: '<p>Two states are <b>equivalent</b> if (1) they produce the <b>same outputs</b>, and (2) for <b>every input</b> their next states are equivalent. Equivalent states can be merged into one. Fewer states can mean fewer flip-flops and simpler logic.</p><p><b>Partition method:</b> (1) group the states by output; (2) split any group whose members, for some input, go to different groups; (3) repeat until nothing splits. Each final group becomes one state.</p>' },
        { type: 'text', html: minTable(MIN5) },
        { type: 'diagram', diagram: fsmDiagram(MIN5), caption: 'A 5-state Moore machine (A is the start state).' },
        { type: 'example', title: 'Minimize the 5-state machine',
          problem: 'Find the equivalent states and the minimized machine.',
          steps: ['Group by output: {A, B, D} (Z = 0) and {C, E} (Z = 1).',
            'Check {A, B, D} on X = 1: A → B and D → B stay inside the Z = 0 group, but B → C lands in the Z = 1 group. B splits off: {A, D}, {B}, {C, E}.',
            'Check {A, D}: on X = 0 both → A; on X = 1 both → B. They stay together (here the next states are even identical).',
            'Check {C, E}: on X = 0, C → A and E → D, both in {A, D}; on X = 1, C → E and E → E. They stay together.',
            'Check {B} needs nothing (one state). Nothing split in this round, so the partition is final.',
            'Result: 3 states, AD, B and CE. That is 2 flip-flops instead of 3.'],
          answer: '{A, D}, {B}, {C, E}: 3 states' },
        { type: 'diagram', diagram: fsmDiagram(MIN3), caption: 'Minimized machine: AD = “last bit 0 (or start)”, B = “one 1”, CE = “two or more 1s”, Z = 1. It is the overlapping “11” detector.' },
        { type: 'check', question: { id: 't7-l14-c1', type: 'tf', difficulty: 2, src: sup(N_MIN),
          prompt: 'In the 5-state example, C and E are equivalent even though, on X = 0, C goes to A while E goes to D.', answer: true,
          explanation: 'Equivalence asks for <i>equivalent</i> next states, not identical ones. A and D are themselves equivalent (same output, same next states), so C and E are too.' } },
      ] },

    /* ---------------- t7-design ---------------- */
    { id: 't7-l15', subtopic: 't7-design', title: 'Word problem to circuit: the complete design flow', minutes: 10,
      src: c('ex1 00:01:51', 'ex2 00:01:12', 'enc 00:01:52', 'im2 00:00:21', 'im2 00:01:55', 'im3 00:00:41', 'mea 00:05:04'),
      blocks: [
        { type: 'text', html: `<p>The whole method, put together. The hub’s Final Exam page lists the same order.</p>
<ol><li><b>Understand the problem</b>: inputs, outputs, Moore or Mealy, and what each state has to remember.</li>
<li><b>State transition diagram</b>. Self-check: every state covers all 2<sup>n</sup> input combinations, with exactly one condition true at a time.</li>
<li><span class="muted">(Optional, supplemental)</span> <b>minimize</b> the states.</li>
<li><b>State encoding / assignment</b>: binary, Gray or one-hot. Count the flip-flops; give the start state the all-zeros code (binary or Gray) so reset works.</li>
<li><b>State transition and output table</b>: current-state bits and inputs on the left; next-state bits and outputs on the right. Unused codes are don’t-cares.</li>
<li><b>Next-state K-maps</b> → flip-flop input equations. With D flip-flops, D = the next-state bit.</li>
<li><b>Output equations</b>. Moore: from the current-state bits only.</li>
<li>Draw the circuit and <b>check by tracing</b> a few inputs.</li></ol>` },
        { type: 'example', title: 'Final-guide drill: a vending machine (Moore)',
          problem: 'An item costs 15¢. The machine accepts nickels (N) and dimes (D), at most one coin per clock cycle. States = total cents inserted. Outputs: Disp (dispense) and Ret (return a nickel of change).',
          steps: ['States by amount: C0, C5, C10, then C15 (enough: dispense) and C20 (dispense and return 5¢). 5 states.',
            'Input conditions: N′D′ (no coin: stay), ND′ (nickel: +5¢), N′D (dime: +10¢). ND = 11 cannot happen, so the three conditions are mutually exclusive and cover every possible case.',
            'C0: N′D′ → C0, ND′ → C5, N′D → C10. C5: → C5, C10, C15. C10: → C10, C15, C20.',
            'Moore outputs (Disp, Ret): C15 = 10, C20 = 11, all others 00.', 'After one dispense cycle, C15 and C20 return to C0 (this design ignores coins during that cycle).',
            '5 states → ⌈log<sub>2</sub> 5⌉ = 3 flip-flops in binary, or 5 in one-hot.'],
          answer: '5 states; Disp in C15 and C20; Ret in C20 only' },
        { type: 'diagram', diagram: fsmDiagram(VEND), caption: 'Vending machine. Outputs inside each state are (Disp, Ret).' },
        { type: 'text', html: '<p>Trace: a dime then another dime: C0 → C10 → C20, so Disp = 1 and Ret = 1 (20¢ paid, 5¢ back). A nickel then a dime: C0 → C5 → C15, so Disp = 1 and Ret = 0.</p>' },
        { type: 'example', title: 'Supplemental: a complete small design, the parity checker',
          problem: 'Moore FSM: Z = 1 while an odd number of 1s has been seen on X so far. Go all the way to the equations.',
          steps: ['Diagram: two states, EVEN (Z = 0, start) and ODD (Z = 1). A 1 swaps them; a 0 keeps the state.', 'Encoding: EVEN = 0, ODD = 1 → one flip-flop Q.',
            'Table rows (Q X → next): 00 → 0, 01 → 1, 10 → 1, 11 → 0.', 'Next state: minterms 1, 2 → D = Q′X + QX′ = Q ⊕ X.', 'Output (Moore, from Q only): Z = Q. The state code is the output.'],
          answer: 'D = Q ⊕ X, Z = Q' },
        { type: 'diagram', diagram: fsmDiagram(PARITY), caption: 'Parity checker: Z = 1 in ODD.' },
        { type: 'check', question: { id: 't7-l15-c1', type: 'short', difficulty: 2, src: fg(N_VEND), normalize: 'text',
          prompt: 'Vending machine, starting in C0: a nickel, then a dime, at two rising edges. Which state is it in? (Type the state name, e.g. C10.)', accept: [run(VEND, ['10', '01']).states[2], '15', '15¢', '15 cents'],
          steps: traceSteps(VEND, ['10', '01'], { outName: '(Disp, Ret)' }),
          explanation: '5¢ + 10¢ = 15¢, so the machine reaches C15, where Disp = 1 and Ret = 0.' } },
        { type: 'check', question: { id: 't7-l15-c2', type: 'boolexpr', difficulty: 2, src: sup(N_IMPL), vars: ['Q', 'X'], answer: 'Q ⊕ X', maxLiterals: 4,
          prompt: 'Parity checker with EVEN = 0, ODD = 1. Write the D flip-flop input (next state) as an expression in Q and X.',
          steps: ['Next state is 1 when (Q, X) = (0, 1) (EVEN, input 1 → ODD) or (1, 0) (ODD, input 0 → stays ODD).', 'Minterms 1 and 2: D = Q′X + QX′.', 'That is Q ⊕ X.'],
          explanation: 'A 1 on X flips the state and a 0 keeps it: exactly what XOR does. Q′X + QX′ and Q ⊕ X are both accepted.' } },
      ] },
  ];

  /* ---------- flashcards ---------- */
  const TOG_TT = { kind: 'truthtable', vars: ['SR1', 'SR0', 'A'], showIndex: true, outputs: [
    { name: 'NS1', values: encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 0).ms.reduce((v, i) => (v[i] = 1, v), [0, 0, 0, 0, 0, 0, 0, 0]) },
    { name: 'NS0', values: encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 1).ms.reduce((v, i) => (v[i] = 1, v), [0, 0, 0, 0, 0, 0, 0, 0]) },
    { name: 'toggle', values: encMinterms(TOGGLE, TOGGLE_ENC, 2, 'out', 0).ms.reduce((v, i) => (v[i] = 1, v), [0, 0, 0, 0, 0, 0, 0, 0]) }] };

  const flashcards = [
    // t7-definition
    { id: 't7-f1', subtopic: 't7-definition', src: c('def 00:00:23', 'def 00:00:32'),
      front: 'What is a finite state machine (FSM), and why does it need memory?',
      back: 'A <b>model of computation</b> that is always in one of a finite number of <b>states</b> and moves to a next state based on its current state and inputs. It must remember the current state, so it needs <b>memory</b> (a state register). That is why FSMs come after registers.' },
    { id: 't7-f2', subtopic: 't7-definition', src: c('def 00:02:43', 'def 00:03:26'),
      front: 'The six-tuple that defines an FSM',
      back: 'FSM = (I, O, S, f, h, S<sub>0</sub>): inputs, outputs, states, next-state function, output function, initial state.' },
    { id: 't7-f3', subtopic: 't7-definition', src: c('def 00:05:21', 'def 00:05:48'),
      front: 'The next-state function f',
      back: 'f: S × I → S. For <b>every state and every input</b> it gives the next state.' },
    { id: 't7-f4', subtopic: 't7-definition', src: c('def 00:06:18', 'def 00:06:39'),
      front: 'The output function h: Moore vs Mealy',
      back: '<b>Moore</b>: h: S → O (the output depends on the state only).<br><b>Mealy</b>: h: S × I → O (the output depends on the state and the input).' },
    { id: 't7-f5', subtopic: 't7-definition', src: c('def 00:07:04', 'def 00:07:21'),
      front: 'S<sub>0</sub> in the six-tuple',
      back: 'The <b>initial state</b>: one designated state where the FSM always starts. Its name doesn’t matter.' },
    { id: 't7-f6', subtopic: 't7-definition', src: c('def 00:01:04', 'def 00:01:37', 'def 00:02:08'),
      front: 'Where are FSMs a good fit? (lecture’s list)',
      back: '<b>Control-intensive</b> hardware (check a status, then decide the next step), <b>network protocols</b>, theory of computation and languages, compilers, and <b>property verification and testing</b>.' },

    // t7-moore
    { id: 't7-f7', subtopic: 't7-moore', src: c('vis 00:01:40', 'vis 00:02:57'),
      front: 'Moore state diagram: where does the output go?',
      back: '<b>Inside the state circle</b> (or listed next to it), because a Moore output depends only on the state. Arrows carry only input conditions.' },
    { id: 't7-f8', subtopic: 't7-moore', src: c('vis 00:03:27', 'vis 00:04:06'),
      front: 'How is the initial state marked on a state diagram?',
      back: 'An <b>arc coming from nowhere</b> into it. Some books draw the initial state as a <b>double circle</b> instead.' },
    { id: 't7-f9', subtopic: 't7-moore', src: c('vis 00:04:22', 'vis 00:05:00', 'vis 00:05:22'),
      front: 'A Moore state has many outputs. What do you write?',
      back: 'List them next to the state. The <b>default output is 0</b>, so you only need to list the outputs that are <b>1</b> in that state.' },
    { id: 't7-f10', subtopic: 't7-moore', src: c('vis 00:06:26', 'vis 00:06:44'),
      front: 'Two ways to label an arrow for a one-input machine (input IN)',
      back: 'With the literal, <b>IN′</b> / <b>IN</b>, or with the value, <b>0</b> / <b>1</b>. They mean the same thing.' },
    { id: 't7-f11', subtopic: 't7-moore', src: c('op 00:03:35', 'op 00:03:51', 'op 00:04:20'),
      front: 'When does a clocked FSM look at its input and change state?',
      back: 'At each <b>positive (rising) clock edge</b> it samples the input and makes its transition; between edges the state holds. The clock is often assumed even when not drawn. (Some FSMs have inputs only and no clock.)' },
    { id: 't7-f12', subtopic: 't7-moore', src: c('op 00:06:05'), frontDiagram: fsmDiagram(PULSE),
      front: 'What does this Moore machine (from Class 21) do?',
      back: 'It generates a <b>short pulse</b>: out = 1 for one clock cycle every time it finds IN = 1. S1 always returns to S0, so a held 1 gives 1, 0, 1, 0, ….' },

    // t7-mealy
    { id: 't7-f13', subtopic: 't7-mealy', src: c('mea 00:00:06', 'mea 00:00:19'),
      front: 'What does a Mealy output depend on?',
      back: 'The <b>combination of the current state and the current input</b>.' },
    { id: 't7-f14', subtopic: 't7-mealy', src: c('mea 00:00:39', 'mea 00:00:49'),
      front: 'Meaning of the Mealy arrow label <span class="mono">1/0</span>',
      back: '<b>input/output</b>: when the input is 1, output 0 and take this arrow to its next state.' },
    { id: 't7-f15', subtopic: 't7-mealy', src: c('mea 00:03:45', 'mea 00:04:11', 'mea 00:04:35', 'mea 00:05:04'),
      front: 'The edge-count self-check for any state diagram',
      back: 'With <i>n</i> binary input variables, each state needs <b>2<sup>n</sup> outgoing edges</b> (2 for one input, 8 for three). Some can be self-loops. Meaning: in every state, define the transition <b>for all inputs</b>.' },
    { id: 't7-f16', subtopic: 't7-mealy', src: c('mea 00:02:49', 'mea 00:02:57', 'mea 00:03:06'),
      front: 'Mealy example 2: why are there two separate edges out of S1?',
      back: 'On input 0 the output is 1, but on input 1 the output is 0. Different outputs need different input/output labels.',
      needsSource: 'The whiteboard drawing of Mealy example 2 (where the S1 arrows lead) is not in the transcript.' },
    { id: 't7-f17', subtopic: 't7-mealy', src: sup(N_MT),
      front: 'Moore vs Mealy: when does the output change?',
      back: '<b>Moore</b>: only after a clock edge changes the state, then stable for the whole cycle.<br><b>Mealy</b>: as soon as the input changes, even mid-cycle. It can respond a cycle earlier, but it can glitch.' },
    { id: 't7-f18', subtopic: 't7-mealy', src: sup(N_MT), backDiagram: fsmDiagram(EDGE_MEALY),
      front: 'Rising-edge detector: how many states for Moore vs Mealy?',
      back: '<b>Moore: 3</b> states (S0, “just rose” with Z = 1, “still high”).<br><b>Mealy: 2</b> states (shown); the 1 is produced on the S0 → S1 arrow. Mealy machines often need fewer states.' },

    // t7-examples
    { id: 't7-f19', subtopic: 't7-examples', src: c('ex1 00:00:19', 'ex1 00:00:44', 'ex1 00:01:51'), frontDiagram: fsmDiagram(LOHI),
      front: 'Example #1 (LO/HI): what does it do, and who chose the start state?',
      back: 'out = the value of A at the last rising edge (A delayed one clock). The problem didn’t give a start state; choosing <b>LO</b> was a design decision.' },
    { id: 't7-f20', subtopic: 't7-examples', src: c('ex1 00:09:20', 'ex1 00:09:40'),
      front: 'When can a state’s code double as its output?',
      back: 'When the encoding equals the output the state produces (e.g. LO = 0, HI = 1). Then no extra output logic is needed.' },
    { id: 't7-f21', subtopic: 't7-examples', src: c('ex2 00:00:43', 'ex2 00:01:31', 'ex2 00:01:46'),
      front: 'Example #2 (holiday lights): sequence, number of states, bit order',
      back: 'STU = 000 → 101 → 010 → 111, then repeat. One state per light combination: <b>4 states</b>. S is the most significant (leftmost) bit.' },
    { id: 't7-f22', subtopic: 't7-examples', src: c('ex2 00:03:09', 'ex2 00:03:18', 'ex2 00:03:29'), backDiagram: fsmDiagram(LIGHTS),
      front: 'Holiday lights: what condition is on each arrow?',
      back: '<b>None</b>. There is no input to consult (a corner case), so the machine moves to the next state on every positive clock edge.' },
    { id: 't7-f23', subtopic: 't7-examples', src: c('im1 00:07:41', 'im1 00:08:10', 'im1 00:08:33'), frontDiagram: fsmDiagram(TOGGLE),
      front: 'Class 24 toggle FSM: what does it do?',
      back: 'Every <b>positive edge of A</b> flips the output: toggle<sub>new</sub> = toggle<sub>old</sub>′, and it holds until the next positive edge of A. It changes half as often as A.' },
    { id: 't7-f24', subtopic: 't7-examples', src: c('im1 00:02:16', 'im1 00:02:45'),
      front: 'How do you find out what a given FSM does?',
      back: 'Feed it a sample input and draw a <b>timing diagram</b>: mark each positive clock edge, follow one arrow per edge, and list the state and output under the input. Then look for the pattern.' },

    // t7-encoding
    { id: 't7-f25', subtopic: 't7-encoding', src: c('enc 00:00:22', 'enc 00:03:42'),
      front: 'State encoding (state assignment)',
      back: 'Giving every state a <b>binary code</b>, because the current state is stored as n bits in the <b>state register</b>.' },
    { id: 't7-f26', subtopic: 't7-encoding', src: c('enc 00:01:52', 'enc 00:02:06', 'enc 00:02:15'),
      front: 'Minimum bits for 5 states (binary)? And in general?',
      back: '<b>3</b>, since 2 bits give only 4 codes. In general ⌈log<sub>2</sub> N⌉ bits for N states (the same for Gray code).' },
    { id: 't7-f27', subtopic: 't7-encoding', src: c('enc 00:07:55', 'enc 00:08:12'),
      front: 'One-hot encoding: bits needed and code shape',
      back: '<b>One bit per state</b> (5 states → 5 bits). Exactly one bit is 1: S0 = 00001, S1 = 00010, …, S4 = 10000.' },
    { id: 't7-f28', subtopic: 't7-encoding', src: c('enc 00:05:00', 'enc 00:06:34', 'enc 00:07:12', 'enc 00:07:21'),
      front: 'Gray-code state encoding: property and advantage',
      back: 'Consecutive codes differ in <b>exactly one bit</b>. A machine that steps through its states in order (forwards or backwards) flips one flip-flop per step, which means <b>less power</b>.' },
    { id: 't7-f29', subtopic: 't7-encoding', src: c('enc 00:02:54', 'enc 00:03:00', 'enc 00:03:08'),
      front: 'Why give the start state the all-zeros code?',
      back: '<b>Reset</b> clears every bit of the state register, which puts the FSM straight into its start state.' },
    { id: 't7-f30', subtopic: 't7-encoding', src: c('enc 00:09:05', 'enc 00:09:17', 'enc 00:09:30'),
      front: 'One-hot advantage: what does code 00011 tell you?',
      back: 'States are very clearly defined. A code with two 1s (or none) is certainly an <b>erroneous state</b>.' },
    { id: 't7-f31', subtopic: 't7-encoding', src: c('enc 00:05:19', 'enc 00:06:07'),
      front: 'Gray codes for five states S0–S4 (3 bits)',
      back: '<span class="mono">000, 001, 011, 010, 110</span>: each differs from the previous one in one bit. (The standard reflected Gray code; the lecture builds it on the board.)' },
    { id: 't7-f32', subtopic: 't7-encoding', src: c('tim 00:00:46', 'tim 00:00:59', 'tim 00:01:13', 'enc 00:09:37'),
      front: 'Besides flip-flop count, what does the encoding choice affect?',
      back: '<b>Power</b> (bit flips) and the <b>complexity of the next-state logic</b>: one encoding can give much simpler logic than another. (The lab uses Gray encoding.)' },
    { id: 't7-f33', subtopic: 't7-encoding', src: sup(N_ONEHOTRST),
      front: 'One-hot and reset: what is the catch?',
      back: 'S0 = 00001 is not all zeros. Clearing every flip-flop gives 00000, an invalid state, so reset must <b>set</b> S0’s flip-flop. (Supplemental.)' },

    // t7-timing
    { id: 't7-f34', subtopic: 't7-timing', src: c('tim 00:01:46', 'tim 00:02:14', 'tim 00:02:58', 'lab8a 00:00:26'),
      front: 'The three blocks of a Moore FSM',
      back: '<b>Next-state logic</b> (combinational, f; inputs = external inputs + current state) → <b>state register</b> (clocked flip-flops) → <b>Moore output logic</b> (combinational, h; input = current state only).' },
    { id: 't7-f35', subtopic: 't7-timing', src: c('tim 00:07:32', 'tim 00:08:06', 'tim 00:08:49'),
      front: 'Minimum clock period of a Moore FSM',
      back: '<b>T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub></b>: clock-to-Q, then the slowest path through the next-state logic, then setup before the next edge.' },
    { id: 't7-f36', subtopic: 't7-timing', src: c('tim 00:09:40', 'tim 00:09:58', 'tim 00:10:30'),
      front: 'How long after a clock edge is a Moore output valid?',
      back: '<b>T<sub>cq</sub> + T<sub>out,moore</sub></b>: the new state appears, then passes through the output logic.' },
    { id: 't7-f37', subtopic: 't7-timing', src: c('tim 00:03:53', 'tim 00:08:31', 'tim 00:08:39'),
      front: 'T<sub>setup</sub>, T<sub>hold</sub>, T<sub>cq</sub>',
      back: '<b>T<sub>setup</sub></b>: D must be stable this long <i>before</i> the edge. <b>T<sub>hold</sub></b>: stable this long <i>after</i> the edge. <b>T<sub>cq</sub></b>: from the edge until Q changes. (Lecture assumption: T<sub>cq</sub> &gt; T<sub>hold</sub>.)' },
    { id: 't7-f38', subtopic: 't7-timing', src: c('tim 00:09:02', 'tim 00:09:09'),
      front: 'What if the clock period is shorter than T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub>?',
      back: 'The next state can arrive too late, and the register may capture a wrong value or go <b>metastable</b>. A longer clock is always fine.' },

    // t7-implement
    { id: 't7-f39', subtopic: 't7-implement', src: c('im2 00:00:58', 'im2 00:02:04', 'im2 00:04:00'),
      front: 'State transition and output table (“glorified truth table”): what is on each side?',
      back: '<b>Left</b>: current-state bits (SR1 SR0) and external inputs, all combinations; each group of rows is one state. <b>Right</b>: next-state bits (NS1 NS0) and the outputs.' },
    { id: 't7-f40', subtopic: 't7-implement', src: c('im2 00:00:40', 'im2 00:05:43', 'im2 00:09:07'), frontDiagram: fsmDiagram(TOGGLE), backDiagram: TOG_TT,
      front: 'State table of the toggle FSM with S0 = 00, S1 = 01, S2 = 10, S3 = 11',
      back: 'NS1 NS0 = 00, 01, 10, 01, 10, 11, 00, 11 and toggle = 0, 0, 1, 1, 1, 1, 0, 0 for rows 0–7.' },
    { id: 't7-f41', subtopic: 't7-implement', src: c('im3 00:02:34'), backDiagram: NS1_KMAP,
      front: 'Toggle FSM: minimal NS1',
      back: 'NS1 = SR1·SR0′ + SR1·A + SR1′·SR0·A′ (minterms 2, 4, 5, 7).' },
    { id: 't7-f42', subtopic: 't7-implement', src: c('im3 00:04:15', 'im3 00:04:40'),
      front: 'Toggle FSM: minimal NS0',
      back: '<b>NS0 = A</b> (minterms 1, 3, 5, 7). The NS0 column repeats the A column.' },
    { id: 't7-f43', subtopic: 't7-implement', src: c('im3 00:06:11', 'im3 00:06:20'),
      front: 'Toggle FSM: output equation',
      back: 'toggle = SR1·SR0′ + SR1′·SR0 (= SR1 ⊕ SR0). A does not appear: it’s a Moore output.' },
    { id: 't7-f44', subtopic: 't7-implement', src: c('im2 00:10:45', 'im2 00:11:05'),
      front: 'The “super common mistake” when filling the output column',
      back: 'Writing the output from the <b>next-state</b> columns. A Moore output depends only on the <b>current-state</b> bits (SR1, SR0).' },
    { id: 't7-f45', subtopic: 't7-implement', src: fg('Hub Final Exam page, Topic 7: “D flip-flops: always preferred for design; D = next-state expression directly.” The lecture’s state register is drawn with D/Q flip-flops (Class 23 V2).'),
      front: 'With a D flip-flop state register, what is each flip-flop’s D input?',
      back: 'The <b>next-state bit</b> itself: D1 = NS1, D0 = NS0. At the rising edge Q takes D, so the register becomes the next state.' },
    { id: 't7-f46', subtopic: 't7-implement', src: sup(N_IMPL),
      front: 'How many rows does a state table have?',
      back: '2<sup>(state bits + input bits)</sup>. The toggle FSM has 2 state bits and 1 input: 2<sup>3</sup> = 8 rows.' },

    // t7-issues
    { id: 't7-f47', subtopic: 't7-issues', src: c('iss 00:00:36', 'iss 00:01:25', 'iss 00:01:51'),
      front: 'The FSM-issues rule for outgoing conditions',
      back: 'In each state, at any time, <b>exactly one</b> outgoing condition must be true. All paths are defined (no “where do I go?”) and none conflict (no ambiguity).' },
    { id: 't7-f48', subtopic: 't7-issues', src: c('iss 00:02:40', 'iss 00:03:15', 'iss 00:03:45'), frontDiagram: fsmDiagram(ISS_BAD),
      front: 'From S0: “stay on A, go to S1 on B.” What is wrong?',
      back: 'AB = 11: both conditions are true, so the requirements conflict. AB = 00: no condition is true, so the next state is unknown. Fix: stay on A + B′, go on A′B.' },
    { id: 't7-f49', subtopic: 't7-issues', src: sup('Algebraic form of the lecture’s rule (exactly one outgoing condition true); standard material.'),
      front: 'Algebraic check that a state’s outgoing conditions are valid',
      back: 'Every pair ANDs to <b>0</b> (mutually exclusive), and all of them OR to <b>1</b> (all-inclusive).' },
    { id: 't7-f50', subtopic: 't7-issues', src: c('lab8b 00:06:11', 'lab8b 00:06:19', 'lab8b 00:07:24'),
      front: 'Lab 8 Verilog: why a <span class="mono">default</span> in the next-state case statement?',
      back: 'To handle a state that is, “by some accident or mistake,” none of the listed states. The instructor also puts an unused value in the defaults as an indicator in simulation.' },
    { id: 't7-f51', subtopic: 't7-issues', src: sup(N_ISS),
      front: 'Unused state codes: why care?',
      back: 'Binary encoding of N states can leave codes unused (5 states in 3 bits leave 3). Make sure the machine can’t get stuck in one: reset into the start state and give unused codes a defined next state. (Supplemental.)' },

    // t7-seqdet
    { id: 't7-f52', subtopic: 't7-seqdet', src: sup(N_SEQ),
      front: 'Overlapping vs non-overlapping sequence detection',
      back: '<b>Overlapping</b>: the end of one match can start the next (101 in 10101 → 2 matches). <b>Non-overlapping</b>: after a match, start fresh (10101 → 1 match).' },
    { id: 't7-f53', subtopic: 't7-seqdet', src: sup(N_SEQ),
      front: 'What does each state of a sequence detector represent?',
      back: 'How much of the pattern has been matched so far, e.g. for 101: nothing, “1”, “10” (and, in Moore, “101 found”).' },
    { id: 't7-f54', subtopic: 't7-seqdet', src: sup(N_SEQ), backDiagram: fsmDiagram(D101_MOORE_OV),
      front: 'Minimum states for a 101 detector: Moore vs Mealy',
      back: '<b>Moore: 4</b> (the last state holds Z = 1). <b>Mealy: 3</b> (Z = 1 on the arrow that completes 101).' },
    { id: 't7-f55', subtopic: 't7-seqdet', src: fg('Hub Final Exam drill: 101 non-overlapping Mealy detector with D flip-flops; equations derived for this app (S0 = 00, S1 = 01, S2 = 10, 11 unused as don’t-cares) and checked by truth table.'), backDiagram: fsmDiagram(D101_MEALY_NO),
      front: '101 non-overlapping Mealy detector (S0 = 00, S1 = 01, S2 = 10): D-input and output equations',
      back: '<b>D1 = Q0·X′</b>, <b>D0 = Q1′·X</b>, <b>Z = Q1·X</b>. Code 11 is a don’t-care.' },

    // t7-minimize
    { id: 't7-f56', subtopic: 't7-minimize', src: fg('Hub Final Exam page, Topic 7: “State minimization: merge equivalent states (same outputs, same next-states for every input).”'),
      front: 'When are two states equivalent?',
      back: 'They have the <b>same outputs</b>, and for <b>every input</b> their next states are equivalent. Equivalent states can be merged.' },
    { id: 't7-f57', subtopic: 't7-minimize', src: sup(N_MIN),
      front: 'The partition method of state minimization',
      back: '1. Group states by output. 2. Split any group whose members, for some input, go to different groups. 3. Repeat until nothing splits. Each final group becomes one state.' },
    { id: 't7-f58', subtopic: 't7-minimize', src: sup(N_MIN),
      front: 'Why minimize states?',
      back: 'Fewer states can mean fewer flip-flops (⌈log<sub>2</sub> N⌉) and simpler next-state and output logic. Example: 5 states (3 flip-flops) → 3 states (2 flip-flops).' },

    // t7-design
    { id: 't7-f59', subtopic: 't7-design', src: fg(N_FLOW),
      front: 'FSM design flow (final exam)',
      back: 'Word problem → state diagram → state table → state assignment → next-state K-maps → flip-flop input equations → output equations.' },
    { id: 't7-f60', subtopic: 't7-design', src: fg(N_VEND), backDiagram: fsmDiagram(VEND),
      front: 'Vending machine drill (15¢, nickels and dimes, Moore): states and outputs',
      back: 'States = cents inserted: C0, C5, C10, C15, C20. Disp = 1 in C15 and C20; Ret = 1 only in C20 (5¢ change). Conditions N′D′, ND′, N′D.' },
    { id: 't7-f61', subtopic: 't7-design', src: sup(N_IMPL), frontDiagram: fsmDiagram(PARITY),
      front: 'Parity checker (EVEN = 0, ODD = 1): next-state and output equations',
      back: '<b>D = Q ⊕ X</b> (a 1 flips the state), <b>Z = Q</b>.' },
    { id: 't7-f62', subtopic: 't7-design', src: fg('Hub Final Exam page, Topic 7: “Common patterns: sequence detectors (overlapping vs non-overlapping), vending machines, traffic lights, counters as FSMs.”'),
      front: 'Common FSM patterns to expect on the final',
      back: 'Sequence detectors (overlapping vs non-overlapping), vending machines, traffic lights, and counters as FSMs.' },
  ];

  /* ---------- questions (part A: definition, Moore, Mealy, examples, encoding) ---------- */
  const flipCount = codes => codes.reduce((n, code, i) => { const nx = codes[(i + 1) % codes.length]; let d = 0; for (let j = 0; j < code.length; j++) if (code[j] !== nx[j]) d++; return n + d; }, 0);
  const bitsFor = n => { let b = 0; while ((1 << b) < n) b++; return b; };
  const TRACE_ONLY = (M, seq, outNames) => { const t = fsmTiming(M, seq, { bus: false, outNames: [] }); return { kind: 'timing', edges: true, signals: t.signals }; };

  const questionsA = [
    /* ---- t7-definition ---- */
    { id: 't7-q1', subtopic: 't7-definition', type: 'mc', difficulty: 1, src: c('def 00:02:43', 'def 00:03:26'),
      prompt: 'The lecture describes an FSM as a six-tuple. Which one?',
      choices: ['(I, O, S, f, h, S<sub>0</sub>): inputs, outputs, states, next-state function, output function, initial state',
        '(I, O, S, f, S<sub>0</sub>, CLK): inputs, outputs, states, next-state function, initial state, clock',
        '(I, O, f, g, h, k): inputs, outputs and four functions',
        '(S, D, Q, CLK, R, S<sub>0</sub>): the signals of the state register'], answer: 0,
      explanation: 'FSM = (I, O, S, f, h, S<sub>0</sub>). The clock is assumed by clocked machines, but it is not one of the six parts of the definition.' },
    { id: 't7-q2', subtopic: 't7-definition', type: 'match', difficulty: 1, src: c('def 00:03:42', 'def 00:04:14', 'def 00:04:41', 'def 00:05:21', 'def 00:06:18', 'def 00:07:04'),
      prompt: 'Match each part of FSM = (I, O, S, f, h, S<sub>0</sub>) with its meaning.',
      pairs: [['I', 'set of inputs (it may even be empty)'], ['O', 'set of outputs'], ['S', 'set of states'], ['f', 'next-state function S × I → S'], ['h', 'output function'], ['S<sub>0</sub>', 'initial state, where the FSM always starts']],
      explanation: 'f gives the next state for every (state, input) pair; h gives the outputs, from the state alone (Moore) or from the state and the input (Mealy).' },
    { id: 't7-q3', subtopic: 't7-definition', type: 'mc', difficulty: 2, src: c('def 00:06:18', 'def 00:06:29'),
      prompt: 'For a <b>Moore</b> FSM, which signature does the output function h have?',
      choices: ['h: S → O', 'h: S × I → O', 'h: S × I → S', 'h: I → O'], answer: 0,
      explanation: 'Moore: each state maps to its output. S × I → O is the Mealy output function, S × I → S is the next-state function f, and I → O would be plain combinational logic with no state.' },
    { id: 't7-q4', subtopic: 't7-definition', type: 'tf', difficulty: 2, src: c('def 00:00:23', 'tim 00:02:42'),
      prompt: 'Because an FSM’s next state is computed by combinational logic, an FSM can be built without any memory elements.', answer: false,
      explanation: 'False. The next-state logic is combinational, but the FSM must remember its current state, so it needs memory: the state register. The lecture calls an FSM a group of combinational <i>and</i> sequential circuits.' },
    { id: 't7-q5', subtopic: 't7-definition', type: 'multi', difficulty: 1, src: c('def 00:01:04', 'def 00:01:37', 'def 00:01:59', 'def 00:02:08'),
      prompt: 'Which of these did the lecture name as uses of FSMs? Select all that apply.',
      choices: ['Control-intensive digital hardware', 'Network protocols', 'Compilers and the theory of languages', 'Property verification and testing', 'Replacing every register in a design with gates'], answers: [0, 1, 2, 3],
      explanation: 'The lecture lists control-intensive applications, network protocols, computation and languages (compilers), and property verification and testing. An FSM <i>needs</i> a register for its state; it can’t replace registers with gates.' },
    { id: 't7-q6', subtopic: 't7-definition', type: 'numeric', difficulty: 2, src: sup('Counting the entries of the lecture’s next-state function f: S × I → S for a made-up machine.'), answer: 12,
      prompt: 'An FSM has 3 states and 2 binary input variables. How many entries does the next-state function f need (one per state–input combination)?',
      steps: ['f is defined for every pair (state, input combination).', '2 binary inputs give 2<sup>2</sup> = 4 input combinations.', '3 states × 4 combinations = 12 entries.'],
      explanation: 'f: S × I → S has |S| × (number of input combinations) entries. On the diagram, that means 4 outgoing edges per state, 12 in total.' },
    { id: 't7-q7', subtopic: 't7-definition', type: 'tf', difficulty: 1, src: c('def 00:07:04', 'def 00:07:21'),
      prompt: 'One state of an FSM is designated the initial state, and the FSM always starts from it.', answer: true,
      explanation: 'True. S<sub>0</sub> in the six-tuple is the initial state. Its name does not matter, but it must be known.' },

    /* ---- t7-moore ---- */
    { id: 't7-q8', subtopic: 't7-moore', type: 'mc', difficulty: 1, src: c('vis 00:03:27', 'vis 00:04:06'),
      prompt: 'How does a state transition diagram show which state is the initial state?',
      choices: ['An arc that comes from no state and points into it (or a double circle)', 'It is always the state drawn at the top left', 'It is the state whose output is 0', 'It is the state with the most self-loops'], answer: 0,
      explanation: 'The lecture marks the initial state with an incoming arc that starts from nowhere and mentions the double-circle alternative. Position and output do not define it.' },
    { id: 't7-q9', subtopic: 't7-moore', type: 'tf', difficulty: 1, src: c('vis 00:05:00', 'vis 00:05:22'),
      prompt: 'In a Moore state diagram with several outputs, any output not listed for a state is 0 in that state.', answer: true,
      explanation: 'True. The default output is 0, so the lecture lists only the outputs that become 1 in each state.' },
    { id: 't7-q10', subtopic: 't7-moore', type: 'short', difficulty: 2, src: c('op 00:01:49', 'op 00:02:44'), normalize: 'binary', width: 5,
      diagram: fsmDiagram(PULSE),
      prompt: 'The pulse machine starts in S0. IN = 0, 1, 1, 1, 0 at five rising edges. Type out after each edge as a 5-bit string (first edge first).',
      accept: [outStr(afterEdges(run(PULSE, [...'01110'])))], steps: traceSteps(PULSE, [...'01110']),
      explanation: 'Each arrow is followed once per edge. S1 returns to S0 on any input, so three 1s in a row give out = 1, 0, 1.' },
    { id: 't7-q11', subtopic: 't7-moore', type: 'mc', difficulty: 2, src: c('op 00:06:05'), diagram: fsmDiagram(PULSE),
      prompt: 'What does this Moore machine do?',
      choices: ['Produces a one-clock-cycle pulse (out = 1) each time it finds IN = 1', 'Copies IN to out with a one-clock delay', 'Holds out = 1 for as long as IN = 1', 'Counts the number of 1s on IN'], answer: 0,
      explanation: 'From S0 a 1 leads to S1 (out = 1), and S1 always returns to S0, so out = 1 lasts one cycle. Copying IN with a delay is the LO/HI machine; holding 1 would need S1 to loop on 1.' },
    { id: 't7-q12', subtopic: 't7-moore', type: 'short', difficulty: 3, src: sup(N_PRAC), normalize: 'binary', width: 6, diagram: fsmDiagram(PULSE),
      prompt: 'The pulse machine starts in S0, and IN is held at 1 for six rising edges. Type out after each edge (6 bits).',
      accept: [outStr(afterEdges(run(PULSE, [...'111111'])))], steps: traceSteps(PULSE, [...'111111']),
      explanation: 'S1 goes back to S0 even when IN is still 1, so a held 1 gives alternating pulses 1, 0, 1, 0, …, not one long 1. A design that pulses once per press needs a third state (like the rising-edge detector in the Mealy lesson).' },
    { id: 't7-q13', subtopic: 't7-moore', type: 'mc', difficulty: 1, src: sup(N_PRAC), diagram: fsmDiagram(D11_MOORE),
      prompt: 'Using the Moore diagram (arrow labels are X), the machine is in S1 and X = 1 at the next rising edge. What are the next state and the output Z after that edge?',
      choices: ['S2, Z = 1', 'S2, Z = 0', 'S0, Z = 0', 'S1, Z = 1'], answer: 0,
      explanation: 'From S1 the arrow labelled 1 goes to S2, and S2 has output 1 written inside. In a Moore machine the output comes from the state you are in after the edge.' },
    { id: 't7-q14', subtopic: 't7-moore', type: 'short', difficulty: 3, src: sup(N_PRAC), normalize: 'list', diagram: fsmDiagram(D11_MOORE),
      prompt: 'Trace this Moore machine from S0 with X = 0, 1, 1, 0, 1, 1, 1 (edges 1–7). After which edges is Z = 1? List the edge numbers.',
      accept: [afterEdges(run(D11_MOORE, [...'0110111'])).map((z, i) => (z === '1' ? i + 1 : null)).filter(x => x !== null).join(', ')],
      steps: traceSteps(D11_MOORE, [...'0110111'], { outName: 'Z' }),
      explanation: 'The machine reaches S2 (Z = 1) after two 1s in a row and stays there while 1s continue. A 0 sends it back to S0.' },
    { id: 't7-q15', subtopic: 't7-moore', type: 'tf', difficulty: 2, src: c('op 00:03:51', 'tim 00:09:40'),
      prompt: 'In a clocked Moore FSM, the output can change only as a result of a rising clock edge (after the state changes).', answer: true,
      explanation: 'True. A Moore output is a function of the state, and the state register changes only at rising edges. The output settles T<sub>cq</sub> + T<sub>out,moore</sub> after the edge.' },

    /* ---- t7-mealy ---- */
    { id: 't7-q16', subtopic: 't7-mealy', type: 'mc', difficulty: 1, src: c('mea 00:00:06', 'mea 00:00:19'),
      prompt: 'The output of a Mealy FSM depends on…',
      choices: ['the current state and the current input', 'the current state only', 'the current input only', 'the next state only'], answer: 0,
      explanation: 'The Mealy output function is h: S × I → O. “State only” is Moore; “input only” would have no memory at all.' },
    { id: 't7-q17', subtopic: 't7-mealy', type: 'short', difficulty: 2, src: c('mea 00:00:29', 'mea 00:01:13'), normalize: 'binary', width: 4, diagram: fsmDiagram(MEALY1),
      prompt: 'Mealy example 1, starting in S0. IN = 1, 0, 1, 1 in four clock cycles. Type the output during each cycle (just before each rising edge), 4 bits.',
      accept: [outStr(run(MEALY1, [...'1011']).outs)], steps: traceSteps(MEALY1, [...'1011']),
      explanation: 'A Mealy output is read from the arrow being taken: in S0 both arrows output 0; from S1 both output 1. The state changes at each edge.' },
    { id: 't7-q18', subtopic: 't7-mealy', type: 'tf', difficulty: 2, src: sup(N_MT),
      prompt: 'In a clocked Mealy machine, the output can change in the middle of a clock cycle if the input changes.', answer: true,
      explanation: 'True. The Mealy output logic takes the input directly, so a change on the input reaches the output without waiting for a clock edge. That is why Mealy outputs can glitch, and why the lecture says Mealy machines behave differently in time.' },
    { id: 't7-q19', subtopic: 't7-mealy', type: 'mc', difficulty: 2, src: sup(N_MT),
      prompt: 'A detector must output Z = 1 once each time X goes from 0 to 1. What is the minimum number of states for a Moore design and for a Mealy design?',
      choices: ['Moore 3, Mealy 2', 'Moore 2, Mealy 3', 'Moore 2, Mealy 2', 'Moore 4, Mealy 3'], answer: 0,
      explanation: 'Moore needs a separate state in which Z = 1 (S0 “low”, S1 “just rose”, S2 “still high”). Mealy produces Z = 1 on the arrow “low → high”, so two states (“last X was 0”, “last X was 1”) suffice.' },
    { id: 't7-q20', subtopic: 't7-mealy', type: 'match', difficulty: 2, src: c('def 00:06:18', 'def 00:06:39', 'vis 00:02:57', 'mea 00:00:49'),
      prompt: 'Match each Moore/Mealy property with its description. (The last two rows are supplemental textbook facts.)',
      pairs: [['Moore output depends on', 'the current state only'], ['Mealy output depends on', 'the current state and the current input'],
        ['Moore output is drawn', 'inside the state circle'], ['Mealy output is drawn', 'on the arrow, as input/output'],
        ['Moore output changes', 'only after a clock edge changes the state'], ['Mealy output changes', 'whenever the input changes, even mid-cycle']],
      explanation: 'The first four come straight from the lectures. The timing rows follow from the output functions: h(S) can change only when S changes at a clock edge; h(S, I) changes when I does.' },
    { id: 't7-q21', subtopic: 't7-mealy', type: 'short', difficulty: 3, src: sup(N_PRAC), normalize: 'binary', width: 7, diagram: fsmDiagram(D11_MEALY),
      prompt: 'This Mealy machine starts in S0. X = 0, 1, 1, 0, 1, 1, 1 in seven cycles. Type Z during each cycle (just before each edge), 7 bits.',
      accept: [outStr(run(D11_MEALY, [...'0110111']).outs)], steps: traceSteps(D11_MEALY, [...'0110111'], { outName: 'Z' }),
      explanation: 'Z = 1 on the arrow 1/1 out of S1, that is, whenever the current bit and the previous bit are both 1. Compare the Moore “11” detector: the same 1s appear one cycle later.' },
    { id: 't7-q22', subtopic: 't7-mealy', type: 'mc', difficulty: 3, src: sup(N_MT), diagram: fsmTiming(EDGE_MEALY, EDGE_SEQ, { outNames: ['Z'] }),
      prompt: 'The timing diagram shows the 2-state Mealy rising-edge detector (S0 = last X was 0, S1 = last X was 1). Why is Z high for only <b>half</b> a clock cycle each time?',
      choices: ['Z = 1 needs state S0 and X = 1: it rises when X rises (mid-cycle) and falls at the next rising edge, when the state becomes S1',
        'The clock is too fast, so the output logic misses half of each cycle',
        'A setup-time violation clears the output after half a cycle',
        'Mealy outputs are only computed while the clock is low'], answer: 0,
      explanation: 'The Mealy output follows the input immediately. X rises at a falling clock edge while the machine is still in S0 (Z = 1); at the next rising edge the state becomes S1, where X = 1 gives Z = 0. The other choices describe timing failures that are not happening here.' },
    { id: 't7-q23', subtopic: 't7-mealy', type: 'mc', difficulty: 2, src: c('mea 00:02:29', 'mea 00:02:38'),
      prompt: 'In the lecture’s Mealy example 2, the arrow from S0 on input 1 is labelled 1/1. Compared with the Moore pulse machine, when does that 1 appear on the output?',
      choices: ['During the same cycle in which IN = 1 is applied, before the clock edge', 'One full cycle after the edge that samples IN = 1', 'Only while the clock is high', 'Never: it is just a label'], answer: 0,
      explanation: 'A Mealy output is produced along the arrow, as soon as the input is 1 in that state. The Moore machine has to enter S1 at the edge first, so its pulse comes a cycle later (supplemental timing remark).' },
    { id: 't7-q24', subtopic: 't7-mealy', type: 'numeric', difficulty: 1, src: c('mea 00:03:45', 'mea 00:04:07'), answer: 4,
      prompt: 'An FSM has two binary input variables. How many outgoing edges should each state have (one per input combination, self-loops included)?',
      steps: ['n = 2 input variables.', '2<sup>n</sup> = 2<sup>2</sup> = 4 combinations: 00, 01, 10, 11.', 'Each needs a defined transition: 4 outgoing edges.'],
      explanation: 'The lecture’s self-check: one input gives 2 edges, three inputs give 8, so two inputs give 4.' },

    /* ---- t7-examples ---- */
    { id: 't7-q25', subtopic: 't7-examples', type: 'mc', difficulty: 1, src: c('ex1 00:01:44', 'ex1 00:01:51'),
      prompt: 'In FSM Example #1 (LO/HI) the problem does not say which state is the start state. What does the lecture do?',
      choices: ['Makes a design decision: LO is the starting state', 'Uses HI, because its output is 1', 'Adds a third state just for starting', 'Leaves the start undefined; it does not matter'], answer: 0,
      explanation: 'When the problem does not give the start state, the designer chooses one; the lecture picks LO and draws the arc from nowhere into it. Every FSM needs a defined initial state.' },
    { id: 't7-q26', subtopic: 't7-examples', type: 'short', difficulty: 2, src: c('ex1 00:05:39', 'ex1 00:06:04', 'ex1 00:06:33'), normalize: 'binary', width: 8, diagram: fsmDiagram(LOHI),
      prompt: `The lecture’s narrated input for the LO/HI machine, starting in LO: A = ${seqStr(LOHI_SEQ)} at eight rising edges. Type out after each edge (8 bits).`,
      accept: [outStr(afterEdges(rLohi))], steps: traceSteps(LOHI, LOHI_SEQ),
      explanation: 'Each edge goes to HI on A = 1 and to LO on A = 0, so out after each edge equals the A sampled at that edge.' },
    { id: 't7-q27', subtopic: 't7-examples', type: 'numeric', difficulty: 1, src: c('ex2 00:01:12', 'ex2 00:01:31'), answer: 4,
      prompt: 'The holiday-light display must show STU = 000, 101, 010, 111 and then repeat. How many states does the Moore FSM need?',
      steps: ['One state per desired light combination.', 'Four distinct combinations appear before the sequence repeats.', '4 states (S0–S3).'],
      explanation: 'Each state is assigned one combination of the light switches, and there are four combinations in the cycle.' },
    { id: 't7-q28', subtopic: 't7-examples', type: 'short', difficulty: 2, src: c('ex2 00:02:57', 'ex2 00:03:41', 'ex2 00:03:51'), normalize: 'binary', width: 3, diagram: fsmDiagram(LIGHTS),
      prompt: 'The holiday-light FSM starts in S0. What does it output (STU) after <b>6</b> rising edges?',
      accept: [rLights.outs[6]], steps: traceSteps(LIGHTS, LIGHT_SEQ, { outName: 'STU' }),
      explanation: 'The ring has 4 states, so after 6 edges the machine is 6 mod 4 = 2 steps from S0: S2, which shows 010.' },
    { id: 't7-q29', subtopic: 't7-examples', type: 'mc', difficulty: 2, src: c('ex2 00:03:09', 'ex2 00:03:18'),
      prompt: 'What condition labels the transitions of the holiday-light FSM?',
      choices: ['None: the machine moves to the next state on every positive clock edge', 'The value of S', 'A start/stop input', 'The output of the previous state'], answer: 0,
      explanation: 'The lecture calls it a corner case: the transition consults nothing, so on the next positive clock edge the machine simply goes to the next state. The set of inputs is empty.' },
    { id: 't7-q30', subtopic: 't7-examples', type: 'short', difficulty: 2, src: c('im1 00:04:12', 'im1 00:04:51', 'im1 00:06:02', 'im1 00:06:54'), normalize: 'binary', width: 7, diagram: fsmDiagram(TOGGLE),
      prompt: `The Class 24 toggle FSM starts in S0. A = ${seqStr(TOGGLE_SEQ)} at seven rising edges. Type toggle after each edge (7 bits).`,
      accept: [outStr(afterEdges(rTog))], steps: traceSteps(TOGGLE, TOGGLE_SEQ, { outName: 'toggle' }),
      explanation: 'Each state waits for A to change: S0 and S2 wait for A = 1, S1 and S3 wait for A = 0. toggle is 1 in S1 and S2, so it flips at each 0 → 1 change of A.' },
    { id: 't7-q31', subtopic: 't7-examples', type: 'mc', difficulty: 3, src: c('im1 00:07:41', 'im1 00:08:10', 'im1 00:08:33'), diagram: fsmDiagram(TOGGLE),
      prompt: 'What does the toggle FSM do?',
      choices: ['toggle flips its value at every positive edge of A, so it changes half as often as A', 'toggle copies A with a one-cycle delay', 'toggle is 1 for exactly one cycle after each change of A', 'toggle flips on every clock edge while A = 1'], answer: 0,
      explanation: 'toggle changes on the S0 → S1 and S2 → S3 transitions, which are both taken when A goes from 0 to 1. Between those, A’s falling edges move S1 → S2 and S3 → S0 without changing toggle. The result: toggle<sub>new</sub> = toggle<sub>old</sub>′ on each positive edge of A.' },
    { id: 't7-q32', subtopic: 't7-examples', type: 'tf', difficulty: 2, src: c('ex2 00:02:21', 'ex2 00:02:31'),
      prompt: 'In Example #2 (holiday lights) the problem statement specifies which state the FSM starts in.', answer: false,
      explanation: 'False. The lecture: “starting state is not defined for us in the problem, so we can make a decision.” S0 (000) is chosen.' },
    { id: 't7-q33', subtopic: 't7-examples', type: 'short', difficulty: 1, src: c('ex2 00:03:51', 'ex2 00:00:43'), normalize: 'text',
      prompt: 'In the holiday-light FSM (S0 = 000, S1 = 101, S2 = 010, S3 = 111), which state follows S3?', accept: [edgeFor(LIGHTS, 'S3', '').to],
      explanation: 'After 111 the required sequence starts over at 000, which is S0. (The narration at 4:00 says “S1 again”, but the sequence it describes repeats from 000.)' },

    /* ---- t7-encoding ---- */
    { id: 't7-q34', subtopic: 't7-encoding', type: 'numeric', difficulty: 1, src: c('enc 00:01:52', 'enc 00:02:15'), answer: bitsFor(5),
      prompt: 'Minimum number of flip-flops for an FSM with 5 states using <b>binary</b> encoding?',
      steps: ['2 flip-flops give 2<sup>2</sup> = 4 codes: too few.', '3 flip-flops give 2<sup>3</sup> = 8 ≥ 5 codes.', 'So 3.'],
      explanation: 'The lecture’s example: five states need at least three bits, because two bits don’t work.' },
    { id: 't7-q35', subtopic: 't7-encoding', type: 'numeric', difficulty: 1, src: c('enc 00:08:12'), answer: 5,
      prompt: 'How many flip-flops does the same 5-state FSM need with <b>one-hot</b> encoding?',
      steps: ['One-hot uses one bit per state.', '5 states → 5 bits → 5 flip-flops.'],
      explanation: 'One-hot trades more flip-flops for clearly defined states (exactly one 1 per code).' },
    { id: 't7-q36', subtopic: 't7-encoding', type: 'numeric', difficulty: 2, src: sup(N_FFCNT), answer: 12 - bitsFor(12),
      prompt: 'An FSM has 12 states. How many <b>more</b> flip-flops does one-hot encoding need than binary encoding?',
      steps: ['Binary: 2<sup>3</sup> = 8 &lt; 12 ≤ 16 = 2<sup>4</sup>, so 4 flip-flops.', 'One-hot: 12 flip-flops.', 'Difference: 12 − 4 = 8.'],
      explanation: 'Binary needs ⌈log<sub>2</sub> 12⌉ = 4 bits, one-hot needs one per state.' },
    { id: 't7-q37', subtopic: 't7-encoding', type: 'short', difficulty: 2, src: c('enc 00:05:00', 'enc 00:06:07'), normalize: 'binary', width: 3,
      prompt: 'Five states S0–S4 are Gray-encoded with 3 bits (S0 = 000, S1 = 001, each next code changes one bit as in the standard reflected Gray code). Type the code for <b>S4</b>.', accept: ['110'],
      steps: ['3-bit reflected Gray sequence: 000, 001, 011, 010, 110, 111, 101, 100.', 'S0 = 000, S1 = 001, S2 = 011, S3 = 010, S4 = 110.', 'Check: 010 → 110 changes only the leftmost bit.'],
      explanation: 'S4 = 110 differs from S3 = 010 in exactly one bit, as Gray code requires. (100, the binary code for 4, would differ from 010 in two bits.)' },
    { id: 't7-q38', subtopic: 't7-encoding', type: 'short', difficulty: 1, src: c('enc 00:08:12', 'enc 00:08:49'), normalize: 'binary', width: 5,
      prompt: 'Five states are one-hot encoded as in the lecture (bit i is 1 for state S<sub>i</sub>; S0 = 00001). Type the code for <b>S3</b>.', accept: ['01000'],
      steps: ['Bit positions from the right: 4 3 2 1 0.', 'S3 → only bit 3 is 1.', 'Code: 01000.'],
      explanation: 'One-hot: a single 1 in the position of the state number.' },
    { id: 't7-q39', subtopic: 't7-encoding', type: 'mc', difficulty: 2, src: c('enc 00:02:54', 'enc 00:03:00', 'enc 00:03:08'),
      prompt: 'Why is it customary to encode the start state S0 as all zeros?',
      choices: ['A reset clears every bit of the state register, which puts the FSM straight into its start state', 'All-zero codes make the output logic smaller', 'The state register cannot store an all-zero code in any other state', 'Gray code requires the first code to be zero'], answer: 0,
      explanation: 'The lecture: if we reset, all the bits of the state register are cleared, so the FSM starts in its starting state. The other choices are not reasons the lecture gives, and they are not true in general.' },
    { id: 't7-q40', subtopic: 't7-encoding', type: 'multi', difficulty: 2, src: c('enc 00:07:55', 'enc 00:09:17'),
      prompt: 'Five states are one-hot encoded. Which of these 5-bit register values can only be erroneous states? Select all that apply.',
      choices: ['00011', '00000', '10000', '00100', '11111'], answers: [0, 1, 4],
      explanation: 'A valid one-hot code has exactly one 1. 00011 and 11111 have several 1s and 00000 has none, so they are errors (the lecture’s example is 00011). 10000 (S4) and 00100 (S2) are valid.' },
    { id: 't7-q41', subtopic: 't7-encoding', type: 'mc', difficulty: 2, src: c('enc 00:06:34', 'enc 00:07:03', 'enc 00:07:12'),
      prompt: 'An FSM steps S0 → S1 → S2 → S3 → S4 over and over. What is the lecture’s argument for Gray encoding here?',
      choices: ['Only one bit changes per step, and every bit flip consumes power, so it is more energy efficient', 'It needs fewer flip-flops than binary encoding', 'It makes erroneous states easy to detect', 'It lets the start state be encoded as all zeros'], answer: 0,
      explanation: 'Gray uses the same number of flip-flops as binary. Easy error detection is the one-hot argument. Binary and Gray both encode S0 as all zeros.' },
    { id: 't7-q42', subtopic: 't7-encoding', type: 'tf', difficulty: 3, src: sup(N_ONEHOTRST),
      prompt: 'With the lecture’s one-hot code (S0 = 00001), a reset that clears every flip-flop of the state register puts the FSM in its start state.', answer: false,
      explanation: 'False. Clearing every flip-flop gives 00000, which is not a valid one-hot state (S0 is 00001). With one-hot, reset must set S0’s flip-flop and clear the others. The “reset clears to S0” argument works for binary and Gray, where S0 = 000.' },
    { id: 't7-q43', subtopic: 't7-encoding', type: 'match', difficulty: 2, src: c('enc 00:00:22', 'enc 00:01:17', 'enc 00:05:00', 'enc 00:07:55'),
      prompt: 'Match each term with its description.',
      pairs: [['binary encoding', '⌈log<sub>2</sub> N⌉ bits; states numbered 000, 001, 010, …'], ['Gray encoding', 'consecutive states differ in exactly one bit'],
        ['one-hot encoding', 'one bit per state; exactly one bit is 1'], ['state assignment', 'another name for choosing the state codes']],
      explanation: 'State encoding is also called state assignment. Binary and Gray use the same number of bits; one-hot uses N bits for N states.' },
    { id: 't7-q44', subtopic: 't7-encoding', type: 'numeric', difficulty: 3, src: c('enc 00:07:12', 'enc 00:07:21'), answer: flipCount(['00', '01', '10', '11']),
      prompt: 'A 4-state machine cycles S0 → S1 → S2 → S3 → S0 with <b>binary</b> codes 00, 01, 10, 11. How many flip-flop bit flips happen in one full cycle (four transitions)?',
      steps: ['00 → 01: 1 flip.', '01 → 10: 2 flips.', '10 → 11: 1 flip.', '11 → 00: 2 flips.', `Total: ${flipCount(['00', '01', '10', '11'])}. (With Gray codes 00, 01, 11, 10 it would be ${flipCount(['00', '01', '11', '10'])}, one per step.)`],
      explanation: 'Every bit flip consumes power (lecture), so the binary cycle costs more than the Gray cycle.' },
    { id: 't7-q45', subtopic: 't7-encoding', type: 'numeric', difficulty: 2, src: c('enc 00:02:34', 'enc 00:02:46'), answer: (1 << bitsFor(6)) - 6,
      prompt: 'An FSM with 6 states is binary-encoded with the minimum number of flip-flops. How many codes are left unused?',
      steps: ['Minimum bits: 2<sup>2</sup> = 4 &lt; 6 ≤ 8 = 2<sup>3</sup>, so 3 bits.', '3 bits give 8 codes; 6 are used.', 'Unused: 8 − 6 = 2.'],
      explanation: 'Any 6 of the 8 codes may be used (the lecture: any subset of distinct codes works). The leftover codes become don’t-cares in the next-state K-maps.' },
    { id: 't7-q46', subtopic: 't7-encoding', type: 'numeric', difficulty: 3, src: sup(N_FFCNT), answer: bitsFor(17),
      prompt: 'How many flip-flops does a binary-encoded FSM with <b>17</b> states need?',
      steps: ['2<sup>4</sup> = 16 &lt; 17: four bits are not enough.', '2<sup>5</sup> = 32 ≥ 17.', '⌈log<sub>2</sub> 17⌉ = 5 flip-flops.'],
      explanation: 'One state more than a power of two forces an extra flip-flop. Watch for 17 vs 16.' },
  ];

  /* ---------- questions (part B: timing, implementation, issues, sequence detectors, minimization, design) ---------- */
  // Partition refinement for Moore machines: start from output classes, split until stable.
  function minimizeMoore(M) {
    const syms = M.inputs.length ? [...Array(1 << M.inputs.length).keys()].map(i => i.toString(2).padStart(M.inputs.length, '0')) : [''];
    let cls = {};
    M.states.forEach(s => { cls[s] = String(M.out[s]); });
    for (;;) {
      const sig = {};
      M.states.forEach(s => { sig[s] = cls[s] + '|' + syms.map(x => cls[edgeFor(M, s, x).to]).join(','); });
      const names = [...new Set(M.states.map(s => sig[s]))];
      const next = {};
      M.states.forEach(s => { next[s] = 'c' + names.indexOf(sig[s]); });
      const before = new Set(Object.values(cls)).size, after = names.length;
      cls = next;
      if (after === before) break;
    }
    const groups = {};
    M.states.forEach(s => { (groups[cls[s]] = groups[cls[s]] || []).push(s); });
    return Object.values(groups);
  }
  const sameGroup = (groups, a, b) => groups.some(g => g.includes(a) && g.includes(b));
  // Exactly one condition true for every input combination?
  function condSetValid(vars, conds) {
    for (let i = 0; i < (1 << vars.length); i++) {
      const env = L.envForRow(vars, i);
      if (conds.filter(cn => L.evalBool(L.parseBool(cn), env) === 1).length !== 1) return false;
    }
    return true;
  }
  // Second minimization example (6 states -> 4)
  const MINB = { type: 'moore', inputs: ['X'], states: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'], out: { S0: '0', S1: '0', S2: '0', S3: '1', S4: '0', S5: '1' }, initial: 'S0', outName: 'Z',
    edges: [B('S0', 'S1', "X'", '0'), B('S0', 'S2', 'X', '1'), B('S1', 'S3', "X'", '0'), B('S1', 'S4', 'X', '1'), B('S2', 'S3', "X'", '0'), B('S2', 'S4', 'X', '1'),
      B('S3', 'S3', "X'", '0'), B('S3', 'S0', 'X', '1'), B('S4', 'S5', "X'", '0'), B('S4', 'S0', 'X', '1'), B('S5', 'S5', "X'", '0'), B('S5', 'S0', 'X', '1')] };
  const MIN5_GROUPS = minimizeMoore(MIN5), MINB_GROUPS = minimizeMoore(MINB);
  const groupText = gs => gs.map(g => '{' + g.join(', ') + '}').join(', ');
  const VEND_ENC = { C0: '000', C5: '001', C10: '010', C15: '011', C20: '100' };
  const TOG_DESC = 'Toggle FSM (Class 24): S0 (toggle = 0) goes to S1 on A; S1 (toggle = 1) goes to S2 on A′; S2 (toggle = 1) goes to S3 on A; S3 (toggle = 0) goes to S0 on A′; on the other value of A each state stays put.';
  const SEQ_TIM = [...'0111011'];
  const SEQ10 = [...'1010110101'];
  const ovCount = (bits, pat) => { let n = 0; for (let i = pat.length; i <= bits.length; i++) if (bits.slice(i - pat.length, i) === pat) n++; return n; };
  const lightsGray = { S0: '00', S1: '01', S2: '11', S3: '10' };
  const lightsGrayD0 = L.minterms(L.mintermsToSOP(LIGHTS.states.filter(s => lightsGray[edgeFor(LIGHTS, s, '').to][1] === '1').map(s => parseInt(lightsGray[s], 2)), ['Q1', 'Q0']), ['Q1', 'Q0']);
  const vendOut = j => Object.keys(VEND_ENC).filter(s => VEND.out[s][j] === '1').map(s => parseInt(VEND_ENC[s], 2));
  const vendUnused = [5, 6, 7];

  const questionsB = [
    /* ---- t7-timing ---- */
    { id: 't7-q47', subtopic: 't7-timing', type: 'mc', difficulty: 1, src: c('tim 00:02:58', 'tim 00:03:08', 'im1 00:01:09'),
      prompt: 'In the block diagram of a <b>Moore</b> FSM, which block takes <b>only the current state</b> as its input?',
      choices: ['The Moore output logic (function h)', 'The next-state logic (function f)', 'The state register', 'The clock'], answer: 0,
      explanation: 'The Moore output logic implements h and depends solely on the state register. The next-state logic takes the external inputs <i>and</i> the current state; the state register takes the next state and the clock.' },
    { id: 't7-q48', subtopic: 't7-timing', type: 'numeric', difficulty: 3, src: sup(N_TNUM + ' Converting the period to a frequency (f = 1/T) is standard.'), answer: 100, tolerance: 0.01,
      prompt: 'A Moore FSM has T<sub>cq</sub> = 2 ns, T<sub>next,max</sub> = 6.5 ns and T<sub>setup</sub> = 1.5 ns. What is the <b>maximum clock frequency</b> in MHz?',
      steps: ['Minimum period: T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub>.', 'T<sub>clk,min</sub> = 2 + 6.5 + 1.5 = 10 ns.', 'f<sub>max</sub> = 1 / T<sub>clk,min</sub> = 1 / (10 × 10<sup>−9</sup> s) = 100 × 10<sup>6</sup> Hz = 100 MHz.'],
      explanation: 'The shortest safe period covers the whole state loop: clock-to-Q, the next-state logic, and setup before the next edge. Its reciprocal is the fastest clock.' },
    { id: 't7-q49', subtopic: 't7-timing', type: 'numeric', difficulty: 2, src: c('tim 00:09:40', 'tim 00:09:58', 'tim 00:10:21'), answer: 4, tolerance: 0.01,
      prompt: 'A Moore FSM has T<sub>cq</sub> = 1.5 ns, T<sub>next,max</sub> = 4 ns and T<sub>out,moore</sub> = 2.5 ns. How many ns after a rising clock edge is the output valid?',
      steps: ['The Moore output depends only on the state register.', 'Wait T<sub>cq</sub> = 1.5 ns for the new state to appear at the register output.', 'Then T<sub>out,moore</sub> = 2.5 ns through the output logic.', '1.5 + 2.5 = 4 ns. T<sub>next,max</sub> is not on this path.'],
      explanation: 'The lecture’s output-delay formula is T<sub>cq</sub> + T<sub>out,moore</sub>. The next-state logic feeds the register, not the output, so its delay does not matter here. (The numbers are made up for practice.)' },
    { id: 't7-q50', subtopic: 't7-timing', type: 'tf', difficulty: 2, src: c('tim 00:07:12', 'tim 00:08:49', 'tim 00:09:17'),
      prompt: 'In the lecture’s analysis, the output-logic delay T<sub>out,moore</sub> is one of the terms of the minimum clock period T<sub>clk</sub>.', answer: false,
      explanation: 'False. T<sub>clk</sub> ≥ T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub> follows the loop from the state register through the next-state logic back to the register. The output path is a separate question: the output is valid T<sub>cq</sub> + T<sub>out,moore</sub> after the edge.' },
    { id: 't7-q51', subtopic: 't7-timing', type: 'mc', difficulty: 1, src: c('tim 00:09:02', 'tim 00:09:09'),
      prompt: 'A Moore FSM is clocked with a period <b>shorter</b> than T<sub>cq</sub> + T<sub>next,max</sub> + T<sub>setup</sub>. What can happen?',
      choices: ['The next state may not be stable a setup time before the edge, so the register can capture a wrong value or become metastable', 'Nothing bad: a shorter period only makes the FSM run faster', 'Only the output logic fails; the state register always works', 'The FSM skips straight to its initial state'], answer: 0,
      explanation: 'The lecture: the clock can be longer than the minimum, but if it is shorter “we are going to probably have issues like metastability.” The state register is exactly the part that fails.' },
    { id: 't7-q52', subtopic: 't7-timing', type: 'match', difficulty: 1, src: c('tim 00:04:06', 'tim 00:04:20', 'tim 00:04:43', 'tim 00:05:01', 'tim 00:07:32', 'tim 00:08:31'),
      prompt: 'Match each timing parameter with its meaning.',
      pairs: [['T<sub>setup</sub>', 'how long before the clock edge D must be stable'], ['T<sub>hold</sub>', 'how long after the clock edge D must stay stable'],
        ['T<sub>cq</sub>', 'time from the rising edge until the register output changes'], ['T<sub>next,max</sub>', 'critical-path delay of the next-state logic'],
        ['T<sub>out,moore</sub>', 'maximum delay of the Moore output logic']],
      explanation: 'T<sub>setup</sub>, T<sub>hold</sub> and T<sub>cq</sub> come from the registers lectures (Topic 6), which this video tells you to review; T<sub>next,max</sub> and T<sub>out,moore</sub> are the combinational delays defined here.' },
    { id: 't7-q53', subtopic: 't7-timing', type: 'short', difficulty: 3, src: sup(N_PRAC), normalize: 'binary', width: SEQ_TIM.length,
      diagram: TRACE_ONLY(TOGGLE, SEQ_TIM),
      solutionDiagram: fsmTiming(TOGGLE, SEQ_TIM),
      prompt: `${TOG_DESC} The timing diagram shows CLK and A. Starting in S0, type toggle after each of the ${SEQ_TIM.length} rising edges (first edge first).`,
      accept: [outStr(afterEdges(run(TOGGLE, SEQ_TIM)))], steps: traceSteps(TOGGLE, SEQ_TIM, { outName: 'toggle' }),
      explanation: 'Read A at each rising edge only (dashed lines in the lecture’s drawing), follow one arrow per edge, then write the Moore output of the state you land in. The solution diagram adds the state and toggle rows.' },
    { id: 't7-q54', subtopic: 't7-timing', type: 'multi', difficulty: 2, src: c('op 00:03:51', 'tim 00:02:01', 'tim 00:09:40'),
      prompt: 'In a clocked Moore FSM, which signals can change <b>only</b> shortly after a rising clock edge (never in the middle of a cycle)? Select all that apply.',
      choices: ['The state register output (the current state)', 'The Moore outputs', 'The external inputs', 'The output of the next-state logic'], answers: [0, 1],
      explanation: 'The register loads only at rising edges, and the Moore outputs depend only on the register. The external inputs are not controlled by the FSM’s clock, and the next-state logic also reads those inputs, so its output changes whenever they do.' },
    { id: 't7-q55', subtopic: 't7-timing', type: 'mc', difficulty: 3, src: sup(N_PRAC + ' The machine is the supplemental Moore rising-edge detector; the analyse-by-timing-diagram method is the Class 24 lecture’s.'),
      diagram: fsmTiming(EDGE_MOORE, EDGE_SEQ, { bus: false, outNames: ['Z'] }),
      prompt: 'The timing diagram shows the input X and the output Z of an unknown <b>Moore</b> FSM. Which description fits Z?',
      choices: ['Z = 1 for one clock cycle after each edge that first samples X = 1 following an X = 0', 'Z equals X delayed by one clock cycle', 'Z = 1 for as long as X = 1', 'Z flips its value every time X goes from 0 to 1'], answer: 0,
      steps: [`X sampled at the rising edges: ${seqStr(EDGE_SEQ)}.`, `Z after each edge: ${afterEdges(run(EDGE_MOORE, EDGE_SEQ)).join(', ')}.`,
        'Z is 1 after edge 2 (X went 0 → 1) and after edge 6 (X went 0 → 1 again), and 0 while X stays 1 (edges 3 and 4).',
        'Delayed X would be 0, 1, 1, 1, 0, 1, 0, and flipping would give 0, 1, 1, 1, 1, 0, 0: both differ from Z.'],
      explanation: 'This is a rising-edge detector: one short pulse per 0 → 1 change of X. Checking each option against the waveform, edge by edge, rules out the others.' },

    /* ---- t7-implement ---- */
    { id: 't7-q56', subtopic: 't7-implement', type: 'boolexpr', difficulty: 2, src: c('im3 00:01:20', 'im3 00:02:23', 'im3 00:02:34'),
      vars: ['Q1', 'Q0', 'A'], minterms: encMinterms(TOGGLE, TOGGLE_ENC, 2, 'next', 0).ms, answer: "Q1Q0' + Q1A + Q1'Q0A'", maxLiterals: 7, solutionDiagram: NS1_KMAP,
      prompt: 'Toggle FSM with S0 = 00, S1 = 01, S2 = 10, S3 = 11. NS1 is 1 in minterms 2, 4, 5 and 7 (order SR1 SR0 A). Write the minimal SOP for NS1. Type SR1 as <b>Q1</b> and SR0 as <b>Q0</b>.',
      steps: ['Plot minterms 2, 4, 5, 7 on a 3-variable K-map.', 'Minterm 2 (010) has no adjacent 1 (its neighbours 0, 3, 6 are all 0) → Q1′Q0A′.', 'Minterms 4 and 5 (10x) → Q1Q0′.', 'Minterms 5 and 7 (1x1) → Q1A.', 'NS1 = Q1Q0′ + Q1A + Q1′Q0A′ (7 literals).'],
      explanation: 'This is the lecture’s result: SR1·SR0′ + SR1·A + SR1′·SR0·A′. Minterm 5 is used twice, which is allowed and gives two larger groups.' },
    { id: 't7-q57', subtopic: 't7-implement', type: 'boolexpr', difficulty: 2, src: c('im3 00:05:27', 'im3 00:06:11', 'im3 00:06:20'),
      vars: ['Q1', 'Q0', 'A'], minterms: encMinterms(TOGGLE, TOGGLE_ENC, 2, 'out', 0).ms, answer: "Q1Q0' + Q1'Q0", maxLiterals: 4, solutionDiagram: TOG_KMAP,
      prompt: 'Toggle FSM (S0 = 00, S1 = 01, S2 = 10, S3 = 11; toggle = 1 in S1 and S2). Write the minimal expression for the output <b>toggle</b>. Type SR1 as Q1 and SR0 as Q0.',
      steps: ['toggle depends on the current state only: it is 1 for codes 01 and 10.', 'On the 3-variable map (SR1 SR0 A) that is minterms 2, 3, 4, 5.', 'Pair 2, 3 → Q1′Q0; pair 4, 5 → Q1Q0′. A drops out of both.', 'toggle = Q1Q0′ + Q1′Q0 = Q1 ⊕ Q0.'],
      explanation: 'A Moore output never contains the input. Q1 ⊕ Q0 is also accepted.' },
    { id: 't7-q58', subtopic: 't7-implement', type: 'short', difficulty: 2, src: sup(N_IMPL), normalize: 'binary', width: 2, diagram: fsmDiagram(D11_MOORE),
      prompt: 'This Moore machine is encoded S0 = 00, S1 = 01, S2 = 10 (code 11 unused). In its state table, what are the next-state bits N1 N0 in the row Q1 Q0 X = 0 1 1?',
      accept: [ENC3[edgeFor(D11_MOORE, 'S1', '1').to]],
      steps: ['Q1 Q0 = 01 is state S1.', `In S1 with X = 1 the arrow goes to ${edgeFor(D11_MOORE, 'S1', '1').to}.`, `${edgeFor(D11_MOORE, 'S1', '1').to} is encoded ${ENC3[edgeFor(D11_MOORE, 'S1', '1').to]}, so N1 N0 = ${ENC3[edgeFor(D11_MOORE, 'S1', '1').to]}.`],
      explanation: 'Each row: decode the current state, follow the arrow for that input, encode the destination.' },
    { id: 't7-q59', subtopic: 't7-implement', type: 'numeric', difficulty: 2, src: sup(N_IMPL), answer: 1 << (bitsFor(5) + 2),
      prompt: 'An FSM with 5 states (binary-encoded with the minimum number of flip-flops) has 2 binary inputs. How many rows does its full state transition table have?',
      steps: ['5 states need ⌈log<sub>2</sub> 5⌉ = 3 state bits.', 'The left side of the table lists every combination of 3 state bits and 2 inputs: 5 variables.', '2<sup>5</sup> = 32 rows (rows for the 3 unused codes are don’t-cares).'],
      explanation: 'Like any truth table, the state table lists all combinations of its inputs, here the state-register bits plus the external inputs.' },
    { id: 't7-q60', subtopic: 't7-implement', type: 'boolexpr', difficulty: 3, src: sup(N_IMPL), diagram: fsmDiagram(D11_MOORE),
      vars: ['Q1', 'Q0', 'X'], minterms: encMinterms(D11_MOORE, ENC3, 2, 'next', 0).ms, dontcares: encMinterms(D11_MOORE, ENC3, 2, 'next', 0).dcs, answer: 'Q0X + Q1X', maxLiterals: 4,
      solutionDiagram: kmap(['Q1', 'Q0', 'X'], encMinterms(D11_MOORE, ENC3, 2, 'next', 0).ms, encMinterms(D11_MOORE, ENC3, 2, 'next', 0).dcs, [['Q0·X', 'Q0X'], ['Q1·X', 'Q1X']]),
      prompt: 'Encode this Moore machine as S0 = 00, S1 = 01, S2 = 10 (code 11 unused) and use D flip-flops. Write the minimal SOP for <b>D1</b> (the next value of Q1).',
      steps: ['N1 = 1 exactly when the next state is S2 (code 10).', 'S2 is reached from S1 on X = 1 (row Q1Q0X = 011, minterm 3) and from S2 on X = 1 (row 101, minterm 5).', 'Code 11 is unused: rows 110 and 111 (minterms 6, 7) are don’t-cares.',
        'Group {3, 7} → Q0X; group {5, 7} → Q1X.', 'D1 = Q0X + Q1X = X(Q1 + Q0).'],
      explanation: 'The don’t-care at 111 lets both 1s join a pair. Without it you would need Q1′Q0X + Q1Q0′X (6 literals). The factored form X(Q1 + Q0) is also accepted.' },
    { id: 't7-q61', subtopic: 't7-implement', type: 'boolexpr', difficulty: 3, src: sup(N_IMPL), diagram: fsmDiagram(D11_MOORE),
      vars: ['Q1', 'Q0', 'X'], minterms: encMinterms(D11_MOORE, ENC3, 2, 'next', 1).ms, dontcares: encMinterms(D11_MOORE, ENC3, 2, 'next', 1).dcs, answer: "Q1'Q0'X", maxLiterals: 3,
      solutionDiagram: kmap(['Q1', 'Q0', 'X'], encMinterms(D11_MOORE, ENC3, 2, 'next', 1).ms, encMinterms(D11_MOORE, ENC3, 2, 'next', 1).dcs, [["Q1′·Q0′·X", "Q1'Q0'X"]]),
      prompt: 'Same machine and encoding (S0 = 00, S1 = 01, S2 = 10, 11 unused). Write the minimal SOP for <b>D0</b>.',
      steps: ['N0 = 1 exactly when the next state is S1 (code 01).', 'Only S0 on X = 1 goes to S1: row 001, minterm 1.', 'Don’t-cares: minterms 6, 7.', 'Minterm 1’s neighbours are 0, 3 and 5; all three are 0 (none is a don’t-care), so it stays alone.', 'D0 = Q1′Q0′X.'],
      explanation: 'The don’t-cares at 110 and 111 are not adjacent to minterm 1, so they cannot help here.' },
    { id: 't7-q62', subtopic: 't7-implement', type: 'boolexpr', difficulty: 2, src: sup(N_IMPL), diagram: fsmDiagram(D11_MOORE),
      vars: ['Q1', 'Q0'], minterms: [parseInt(ENC3.S2, 2)], dontcares: [3], answer: 'Q1', maxLiterals: 1,
      solutionDiagram: kmap(['Q1', 'Q0'], [parseInt(ENC3.S2, 2)], [3], [['Q1', 'Q1']]),
      prompt: 'Same machine and encoding (S0 = 00, S1 = 01, S2 = 10, 11 unused). Write the minimal output equation for <b>Z</b>.',
      steps: ['Moore: Z depends only on Q1 Q0.', 'Z = 1 only in S2 (code 10): minterm 2. Code 11 is a don’t-care: minterm 3.', 'Group {2, 3} → Q1.', 'Z = Q1.'],
      explanation: 'Treating the unused code 11 as a don’t-care shrinks Q1Q0′ to Q1. (That is safe only if the machine can never be in code 11; see FSM issues.)' },
    { id: 't7-q63', subtopic: 't7-implement', type: 'boolexpr', difficulty: 2, src: fg('Hub Final Exam page, Topic 7: counters as FSMs. The 2-bit up/down counter and its equations are worked out for this app with the lecture’s method and checked by truth table.'), diagram: fsmDiagram(UPDOWN),
      vars: ['Q1', 'Q0', 'U'], minterms: encMinterms(UPDOWN, TOGGLE_ENC, 2, 'next', 1).ms, answer: "Q0'", maxLiterals: 1,
      prompt: 'A 2-bit up/down counter as a Moore FSM: S0 = 00, S1 = 01, S2 = 10, S3 = 11; U = 1 counts up, U = 0 counts down (wrapping around). Write the minimal expression for <b>D0</b>.',
      steps: ['Counting up or down by 1 always flips the lowest bit.', `Table check: D0 = 1 in minterms ${encMinterms(UPDOWN, TOGGLE_ENC, 2, 'next', 1).ms.join(', ')} (order Q1 Q0 U): exactly the rows with Q0 = 0.`, 'One group of four → D0 = Q0′.'],
      explanation: 'Whatever U is, the next count has the opposite low bit, so D0 = Q0′ and U drops out.' },
    { id: 't7-q64', subtopic: 't7-implement', type: 'boolexpr', difficulty: 3, src: fg('Hub Final Exam page, Topic 7: counters as FSMs. Equations worked out for this app and checked by truth table.'), diagram: fsmDiagram(UPDOWN),
      vars: ['Q1', 'Q0', 'U'], minterms: encMinterms(UPDOWN, TOGGLE_ENC, 2, 'next', 0).ms, answer: "Q1 ⊕ Q0 ⊕ U'",
      prompt: 'Same up/down counter (S0 = 00 … S3 = 11; U = 1 up, U = 0 down). Write an expression for <b>D1</b>. Any correct form is accepted; XOR (⊕ or ^) is allowed.',
      steps: [`D1 = 1 in minterms ${encMinterms(UPDOWN, TOGGLE_ENC, 2, 'next', 0).ms.join(', ')} (order Q1 Q0 U): 00 down → 11, 01 up → 10, 10 up → 11, 11 down → 10.`,
        'On the K-map these four cells form a checkerboard: no two are adjacent, so the minimal SOP is four 3-literal terms: Q1′Q0′U′ + Q1′Q0U + Q1Q0′U + Q1Q0U′.', 'A checkerboard is an XOR pattern. These are the rows with an odd number of 1s among Q1, Q0, U′.', 'D1 = Q1 ⊕ Q0 ⊕ U′.'],
      explanation: 'Up: the high bit flips when Q0 = 1. Down: it flips when Q0 = 0. So D1 = Q1 ⊕ (Q0 if U, Q0′ if not) = Q1 ⊕ Q0 ⊕ U′.' },
    { id: 't7-q65', subtopic: 't7-implement', type: 'boolexpr', difficulty: 3, src: sup(N_IMPL + ' The lecture says the lab uses Gray encoding (Class 23 V1).'), diagram: fsmDiagram(GRAYEN),
      vars: ['Q1', 'Q0', 'E'], minterms: encMinterms(GRAYEN, GRAY_ENC, 2, 'next', 0).ms, answer: "Q0E + Q1E'", maxLiterals: 4,
      solutionDiagram: kmap(['Q1', 'Q0', 'E'], encMinterms(GRAYEN, GRAY_ENC, 2, 'next', 0).ms, [], [['Q0·E', 'Q0E'], ['Q1·E′', "Q1E'"]]),
      prompt: 'This 4-state Moore machine steps S0 → S1 → S2 → S3 → S0 when E = 1 and holds when E = 0. It is <b>Gray</b>-encoded: S0 = 00, S1 = 01, S2 = 11, S3 = 10. Write the minimal SOP for <b>D1</b>.',
      steps: ['E = 1 rows: 00 → 01, 01 → 11, 11 → 10, 10 → 00. E = 0 rows: each code stays.',
        `D1 (next Q1) = 1 in rows 011, 100, 110, 111: minterms ${encMinterms(GRAYEN, GRAY_ENC, 2, 'next', 0).ms.join(', ')} (order Q1 Q0 E).`, 'Group {3, 7} → Q0E; group {4, 6} → Q1E′.', 'D1 = Q0E + Q1E′.'],
      explanation: 'Read it as a 2:1 choice: when E = 1 the next Q1 is Q0 (in Gray order), and when E = 0 it is Q1 (hold). Only one flip-flop changes per step, as Gray encoding promises.' },
    { id: 't7-q66', subtopic: 't7-implement', type: 'boolexpr', difficulty: 3, src: sup(N_IMPL + ' Illustrates the lecture’s point (Class 23 V2) that the encoding changes how complex the next-state logic is.'), diagram: fsmDiagram(LIGHTS),
      vars: ['Q1', 'Q0'], minterms: lightsGrayD0, answer: "Q1'", maxLiterals: 1,
      prompt: 'Encode the holiday-light FSM in <b>Gray</b> code: S0 = 00, S1 = 01, S2 = 11, S3 = 10. The machine steps S0 → S1 → S2 → S3 → S0 on every edge. Write the minimal expression for <b>D0</b> (the next value of Q0).',
      steps: ['Next codes: 00 → 01, 01 → 11, 11 → 10, 10 → 00.', 'Next Q0: 1, 1, 0, 0 for current codes 00, 01, 11, 10.', 'It is 1 exactly when Q1 = 0 (minterms 0 and 1).', 'D0 = Q1′. (Similarly D1 = Q0.)'],
      explanation: 'With Gray codes the next-state logic is just a wire and an inverter. With binary codes it needs D1 = Q1 ⊕ Q0, but then the outputs need no gates (S = Q0, T = Q1, U = Q0). Different encodings move the complexity around.' },
    { id: 't7-q67', subtopic: 't7-implement', type: 'multi', difficulty: 1, src: c('im2 00:02:04', 'im2 00:02:14', 'im2 00:02:26', 'im2 00:05:15'),
      prompt: 'Which columns are on the <b>left</b> (input) side of the toggle FSM’s state transition and output table? Select all that apply.',
      choices: ['SR1', 'SR0', 'A', 'NS1', 'NS0', 'toggle'], answers: [0, 1, 2],
      explanation: 'The left side lists the inputs of the next-state logic: the state-register bits (the current state) and the external input A. NS1, NS0 and toggle are the results on the right side.' },
    { id: 't7-q68', subtopic: 't7-implement', type: 'tf', difficulty: 1, src: c('im3 00:05:27', 'im2 00:08:36'),
      prompt: 'In the toggle FSM, the input A appears in the minimal expression for the output toggle.', answer: false,
      explanation: 'False. toggle is a Moore output, so it depends only on SR1 and SR0: toggle = SR1·SR0′ + SR1′·SR0. A drops out of both K-map groups.' },
    { id: 't7-q69', subtopic: 't7-implement', type: 'short', difficulty: 2, src: c('im2 00:09:07', 'im3 00:05:59', 'im3 00:06:11'), normalize: 'list', diagram: fsmDiagram(TOGGLE),
      prompt: 'Toggle FSM with S0 = 00, S1 = 01, S2 = 10, S3 = 11. List the minterms (order SR1 SR0 A, SR1 = MSB) in which toggle = 1.',
      accept: [encMinterms(TOGGLE, TOGGLE_ENC, 2, 'out', 0).ms.join(', ')],
      steps: ['toggle = 1 in S1 (01) and S2 (10), whatever A is.', 'S1 rows: 010, 011 → minterms 2, 3.', 'S2 rows: 100, 101 → minterms 4, 5.', 'toggle = Σm(2, 3, 4, 5).'],
      explanation: 'Each state covers two rows (A = 0 and A = 1), and a Moore output has the same value in both.' },
    { id: 't7-q70', subtopic: 't7-implement', type: 'mc', difficulty: 1, src: c('im1 00:00:55', 'im1 00:01:02', 'im3 00:04:58'),
      prompt: 'The state register is built from D flip-flops. What is connected to each flip-flop’s D input?',
      choices: ['The matching next-state bit from the next-state logic (D1 = NS1, D0 = NS0)', 'The matching current-state bit (D = Q)', 'The Moore output', 'The clock'], answer: 0,
      explanation: 'On every rising edge the register takes the value of the next state that the combinational logic provides. D = Q would never change state; the output and the clock go elsewhere.' },

    /* ---- t7-issues ---- */
    { id: 't7-q71', subtopic: 't7-issues', type: 'tf', difficulty: 1, src: c('iss 00:00:36', 'iss 00:01:25'),
      prompt: 'In every state of an FSM, at any given time, exactly one outgoing condition must be true.', answer: true,
      explanation: 'True. This is the lecture’s rule: all paths from each state are defined (at least one condition is true) and there is no ambiguity (no two are true together).' },
    { id: 't7-q72', subtopic: 't7-issues', type: 'mc', difficulty: 1, src: c('iss 00:03:41', 'iss 00:03:54', 'iss 00:03:58'), diagram: fsmDiagram(ISS_BAD),
      prompt: 'In S0 the outgoing conditions are A (stay in S0) and B (go to S1). For which input combination does the FSM <b>not know where to go</b>?',
      choices: ['AB = 00', 'AB = 11', 'AB = 10', 'AB = 01'], answer: 0,
      explanation: 'With A = 0 and B = 0 neither condition is true. AB = 11 is the other problem (both true, conflicting requirements); 10 and 01 each make exactly one condition true.' },
    { id: 't7-q73', subtopic: 't7-issues', type: 'multi', difficulty: 3, src: sup('Applies the lecture’s rule (exactly one outgoing condition true, all paths defined) to new condition sets; each set is checked over all four input combinations.'),
      prompt: 'A state has inputs A and B. Which sets of outgoing conditions are valid (for every input combination exactly one condition is true)? Select all that apply.',
      choices: ['A and A′', 'A and B', 'A + B′ and A′B', 'AB and A′B′', 'A′, AB and AB′'],
      answers: [["A", "A'"], ['A', 'B'], ["A + B'", "A'B"], ['AB', "A'B'"], ["A'", 'AB', "AB'"]].map((s, i) => (condSetValid(['A', 'B'], s) ? i : null)).filter(i => i !== null),
      steps: ['For each set, test AB = 00, 01, 10, 11 and count the true conditions.', 'A, A′: always exactly one → valid (B is simply ignored).', 'A, B: AB = 11 gives two, AB = 00 gives none → invalid.', 'A + B′, A′B: they are complements of each other → valid (the lecture’s fix).', 'AB, A′B′: AB = 01 and 10 give none → invalid.', 'A′, AB, AB′: A = 0 → only A′; A = 1 → AB or AB′ depending on B → valid.'],
      explanation: 'Valid means mutually exclusive (every pair ANDs to 0) and all-inclusive (the OR of all of them is 1).' },
    { id: 't7-q74', subtopic: 't7-issues', type: 'boolexpr', difficulty: 3, src: c('iss 00:04:14', 'iss 00:04:25'), vars: ['A', 'B'], answer: "A + B'", maxLiterals: 2, diagram: fsmDiagram(ISS_FIX),
      prompt: 'The lecture’s fix: from S0, go to S1 on A′B. Write the (minimal) condition for the self-loop on S0, so that exactly one outgoing condition is true for every input.',
      steps: ['With two outgoing arrows, the self-loop must be true exactly when A′B is false.', 'Self-loop = (A′B)′.', 'De Morgan: (A′B)′ = A + B′.', 'Check: (A + B′)·A′B = 0 and (A + B′) + A′B = 1.'],
      explanation: 'The lecture keeps “stay on A” and adds “stay on A′B′”; together they are A + A′B′ = A + B′, the complement of A′B.' },
    { id: 't7-q75', subtopic: 't7-issues', type: 'numeric', difficulty: 2, src: sup('Applies the lecture’s rule (exactly one outgoing condition true) to a new state; checked over all input combinations.'),
      answer: [0, 1, 2, 3].filter(i => ["X'Y'", 'X', 'Y'].filter(cn => L.evalBool(L.parseBool(cn), L.envForRow(['X', 'Y'], i))).length > 1).length,
      prompt: 'A state with inputs X and Y has three outgoing arrows labelled X′Y′, X and Y. For how many of the four input combinations is <b>more than one</b> condition true?',
      steps: ['XY = 00: only X′Y′ is true.', 'XY = 01: only Y.', 'XY = 10: only X.', 'XY = 11: X and Y are both true → conflict.', 'Answer: 1 combination (XY = 11). Fix: label one of the arrows XY′ or X′Y instead.'],
      explanation: 'Every combination makes at least one condition true, so the set is all-inclusive, but X and Y overlap at XY = 11, so it is ambiguous there.' },
    { id: 't7-q76', subtopic: 't7-issues', type: 'mc', difficulty: 1, src: c('lab8b 00:06:03', 'lab8b 00:06:11', 'lab8b 00:06:19'),
      prompt: 'In the Lab 8 Verilog next-state <span class="mono">case</span> statement, why is there a <span class="mono">default</span> branch?',
      choices: ['To handle the case where the state is, by some accident or mistake, none of the listed states', 'Because Verilog cannot compile a case statement without one', 'To set the clock frequency', 'To make the FSM a Mealy machine'], answer: 0,
      explanation: 'The lab video evaluates S0, S1, … and then “if state is by some accident or mistake none of these” assigns the default case. The instructor also puts an unused value there as a simulation indicator.' },
    { id: 't7-q77', subtopic: 't7-issues', type: 'tf', difficulty: 2, src: sup(N_ISS),
      prompt: 'If an FSM can never be in an unused state code (it is reset into S0 and every transition leads to a used code), the rows for that code can be treated as don’t-cares in the next-state and output K-maps.', answer: true,
      explanation: 'True. Rows that can never occur may be filled however gives the simplest logic. If the machine could reach the unused code (for example at power-up without reset), you would instead give it a defined next state, usually the start state.' },

    /* ---- t7-seqdet ---- */
    { id: 't7-q78', subtopic: 't7-seqdet', type: 'numeric', difficulty: 2, src: sup(N_SEQ), answer: ovCount(SEQ10.join(''), '101'),
      prompt: `How many times does an <b>overlapping</b> 101 detector report a match on the input ${m(SEQ10.join(''))} (first bit first)?`,
      steps: ['Overlapping: check every window of three consecutive bits.', 'Bits 1–3 = 101 ✓, 3–5 = 101 ✓, 6–8 = 101 ✓, 8–10 = 101 ✓; the other windows (010, 011, 110, 010) do not match.', `Total: ${ovCount(SEQ10.join(''), '101')} matches, ending at bits 3, 5, 8 and 10.`],
      explanation: 'Bit 3 ends the first match and starts the second; bit 8 ends the third and starts the fourth. A non-overlapping detector finds only 2 (ending at bits 3 and 8).' },
    { id: 't7-q79', subtopic: 't7-seqdet', type: 'short', difficulty: 3, src: fg(N_SEQ), normalize: 'binary', width: SEQ10.length, diagram: fsmDiagram(D101_MEALY_NO),
      prompt: `The Mealy 101 detector (non-overlapping) starts in S0. X = ${m(SEQ10.join(''))}, one bit per cycle. Type Z during each cycle (just before each rising edge), ${SEQ10.length} bits.`,
      accept: [outStr(run(D101_MEALY_NO, SEQ10).outs)], steps: traceSteps(D101_MEALY_NO, SEQ10, { outName: 'Z' }),
      explanation: 'Z = 1 on the arrow S2 —1/1→ S0. Because that arrow returns to S0, the 1 that completed a match cannot start the next one: only 2 matches (bits 3 and 8).' },
    { id: 't7-q80', subtopic: 't7-seqdet', type: 'mc', difficulty: 1, src: sup(N_SEQ),
      prompt: 'What is the minimum number of states for a 101 sequence detector built as a Moore machine, and as a Mealy machine?',
      choices: ['Moore 4, Mealy 3', 'Moore 3, Mealy 4', 'Moore 3, Mealy 3', 'Moore 4, Mealy 4'], answer: 0,
      explanation: 'Both need “nothing”, “seen 1” and “seen 10”. Moore also needs a state for “101 found” in which Z = 1; Mealy produces Z = 1 on the arrow that completes the pattern, so it needs no extra state.' },
    { id: 't7-q81', subtopic: 't7-seqdet', type: 'mc', difficulty: 2, src: sup(N_SEQ), diagram: fsmDiagram(D101_MOORE_OV),
      prompt: 'This is the overlapping Moore 101 detector (S3: “101 found”, Z = 1). Which single change makes it <b>non-overlapping</b>?',
      choices: ['S3’s arrow on X = 0 goes to S0 instead of S2', 'S3’s arrow on X = 1 goes to S0 instead of S1', 'S2’s arrow on X = 1 goes to S0 instead of S3', 'S1’s arrow on X = 1 goes to S0 instead of staying in S1'], answer: 0,
      explanation: 'After a match, overlapping reuses the final 1: a following 0 gives “10” (S2). Non-overlapping may not reuse it, so a following 0 means nothing useful (S0). A following 1 is a fresh start (S1) in both versions; sending it to S0 would miss 101101. The other two changes break ordinary detection (for example 1101).' },
    { id: 't7-q82', subtopic: 't7-seqdet', type: 'boolexpr', difficulty: 3, src: fg('Hub Final Exam drill: 101 non-overlapping Mealy detector with D flip-flops; equations derived for this app and checked by truth table.'), diagram: fsmDiagram(D101_MEALY_NO),
      vars: ['Q1', 'Q0', 'X'], minterms: D101_Z.ms, dontcares: D101_Z.dcs, answer: 'Q1X', maxLiterals: 2,
      solutionDiagram: kmap(['Q1', 'Q0', 'X'], D101_Z.ms, D101_Z.dcs, [['Q1·X', 'Q1X']]),
      prompt: 'Encode the non-overlapping Mealy 101 detector as S0 = 00, S1 = 01, S2 = 10 (code 11 unused). Write the minimal output equation for <b>Z</b>.',
      steps: ['Z = 1 only on the arrow S2 —1/1→: row Q1Q0X = 101, minterm 5.', 'Unused code 11: minterms 6 and 7 are don’t-cares.', 'Group {5, 7} → Q1X.', 'Z = Q1X. It contains X, as a Mealy output may.'],
      explanation: 'Without the don’t-care you would need Q1Q0′X. The input in the equation is what makes this a Mealy output.' },
    { id: 't7-q83', subtopic: 't7-seqdet', type: 'boolexpr', difficulty: 3, src: sup(N_SEQ), diagram: fsmDiagram(D101_MEALY_OV),
      vars: ['Q1', 'Q0', 'X'], minterms: encMinterms(D101_MEALY_OV, ENC3, 2, 'next', 1).ms, dontcares: encMinterms(D101_MEALY_OV, ENC3, 2, 'next', 1).dcs, answer: 'X', maxLiterals: 1,
      solutionDiagram: kmap(['Q1', 'Q0', 'X'], encMinterms(D101_MEALY_OV, ENC3, 2, 'next', 1).ms, encMinterms(D101_MEALY_OV, ENC3, 2, 'next', 1).dcs, [['X', 'X']]),
      prompt: 'This is the <b>overlapping</b> Mealy 101 detector, encoded S0 = 00, S1 = 01, S2 = 10 (11 unused). Write the minimal expression for <b>D0</b>.',
      steps: ['D0 = 1 when the next state is S1 (code 01).', 'S1 is reached on X = 1 from S0 (row 001), from S1 (row 011) and, overlapping, from S2 (row 101): minterms 1, 3, 5.', 'Minterms 6, 7 are don’t-cares (code 11).', 'Use 7 to complete the group of four X = 1 cells → D0 = X.'],
      explanation: 'Every X = 1 leads to S1 (“the last bit is 1”), and every X = 0 leads elsewhere, so the low state bit simply copies X.' },
    { id: 't7-q84', subtopic: 't7-seqdet', type: 'boolexpr', difficulty: 2, src: fg('Hub Final Exam drill: 101 non-overlapping Mealy detector with D flip-flops; equations derived for this app and checked by truth table.'), diagram: fsmDiagram(D101_MEALY_NO),
      vars: ['Q1', 'Q0', 'X'], minterms: D101_N1.ms, dontcares: D101_N1.dcs, answer: "Q0X'", maxLiterals: 2,
      solutionDiagram: kmap(['Q1', 'Q0', 'X'], D101_N1.ms, D101_N1.dcs, [["Q0·X′", "Q0X'"]]),
      prompt: 'Non-overlapping Mealy 101 detector, S0 = 00, S1 = 01, S2 = 10 (11 unused). Write the minimal SOP for <b>D1</b>.',
      steps: ['D1 = 1 when the next state is S2 (code 10).', 'Only S1 on X = 0 goes to S2: row 010, minterm 2.', 'Don’t-cares: 6 and 7.', 'Pair 2 with the don’t-care 6 → Q0X′.', 'D1 = Q0X′.'],
      explanation: 'Q1′Q0X′ would also be correct but has one literal more than needed; the don’t-care at 110 removes Q1′.' },
    { id: 't7-q85', subtopic: 't7-seqdet', type: 'tf', difficulty: 2, src: sup(N_SEQ),
      prompt: `An <b>overlapping</b> detector for the pattern 11 reports two matches on the input ${m('0111')}.`, answer: ovCount('0111', '11') === 2,
      explanation: 'True. Windows: 01, 11 ✓, 11 ✓. The middle 1 ends the first match and starts the second. A non-overlapping detector would report only one.' },
    { id: 't7-q86', subtopic: 't7-seqdet', type: 'short', difficulty: 2, src: sup(N_SEQ), normalize: 'list', diagram: fsmDiagram(D101_MOORE_NO),
      prompt: `This is the <b>non-overlapping</b> Moore 101 detector. Starting in S0, X = ${m(SEQ10.join(''))} at edges 1–${SEQ10.length}. After which edges is Z = 1? List the edge numbers.`,
      accept: [afterEdges(run(D101_MOORE_NO, SEQ10)).map((z, i) => (z === '1' ? i + 1 : null)).filter(x => x !== null).join(', ')],
      steps: traceSteps(D101_MOORE_NO, SEQ10, { outName: 'Z' }),
      explanation: 'After the match at edge 3 the 0 sends S3 back to S0, so bits 3–5 (101) are not counted. The next fresh 101 is bits 6–8.' },

    /* ---- t7-minimize ---- */
    { id: 't7-q87', subtopic: 't7-minimize', type: 'mc', difficulty: 2, src: sup(N_MIN),
      prompt: '<p>Moore machine (input X, output Z):</p>' + minTable(MIN5) + '<p>Which pair of states can be merged just by looking at their rows (same output, identical next states)?</p>',
      choices: ['A and D', 'A and B', 'B and D', 'C and D'], answer: 0,
      explanation: 'A and D both have Z = 0, go to A on X = 0 and to B on X = 1. A and B have different rows, and on X = 1 B goes to C (Z = 1) while A goes to B (Z = 0), so they are not equivalent; the same X = 1 test separates B from D. C has Z = 1, so it can’t merge with D. (C and E are equivalent too, but that needs one more step of reasoning.)' },
    { id: 't7-q88', subtopic: 't7-minimize', type: 'numeric', difficulty: 3, src: sup(N_MIN), answer: MIN5_GROUPS.length,
      prompt: '<p>Minimize this 5-state Moore machine (input X, output Z):</p>' + minTable(MIN5) + '<p>How many states does the minimal machine have?</p>',
      steps: ['Group by output: {A, B, D} (Z = 0), {C, E} (Z = 1).', 'X = 1: A → B and D → B stay in the Z = 0 group, but B → C leaves it. Split: {A, D}, {B}, {C, E}.', '{A, D}: X = 0 → A, A; X = 1 → B, B. Same groups.', '{C, E}: X = 0 → A, D (both in {A, D}); X = 1 → E, E. Same groups.', `Nothing splits: ${groupText(MIN5_GROUPS)} → ${MIN5_GROUPS.length} states.`],
      explanation: 'Three states fit in 2 flip-flops instead of 3. The merged machine is the overlapping 11 detector.' },
    { id: 't7-q89', subtopic: 't7-minimize', type: 'tf', difficulty: 1, src: fg('Hub Final Exam page, Topic 7: “State minimization: merge equivalent states (same outputs, same next-states for every input).”'),
      prompt: 'Two states that produce different outputs can never be equivalent.', answer: true,
      explanation: 'True. Equivalent states must have the same outputs (and equivalent next states for every input). Different outputs can be told apart immediately.' },
    { id: 't7-q90', subtopic: 't7-minimize', type: 'multi', difficulty: 3, src: sup(N_MIN), diagram: fsmDiagram(MINB),
      prompt: '<p>Moore machine (input X, output Z):</p>' + minTable(MINB) + '<p>Select every pair of <b>equivalent</b> states.</p>',
      choices: ['S1 and S2', 'S3 and S5', 'S0 and S4', 'S1 and S4', 'S2 and S4'],
      answers: [['S1', 'S2'], ['S3', 'S5'], ['S0', 'S4'], ['S1', 'S4'], ['S2', 'S4']].map(([a, b], i) => (sameGroup(MINB_GROUPS, a, b) ? i : null)).filter(i => i !== null),
      steps: ['By output: {S0, S1, S2, S4} (Z = 0), {S3, S5} (Z = 1).', 'X = 0: S0 → S1 and S1, S2 → S3, S4 → S5. S1, S2 and S4 go to the Z = 1 group and S0 does not, so S0 splits off: {S0}, {S1, S2, S4}, {S3, S5}.',
        'X = 1: S1, S2 → S4 (middle group) but S4 → S0 (its own group). S4 splits off: {S0}, {S1, S2}, {S4}, {S3, S5}.', '{S1, S2}: identical rows. {S3, S5}: X = 0 → S3, S5 (same group), X = 1 → S0, S0. Nothing more splits.', `Final: ${groupText(MINB_GROUPS)}.`],
      explanation: 'S1 ≡ S2 (identical rows) and S3 ≡ S5 (same output; their next states are themselves equivalent). S4 differs from S1 and S2 on X = 1, and S0 differs from S4 on X = 0.' },
    { id: 't7-q91', subtopic: 't7-minimize', type: 'numeric', difficulty: 2, src: sup(N_MIN), answer: bitsFor(MINB_GROUPS.length),
      prompt: 'A 6-state Moore machine (S0–S5) is minimized: S1 ≡ S2 and S3 ≡ S5, and no other states merge. How many flip-flops does a binary encoding of the minimized machine need?',
      steps: [`6 states minus 2 merges → ${MINB_GROUPS.length} states: ${groupText(MINB_GROUPS)}.`, `⌈log<sub>2</sub> ${MINB_GROUPS.length}⌉ = ${bitsFor(MINB_GROUPS.length)} flip-flops.`, 'Before minimizing: 6 states needed 3.'],
      explanation: 'Minimizing saved a flip-flop here. Even when it does not, fewer states usually means simpler next-state logic.' },

    /* ---- t7-design ---- */
    { id: 't7-q92', subtopic: 't7-design', type: 'short', difficulty: 1, src: fg(N_VEND), normalize: 'binary', width: 2, diagram: fsmDiagram(VEND),
      prompt: 'Vending machine (15¢; outputs written as Disp Ret). Starting in C0, a dime is inserted at one rising edge and another dime at the next. Type Disp Ret after the second edge (2 bits).',
      accept: [run(VEND, ['01', '01']).outs[2]], steps: traceSteps(VEND, ['01', '01'], { outName: '(Disp, Ret)' }),
      explanation: '10¢ + 10¢ = 20¢: the machine is in C20, where it dispenses and returns 5¢ change.' },
    { id: 't7-q93', subtopic: 't7-design', type: 'numeric', difficulty: 1, src: fg(N_VEND), answer: bitsFor(VEND.states.length),
      prompt: 'The vending machine has the states C0, C5, C10, C15 and C20. How many flip-flops does a binary state encoding need?',
      steps: ['5 states.', '2 flip-flops give only 4 codes; 3 give 8.', '⌈log<sub>2</sub> 5⌉ = 3 flip-flops (3 codes unused). One-hot would use 5.'],
      explanation: 'Same count as the lecture’s five-state encoding example.' },
    { id: 't7-q94', subtopic: 't7-design', type: 'boolexpr', difficulty: 3, src: fg(N_VEND + ' Encoding C0 = 000, C5 = 001, C10 = 010, C15 = 011, C20 = 100 chosen for this app; unused codes treated as don’t-cares.'),
      vars: ['Q2', 'Q1', 'Q0'], minterms: vendOut(0), dontcares: vendUnused, answer: 'Q2 + Q1Q0', maxLiterals: 3,
      solutionDiagram: kmap(['Q2', 'Q1', 'Q0'], vendOut(0), vendUnused, [['Q2', 'Q2'], ['Q1·Q0', 'Q1Q0']]),
      prompt: 'Vending machine encoded C0 = 000, C5 = 001, C10 = 010, C15 = 011, C20 = 100 (codes 101, 110, 111 unused). Disp = 1 in C15 and C20. Write the minimal SOP for <b>Disp</b> in Q2 Q1 Q0.',
      steps: ['Moore output: depends on Q2 Q1 Q0 only.', 'Disp = 1 for C15 = 011 (minterm 3) and C20 = 100 (minterm 4).', 'Don’t-cares: 5, 6, 7.', 'Group {4, 5, 6, 7} → Q2. Group {3, 7} → Q1Q0.', 'Disp = Q2 + Q1Q0.'],
      explanation: 'Minterms 3 and 4 are not adjacent, so without don’t-cares you would need Q2′Q1Q0 + Q2Q1′Q0′ (6 literals). The unused codes shrink it to 3 literals.' },
    { id: 't7-q95', subtopic: 't7-design', type: 'boolexpr', difficulty: 2, src: fg(N_VEND + ' Encoding chosen for this app; unused codes treated as don’t-cares.'),
      vars: ['Q2', 'Q1', 'Q0'], minterms: vendOut(1), dontcares: vendUnused, answer: 'Q2', maxLiterals: 1,
      prompt: 'Same encoding (C0 = 000, C5 = 001, C10 = 010, C15 = 011, C20 = 100; 101, 110, 111 unused). Ret = 1 only in C20. Write the minimal expression for <b>Ret</b>.',
      steps: ['Ret = 1 only for C20 = 100: minterm 4.', 'Don’t-cares 5, 6, 7 complete the group {4, 5, 6, 7}.', 'Ret = Q2.'],
      explanation: 'Only one used code has Q2 = 1, so Q2 alone identifies C20.' },
    { id: 't7-q96', subtopic: 't7-design', type: 'mc', difficulty: 2, src: sup(N_PRAC), diagram: fsmDiagram(PARITY),
      prompt: 'Which word problem does this Moore machine solve? (Arrow labels are X; EVEN is the start state.)',
      choices: ['Z = 1 when an odd number of 1s has been received on X so far', 'Z = 1 when the last two bits of X were both 1', 'Z equals X delayed by one clock cycle', 'Z = 1 for one cycle after each 0 → 1 change of X'], answer: 0,
      explanation: 'A 1 swaps EVEN and ODD and a 0 keeps the state, so the state is the parity of the 1s seen. Test the others with X = 1, 1: this machine gives Z = 1, 0, while “delayed X” would give 1, 1 and “two 1s in a row” would give 0, 1. With X = 1, 0 it gives 1, 1, but a one-cycle pulse would give 1, 0.' },
    { id: 't7-q97', subtopic: 't7-design', type: 'short', difficulty: 2, src: sup(N_PRAC), normalize: 'binary', width: 6, diagram: fsmDiagram(PARITY),
      prompt: 'The parity checker starts in EVEN. X = 1, 1, 0, 1, 1, 1 at six rising edges. Type Z after each edge (6 bits).',
      accept: [outStr(afterEdges(run(PARITY, [...'110111'])))], steps: traceSteps(PARITY, [...'110111'], { outName: 'Z' }),
      explanation: 'Z after each edge is the parity of the 1s so far: 1, 2, 2, 3, 4, 5 ones → odd, even, even, odd, even, odd.' },
    { id: 't7-q98', subtopic: 't7-design', type: 'match', difficulty: 1, src: fg(N_FLOW),
      prompt: 'Match each design step with what it produces.',
      pairs: [['state transition diagram', 'states, arrows with input conditions, and the outputs'], ['state encoding (assignment)', 'a binary code for every state, which fixes the number of flip-flops'],
        ['state transition and output table', 'next-state bits and outputs for every current-state/input row'], ['next-state K-maps', 'minimal D flip-flop input equations'],
        ['output K-maps (Moore)', 'output equations in the current-state bits only']],
      explanation: 'That is the order on the hub’s Final Exam page: word problem → diagram → table → assignment → next-state K-maps → flip-flop input equations → output equations. (The lecture encodes first and then builds the table directly in bits.)' },
    { id: 't7-q99', subtopic: 't7-design', type: 'numeric', difficulty: 1, src: fg('Hub Final Exam page, Topic 7, lists traffic lights as a common FSM pattern. This small word problem is written for this app in the style of the holiday-light example.'), answer: bitsFor(3),
      prompt: 'A traffic light has no inputs: on every clock edge it steps green → yellow → red → green. How many flip-flops does a binary-encoded Moore FSM for it need?',
      steps: ['One state per light: 3 states.', '1 flip-flop gives 2 codes (too few); 2 give 4 ≥ 3.', '⌈log<sub>2</sub> 3⌉ = 2 flip-flops (one code unused).'],
      explanation: 'Like the holiday-light display, a machine with no inputs simply moves to the next state on every rising edge; only the number of states sets the flip-flop count.' },
    { id: 't7-q100', subtopic: 't7-design', type: 'mc', difficulty: 2, src: sup(N_MT),
      prompt: 'A detector must raise Z <b>during the same clock cycle</b> in which the last bit of the pattern is on the input, before the edge that samples it. Which kind of FSM can do that?',
      choices: ['A Mealy machine, because its output depends on the current input as well as the state', 'A Moore machine, because its output depends only on the state', 'Either kind, as long as it has at least four states', 'Neither: an FSM output can only change right after a clock edge'], answer: 0,
      explanation: 'A Moore output can change only when the state changes, after a clock edge, so it reports the match one cycle later. A Mealy output is computed from the state and the input, so it can go high as soon as the last bit arrives.' },
  ];
  const questions = questionsA.concat(questionsB);

  /* ---------- subtopics, practice, registration ---------- */
  const subtopics = [
    { id: 't7-definition', title: 'What an FSM is: the six-tuple (I, O, S, f, h, S0)' },
    { id: 't7-moore', title: 'Moore machines: state diagrams and operation' },
    { id: 't7-mealy', title: 'Mealy machines; Moore vs Mealy' },
    { id: 't7-examples', title: 'Instructor’s examples: LO/HI, holiday lights, toggle' },
    { id: 't7-encoding', title: 'State encoding: binary, Gray, one-hot; flip-flop count' },
    { id: 't7-timing', title: 'FSM block diagram, timing diagrams and clock period' },
    { id: 't7-implement', title: 'Implementation: state table → K-maps → D flip-flops' },
    { id: 't7-issues', title: 'FSM issues: complete, unambiguous transitions' },
    { id: 't7-seqdet', title: 'Sequence detectors: overlapping vs non-overlapping' },
    { id: 't7-minimize', title: 'State minimization (merging equivalent states)' },
    { id: 't7-design', title: 'Full design flow and final-exam drills' },
  ];

  // Generator ids from the README catalogue. fsmTrace's `type` param (moore | mealy) is assumed; see the section notes.
  const practice = [
    { gen: 'fsmTrace', label: 'Trace a Moore FSM: state and output after each clock edge', subtopic: 't7-moore', params: { type: 'moore' } },
    { gen: 'fsmTrace', label: 'Trace a Mealy FSM: outputs read from the arrows', subtopic: 't7-mealy', params: { type: 'mealy' } },
    { gen: 'stateBits', label: 'How many flip-flops? Binary vs one-hot state encoding', subtopic: 't7-encoding' },
    { gen: 'kmapMinimize', label: 'Next-state K-maps: minimize a 3-variable function (with don’t-cares for unused codes)', subtopic: 't7-implement', params: { vars: 3, dontcares: true } },
    { gen: 'kmapMinimize', label: 'K-map practice, 4 variables with don’t-cares (the size you get with 2 state bits + 2 inputs)', subtopic: 't7-design', params: { vars: 4, dontcares: true } },
  ];

  Study.registerSection({
    id: 't7', order: 7,
    title: 'Finite State Machines',
    short: 'FSMs',
    hub: '../#topic-7',
    summary: 'Finite state machines: the six-tuple definition, Moore and Mealy machines and their state diagrams, the instructor’s LO/HI, holiday-light and toggle examples, binary, Gray and one-hot state encoding, FSM timing, implementation with state tables, K-maps and D flip-flops, and FSM issues; plus sequence detectors, state minimization and the design drills from the final-exam guide.',
    finalWeight: 16,
    sources: [
      { file: F.def, title: 'Class 21 · Finite State Machine — Definition' },
      { file: F.vis, title: 'Class 21 · FSM (Moore) — Visual Representation' },
      { file: F.op, title: 'Class 21 · FSM (Moore) — Operation' },
      { file: F.mea, title: 'Class 21 · FSM (Mealy) — Operation' },
      { file: F.ex1, title: 'Class 22 · FSM Example #1' },
      { file: F.ex2, title: 'Class 22 · FSM Example #2' },
      { file: F.enc, title: 'Class 23 · FSM State Encoding' },
      { file: F.tim, title: 'Class 23 · Timing Diagram for FSM' },
      { file: F.im1, title: 'Class 24 · FSM Implementation (1/2)' },
      { file: F.im2, title: 'Class 24 · FSM Implementation (2/2)' },
      { file: F.im3, title: 'Class 24 · Video 3 (untitled): K-maps for the next-state and output logic' },
      { file: F.iss, title: 'Class 25 · FSM Issues (partial upload)' },
      { file: F.lab8a, title: 'Lab 8 · Verilog FSM 01 (three-block Moore FSM)' },
      { file: F.lab8b, title: 'Lab 8 · Verilog FSM 02 (state register, next-state case, default)' },
    ],
    gaps: [
      'Class 25 Video 1 (FSM Issues, Topic_7/class29_video1) is a partial upload: the transcript stops at 4:52, right after the two-input example in state S0. The rest of that lecture is missing, so unused state codes, reset strategy and Mealy output glitches are covered here as supplemental material.',
      'Sequence detectors (overlapping vs non-overlapping), state minimization, and the vending-machine, 101-detector, traffic-light and counter-as-FSM drills are listed on the hub’s Final Exam page but are not taught in any mirrored Topic 7 lecture. Those lessons and questions are marked supplemental or final-guide; the machines, encodings and equations are worked out for this app.',
      'Mealy timing: Class 21 Video 4 (1:42) points to a simulation in the textbook, and Class 23 Video 2 (10:52) says the Mealy timing computation is out of scope this year. Neither is mirrored; the Mealy timing statements here (output changes mid-cycle, can glitch, often fewer states) are standard textbook material.',
      'The whiteboard drawings are not transcribed, so the state diagrams are rebuilt from the narration. Where Mealy example 2’s S1 arrows lead is not said (Class 21 Video 4, 2:49), so that card is flagged. The Gray codes for S2–S4 are not read out (Class 23 Video 1, 5:19); the standard reflected Gray code is used. In the toggle table the narration says “stay in state 2” for S3 with A = 1 (Class 24 Video 2, 7:05), and at the end of Example #2 it says the display wraps to “S1 again” (Class 22 Video 2, 4:00); the app follows the diagram, the trace and the stated light sequence instead.',
      'The lectures refer to more examples worked in class (Class 22 Video 1 at 0:12, Class 22 Video 2 at 4:08, Class 24 Video 3 at 7:08) and to a Gray-encoded lab FSM (Class 23 Video 1 at 9:34). Those in-class examples and the Lab 8 handout are not mirrored.',
    ],
    subtopics, lessons, flashcards, questions, practice,
  });
})();
