/* CECS 201 Study — section t6: Synchronous Sequential Logic (Topic 6: Classes 17–20, 15 lecture videos).
   Sources: every Topic_6/*.vtt transcript (cited as file#hh:mm:ss) and the hub's Final Exam page. Class 17 Video 5
   (D flip-flop) is a partial upload. JK/T flip-flops, NAND and gated SR latches, ripple counters, mod-N next-state
   design, SISO/SIPO/PISO/PIPO names and the maximum-clock-frequency formula are not in the mirrored lectures; they
   are marked supplemental. Schema and conventions: study/README.md.
   Every timing waveform below is computed by the small simulators in this file (latch, flip-flop, register,
   counter), so a picture can never disagree with the answer next to it. */
(function () {
  'use strict';
  const Study = window.Study;
  const L = Study.logic;

  /* ---------------- sources ---------------- */
  const V = {
    c17v1: 'Topic_6/class19_video1.mp4.vtt',   // Class 17 Video 1: Intro to Synchronous Sequential Logic
    c17v2: 'Topic_6/class19_video2.mp4.vtt',   // Class 17 Video 2: Clock
    c17v3: 'Topic_6/class19_video3.mp4.vtt',   // Class 17 Video 3: SR Latch
    c17v4: 'Topic_6/class19_video4.mp4.vtt',   // Class 17 Video 4: D Latch
    c17v5: 'Topic_6/class19_video5.mp4.vtt',   // Class 17 Video 5: D Flip-Flop (partial upload, ends 4:35)
    c18v1: 'Topic_6/class20_video1.mp4.vtt',   // Class 18 Video 1: 4-bit Register
    c18v2: 'Topic_6/class20_video2.mp4.vtt',   // Class 18 Video 2: 4-bit Load Register
    c18v3: 'Topic_6/class20_video3.mp4.vtt',   // Class 18 Video 3: Shifting (starts with a load-register example)
    c19v1: 'Topic_6/class21_video1.mp4.vtt',   // Class 19 Video 1: Multi-function Registers
    c19v2: 'Topic_6/class21_video2.mp4.vtt',   // Class 19 Video 2: Multi-function Shift Register
    c19v3: 'Topic_6/class21_video3.mp4.vtt',   // Class 19 Video 3: Setup, Hold, Clock-to-Q
    c20v1: 'Topic_6/class22_video1.mp4.vtt',   // Class 20 Video 1: How Counters Work
    c20v2: 'Topic_6/class22_video2.mp4.vtt',   // Class 20 Video 2: Counter Design
    c20v3: 'Topic_6/class22_video3.mp4.vtt',   // Class 20 Video 3: Timers (1/2)
    c20v4: 'Topic_6/class22_video4.mp4.vtt',   // Class 20 Video 4: Timers (2/2)
  };
  // c('c17v3 00:05:41', …) -> { type: 'course', refs: ['Topic_6/class19_video3.mp4.vtt#00:05:41', …] }
  const c = (...refs) => ({
    type: 'course',
    refs: refs.map(r => {
      const [k, t] = r.split(' ');
      if (!V[k] || !/^\d\d:\d\d:\d\d$/.test(t)) throw new Error('t6-sequential: bad ref ' + r);
      return V[k] + '#' + t;
    }),
  });
  const STD = 'standard logic-design material (e.g. Mano & Ciletti, Digital Design; Vahid, Digital Design)';
  const supp = what => ({ type: 'supplemental', note: what + ': ' + STD + '; not stated in the mirrored Topic 6 lectures.' });
  const suppGuide = what => ({ type: 'supplemental', note: what + ' is listed on the hub’s Final Exam study page (Topic 6 points), but no mirrored lecture teaches it; the material here is ' + STD + '.' });
  const guide = what => ({ type: 'final-guide', note: 'From the hub’s Final Exam study page (Topic 6): ' + what });
  const NS_DFF = 'Class 17 Video 5 (D flip-flop) is a partial upload that stops at 4:35, before the master–servant hand-over is explained.';
  const NS_CLASS = what => 'In-class material not mirrored: ' + what + '.';

  /* ---------------- formatting helpers ---------------- */
  const mono = s => `<span class="mono">${s}</span>`;
  const b2 = s => `${mono(s)}<sub>2</sub>`;
  const tbl = (head, rows) =>
    `<table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(x => `<td>${x}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
  const QN = 'Q′';                                          // display form of Q' in prose

  /* ---------------- tiny simulators (all waveforms and traced answers come from these) ---------------- */
  const toBin = (v, n) => { let s = (v >>> 0).toString(2); while (s.length < n) s = '0' + s; return s.slice(-n); };
  const bit = (s, i) => s[s.length - 1 - i];                // bit i of a binary string, bit 0 = rightmost
  const inc = s => toBin((parseInt(s, 2) + 1) % (1 << s.length), s.length);
  const dec = s => toBin((parseInt(s, 2) + (1 << s.length) - 1) % (1 << s.length), s.length);
  const shl = s => s.slice(1) + '0';                        // shift left: MSB out, 0 in
  const shrL = s => '0' + s.slice(0, -1);                   // logical shift right: 0 in
  const shrA = s => s[0] + s.slice(0, -1);                  // arithmetic shift right: copy the MSB
  const shrIn = (s, b) => b + s.slice(0, -1);               // shift right with a serial-in bit
  const fromTwos = s => (s[0] === '1' ? parseInt(s, 2) - (1 << s.length) : parseInt(s, 2));

  // clocks: `per` slots per period, low half first, so the rising edge is in the middle of each period
  const CK = (n, per = 4) => ('0'.repeat(per / 2) + '1'.repeat(per / 2)).repeat(n);
  // per-cycle values -> wave; inputs change at the start of a period (a falling edge), well before the next rising edge
  const held = (vals, per = 4) => vals.map(v => String(v).repeat(per)).join('');
  // per-cycle register results -> wave; each new value appears at that period's rising edge
  const after = (vals, q0, per = 4) => vals.map((v, k) => String(k ? vals[k - 1] : q0).repeat(per / 2) + String(v).repeat(per / 2)).join('');
  // run one rising edge per cycle: next(q, input) -> q
  const run = (q0, ins, next) => { const out = []; let q = q0; for (const x of ins) { q = next(q, x); out.push(q); } return out; };
  // slot-level devices
  function latchQ(en, d, q0) { let q = q0, o = ''; for (let i = 0; i < d.length; i++) { if (en[i] === '1') q = d[i]; o += q; } return o; }
  function edgeFF(clk, ins, q0, next) {
    let q = q0, o = '';
    for (let i = 0; i < clk.length; i++) {
      if (i > 0 && clk[i - 1] === '0' && clk[i] === '1') {
        if (ins.some(w => w[i] !== w[i - 1])) throw new Error('t6-sequential: an input changes exactly at a rising edge (slot ' + i + ')');
        q = next(q, ins.map(w => w[i - 1]));
      }
      o += q;
    }
    return o;
  }
  const dffQ = (clk, d, q0) => edgeFF(clk, [d], q0, (q, [x]) => x);
  const tffQ = (clk, t, q0) => edgeFF(clk, [t], q0, (q, [x]) => (x === '1' ? (q === '1' ? '0' : '1') : q));
  const jkQ = (clk, j, k, q0) => edgeFF(clk, [j, k], q0, (q, [a, b]) => (a + b === '00' ? q : a + b === '01' ? '0' : a + b === '10' ? '1' : (q === '1' ? '0' : '1')));
  function srQ(s, r, q0) {
    let q = q0, o = '';
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '1' && r[i] === '1') throw new Error('t6-sequential: S = R = 1 in an SR trace');
      if (s[i] === '1') q = '1'; else if (r[i] === '1') q = '0';
      o += q;
    }
    return o;
  }
  const notW = w => [...w].map(x => (x === '1' ? '0' : x === '0' ? '1' : 'x')).join('');
  const andW = (...ws) => [...ws[0]].map((_, i) => (ws.some(w => w[i] === '0') ? '0' : ws.some(w => w[i] === 'x') ? 'x' : '1')).join('');
  const atEdges = (clk, w) => { let o = ''; for (let i = 1; i < clk.length; i++) if (clk[i - 1] === '0' && clk[i] === '1') o += w[i]; return o; };
  // timing spec; asserts equal lengths and legal characters
  function tm(signals, edges) {
    const n = signals[0][1].length;
    for (const [nm, w] of signals) if (w.length !== n || !/^[01x]+$/.test(w)) throw new Error('t6-sequential: bad wave for ' + nm + ': ' + w);
    const spec = { kind: 'timing', signals: signals.map(([name, wave]) => ({ name, wave })) };
    if (edges) spec.edges = true;
    return spec;
  }
  // per-bit signals of a multi-bit per-cycle trace: bits('Q', ['100', …], '000') -> [['Q2', wave], ['Q1', wave], ['Q0', wave]]
  const bitsAfter = (name, vals, q0, per = 4) => [...q0].map((_, j) => { const i = q0.length - 1 - j; return [name + i, after(vals.map(v => bit(v, i)), bit(q0, i), per)]; });
  const tt = (vars, outs) => ({ kind: 'truthtable', vars, outputs: outs.map(([name, expr, dc]) => ({ name, values: L.truthTable(expr, vars).rows.map(r => ((dc || []).includes(r.index) ? 'x' : r.out)) })) });
  const kmapOf = (vars, ms, dcs, terms) => ({ kind: 'kmap', vars, minterms: ms, dontcares: dcs, groups: terms.map(t => ({ cells: L.minterms(t, vars), label: t })) });

  /* ---------------- shared waveforms and traces ---------------- */
  // SR latch (no clock): one slot = one moment in time
  const SR_S = '001100000110', SR_R = '000000110000';
  const SR_Q = srQ(SR_S, SR_R, '0');
  // D latch vs D flip-flop, same CLK and D (Q starts at 0)
  const LF_CLK = CK(4), LF_D = '0001111000001111';
  const LF_LATCH = latchQ(LF_CLK, LF_D, '0'), LF_FF = dffQ(LF_CLK, LF_D, '0');
  // D flip-flop trace with a short pulse on D during a high phase (question)
  const DF_CLK = CK(5), DF_D = '01110001000011111110';
  const DF_FF = dffQ(DF_CLK, DF_D, '0'), DF_LATCH = latchQ(DF_CLK, DF_D, '0');
  // 4-bit basic register: D changes from 1001 to 0110 just after the first edge (Class 18 Video 1 example, extended)
  const RG_CLK = CK(3), RG_D = { 3: '111000000000', 2: '000111111111', 1: '000111111111', 0: '111000000000' };
  const RG_Q = { 3: dffQ(RG_CLK, RG_D[3], '0'), 2: dffQ(RG_CLK, RG_D[2], '0'), 1: dffQ(RG_CLK, RG_D[1], '0'), 0: dffQ(RG_CLK, RG_D[0], '0') };
  // load register (Class 18 Video 3 example): LD per cycle, D per cycle
  const LR_LD = ['1', '1', '0', '0'], LR_DIN = ['1100', '0011', '1010', '1010'];
  const LR_Q = run('0000', LR_LD.map((ld, k) => [ld, LR_DIN[k]]), (q, [ld, d]) => (ld === '1' ? d : q));
  // 3-bit shift-right register with serial input (Class 19 Video 2 register, SHR = 1, LD = 0)
  const SH_SRI = ['1', '0', '1', '1'];
  const SH_Q = run('000', SH_SRI, (q, b) => shrIn(q, b));
  // 3-bit up counter (Class 20 Video 2 design), CNT per cycle, counting from 000
  const CT_CNT = ['1', '1', '1', '0', '1', '1', '1', '1', '1'];
  const CT_Q = run('000', CT_CNT, (q, cnt) => (cnt === '1' ? inc(q) : q));
  // timer (Class 20 Videos 3–4): upper bound 5 -> DEC -> 100; counter load = LD + TC
  const TM_LD = ['1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'];
  const TM_Q = run('xxx', TM_LD, (q, ld) => (ld === '1' || q === '000' ? dec('101') : dec(q)));
  // T flip-flop with T = 1: divide by two
  const TF_CLK = CK(4), TF_T = '1111111111111111', TF_Q = tffQ(TF_CLK, TF_T, '0');

  /* ---------------- subtopics ---------------- */
  const subtopics = [
    { id: 't6-intro', title: 'Sequential vs. combinational logic' },
    { id: 't6-clock', title: 'The clock: period, frequency, duty cycle, edges' },
    { id: 't6-srlatch', title: 'SR latch' },
    { id: 't6-dlatch', title: 'D latch (level-sensitive)' },
    { id: 't6-dff', title: 'D flip-flop (edge-triggered)' },
    { id: 't6-register', title: '4-bit register' },
    { id: 't6-loadreg', title: 'Load register' },
    { id: 't6-shifting', title: 'Shifting: logical and arithmetic' },
    { id: 't6-multireg', title: 'Multi-function registers' },
    { id: 't6-shiftreg', title: 'Shift registers' },
    { id: 't6-timing', title: 'Setup, hold and clock-to-Q delay' },
    { id: 't6-counters', title: 'How counters work' },
    { id: 't6-counterdesign', title: 'Counter design' },
    { id: 't6-timers', title: 'Timers' },
    { id: 't6-jkt', title: 'JK and T flip-flops (supplemental)' },
  ];

  /* ================================================================== lessons */
  const lessons = [
    /* ---------------------------------------------------------------- 1. sequential vs combinational */
    { id: 't6-l1', subtopic: 't6-intro', title: 'What makes logic sequential', minutes: 7,
      src: c('c17v1 00:01:06', 'c17v1 00:04:09', 'c17v1 00:05:01', 'c17v1 00:07:05', 'c17v1 00:12:19'),
      blocks: [
        { type: 'text', html: `<p>Phones, navigation systems, smartwatches and laptops all have to <b>send, receive, store, retrieve and process information</b>. We already know how to <i>represent</i> information in binary (ASCII, BCD, Gray code, unsigned and signed numbers). Now we need hardware that can <b>store</b> it — a memory element. That is what synchronous sequential logic is about.</p>` },
        { type: 'text', html: `<p><b>Combinational circuit:</b> the output is a function of the inputs only. Dr. Trajkovic's picture is water running down a pipe from top to bottom: nothing can be stored or accumulated along the way, so whatever goes in determines what comes out right now.</p>
<p><b>Sequential circuit:</b> the output is a function of the inputs <b>and the current state</b>. The circuit gets to its current state through the <b>past sequence of input values</b>, so the same input can produce different outputs depending on what happened before.</p>` },
        { type: 'text', html: `<p>The lecture's block diagram has two boxes:</p>
<pre class="mono">  inputs ───────►┌───────────────────┐──────► outputs
                 │ combinational     │
            ┌───►│ logic             │────┐ update (next state)
            │    └───────────────────┘    │
            │    ┌───────────────────┐    │
            └────┤ memory element    │◄───┘
     current     │ (current state)   │
     state       └───────────────────┘</pre>
<p>The combinational logic sees the <b>outside inputs</b> and the <b>current state</b> held by the memory element. It produces the outputs and also <b>updates the state</b>. The path from the logic back into the memory and around again is a loop — this <i>feedback</i> is what lets the circuit remember (the word “feedback” is standard terminology, not the lecture's).</p>` },
        { type: 'callout', tone: 'note', html: `A memory you write data into (at an address) and later read back is also a sequential circuit — just a much simpler one than the general block diagram.` },
        { type: 'text', html: `<p>Sequential circuits come in two kinds <i>with respect to the timing of signals</i>:</p>
<ul><li><b>Synchronous</b> — behavior and outputs are affected by the input values only at <b>discrete instances of time</b>. Like a conductor keeping an orchestra on the same rhythm, a clock decides those instants.</li>
<li><b>Asynchronous</b> — behavior and outputs can depend on the inputs at <b>any time</b>; there is no conductor.</li></ul>
<p>Either way, the functional rule is the same: outputs depend on the series of inputs and the current state. This course works with the <b>synchronous</b> kind.</p>` },
        { type: 'example', title: 'Same input, different output (illustration)',
          problem: `A circuit receives one bit per clock tick and must output 1 when the last two bits received were both 1. The bits 1, 1, 0, 1 arrive (assume the bit before the first one was 0). What are the outputs, and does the circuit need memory?`,
          steps: [
            `Tick 1: input 1, previous bit 0 → output 0.`,
            `Tick 2: input 1, previous bit 1 → output 1.`,
            `Tick 3: input 0 → output 0.`,
            `Tick 4: input 1, previous bit 0 → output 0.`,
            `Ticks 1, 2 and 4 all have input 1, but the outputs are 0, 1, 0: the output depends on the <b>previous</b> bit, which must be stored. So the circuit is sequential (its state is “the last bit”).`],
          answer: 'Outputs 0, 1, 0, 0 — it needs state, so it is sequential.' },
        { type: 'check', question: { id: 't6-l1-c1', type: 'tf', difficulty: 1, src: c('c17v1 00:04:09'),
          prompt: 'A combinational circuit can give different outputs for the same input values, depending on what its inputs were earlier.',
          answer: false,
          explanation: `False. A combinational output is a function of the present inputs only (the water-pipe picture). Depending on earlier inputs requires a stored state — that is the definition of a sequential circuit.` } },
        { type: 'check', question: { id: 't6-l1-c2', type: 'mc', difficulty: 1, src: c('c17v1 00:08:14', 'c17v1 00:09:29'),
          prompt: 'In the sequential-circuit block diagram, what are the inputs of the combinational logic?',
          choices: ['The outside inputs and the current state from the memory element', 'Only the outside inputs', 'Only the current state', 'Only the clock'],
          answer: 0,
          explanation: `The combinational logic is fed both the external inputs and the current state kept by the memory element; from them it produces the outputs and the state update. Using only the inputs would make it combinational; using only the state would ignore the inputs; the clock only decides <i>when</i> the state is updated.` } },
      ] },

    /* ---------------------------------------------------------------- 2. clock */
    { id: 't6-l2', subtopic: 't6-clock', title: 'The clock: period, frequency, duty cycle, edges', minutes: 7,
      src: c('c17v2 00:00:37', 'c17v2 00:03:18', 'c17v2 00:05:20', 'c17v5 00:00:23', 'c18v2 00:03:09'),
      blocks: [
        { type: 'text', html: `<p>Synchronous circuits are synchronized by a <b>clock generator</b>. It produces <b>clock pulses</b>, which make up <b>clock cycles</b>; on schematics the signal is labelled <b>clock</b> or <b>CLK</b>. The clock determines <b>when data is stored</b> in a synchronous sequential circuit.</p>
<p>The clock is a <b>periodic</b> signal: the same shape repeats every <b>clock period</b> <i>T</i><sub>CLK</sub>. Its <b>frequency</b> is</p>
<p class="mono">T<sub>CLK</sub> = 1 / f<sub>CLK</sub>   and   f<sub>CLK</sub> = 1 / T<sub>CLK</sub></p>
${tbl(['Period', 'Frequency'], [['1 ns', '1 GHz'], ['10 ns', '100 MHz'], ['20 ns', '50 MHz'], ['1 µs', '1 MHz']])}` },
        { type: 'text', html: `<p>The <b>duty cycle</b> is the fraction of the period in which the signal is <b>active</b> — for now, active means equal to 1. The lecture's first clock is 1 for about half the period: a <b>50% duty cycle</b>. A clock can just as well be 1 for 10% or 90% of the period, or any amount in between.</p>` },
        { type: 'diagram', diagram: tm([['CLK 50%', CK(3)], ['CLK 25%', '0001'.repeat(3)], ['CLK 75%', '0111'.repeat(3)]]),
          caption: 'Three clocks with the same period (4 slots) and different duty cycles: 2, 1 and 3 slots of every 4 are 1.' },
        { type: 'text', html: `<p>An <b>edge</b> is the instant the clock changes value:</p>
<ul><li><b>Rising (positive) edge</b> — the clock goes from 0 to 1. The flip-flops in this course act on this edge.</li>
<li><b>Falling (negative) edge</b> — the clock goes from 1 to 0.</li></ul>` },
        { type: 'example', title: 'Period → frequency', problem: 'A clock has a period of 20 ns. What is its frequency?',
          steps: ['f = 1 / T', 'f = 1 / (20 × 10<sup>−9</sup> s) = 0.05 × 10<sup>9</sup> Hz', '0.05 × 10<sup>9</sup> Hz = 50 × 10<sup>6</sup> Hz = 50 MHz'],
          answer: '50 MHz' },
        { type: 'example', title: 'Duty cycle → time high', problem: 'A 250 MHz clock has a 40% duty cycle. How long is it 1 in each period?',
          steps: ['T = 1 / f = 1 / (250 × 10<sup>6</sup> Hz) = 4 × 10<sup>−9</sup> s = 4 ns', 'time high = duty cycle × T = 0.40 × 4 ns = 1.6 ns', 'time low = 4 ns − 1.6 ns = 2.4 ns'],
          answer: '1.6 ns high (and 2.4 ns low)' },
        { type: 'check', question: { id: 't6-l2-c1', type: 'numeric', difficulty: 1, src: c('c17v2 00:03:18'),
          prompt: 'A clock runs at 100 MHz. What is its period, in nanoseconds?', answer: 10,
          steps: ['T = 1 / f = 1 / (100 × 10<sup>6</sup> Hz)', '= 10 × 10<sup>−9</sup> s = 10 ns'],
          explanation: 'Period and frequency are reciprocals: 1 / 100 MHz = 10 ns.' } },
        { type: 'check', question: { id: 't6-l2-c2', type: 'mc', difficulty: 1, src: c('c17v5 00:00:23'),
          prompt: 'What is a rising (positive) clock edge?',
          choices: ['The instant the clock goes from 0 to 1', 'The instant the clock goes from 1 to 0', 'The whole time the clock is 1', 'The middle of the low half of the period'],
          answer: 0,
          explanation: 'The rising or positive edge is the short moment when the clock changes from 0 to 1. The 1 → 0 change is the falling (negative) edge; “the whole time the clock is 1” is a level, not an edge.' } },
      ] },

    /* ---------------------------------------------------------------- 3. SR latch */
    { id: 't6-l3', subtopic: 't6-srlatch', title: 'The SR latch', minutes: 9,
      src: c('c17v3 00:00:13', 'c17v3 00:03:30', 'c17v3 00:05:41', 'c17v3 00:06:53', 'c17v3 00:08:28', 'c17v3 00:10:37'),
      blocks: [
        { type: 'text', html: `<p>The first hardware that can <b>store one bit</b> is the <b>SR latch</b>. It has two inputs, <b>S</b> (<i>set</i> the latch) and <b>R</b> (<i>reset</i> the latch), and one output <b>Q</b>, the value of the stored bit. The physical circuit makes the output available both regular and complemented, as <b>Q</b> and <b>${QN}</b>.</p>
<p>It is built from two <b>NOR</b> gates. Remember: a NOR output is 1 <b>only when both inputs are 0</b>.</p>` },
        { type: 'diagram', diagram: tt(['A', 'B'], [['A NOR B', "(A + B)'"]]), caption: 'NOR: 1 only for inputs 00.' },
        { type: 'diagram', diagram: { kind: 'component', shape: 'srlatch', inputs: ['S', 'R'], outputs: ['Q', QN] },
          caption: 'Cross-coupled NOR gates: S goes into the gate that drives Q′, R into the gate that drives Q, and each gate’s output is wired back to an input of the other gate.' },
        { type: 'text', html: `<p>What you must be able to reproduce is the <b>function table</b> (in the lecture's order):</p>
${tbl(['S', 'R', 'Q', QN, 'meaning'], [['1', '0', '1', '0', 'set the latch'], ['0', '1', '0', '1', 'reset the latch'], ['0', '0', 'Q', 'Q′', 'keep the previous value'], ['1', '1', '0', '0', '<b>forbidden</b>']])}
<p>With SR = 00 the latch remembers: after 10 it keeps Q = 1, after 01 it keeps Q = 0.</p>` },
        { type: 'example', title: 'Why SR = 00 remembers (gate by gate)',
          problem: 'Check that both stored values are stable when S = R = 0. (The lecture leaves this step-by-step to the zyBook animation; the gate reasoning is standard.)',
          steps: [
            'Suppose Q = 1 and Q′ = 0. The Q gate sees R = 0 and Q′ = 0 → NOR = 1, so Q stays 1.',
            'The Q′ gate sees S = 0 and Q = 1 → NOR = 0, so Q′ stays 0. Consistent.',
            'Suppose Q = 0 and Q′ = 1. The Q gate sees R = 0 and Q′ = 1 → NOR = 0, so Q stays 0.',
            'The Q′ gate sees S = 0 and Q = 0 → NOR = 1, so Q′ stays 1. Consistent.',
            'Both states sustain themselves through the feedback wires, so SR = 00 keeps whichever value was stored.'],
          answer: 'Both Q = 1 and Q = 0 are self-sustaining, so 00 holds the previous value.' },
        { type: 'example', title: 'Trace a sequence',
          problem: 'Q starts at 0. The inputs SR go through 00, 10, 00, 01, 00, 10, 00 (the waveform below). What does Q do?',
          steps: ['00: keep → Q = 0.', '10: set → Q = 1.', '00: keep → Q stays 1.', '01: reset → Q = 0.', '00: keep → Q stays 0.', '10: set → Q = 1.', '00: keep → Q stays 1.'],
          answer: 'Q = 0, 1, 1, 0, 0, 1, 1' },
        { type: 'diagram', diagram: tm([['S', SR_S], ['R', SR_R], ['Q', SR_Q], [QN, notW(SR_Q)]]),
          caption: 'Q changes only when S or R is 1; while both are 0 it holds.' },
        { type: 'text', html: `<p><b>SR = 11 is forbidden.</b> Both NOR gates see a 1, so <b>Q = ${QN} = 0</b> — the outputs are no longer complements. Worse, if both inputs then return to 0 at the same moment, each gate sees zeros, both outputs try to become 1, then 0 … the latch may not settle into either state. This is <b>metastability</b>. The rule: <b>never put 1, 1 on the S and R inputs.</b></p>
<p>Latches used to be popular because they are simple, but having to guarantee from the outside that SR = 11 never happens is a problem. That is why a more robust latch was introduced next.</p>` },
        { type: 'callout', tone: 'note', html: `<b>Supplemental — other versions.</b> A latch made of cross-coupled <b>NAND</b> gates has <b>active-low</b> inputs (often written S′ and R′): S′R′ = 01 sets, 10 resets, 11 holds, and 00 is forbidden (it forces Q = Q′ = 1). A <b>gated SR latch</b> ANDs S and R with an enable E, so the latch only listens while E = 1. Neither appears in the mirrored lectures; the hub’s final guide lists gated latches.` },
        { type: 'check', question: { id: 't6-l3-c1', type: 'mc', difficulty: 1, src: c('c17v3 00:06:18'),
          prompt: 'A NOR-based SR latch receives S = 0, R = 1. What happens?',
          choices: ['It resets: Q = 0, Q′ = 1', 'It sets: Q = 1, Q′ = 0', 'It keeps its previous value', 'Q = Q′ = 0 (forbidden)'],
          answer: 0,
          explanation: 'R = 1 resets the latch: Q becomes 0 and Q′ becomes 1. Setting needs S = 1, R = 0; keeping needs 00; Q = Q′ = 0 happens for the forbidden 11.' } },
        { type: 'check', question: { id: 't6-l3-c2', type: 'tf', difficulty: 1, src: c('c17v3 00:09:11', 'c17v3 00:10:37'),
          prompt: 'For an SR latch, the input combination S = R = 1 is forbidden.',
          answer: true,
          explanation: 'True. In the NOR latch it forces Q = Q′ = 0, and releasing both inputs together can leave the latch metastable, so the rule is never to apply 1, 1.' } },
      ] },

    /* ---------------------------------------------------------------- 4. D latch */
    { id: 't6-l4', subtopic: 't6-dlatch', title: 'The D latch: level-sensitive storage', minutes: 8,
      src: c('c17v4 00:00:54', 'c17v4 00:03:24', 'c17v4 00:05:21', 'c17v4 00:08:37', 'c17v4 00:11:46', 'c17v4 00:12:37'),
      blocks: [
        { type: 'text', html: `<p>The <b>D latch</b> also stores one bit but is far more robust than the SR latch. Its inputs are <b>D</b> (<i>data</i>, the bit to store) and <b>E</b> (<i>enable</i>); its output is <b>Q</b>, the stored bit (${QN} may also be brought out).</p>
<p>Inside is an SR latch with two AND gates and an inverter in front of it: E goes to both AND gates, D to the top one and D′ (through the NOT) to the bottom one.</p>
<p class="mono">S = E·D        R = E·D′</p>` },
        { type: 'diagram', diagram: { kind: 'circuit', inputs: ['D', 'E'], gates: [{ id: 'n1', type: 'NOT', in: ['D'] }, { id: 'g1', type: 'AND', in: ['D', 'E'] }, { id: 'g2', type: 'AND', in: ['n1', 'E'] }], outputs: [{ name: 'S', from: 'g1' }, { name: 'R', from: 'g2' }] },
          caption: 'The gating logic that feeds the internal SR latch: S = E·D, R = E·D′.' },
        { type: 'diagram', diagram: { kind: 'component', shape: 'dlatch', inputs: ['D', 'E'], outputs: ['Q', QN] }, caption: 'D latch symbol.' },
        { type: 'text', html: `${tbl(['E', 'D', 'S', 'R', 'SR latch does', 'Q'], [['0', '–', '0', '0', 'keep', 'previous Q'], ['1', '0', '0', '1', 'reset', '0'], ['1', '1', '1', '0', 'set', '1']])}
<p>With E = 0 both AND gates output 0, the SR latch sees 00 and keeps its value — <b>D does not matter</b>. With E = 1 the output is literally a copy of D. And because S = E·D and R = E·D′ can never both be 1, the forbidden input never reaches the SR latch.</p>` },
        { type: 'example', title: 'Work through E = 1, D = 0',
          problem: 'Find S, R and Q for E = 1, D = 0.',
          steps: ['The inverter gives D′ = 1.', 'Top AND: S = E·D = 1·0 = 0.', 'Bottom AND: R = E·D′ = 1·1 = 1.', 'SR = 01 → the SR latch resets, so Q = 0 — the same value as D.'],
          answer: 'S = 0, R = 1, Q = 0' },
        { type: 'text', html: `<p>While E = 1 the latch is <b>transparent</b> (Q follows D); while E = 0 it is <b>latched</b> and holds. What matters is the <b>level</b> of E for the whole time it is 1, so the D latch is <b>level-sensitive</b>. (“Transparent” and “level-sensitive” are standard terms; the lecture says the output copies the input whenever E = 1.)</p>
<p>Now connect a <b>clock</b> to E. During the entire time CLK = 1 the latch stores whatever is on D — if D changes many times in that interval, Q follows every change. We want the moment when the input is “sampled” to be as short as possible. Making the clock pulse tiny still leaves a window; the better option is to sample <b>only at the rising edge</b>. That is the flip-flop (next lesson).</p>` },
        { type: 'diagram', diagram: tm([['CLK = E', LF_CLK], ['D', LF_D], ['Q (D latch)', LF_LATCH]]),
          caption: 'D latch with the clock on its enable: Q follows D whenever CLK = 1 (it catches the change in the middle of the first high phase) and holds while CLK = 0.' },
        { type: 'check', question: { id: 't6-l4-c1', type: 'mc', difficulty: 1, src: c('c17v4 00:05:21'),
          prompt: 'A D latch has E = 0. What is Q?',
          choices: ['The previous value, whatever D is', 'Always 0', 'A copy of D', 'Unknown (forbidden state)'],
          answer: 0,
          explanation: 'E = 0 makes both AND gates output 0, so the SR latch sees 00 and keeps its stored value. Q copies D only when E = 1, and the D latch never reaches a forbidden state.' } },
        { type: 'check', question: { id: 't6-l4-c2', type: 'tf', difficulty: 2, src: c('c17v4 00:04:01', 'c17v4 00:01:16'),
          prompt: 'Inside a D latch, the internal SR latch can never receive S = R = 1.',
          answer: true,
          explanation: 'True. S = E·D and R = E·D′; D and D′ are never both 1, so S and R are never both 1. That is why the D latch is more robust than the SR latch.' } },
      ] },

    /* ---------------------------------------------------------------- 5. D flip-flop */
    { id: 't6-l5', subtopic: 't6-dff', title: 'The D flip-flop: edge-triggered storage', minutes: 9,
      src: c('c17v5 00:00:08', 'c17v5 00:00:58', 'c17v5 00:01:27', 'c17v5 00:02:07', 'c17v5 00:02:58', 'c18v1 00:00:34', 'c18v1 00:01:47'),
      needsSource: NS_DFF,
      blocks: [
        { type: 'text', html: `<p>The <b>D flip-flop</b> (DFF) uses only the <b>positive (rising) edge</b> of the clock — the little moment when CLK goes from 0 to 1 — to “sample” the value on its input and store it. It has two inputs, <b>D</b> (data to store) and <b>CLK</b> (what used to be the enable, now driven by the clock), and one output <b>Q</b>.</p>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'dff', inputs: ['D'], outputs: ['Q'], clock: true }, caption: 'D flip-flop symbol; the triangle marks an edge-triggered clock input.' },
        { type: 'text', html: `<p><b>Master–servant construction</b> (the lecture's name; many books say master–slave): two cascaded D latches.</p>
<ul><li>The external D goes to the first latch, the <b>master</b>.</li>
<li>The clock reaches the master's enable <b>through a NOT gate</b> (master E = CLK′).</li>
<li>The second latch, the <b>servant</b>, gets the clock <b>without</b> the inverter (servant E = CLK). Its D comes from the master's Q, and its Q is the flip-flop's output.</li></ul>` },
        { type: 'callout', tone: 'warn', html: `The Class 17 Video 5 upload stops at 4:35, right after this block diagram is drawn. The hand-over below is standard material that completes the picture.` },
        { type: 'text', html: `<p><b>How the hand-over works</b> (supplemental):</p>
<ol><li><b>CLK = 0:</b> master enabled (transparent, follows D); servant disabled (holds Q).</li>
<li><b>Rising edge:</b> the master closes, freezing the value D had at that instant; the servant opens and copies it to Q.</li>
<li><b>CLK = 1:</b> the master is closed, so changes on D cannot get through; the servant passes the frozen value.</li></ol>
<p>Net effect: <b>Q takes the value of D at each rising edge and holds it until the next one.</b> Written as an equation, Q⁺ = D at every rising edge (the Q⁺ notation is standard, not the lecture's).</p>` },
        { type: 'diagram', diagram: tm([['CLK', LF_CLK], ['D', LF_D], ['Q (D latch, E = CLK)', LF_LATCH], ['Q (D flip-flop)', LF_FF]], true),
          caption: 'Same CLK and D, Q starting at 0. The latch follows D during every high phase; the flip-flop only changes at rising edges, taking D’s value at each edge: 0, 1, 0, 1.' },
        { type: 'text', html: `<p><b>Reset.</b> Every flip-flop also gets a special <b>reset</b> input. When reset becomes 1 (or on its rising edge) the content of the DFF becomes <b>0, no matter what is on D</b> — and without waiting for the clock. Later lectures call this the <b>asynchronous reset</b>.</p>` },
        { type: 'example', title: 'Read Q from a timing diagram',
          problem: 'Using the diagram above, what is the flip-flop’s Q after each of the four rising edges?',
          steps: ['Edge 1: D is 0 just before the edge → Q = 0.', 'Edge 2: D is 1 → Q = 1.', 'Edge 3: D is 0 → Q = 0 (D fell during the second high phase, but the flip-flop ignores it until this edge).', 'Edge 4: D is 1 → Q = 1.'],
          answer: 'Q = 0, 1, 0, 1 after edges 1–4' },
        { type: 'callout', tone: 'note', html: `<b>Supplemental:</b> a <b>negative-edge-triggered</b> flip-flop (drawn with a bubble on the clock input) samples D on the falling edge instead. All flip-flops in this course are positive-edge-triggered.` },
        { type: 'check', question: { id: 't6-l5-c1', type: 'mc', difficulty: 1, src: c('c18v1 00:00:34'),
          prompt: 'When does a (positive-edge) D flip-flop capture the value on D?',
          choices: ['At the rising edge of the clock', 'During the whole time CLK = 1', 'During the whole time CLK = 0', 'At the falling edge of the clock'],
          answer: 0,
          explanation: 'On the rising clock edge the value on the input is captured and stored. “Whole time CLK = 1” describes a D latch with CLK on its enable; the falling edge applies to negative-edge flip-flops.' } },
        { type: 'check', question: { id: 't6-l5-c2', type: 'tf', difficulty: 2, src: c('c17v5 00:02:58', 'c17v5 00:04:08'),
          prompt: 'In the master–servant D flip-flop, the master latch is enabled while CLK = 0.',
          answer: true,
          explanation: 'True. The clock reaches the master’s enable through a NOT gate, so the master is enabled when CLK = 0; the servant (enable = CLK) is enabled when CLK = 1.' } },
      ] },

    /* ---------------------------------------------------------------- 6. 4-bit register */
    { id: 't6-l6', subtopic: 't6-register', title: 'Building a 4-bit register', minutes: 8,
      src: c('c18v1 00:03:08', 'c18v1 00:04:22', 'c18v1 00:05:42', 'c18v1 00:09:39', 'c18v1 00:11:04', 'c18v1 00:13:55'),
      blocks: [
        { type: 'text', html: `<p>One D flip-flop stores one bit. A <b>register</b> stores a <b>group of bits</b> — a 4-bit register stores four, so it needs <b>four D flip-flops</b>. The point of a register is that all its bits are stored <b>simultaneously</b>, on the rising edge of the clock.</p>
<p>Storing the bits on the inputs into the register is called <b>loading the register</b>: updating its content with the data supplied on the inputs.</p>` },
        { type: 'text', html: `<p><b>Structure.</b> Flip-flop 0 (on the right) stores bit 0, flip-flop 1 stores bit 1, and so on: input D<sub>i</sub> goes to flip-flop i, which produces Q<sub>i</sub>. All flip-flops are identical; only their connections differ. Because they must all update at the same time, they <b>share a common clock</b>, and they also share a <b>common reset</b>.</p>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'register', label: '4-bit register', inputs: ['D3..0', 'reset'], outputs: ['Q3..0'], clock: true },
          caption: 'Block diagram: 4-bit input, clock, reset, 4-bit output.' },
        { type: 'example', title: 'The lecture’s loading example',
          problem: 'The register holds Q3..0 = 0000. The value 1001 is placed on D3..0 before the next rising edge. What happens?',
          steps: [
            'While CLK = 0, all four flip-flops hold their previous value: Q = 0000.',
            'The new data 1001 is supplied <i>before</i> the rising edge.',
            'At the rising edge every flip-flop captures its own bit: Q3 becomes 1, Q2 gets a new 0, Q1 gets a new 0, Q0 becomes 1.',
            'Q3..0 = 1001 from just after the edge, and it stays while CLK is 1 and after CLK returns to 0.',
            'The next rising edge is the next opportunity to load new data.'],
          answer: 'Q3..0 = 1001 after the edge' },
        { type: 'diagram', diagram: tm([['CLK', RG_CLK], ['D3', RG_D[3]], ['D2', RG_D[2]], ['D1', RG_D[1]], ['D0', RG_D[0]], ['Q3', RG_Q[3]], ['Q2', RG_Q[2]], ['Q1', RG_Q[1]], ['Q0', RG_Q[0]]], true),
          caption: 'D = 1001 is loaded at edge 1. D changes to 0110 during the first high phase, but Q waits for edge 2 to become 0110; edge 3 reloads the same 0110.' },
        { type: 'callout', tone: 'tip', html: `This <b>basic register</b> loads on <b>every</b> rising edge — the clock never stops, so there is no way to say “not now”. The load register in the next lesson adds that control.` },
        { type: 'check', question: { id: 't6-l6-c1', type: 'numeric', difficulty: 1, src: c('c18v1 00:04:22'),
          prompt: 'How many D flip-flops does an 8-bit register need?', answer: 8,
          steps: ['Each D flip-flop stores one bit.', '8 bits → 8 flip-flops.'],
          explanation: 'One flip-flop per bit, all sharing the clock and reset.' } },
        { type: 'check', question: { id: 't6-l6-c2', type: 'mc', difficulty: 1, src: c('c18v1 00:09:39'),
          prompt: 'Why do all the flip-flops in a register share one clock?',
          choices: ['So that every bit is updated simultaneously', 'To save one AND gate per bit', 'Because each flip-flop needs a different clock frequency', 'So that the bits are loaded one after another'],
          answer: 0,
          explanation: 'All bits of a register must be stored at the same moment, so the flip-flops share a common clock (and a common reset). Loading bits one after another is what a shift register does over several clocks — with the same shared clock.' } },
      ] },

    /* ---------------------------------------------------------------- 7. load register */
    { id: 't6-l7', subtopic: 't6-loadreg', title: 'The load register: choosing when to load', minutes: 9,
      src: c('c18v2 00:00:55', 'c18v2 00:02:10', 'c18v2 00:02:50', 'c18v2 00:04:28', 'c18v2 00:09:08', 'c18v2 00:10:43', 'c18v3 00:01:34'),
      blocks: [
        { type: 'text', html: `<p>The basic register loads on every positive clock edge, and the clock runs all the time — we have no control. The <b>load register</b> adds a control input <b>LD</b> (load):</p>
${tbl(['LD', 'at a rising edge', 'otherwise (CLK = 1, falling edge, CLK = 0)'], [['1', 'load: Q ← D', 'keep previous value'], ['0', 'keep previous value', 'keep previous value']])}
<p>The content changes <b>only when LD = 1 and there is a rising edge</b>.</p>` },
        { type: 'text', html: `<p><b>Implementation.</b> There are two options per bit — keep or load — so put a <b>2:1 multiplexer</b> in front of each flip-flop:</p>
<ul><li><b>I1</b> (selected when LD = 1) ← the external data bit D<sub>i</sub>;</li>
<li><b>I0</b> (selected when LD = 0) ← the flip-flop's own output Q<sub>i</sub>, so the old value is copied back in;</li>
<li>the mux output Y drives the flip-flop's D input; the select S of <b>every</b> mux is connected to the same LD.</li></ul>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'mux', label: '2:1', inputs: ['I0: Q0', 'I1: D0'], select: ['LD'], outputs: ['to DFF0 D'] },
          caption: 'Bit 0 of the load register; bits 1–3 are identical, all selects tied to LD.' },
        { type: 'text', html: `<p>As an equation (the 2:1 mux equation; the written form is standard): <span class="mono">Q<sub>i</sub>⁺ = LD′·Q<sub>i</sub> + LD·D<sub>i</sub></span>.</p>` },
        { type: 'example', title: 'The lecture’s example',
          problem: 'Reset the register, then: LD = 1 with D = 1100; then D = 0011; then LD = 0 with D = 1010. What does the register hold after each rising edge?',
          steps: [
            'Reset = 1 → the content becomes 0000 immediately, whatever the clock is doing.',
            'Reset = 0, LD = 1, D = 1100: every mux passes I1 = D, so the next rising edge stores 1100.',
            'D changes to 0011 (LD still 1): the next rising edge stores 0011.',
            'LD = 0, D = 1010: every mux now passes I0 = the current Q = 0011, so each following edge reloads 0011 — the 1010 on the inputs is ignored.'],
          answer: '1100, then 0011, then 0011 (held)' },
        { type: 'diagram', diagram: tm([['CLK', CK(4)], ['LD', held(LR_LD)], ...bitsAfter('Q', LR_Q, '0000')], true),
          caption: 'Starting from 0000: D = 1100, 0011, 1010, 1010 in the four periods. Q changes at the first two edges (LD = 1) and holds 0011 at the last two (LD = 0).' },
        { type: 'check', question: { id: 't6-l7-c1', type: 'mc', difficulty: 1, src: c('c18v2 00:02:50'),
          prompt: 'A load register has LD = 0 when a rising clock edge arrives. What happens to its content?',
          choices: ['It keeps the previous value', 'It loads the value on D', 'It clears to 0', 'It shifts one bit'],
          answer: 0,
          explanation: 'With LD = 0 each mux selects I0 = the flip-flop’s own Q, so the edge just stores the old value again. Loading needs LD = 1; clearing and shifting are functions of the multi-function registers later.' } },
        { type: 'check', question: { id: 't6-l7-c2', type: 'mc', difficulty: 2, src: c('c18v2 00:09:08'),
          prompt: 'In the load register, which multiplexer input is connected to the flip-flop’s own output Q<sub>i</sub>?',
          choices: ['I0 — selected when LD = 0', 'I1 — selected when LD = 1', 'The select input S', 'None — Q is never fed back'],
          answer: 0,
          explanation: 'To keep the value, the flip-flop’s Q is wired back to I0, which is chosen when LD = 0. I1 carries the new data D<sub>i</sub>; the select line carries LD.' } },
      ] },

    /* ---------------------------------------------------------------- 8. shifting */
    { id: 't6-l8', subtopic: 't6-shifting', title: 'Shifting: left, logical right, arithmetic right', minutes: 8,
      src: c('c18v3 00:06:09', 'c18v3 00:07:30', 'c18v3 00:09:24', 'c18v3 00:09:38', 'c18v3 00:11:52', 'c18v3 00:12:56'),
      blocks: [
        { type: 'text', html: `<p>Shifting moves every bit of a binary number one position. (For now we do not commit to whether the number is signed or unsigned.)</p>
<p><b>Shift left:</b> each bit moves one place toward the MSB. The old MSB is kicked out — it can be provided as a <b>carry out</b> — and a <b>0 is always shifted in</b> at the LSB. For shifting left it does not matter whether the number is unsigned or signed, or whether the shift is called arithmetic or logical.</p>
<p><b>Shift right:</b> each bit moves one place toward the LSB and the old LSB falls out. What goes into the MSB is the important difference:</p>
<ul><li><b>logical</b> shift right — always shift in <b>0</b>;</li>
<li><b>arithmetic</b> shift right — always <b>copy the MSB</b>.</li></ul>` },
        { type: 'diagram', diagram: { kind: 'bits', bits: '1010' }, caption: 'Start: 1010.' },
        { type: 'example', title: 'Shift 1010 right both ways',
          problem: 'Shift 1010 right by one bit, logically and arithmetically. Interpret the results as unsigned and as two’s complement.',
          steps: [
            'Drop the LSB (0) and move the other bits right: _101.',
            'Logical: put 0 in the MSB → 0101. Unsigned: 10 → 5 (÷2).',
            'Arithmetic: copy the old MSB (1) → 1101. Two’s complement: 1010 = −6 → 1101 = −3 (÷2, sign kept).',
            'The two results differ because the number is negative in two’s complement (MSB = 1).'],
          answer: 'logical 0101, arithmetic 1101' },
        { type: 'diagram', diagram: { kind: 'bits', bits: '1101' }, caption: '1010 after an arithmetic shift right: the MSB 1 was copied.' },
        { type: 'text', html: `<p>For unsigned numbers and for positive two's-complement numbers the MSB is 0, so “copy the MSB” also shifts in 0 — no visible difference. The difference shows up for <b>negative two's-complement</b> numbers.</p>
<p><b>Why both exist.</b> Logical shifting serves <b>strings of bits</b> that need not be numbers — e.g. a bit stream arriving over USB or Bluetooth that is read one bit at a time. Arithmetic shifting is for <b>numbers</b>: shifting left multiplies by 2, shifting right divides by 2, and the sign must be preserved or the value changes completely.</p>` },
        { type: 'callout', tone: 'warn', html: `<b>Supplemental details.</b> Arithmetic right shift of an odd negative number rounds toward −∞: 1011 (−5) → 1101 (−3). A left shift multiplies by 2 only if the result still fits: 4-bit 0110 (6) → 1100, which is −4 in two’s complement (overflow).` },
        { type: 'check', question: { id: 't6-l8-c1', type: 'short', difficulty: 1, src: c('c18v3 00:07:30'),
          prompt: 'Shift the 4-bit value 0011 left by one bit.', normalize: 'binary', width: 4, accept: ['0110'],
          steps: ['Move every bit one place left; the MSB 0 falls out.', 'Shift in 0 at the LSB: 0110.'],
          explanation: '0011 (3) becomes 0110 (6): a left shift doubles the value when nothing significant falls out.' } },
        { type: 'check', question: { id: 't6-l8-c2', type: 'short', difficulty: 2, src: c('c18v3 00:09:38'),
          prompt: 'Shift the 4-bit two’s-complement value 1100 arithmetically right by one bit.', normalize: 'binary', width: 4, accept: ['1110'],
          steps: ['Drop the LSB 0 and move the rest right: _110.', 'Arithmetic shift copies the MSB (1): 1110.', 'Check: 1100 = −4 and 1110 = −2, i.e. ÷2.'],
          explanation: 'Arithmetic right shift keeps the sign: −4 becomes −2. A logical shift would give 0110 (+6).' } },
      ] },

    /* ---------------------------------------------------------------- 9. multi-function registers */
    { id: 't6-l9', subtopic: 't6-multireg', title: 'Multi-function registers', minutes: 9,
      src: c('c19v1 00:00:54', 'c19v1 00:02:27', 'c19v1 00:03:18', 'c19v1 00:05:31', 'c19v1 00:06:49', 'c19v1 00:09:14', 'c19v1 00:11:14'),
      blocks: [
        { type: 'text', html: `<p>The asynchronous <b>reset</b> zeroes a register immediately. Sometimes we instead want to <b>clear</b> it <b>synchronously</b>: put all zeros into all flip-flops <i>on the clock edge</i>. A register that can do several such operations, chosen by control bits, is a <b>multi-function register</b>.</p>
<p>The lecture's example is a 2-bit register with <b>LD</b> (load) and <b>CLR</b> (clear), and a third function, <b>keep</b> the current value. Its <b>function table</b>:</p>
${tbl(['CLR', 'LD', 'function'], [['0', '0', 'keep'], ['0', '1', 'load'], ['1', '0', 'clear'], ['1', '1', 'keep']])}` },
        { type: 'text', html: `<p>Four rows means four options per bit, so each flip-flop gets a <b>4:1 mux</b> with selects S1, S0. Connect <b>CLR → S1</b> and <b>LD → S0</b>: then reading (CLR, LD) as a binary number gives exactly the mux input number 0, 1, 2, 3.</p>
${tbl(['mux input', '(CLR, LD)', 'connected to', 'function'], [['I0', '00', 'Q<sub>i</sub> (own output)', 'keep'], ['I1', '01', 'D<sub>i</sub> (external input)', 'load'], ['I2', '10', 'hard-coded 0', 'clear'], ['I3', '11', 'Q<sub>i</sub> (own output)', 'keep']])}` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'mux', label: '4:1', inputs: ['I0: Q1', 'I1: D1', 'I2: 0', 'I3: Q1'], select: ['S1 = CLR', 'S0 = LD'], outputs: ['to DFF1 D'] },
          caption: 'The mux in front of flip-flop 1; flip-flop 0 has the same mux with Q0 and D0.' },
        { type: 'text', html: `<p><b>Block diagram:</b> “2-bit multi-function register” with inputs D1..0, CLR, LD, an edge-triggered clock and the asynchronous reset, and outputs Q1..0. The block alone is <b>not enough</b> — it must come with the function table that says what each combination of CLR and LD does.</p>` },
        { type: 'example', title: 'Trace the 2-bit register',
          problem: 'Q1Q0 = 10. At four rising edges the controls are (CLR, LD, D1D0) = (0, 1, 01), (1, 1, 10), (1, 0, 11), (0, 0, 11). What is Q after each edge?',
          steps: ['(0, 1): mux input 1 = load → Q = 01.', '(1, 1): mux input 3 = keep → Q stays 01 (the 10 on D is ignored).', '(1, 0): mux input 2 = constant 0 → Q = 00 (synchronous clear).', '(0, 0): mux input 0 = keep → Q stays 00.'],
          answer: '01, 01, 00, 00' },
        { type: 'callout', tone: 'warn', html: `Function tables differ between designs. Many textbooks give <b>clear priority</b> (CLR = 1 clears whatever LD is); in the lecture’s table CLR = LD = 1 means <b>keep</b>. On an exam, use the table you are given.` },
        { type: 'check', question: { id: 't6-l9-c1', type: 'mc', difficulty: 2, src: c('c19v1 00:07:07', 'c19v1 00:09:14'),
          prompt: 'In the lecture’s multi-function register, (CLR, LD) = (1, 0). Which mux input reaches the flip-flops, and what is stored at the next edge?',
          choices: ['I2, the hard-coded 0 — the register is cleared', 'I1, the external data — the register loads', 'I0, the current value — the register keeps', 'I3, the current value — the register keeps'],
          answer: 0,
          explanation: 'CLR is S1 and LD is S0, so (1, 0) selects input 2, which is wired to constant 0: a synchronous clear. Input 1 (01) loads; inputs 0 and 3 (00 and 11) keep.' } },
        { type: 'check', question: { id: 't6-l9-c2', type: 'tf', difficulty: 2, src: c('c19v1 00:01:24', 'c19v1 00:05:04'),
          prompt: 'The synchronous clear (CLR) waits for a rising clock edge, while the asynchronous reset does not.',
          answer: true,
          explanation: 'True. CLR works through the mux, so its zeros are stored at the clock edge; the reset input acts on the flip-flops directly, regardless of the clock.' } },
      ] },

    /* ---------------------------------------------------------------- 10. shift registers */
    { id: 't6-l10', subtopic: 't6-shiftreg', title: 'Shift registers', minutes: 10,
      src: c('c19v2 00:00:19', 'c19v2 00:01:22', 'c19v2 00:03:02', 'c19v2 00:05:24', 'c19v2 00:06:41', 'c19v2 00:10:46', 'c19v2 00:11:22'),
      blocks: [
        { type: 'text', html: `<p>The lecture builds a <b>3-bit shift register</b> that can shift right by one bit or load. Function table (SHR = shift right, LD = load):</p>
${tbl(['SHR', 'LD', 'function'], [['0', '0', 'keep'], ['0', '1', 'load'], ['1', '0', 'shift right'], ['1', '1', 'keep']])}
<p>As before, four options → a <b>4:1 mux per flip-flop</b>, with <b>SHR → S1</b> and <b>LD → S0</b>.</p>` },
        { type: 'text', html: `<p>Mux connections for flip-flop i:</p>
${tbl(['input', 'connected to', 'why'], [['I0, I3', 'Q<sub>i</sub>', 'keep: copy the bit being updated'], ['I1', 'D<sub>i</sub>', 'load: external input'], ['I2', 'Q<sub>i+1</sub>', 'shift right: take the bit from the left neighbour']])}
<p>So flip-flop 0 gets Q1 and flip-flop 1 gets Q2. Flip-flop 2 (the MSB) has no left neighbour: its I2 is a data input called <b>shift right in (SRI)</b>. Q0, the bit that falls out, could be brought out as <b>shift right out</b>.</p>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'mux', label: '4:1', inputs: ['I0: Q1', 'I1: D1', 'I2: Q2', 'I3: Q1'], select: ['S1 = SHR', 'S0 = LD'], outputs: ['to DFF1 D'] },
          caption: 'The mux for flip-flop 1. For flip-flop 2, I2 is SRI; for flip-flop 0, I2 is Q1.' },
        { type: 'text', html: `<p><b>What should SRI be?</b> It depends on the kind of shift:</p>
<ul><li><b>logical</b> shift right → SRI = 0;</li>
<li><b>arithmetic</b> shift right → SRI = a copy of the MSB, i.e. connect <b>Q2</b> back to SRI.</li></ul>
<p>Block diagram: 3-bit shift register with inputs SRI (data), SHR and LD (control), D (3 bits), clock and asynchronous reset, output Q (3 bits) — plus its function table.</p>` },
        { type: 'example', title: 'Logical vs arithmetic, two shifts',
          problem: 'Q2Q1Q0 = 110 and (SHR, LD) = (1, 0) for two rising edges. Find Q with SRI = 0, and with SRI wired to Q2.',
          steps: ['SRI = 0: 110 → 011 (0 enters, the 0 in Q0 falls out) → 001.', 'SRI = Q2: at the first edge Q2 = 1 enters → 111; at the second edge Q2 = 1 enters again → 111.', 'As two’s complement, 110 = −2 → 111 = −1 → 111 = −1 (arithmetic ÷2, rounding toward −∞).'],
          answer: 'logical: 011, 001; arithmetic: 111, 111' },
        { type: 'diagram', diagram: tm([['CLK', CK(4)], ['SRI', held(SH_SRI)], ...bitsAfter('Q', SH_Q, '000')], true),
          caption: 'Serial input: SRI = 1, 0, 1, 1 in four periods with SHR = 1. Starting from 000, Q2Q1Q0 = 100, 010, 101, 110 — each bit enters at Q2 and moves one place right per edge.' },
        { type: 'text', html: `<p><b>Supplemental — serial vs. parallel.</b> Shift registers are often named by how data enters and leaves:</p>
${tbl(['name', 'in', 'out', 'typical use'], [['SISO', 'serial (1 bit per clock)', 'serial', 'delay line'], ['SIPO', 'serial', 'parallel (all bits at once)', 'serial → parallel: collect a bit stream into a word'], ['PISO', 'parallel load', 'serial', 'parallel → serial: send a word one bit at a time'], ['PIPO', 'parallel load', 'parallel', 'ordinary register']])}
<p>The lecture's register loads in parallel (D) and shifts in serially (SRI), so it can act as PIPO, SIPO (read Q) or PISO (read shift right out). These names are on the hub's final guide but not in the lectures.</p>` },
        { type: 'callout', tone: 'tip', html: `<b>The lecture’s closing question — shifting left.</b> Flip-flop i takes Q<sub>i−1</sub> (its right neighbour) and flip-flop 0 takes a shift-left-in bit. Since a left shift always shifts in 0 (Class 18 Video 3), shift-left-in = 0 for both logical and arithmetic shifting. (This answer is worked out here; the video leaves it for class.)` },
        { type: 'check', question: { id: 't6-l10-c1', type: 'mc', difficulty: 2, src: c('c19v2 00:05:24'),
          prompt: 'In the lecture’s 3-bit shift-right register, what is connected to input I2 of the mux in front of flip-flop 0?',
          choices: ['Q1', 'Q0', 'SRI', 'D0'],
          answer: 0,
          explanation: 'Shifting right moves the value in flip-flop 1 into flip-flop 0, so I2 of flip-flop 0’s mux is Q1. Q0 feeds its own I0/I3 (keep), D0 feeds I1 (load), and SRI feeds flip-flop 2.' } },
        { type: 'check', question: { id: 't6-l10-c2', type: 'short', difficulty: 2, src: c('c19v2 00:06:41'),
          prompt: 'Q2Q1Q0 = 011, SRI = 1, (SHR, LD) = (1, 0). What is Q2Q1Q0 after one rising edge?', normalize: 'binary', width: 3, accept: ['101'],
          steps: ['Shift right: Q1 → Q0 and Q2 → Q1, so Q1Q0 become 01.', 'SRI = 1 enters Q2.', 'Q = 101 (the old Q0 = 1 falls out).'],
          explanation: 'Each bit moves one place right and SRI fills the MSB.' } },
      ] },

    /* ---------------------------------------------------------------- 11. setup / hold / clock-to-Q */
    { id: 't6-l11', subtopic: 't6-timing', title: 'Setup time, hold time and clock-to-Q delay', minutes: 8,
      src: c('c19v3 00:00:06', 'c19v3 00:02:57', 'c19v3 00:04:04', 'c19v3 00:06:23', 'c19v3 00:07:39', 'c19v3 00:09:21'),
      blocks: [
        { type: 'text', html: `<p>So far we assumed <b>ideal timing</b>: put a value on D, and immediately after the rising edge it is stored and available on Q. Real flip-flops — like the adders and subtractors whose delays you modelled in the add/sub lab — need time. Problems and labs in this course still use ideal timing, but you must know the three <b>timing constraints</b>, all defined with respect to the <b>active (positive) clock edge</b>:</p>
<ul><li><b>Clock-to-Q delay, t<sub>CQ</sub></b> — the time needed <i>after</i> the active edge for the output Q to assume its new value. It is about the <b>output</b>.</li>
<li><b>Setup time, t<sub>setup</sub></b> — the minimum time the input must be <b>stable before</b> the active edge so that correct data is stored.</li>
<li><b>Hold time, t<sub>hold</sub></b> — the minimum time the input must stay <b>stable after</b> the active edge for the correct data to be stored.</li></ul>
<p>If these minimum times are not respected, <b>incorrect data may be stored</b>.</p>` },
        { type: 'diagram', diagram: tm([['CLK', '000000111111'], ['D', 'xxx1111xxxxx'], ['Q', '000000001111']]),
          caption: 'Illustration (1 slot = 1 time unit): D must be stable for t_setup = 3 units before the edge and t_hold = 1 unit after it (x = allowed to change). Q shows the new value t_CQ = 2 units after the edge.' },
        { type: 'text', html: `<p><b>Why they matter (supplemental).</b> The lecture says these times are used later to find how short a clock cycle can be. The standard result: data launched by one edge passes through the flip-flop (t<sub>CQ</sub>) and the combinational logic, and must arrive t<sub>setup</sub> before the next edge:</p>
<p class="mono">T<sub>CLK</sub> ≥ t<sub>CQ</sub> + t<sub>logic,max</sub> + t<sub>setup</sub>      f<sub>max</sub> = 1 / T<sub>min</sub></p>
<p>The hold constraint is t<sub>CQ</sub> + t<sub>logic,min</sub> ≥ t<sub>hold</sub>; it does not depend on the clock period, so slowing the clock cannot fix a hold violation.</p>` },
        { type: 'example', title: 'Maximum clock frequency (supplemental)',
          problem: 't<sub>CQ</sub> = 2 ns, the slowest path through the logic between two registers is 5 ns, t<sub>setup</sub> = 1 ns. What is the fastest clock?',
          steps: ['T<sub>min</sub> = t<sub>CQ</sub> + t<sub>logic</sub> + t<sub>setup</sub> = 2 + 5 + 1 = 8 ns.', 'f<sub>max</sub> = 1 / 8 ns = 0.125 × 10<sup>9</sup> Hz = 125 MHz.'],
          answer: '125 MHz' },
        { type: 'callout', tone: 'warn', html: `A setup or hold violation can leave a flip-flop <b>metastable</b> — the same “cannot settle” behavior Class 17 Video 3 described for the SR latch. (Linking the two is standard material.)` },
        { type: 'check', question: { id: 't6-l11-c1', type: 'mc', difficulty: 1, src: c('c19v3 00:05:29', 'c19v3 00:09:52'),
          prompt: 'Which timing parameter describes the flip-flop’s <b>output</b> rather than its input?',
          choices: ['Clock-to-Q delay t<sub>CQ</sub>', 'Setup time', 'Hold time', 'Duty cycle'],
          answer: 0,
          explanation: 't<sub>CQ</sub> is when Q becomes valid after the edge. Setup and hold are defined for the input signal; duty cycle describes the clock, not the flip-flop.' } },
        { type: 'check', question: { id: 't6-l11-c2', type: 'numeric', difficulty: 2, src: supp('Minimum clock period T ≥ t_CQ + t_logic + t_setup'),
          prompt: 't<sub>CQ</sub> = 1 ns, t<sub>logic,max</sub> = 6 ns, t<sub>setup</sub> = 1 ns. What is the minimum clock period, in ns?', answer: 8,
          steps: ['T<sub>min</sub> = t<sub>CQ</sub> + t<sub>logic,max</sub> + t<sub>setup</sub>', '= 1 + 6 + 1 = 8 ns'],
          explanation: 'The data must get out of the first flip-flop, through the logic, and be stable a setup time before the next edge. (Supplemental formula.)' } },
      ] },

    /* ---------------------------------------------------------------- 12. how counters work */
    { id: 't6-l12', subtopic: 't6-counters', title: 'How counters work', minutes: 8,
      src: c('c20v1 00:00:00', 'c20v1 00:01:39', 'c20v1 00:02:28', 'c20v1 00:03:21', 'c20v1 00:04:37', 'c20v1 00:05:20'),
      blocks: [
        { type: 'text', html: `<p><b>Counters</b> (and timers) are extensions of registers: they use a register to store the number counted so far. A counter can count <b>up</b> (0, 1, 2, …) or <b>down</b> (…, 2, 1, 0).</p>
<ul><li>Counting up: <b>next value = current value + 1</b> — adding one is an <b>increment</b> (an <b>incrementer</b> circuit).</li>
<li>Counting down: <b>next value = current value − 1</b> — a <b>decrement</b> (a <b>decrementer</b>).</li></ul>` },
        { type: 'example', title: 'What comes after 111 in a 3-bit up counter?',
          problem: 'A 3-bit up counter holds 111. What is its next value?',
          steps: ['next = 111 + 001.', 'Bit 0: 1 + 1 = 0, carry 1. Bit 1: 1 + 0 + 1 = 0, carry 1. Bit 2: 1 + 0 + 1 = 0, carry 1.', 'The sum is 1000, but the counter has only three bits: 000 is stored and the carry is discarded (some counters bring it out as a carry out).', 'So after 111 the counter starts again at 000, 001, … — it <b>wraps around</b>.'],
          answer: '000' },
        { type: 'diagram', diagram: { kind: 'arith', op: '+', rows: ['111', '001'], result: '1000' }, caption: 'Only the low three bits (000) are kept; the carry out is discarded.' },
        { type: 'example', title: 'What comes after 000 in a 3-bit down counter?',
          problem: 'Counting down: 010, 001, 000, … What comes next? (The lecture leaves 000 − 001 as self-study.)',
          steps: ['next = 000 − 001.', 'Subtract by adding the two’s complement: the two’s complement of 001 is 111.', '000 + 111 = 111 (no carry out here; any carry out would be discarded).', 'So the down counter wraps from 000 to 111, then continues 110, 101, …'],
          answer: '111' },
        { type: 'diagram', diagram: { kind: 'fsm', type: 'moore', layout: 'circle', initial: 's0',
          states: ['000', '001', '010', '011', '100', '101', '110', '111'].map((v, i) => ({ id: 's' + i, label: v, output: i === 7 ? '1' : '0' })),
          transitions: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ from: 's' + i, to: 's' + ((i + 1) % 8), label: '1' })) },
          caption: '3-bit up counter as a state diagram: one step per rising edge while counting is enabled (arrow label = count enable 1); state output = terminal count, 1 only in 111.' },
        { type: 'text', html: `<p>An n-bit up counter visits all 2<sup>n</sup> values and wraps, so it counts modulo 2<sup>n</sup>. <b>Supplemental:</b> a <b>mod-N</b> counter counts 0, 1, …, N−1 and then returns to 0 (e.g. a mod-10 “decade” counter); it needs ⌈log<sub>2</sub> N⌉ flip-flops.</p>` },
        { type: 'check', question: { id: 't6-l12-c1', type: 'short', difficulty: 1, src: c('c20v1 00:04:37'),
          prompt: 'A 3-bit up counter holds 111. What does it hold after the next counting edge?', normalize: 'binary', width: 3, accept: ['000'],
          steps: ['111 + 001 = 1000.', 'Keep three bits: 000 (the carry is discarded).'],
          explanation: 'The counter wraps around from its maximum value to 000.' } },
        { type: 'check', question: { id: 't6-l12-c2', type: 'short', difficulty: 2, src: c('c20v1 00:05:20', 'c20v1 00:05:57'),
          prompt: 'A 3-bit down counter holds 000. What does it hold after the next counting edge?', normalize: 'binary', width: 3, accept: ['111'],
          steps: ['000 − 001 = 000 + (two’s complement of 001).', 'Two’s complement of 001 = 110 + 1 = 111.', '000 + 111 = 111.'],
          explanation: 'Counting down wraps from 000 to 111.' } },
      ] },

    /* ---------------------------------------------------------------- 13. counter design (lecture) */
    { id: 't6-l13', subtopic: 't6-counterdesign', title: 'Designing a 3-bit up counter', minutes: 10,
      src: c('c20v2 00:00:08', 'c20v2 00:00:44', 'c20v2 00:01:05', 'c20v2 00:02:01', 'c20v2 00:04:09', 'c20v2 00:05:06', 'c20v2 00:06:54', 'c20v2 00:12:22'),
      blocks: [
        { type: 'text', html: `<p>The lecture designs a <b>3-bit counter that counts up</b>. It has no data inputs (nothing is loaded from outside), only control inputs:</p>
<ul><li><b>CLK</b> and <b>reset</b> — the asynchronous reset of the register inside: whenever reset becomes active everything goes to 0, independent of the clock;</li>
<li><b>CLR</b> — synchronous clear: if CLR = 1, the next positive clock edge puts all zeros in the counter;</li>
<li><b>CNT</b> — count: if CLR = 0 and CNT = 1, the counter increments by one at each edge.</li></ul>
<p>Outputs: <b>C</b> (3 bits, the content of the counter) and <b>TC</b>, <b>terminal count</b> (1 bit), which is 1 when the counter reaches its maximum value just before wrapping around.</p>` },
        { type: 'text', html: `<p><b>TC.</b> C goes 000, 001, 010, …, 110, 111, 000. TC must be 1 only for 111, so it is the minterm</p>
<p class="mono">TC = C2 · C1 · C0</p>
<p>(bits of a vector are accessed by index — C2 is bit 2).</p>` },
        { type: 'text', html: `<p><b>Inside.</b> Use the <b>multi-function register</b> with clear and load (here 3 bits wide):</p>
<ul><li>an <b>incrementer</b> takes the register's output Q2..0 and computes Q + 1, which goes to the register's D inputs;</li>
<li><b>CNT drives the register's LD</b>, so each edge with CNT = 1 loads Q + 1, and CNT = 0 keeps the count;</li>
<li><b>CLR</b> drives the register's CLR;</li>
<li>Q2..0 is the output C2..0, and a 3-input <b>AND gate</b> of Q2, Q1, Q0 produces TC.</li></ul>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'counter', label: '3-bit up counter', inputs: ['CLR', 'CNT', 'reset'], outputs: ['C2..0', 'TC'], clock: true },
          caption: 'Block diagram of the lecture’s counter.' },
        { type: 'example', title: 'Watch it count (the lecture’s walk-through)',
          problem: 'Start with CLR = 1, then CLR = 0 and CNT = 1. Follow C and TC over the first edges.',
          steps: [
            'CLR = 1 → at the edge Q = 000; so C = 000 and TC = 0 (0·0·0 = 0).',
            'CLR becomes 0: nothing happens by itself — the content stays 000.',
            'CNT = 1 makes LD = 1. The incrementer sees 000 and outputs 001.',
            'Next positive edge: 001 “hops inside” the register: Q = C = 001, TC still 0.',
            'Shortly after the edge the incrementer shows 010; with CLR = 0 and CNT = 1 still, the next edge stores 010 — and so on.',
            'At 111, TC = 1; the next edge stores 111 + 1 = 000 (wrap around) and TC returns to 0.'],
          answer: 'C = 000, 001, 010, …, 111 (TC = 1), 000, …' },
        { type: 'diagram', diagram: tm([['CLK', CK(9, 2)], ['CNT', held(CT_CNT, 2)], ...bitsAfter('C', CT_Q, '000', 2), ['TC', andW(...bitsAfter('C', CT_Q, '000', 2).map(s => s[1]))]], true),
          caption: 'CNT = 0 in the fourth period pauses the count at 011. TC is 1 only while C = 111.' },
        { type: 'callout', tone: 'warn', html: `<b>Corner case (worked out here, not in the video).</b> With the lecture’s multi-function register, (CLR, LD) = (1, 1) means <i>keep</i>. So asserting CLR while CNT = 1 would keep the count instead of clearing it. The walk-through uses CLR before counting starts; a counter that must clear at any time gives CLR priority, e.g. LD = CNT · CLR′.` },
        { type: 'check', question: { id: 't6-l13-c1', type: 'boolexpr', difficulty: 1, src: c('c20v2 00:04:09'),
          prompt: 'Write TC for the 3-bit up counter in terms of C2, C1, C0.', vars: ['C2', 'C1', 'C0'], answer: 'C2C1C0', maxLiterals: 3,
          steps: ['TC = 1 only in the last state before wrapping, 111.', 'The minterm for C2C1C0 = 111 is C2·C1·C0.'],
          explanation: 'Terminal count is 1 exactly when all three bits are 1.' } },
        { type: 'check', question: { id: 't6-l13-c2', type: 'mc', difficulty: 2, src: c('c20v2 00:12:22'),
          prompt: 'In the lecture’s counter, what happens at a rising edge when CLR = 0 and CNT = 0?',
          choices: ['The count is kept', 'The count increments', 'The counter clears to 000', 'TC is forced to 1'],
          answer: 0,
          explanation: 'CNT drives the register’s LD. With CLR = 0 and LD = 0 the register keeps its value, so counting pauses. Incrementing needs CNT = 1; clearing needs CLR = 1; TC only depends on the count.' } },
      ] },

    /* ---------------------------------------------------------------- 14. counter next-state logic (supplemental) */
    { id: 't6-l14', subtopic: 't6-counterdesign', title: 'Counter next-state logic, mod-N and ripple counters', minutes: 10,
      src: suppGuide('Designing a mod-N synchronous counter with D flip-flops, and ripple vs. synchronous counters,'),
      needsSource: NS_CLASS('the counter with load and the down counter built in class (Class 20 Video 2 at 14:44)'),
      blocks: [
        { type: 'callout', tone: 'note', html: `This lesson is <b>supplemental</b>: the hub’s final guide asks you to design a mod-N synchronous counter and to know ripple vs. synchronous counters, but the mirrored lectures build counters from a register and an incrementer instead.` },
        { type: 'text', html: `<p><b>Method.</b> With D flip-flops, the D input of each flip-flop simply equals the bit's next value: D<sub>i</sub> = Q<sub>i</sub>⁺. So (1) list present state → next state, (2) treat each next-state bit as a function of the present state, (3) minimize it. For a 3-bit up counter (mod 8):</p>` },
        { type: 'diagram', diagram: tt(['Q2', 'Q1', 'Q0'], [['D2 = Q2⁺', 'Q2 ⊕ Q1Q0'], ['D1 = Q1⁺', 'Q1 ⊕ Q0'], ['D0 = Q0⁺', "Q0'"]]),
          caption: 'Present state → next state of a 3-bit up counter (each row’s next state is the row number + 1, mod 8).' },
        { type: 'example', title: 'Read off the D equations (mod 8)',
          problem: 'Find D2, D1, D0 for the 3-bit up counter.',
          steps: ['Bit 0 flips at every count: D0 = Q0′.', 'Bit 1 flips when Q0 = 1 (a carry comes in): D1 = Q1 ⊕ Q0.', 'Bit 2 flips when Q1 = Q0 = 1: D2 = Q2 ⊕ Q1Q0.', 'In general D<sub>i</sub> = Q<sub>i</sub> ⊕ (Q<sub>i−1</sub>⋯Q<sub>0</sub>); with a count enable, D<sub>i</sub> = Q<sub>i</sub> ⊕ (CNT·Q<sub>i−1</sub>⋯Q<sub>0</sub>).'],
          answer: "D0 = Q0', D1 = Q1 ⊕ Q0, D2 = Q2 ⊕ Q1Q0" },
        { type: 'example', title: 'A mod-6 counter (0 → 5 → 0)',
          problem: 'Design D2, D1, D0 for a counter 000 → 001 → … → 101 → 000. States 110 and 111 never occur.',
          steps: [
            'Next state of s is (s + 1) mod 6: 0→1, 1→2, 2→3, 3→4, 4→5, 5→0.',
            'Unused states 6 and 7 are don’t-cares (X) in every map.',
            'D2 = 1 for present states 3 and 4 → Σm(3, 4) + d(6, 7) → group {3, 7} = Q1Q0 and {4, 6} = Q2Q0′: <b>D2 = Q1Q0 + Q2Q0′</b>.',
            'D1 = 1 for present states 1 and 2 → Σm(1, 2) + d(6, 7) → m1 has no 1/X neighbour, so it stays Q2′Q1′Q0; {2, 6} = Q1Q0′: <b>D1 = Q2′Q1′Q0 + Q1Q0′</b>.',
            'D0 = 1 for present states 0, 2, 4 → with X at 6 the group {0, 2, 4, 6} = Q0′: <b>D0 = Q0′</b>.',
            'Terminal count (1 at 101) with 6, 7 as don’t-cares: TC = C2C0.'],
          answer: "D2 = Q1Q0 + Q2Q0', D1 = Q2'Q1'Q0 + Q1Q0', D0 = Q0'" },
        { type: 'diagram', diagram: kmapOf(['Q2', 'Q1', 'Q0'], [3, 4], [6, 7], ['Q1Q0', "Q2Q0'"]), caption: 'D2 of the mod-6 counter.' },
        { type: 'diagram', diagram: kmapOf(['Q2', 'Q1', 'Q0'], [1, 2], [6, 7], ["Q2'Q1'Q0", "Q1Q0'"]), caption: 'D1 of the mod-6 counter.' },
        { type: 'text', html: `<p><b>Synchronous vs. ripple counters.</b> In a <b>synchronous</b> counter every flip-flop shares the same clock and changes at the same edge — the lecture's counter is synchronous. In a <b>ripple (asynchronous)</b> counter only the first flip-flop gets the clock; each later flip-flop is clocked by the previous flip-flop's output (typically toggle flip-flops). It needs no next-state logic, but each stage adds a delay, so the bits change one after another and the outputs briefly show wrong intermediate values.</p>` },
        { type: 'callout', tone: 'exam', html: `<b>Final-guide drill:</b> a 4-bit synchronous up counter with parallel load, using D flip-flops. Per bit, a mux chooses: LD → the external input, otherwise CNT → the incremented value, otherwise keep. Sketch CLK, LD, the parallel inputs and Q3..Q0, remembering that Q only changes at rising edges.` },
        { type: 'check', question: { id: 't6-l14-c1', type: 'boolexpr', difficulty: 2, src: supp('Next-state (D input) equation of a binary up counter'),
          prompt: 'For the 3-bit up counter built from D flip-flops, write D1 in terms of Q2, Q1, Q0 (⊕ allowed).', vars: ['Q2', 'Q1', 'Q0'], answer: 'Q1 ⊕ Q0',
          steps: ['Next bit 1 is 1 for present states 1, 2, 5, 6.', 'Bit 1 flips exactly when Q0 = 1 (carry from bit 0).', 'D1 = Q1 ⊕ Q0 (equivalently Q1′Q0 + Q1Q0′).'],
          explanation: 'Q2 does not matter for bit 1; any expression equivalent to Q1 ⊕ Q0 is accepted.' } },
        { type: 'check', question: { id: 't6-l14-c2', type: 'mc', difficulty: 2, src: supp('Ripple (asynchronous) counters'),
          prompt: 'What distinguishes a ripple counter from a synchronous counter?',
          choices: ['Each flip-flop after the first is clocked by the previous flip-flop’s output, so the bits change one after another', 'All flip-flops share one clock and change at the same edge', 'It counts in Gray code', 'It cannot wrap around'],
          answer: 0,
          explanation: 'In a ripple counter the clock “ripples” from stage to stage, adding delay per stage. Sharing one clock is the definition of a synchronous counter; Gray code and wrap-around are unrelated.' } },
      ] },

    /* ---------------------------------------------------------------- 15. timers */
    { id: 't6-l15', subtopic: 't6-timers', title: 'Timers', minutes: 10,
      src: c('c20v3 00:00:07', 'c20v3 00:00:59', 'c20v3 00:01:45', 'c20v3 00:05:03', 'c20v3 00:06:09', 'c20v3 00:08:13', 'c20v4 00:00:23', 'c20v4 00:06:45', 'c20v4 00:07:37', 'c20v4 00:09:46', 'c20v4 00:10:32'),
      blocks: [
        { type: 'text', html: `<p>A <b>timer</b> is a sequential circuit that generates a <b>pulse at a specified time interval</b>; the time can repeat, so it can mark repeating intervals. The pulse can last a <b>full clock cycle</b> (from the beginning of one cycle to the beginning of the next).</p>
<p>Every timer has a <b>counter</b> inside that counts <b>once per clock cycle</b>, so the clock rate sets the time per count — with a 1 µs oscillator, each count is 1 µs.</p>` },
        { type: 'text', html: `<p><b>The lecture's timer</b> (a 3-bit design):</p>
${tbl(['part', 'job'], [
  ['upper bound input', 'how many clock cycles each interval lasts, e.g. 5 = 101'],
  ['DEC (decrementer)', 'subtracts 1: counting N−1, …, 1, 0 gives exactly N counts'],
  ['3-bit load register (LD, CLK)', 'stores N−1 once, so it can be reused for every interval'],
  ['2:1 mux, select = LD', 'LD = 1: pass the DEC output straight to the counter; LD = 0: pass the stored value'],
  ['3-bit count-down counter with load', 'designed in class; counts down while CNT = 1; its load input is LD OR TC'],
  ['T output', 'TC of the counter: 1 when the count reaches 000'],
])}` },
        { type: 'example', title: 'Upper bound 5 with a 1 µs clock',
          problem: 'Load the upper bound 5 (101) and count. What does the counter do, and what does T look like?',
          steps: [
            'DEC turns 101 into 100 (= 4).',
            'Put LD = 1: the mux passes 100 directly and the counter’s load is 1, so at the first rising edge both the load register and the counter get 100.',
            'Drop LD to 0. Now the mux passes the stored 100, and while TC = 0 the counter’s load (LD OR TC) is 0, so with CNT = 1 it counts down.',
            'Every 1 µs: 100 → 011 → 010 → 001 → 000. At 000, TC = 1: T pulses.',
            'TC = 1 makes the counter’s load 1, so the next edge reloads 100 and TC returns to 0 — and it starts again.',
            'T is 1 for one 1 µs cycle out of every 5 cycles: a pulse every 5 µs.'],
          answer: 'C = 100, 011, 010, 001, 000 (T = 1), 100, …; one 1 µs pulse every 5 µs' },
        { type: 'diagram', diagram: tm([['CLK (1 µs)', CK(11, 2)], ['LD', held(TM_LD, 2)], ...bitsAfter('C', TM_Q, 'xxx', 2), ['T = TC', andW(...bitsAfter('C', TM_Q, 'xxx', 2).map(s => notW(s[1])))]], true),
          caption: 'Upper bound 5: the counter is loaded with 100 at the first edge, counts 011, 010, 001, 000 and reloads. T is high for exactly one clock period every 5 periods (x = unknown before the first load).' },
        { type: 'text', html: `<p><b>Why the peculiar parts?</b></p>
<ul><li><b>Decrementer</b> — we want N counts, and since 0 is counted too, we start at N − 1.</li>
<li><b>Load register</b> — the starting value is saved there, so after the external LD drops to 0 it is reused over and over.</li>
<li><b>Mux</b> — loading the register needs a rising edge, but we want the counter to start at the <i>first</i> edge too; on that first edge the counter takes the DEC output directly.</li></ul>
<p>Counting from 7 to 0 (or 0 to 7) would be simpler — no load needed — but this design works for <b>any upper bound</b> up to the largest number the bits can represent.</p>` },
        { type: 'example', title: 'Choosing the count (supplemental arithmetic)',
          problem: 'With a 50 MHz clock, how would you get a pulse every 1 ms?',
          steps: ['T<sub>CLK</sub> = 1 / 50 MHz = 20 ns.', 'N = 1 ms / 20 ns = 10<sup>−3</sup> / (20 × 10<sup>−9</sup>) = 50,000 cycles.', 'Load N − 1 = 49,999 into the down counter.', 'Bits: 2<sup>15</sup> = 32,768 ≤ 49,999 &lt; 65,536 = 2<sup>16</sup>, so a 16-bit counter.'],
          answer: 'Upper bound 50,000 (load 49,999); 16-bit counter' },
        { type: 'check', question: { id: 't6-l15-c1', type: 'numeric', difficulty: 2, src: c('c20v4 00:09:46'),
          prompt: 'In the lecture’s timer the upper bound is set to 6. What value (decimal) is loaded into the count-down counter?', answer: 5,
          steps: ['The decrementer subtracts 1 from the upper bound.', '6 − 1 = 5 (101).', 'Counting 5, 4, 3, 2, 1, 0 gives 6 counts.'],
          explanation: 'N counts need a start value of N − 1 because 0 is counted too.' } },
        { type: 'check', question: { id: 't6-l15-c2', type: 'mc', difficulty: 2, src: c('c20v4 00:10:32'),
          prompt: 'Why does the lecture’s timer have a mux between the load register and the counter?',
          choices: ['So the counter can be loaded at the very first edge, without waiting a cycle for the load register', 'To subtract 1 from the upper bound', 'To divide the clock frequency by two', 'To turn the down counter into an up counter'],
          answer: 0,
          explanation: 'The load register only has the value after a rising edge. With LD = 1 the mux passes the decrementer’s output directly, so the counter starts at the same edge. Subtracting 1 is the decrementer’s job.' } },
      ] },

    /* ---------------------------------------------------------------- 16. JK and T flip-flops (supplemental) */
    { id: 't6-l16', subtopic: 't6-jkt', title: 'JK and T flip-flops (supplemental)', minutes: 8,
      src: suppGuide('JK and T flip-flops and excitation tables'),
      blocks: [
        { type: 'callout', tone: 'note', html: `<b>Supplemental.</b> The hub’s final guide lists edge-triggered D, JK and T flip-flops, but the mirrored Topic 6 lectures cover only latches and D flip-flops. This lesson gives the standard definitions.` },
        { type: 'text', html: `<p>A <b>JK flip-flop</b> is like an SR latch with an edge-triggered clock, except that J = K = 1 is allowed: it <b>toggles</b>.</p>
${tbl(['J', 'K', 'Q⁺', 'action'], [['0', '0', 'Q', 'hold'], ['0', '1', '0', 'reset'], ['1', '0', '1', 'set'], ['1', '1', 'Q′', 'toggle']])}
<p class="mono">Q⁺ = J·Q′ + K′·Q</p>` },
        { type: 'diagram', diagram: tt(['J', 'K', 'Q'], [['Q⁺', "JQ' + K'Q"]]), caption: 'JK characteristic table with the present Q as an input.' },
        { type: 'diagram', diagram: { kind: 'component', shape: 'jkff', inputs: ['J', 'K'], outputs: ['Q', QN], clock: true }, caption: 'JK flip-flop.' },
        { type: 'text', html: `<p>A <b>T (toggle) flip-flop</b> has one input: T = 0 holds, T = 1 toggles at each rising edge.</p>
<p class="mono">Q⁺ = T ⊕ Q</p>
<p>Build one from a D flip-flop with D = T ⊕ Q, or from a JK flip-flop with J = K = T.</p>` },
        { type: 'diagram', diagram: { kind: 'component', shape: 'tff', inputs: ['T'], outputs: ['Q'], clock: true }, caption: 'T flip-flop.' },
        { type: 'text', html: `<p><b>Excitation tables</b> answer the design question “which input do I need to get from Q to Q⁺?” (X = don't care):</p>
${tbl(['Q → Q⁺', 'D', 'T', 'J K', 'S R'], [['0 → 0', '0', '0', '0 X', '0 X'], ['0 → 1', '1', '1', '1 X', '1 0'], ['1 → 0', '0', '1', 'X 1', '0 1'], ['1 → 1', '1', '0', 'X 0', 'X 0']])}` },
        { type: 'diagram', diagram: tm([['CLK', TF_CLK], ['T', TF_T], ['Q', TF_Q]], true),
          caption: 'With T = 1 the flip-flop toggles at every rising edge, so Q has half the clock frequency.' },
        { type: 'example', title: 'Counter inputs with T flip-flops',
          problem: 'Which T inputs make three T flip-flops count up (Q2Q1Q0)?',
          steps: ['Bit 0 changes at every count → T0 = 1.', 'Bit 1 changes when Q0 = 1 → T1 = Q0.', 'Bit 2 changes when Q1 = Q0 = 1 → T2 = Q1Q0.'],
          answer: 'T0 = 1, T1 = Q0, T2 = Q1Q0' },
        { type: 'check', question: { id: 't6-l16-c1', type: 'mc', difficulty: 1, src: supp('JK flip-flop characteristic table'),
          prompt: 'A JK flip-flop has J = 1, K = 1 at a rising edge. What happens?',
          choices: ['Q toggles', 'Q is set to 1', 'Q is reset to 0', 'The input is forbidden'],
          answer: 0,
          explanation: 'JK = 11 toggles (Q⁺ = Q′). Unlike the SR latch, the JK flip-flop has no forbidden input. JK = 10 sets and 01 resets.' } },
        { type: 'check', question: { id: 't6-l16-c2', type: 'short', difficulty: 2, src: supp('T flip-flop behavior'),
          prompt: 'A T flip-flop starts at Q = 0. At four rising edges T = 1, 0, 1, 1. Type Q after each edge as a 4-bit string (first edge first).', normalize: 'binary', width: 4, accept: ['1101'],
          steps: ['Edge 1: T = 1 → toggle 0 → 1.', 'Edge 2: T = 0 → hold 1.', 'Edge 3: T = 1 → toggle 1 → 0.', 'Edge 4: T = 1 → toggle 0 → 1.', 'Q after the edges: 1, 1, 0, 1 → 1101.'],
          explanation: 'T = 1 toggles, T = 0 holds.' } },
      ] },
  ];

  /* ================================================================== flashcards */
  const flashcards = [
    /* t6-intro */
    { id: 't6-f1', subtopic: 't6-intro', src: c('c17v1 00:04:09'), front: 'Combinational circuit — what is its output a function of?',
      back: 'Only its <b>current inputs</b>. Lecture picture: water through a pipe — nothing can be stored or accumulated, so what goes in determines what comes out now.' },
    { id: 't6-f2', subtopic: 't6-intro', src: c('c17v1 00:05:01', 'c17v1 00:05:41'), front: 'Sequential circuit — what is its output a function of?',
      back: 'The <b>inputs and the current state</b>.' },
    { id: 't6-f3', subtopic: 't6-intro', src: c('c17v1 00:06:03', 'c17v1 00:07:55'), front: 'Where does a sequential circuit’s <b>current state</b> come from, and where is it kept?',
      back: 'It is reached through the <b>past sequence of input values</b> and is stored in a <b>memory element</b>.' },
    { id: 't6-f4', subtopic: 't6-intro', src: c('c17v1 00:07:55', 'c17v1 00:09:49'), front: 'The two boxes of the sequential-circuit block diagram, and what flows between them',
      back: '<b>Memory element</b> (holds the current state) and <b>combinational logic</b>. The logic takes the outside inputs + the current state, produces the outputs, and updates the state stored in memory.' },
    { id: 't6-f5', subtopic: 't6-intro', src: c('c17v1 00:13:44', 'c17v1 00:15:00'), front: 'Synchronous vs. asynchronous sequential circuits',
      back: '<b>Synchronous:</b> inputs affect behavior/outputs only at <b>discrete instants of time</b> (set by a clock — the “conductor”).<br><b>Asynchronous:</b> inputs can affect them at <b>any time</b>.' },
    { id: 't6-f6', subtopic: 't6-intro', src: c('c17v1 00:01:06', 'c17v1 00:03:26'), front: 'Why do everyday gadgets need sequential logic?',
      back: 'They must send, receive, <b>store, retrieve</b> and process information; storing needs a memory element, which combinational logic cannot provide.' },

    /* t6-clock */
    { id: 't6-f7', subtopic: 't6-clock', src: c('c17v2 00:00:37', 'c17v2 00:01:46'), front: 'What does the clock (CLK) do in a synchronous sequential circuit?',
      back: 'A clock generator produces clock pulses (clock cycles) that <b>determine when data is stored</b>, keeping every part synchronized.' },
    { id: 't6-f8', subtopic: 't6-clock', src: c('c17v2 00:03:18', 'c17v2 00:03:28'), front: 'Relation between clock period and clock frequency',
      back: '<span class="mono">T<sub>CLK</sub> = 1 / f<sub>CLK</sub></span> — e.g. 10 ns ↔ 100 MHz, 1 µs ↔ 1 MHz.' },
    { id: 't6-f9', subtopic: 't6-clock', src: c('c17v2 00:05:05', 'c17v2 00:05:20'), front: 'Duty cycle',
      back: 'The <b>fraction of the period in which the signal is active</b> (equal to 1). It can be 50%, 10%, 90% or anything in between.',
      backDiagram: tm([['50%', CK(3)], ['25%', '0001'.repeat(3)]]) },
    { id: 't6-f10', subtopic: 't6-clock', src: c('c17v5 00:00:23'), front: 'Rising (positive) edge',
      back: 'The moment the clock goes from <b>0 to 1</b>. Course flip-flops capture data here.' },
    { id: 't6-f11', subtopic: 't6-clock', src: c('c18v2 00:03:09', 'c18v3 00:01:12'), front: 'Falling (negative) edge',
      back: 'The moment the clock goes from <b>1 to 0</b>. A positive-edge flip-flop ignores it (a load register keeps its value).' },

    /* t6-srlatch */
    { id: 't6-f12', subtopic: 't6-srlatch', src: c('c17v3 00:00:13', 'c17v3 00:01:31'), front: 'SR latch: inputs and outputs',
      back: 'Stores 1 bit. Inputs <b>S</b> (set) and <b>R</b> (reset); output <b>Q</b> (the stored bit), also available complemented as <b>Q′</b>.',
      backDiagram: { kind: 'component', shape: 'srlatch', inputs: ['S', 'R'], outputs: ['Q', QN] } },
    { id: 't6-f13', subtopic: 't6-srlatch', src: c('c17v3 00:05:41', 'c17v3 00:06:18'), front: 'SR latch with SR = 10, and with SR = 01',
      back: '<b>10 → set</b>: Q = 1, Q′ = 0.<br><b>01 → reset</b>: Q = 0, Q′ = 1.' },
    { id: 't6-f14', subtopic: 't6-srlatch', src: c('c17v3 00:07:13', 'c17v3 00:07:30'), front: 'SR latch with SR = 00',
      back: '<b>Keeps the previous value</b>: Q stays 1 after a set, stays 0 after a reset.' },
    { id: 't6-f15', subtopic: 't6-srlatch', src: c('c17v3 00:08:49', 'c17v3 00:09:11'), front: 'NOR SR latch with SR = 11',
      back: '<b>Forbidden.</b> Q = Q′ = 0 (not complements), and releasing both to 0 together can make the latch metastable. Rule: never apply 1, 1.' },
    { id: 't6-f16', subtopic: 't6-srlatch', src: c('c17v3 00:10:10', 'c17v3 00:10:28'), front: 'Metastability (SR latch)',
      back: 'After SR = 11 goes to 00, the cross-coupled gates keep reacting to each other and the latch <b>cannot settle</b> into one state.' },
    { id: 't6-f17', subtopic: 't6-srlatch', src: c('c17v3 00:03:30', 'c17v3 00:04:20'), front: 'Gate-level structure of the NOR SR latch',
      back: 'Two <b>cross-coupled NOR gates</b>: S into one gate (output Q′), R into the other (output Q); each output feeds an input of the other gate.' },
    { id: 't6-f18', subtopic: 't6-srlatch', src: supp('NAND (S′R′) latch'), front: 'NAND-based SR latch (supplemental)',
      back: '<b>Active-low</b> inputs S′, R′: 01 sets, 10 resets, <b>11 holds</b>, <b>00 forbidden</b> (Q = Q′ = 1).' },
    { id: 't6-f19', subtopic: 't6-srlatch', src: supp('SR characteristic equation'), front: 'SR latch characteristic equation (supplemental)',
      back: '<span class="mono">Q⁺ = S + R′Q</span>, valid when SR ≠ 11 (11 is a don’t-care).' },
    { id: 't6-f20', subtopic: 't6-srlatch', src: suppGuide('The gated SR latch'), front: 'Gated SR latch (supplemental)',
      back: 'S and R are each ANDed with an enable E, so the latch only responds while E = 1. The D latch is a gated latch with R = D′.' },

    /* t6-dlatch */
    { id: 't6-f21', subtopic: 't6-dlatch', src: c('c17v4 00:00:54', 'c17v4 00:01:33'), front: 'D latch: inputs and output',
      back: '<b>D</b> = data (the bit to store), <b>E</b> = enable; output <b>Q</b> = the stored bit.',
      backDiagram: { kind: 'component', shape: 'dlatch', inputs: ['D', 'E'], outputs: ['Q', QN] } },
    { id: 't6-f22', subtopic: 't6-dlatch', src: c('c17v4 00:03:24', 'c17v4 00:04:01'), front: 'What is inside a D latch?',
      back: 'An SR latch fed by two AND gates and an inverter: <span class="mono">S = E·D</span>, <span class="mono">R = E·D′</span>.' },
    { id: 't6-f23', subtopic: 't6-dlatch', src: c('c17v4 00:05:21', 'c17v4 00:06:18'), front: 'D latch with E = 0',
      back: 'Both ANDs give 0 → SR = 00 → <b>keeps the previous value</b>; D does not matter.' },
    { id: 't6-f24', subtopic: 't6-dlatch', src: c('c17v4 00:08:37', 'c17v4 00:08:54'), front: 'D latch with E = 1',
      back: 'Q is a <b>copy of D</b> (transparent): D = 0 resets, D = 1 sets.' },
    { id: 't6-f25', subtopic: 't6-dlatch', src: c('c17v4 00:01:16', 'c17v4 00:04:01'), front: 'Why is the D latch more robust than the SR latch?',
      back: 'Because S = E·D and R = E·D′ can never both be 1, the forbidden SR = 11 can never occur.' },
    { id: 't6-f26', subtopic: 't6-dlatch', src: c('c17v4 00:10:48', 'c17v4 00:11:46'), front: 'Problem with a D latch whose enable is the clock',
      back: 'It stores during the <b>whole time CLK = 1</b> (level-sensitive); if D changes many times in that window, Q follows every change. Fix: sample only at the rising edge → flip-flop.' },

    /* t6-dff */
    { id: 't6-f27', subtopic: 't6-dff', src: c('c17v5 00:00:08', 'c17v5 00:00:58'), front: 'D flip-flop (DFF)',
      back: 'Inputs D and CLK, output Q. It samples D <b>only at the rising clock edge</b> and stores it until the next rising edge.',
      backDiagram: { kind: 'component', shape: 'dff', inputs: ['D'], outputs: ['Q'], clock: true } },
    { id: 't6-f28', subtopic: 't6-dff', src: c('c17v5 00:01:27', 'c17v5 00:02:07', 'c17v5 00:02:58'), front: 'Master–servant D flip-flop: how are the two latches connected?',
      back: 'Two cascaded D latches. External D → <b>master</b>, whose enable is <b>CLK′</b> (through a NOT). Master Q → <b>servant</b>, whose enable is <b>CLK</b>. Servant Q = flip-flop output.' },
    { id: 't6-f29', subtopic: 't6-dff', src: supp('Master–servant (master–slave) operation'), needsSource: NS_DFF,
      front: 'Master–servant flip-flop: what happens in each clock phase? (supplemental — the video is cut off)',
      back: 'CLK = 0: master follows D, servant holds. Rising edge: master freezes D, servant copies it. CLK = 1: master closed, D changes are blocked. → Q takes D at the rising edge.' },
    { id: 't6-f30', subtopic: 't6-dff', src: c('c17v4 00:12:37', 'c17v5 00:00:08'), front: 'Latch vs. flip-flop',
      back: '<b>Latch:</b> level-sensitive — follows D the whole time its enable is 1.<br><b>Flip-flop:</b> edge-triggered — takes D only at the clock edge.',
      backDiagram: tm([['CLK', LF_CLK], ['D', LF_D], ['latch Q', LF_LATCH], ['flip-flop Q', LF_FF]], true) },
    { id: 't6-f31', subtopic: 't6-dff', src: c('c18v1 00:01:27', 'c18v1 00:01:47', 'c20v2 00:00:44'), front: 'Flip-flop reset input',
      back: 'When reset = 1 (or on its rising edge) the stored value becomes <b>0 no matter what D is</b>, without waiting for the clock — an <b>asynchronous</b> reset.' },
    { id: 't6-f32', subtopic: 't6-dff', src: c('c18v1 00:00:34'), front: 'D flip-flop characteristic (what Q becomes)',
      back: 'At each rising edge <span class="mono">Q⁺ = D</span>; between edges Q holds. (Q⁺ notation is standard shorthand.)' },
    { id: 't6-f33', subtopic: 't6-dff', src: supp('Negative-edge-triggered flip-flops'), front: 'Negative-edge-triggered flip-flop (supplemental)',
      back: 'Samples D on the <b>falling</b> (1 → 0) edge; drawn with a bubble on the clock input.' },

    /* t6-register */
    { id: 't6-f34', subtopic: 't6-register', src: c('c18v1 00:03:08', 'c18v1 00:04:47'), front: 'Register',
      back: 'Stores a <b>group of bits</b>, all stored <b>simultaneously</b> on the rising clock edge.' },
    { id: 't6-f35', subtopic: 't6-register', src: c('c18v1 00:04:22', 'c18v1 00:07:05'), front: 'How many D flip-flops does an n-bit register need?',
      back: '<b>n</b> — one flip-flop per bit (flip-flop i stores bit i).' },
    { id: 't6-f36', subtopic: 't6-register', src: c('c18v1 00:09:39', 'c18v1 00:10:05'), front: 'What do all flip-flops of a register share, and why?',
      back: 'A <b>common clock</b> (so all bits update simultaneously) and a <b>common reset</b>.' },
    { id: 't6-f37', subtopic: 't6-register', src: c('c18v1 00:05:42', 'c18v1 00:06:05'), front: '“Loading” a register',
      back: 'Updating its content with the data supplied on its inputs (D3..0 → Q3..0 at the rising edge).' },
    { id: 't6-f38', subtopic: 't6-register', src: c('c18v2 00:00:19', 'c18v2 00:01:31'), front: 'Basic register — its limitation',
      back: 'It loads on <b>every</b> positive clock edge, and the clock always runs, so there is no control over when data is stored.' },

    /* t6-loadreg */
    { id: 't6-f39', subtopic: 't6-loadreg', src: c('c18v2 00:02:10', 'c18v2 00:02:36'), front: 'Load register: when does its content change?',
      back: 'Only when <b>LD = 1 and a rising clock edge</b> occur together. LD = 0 at an edge, or no edge at all → keep.' },
    { id: 't6-f40', subtopic: 't6-loadreg', src: c('c18v2 00:04:44', 'c18v2 00:09:08', 'c18v2 00:10:43'), front: 'Load register: how is it built?',
      back: 'A <b>2:1 mux</b> in front of each D flip-flop: I1 = D<sub>i</sub> (load), I0 = Q<sub>i</sub> fed back (keep), select = LD (shared by all muxes).',
      backDiagram: { kind: 'component', shape: 'mux', label: '2:1', inputs: ['I0: Qi', 'I1: Di'], select: ['LD'], outputs: ['to DFFi D'] } },
    { id: 't6-f41', subtopic: 't6-loadreg', src: supp('The 2:1-mux next-state equation of a load-register bit'), front: 'Next-state equation of one load-register bit',
      back: '<span class="mono">Q<sub>i</sub>⁺ = LD′·Q<sub>i</sub> + LD·D<sub>i</sub></span>' },
    { id: 't6-f42', subtopic: 't6-loadreg', src: c('c18v3 00:03:46', 'c18v3 00:04:24'), front: 'Load register holds 0011; LD = 0 and D = 1010 at the next edge. Result?',
      back: 'Still <b>0011</b>: every mux selects I0 (the current Q), so the inputs are ignored.' },

    /* t6-shifting */
    { id: 't6-f43', subtopic: 't6-shifting', src: c('c18v3 00:06:48', 'c18v3 00:07:30'), front: 'Shift left: what falls out and what goes in?',
      back: 'The <b>MSB</b> falls out (can be a carry out); a <b>0 is always shifted in</b> at the LSB — for signed and unsigned, arithmetic and logical alike.' },
    { id: 't6-f44', subtopic: 't6-shifting', src: c('c18v3 00:09:24'), front: 'Logical shift right',
      back: 'LSB falls out; <b>0</b> is shifted into the MSB.' },
    { id: 't6-f45', subtopic: 't6-shifting', src: c('c18v3 00:09:38'), front: 'Arithmetic shift right',
      back: 'LSB falls out; the <b>MSB is copied</b> (sign preserved).' },
    { id: 't6-f46', subtopic: 't6-shifting', src: c('c18v3 00:10:16', 'c18v3 00:11:52'), front: 'When do logical and arithmetic right shifts give different results?',
      back: 'Only for <b>negative two’s-complement</b> numbers (MSB = 1). For unsigned and positive numbers both shift in 0.' },
    { id: 't6-f47', subtopic: 't6-shifting', src: c('c18v3 00:12:56', 'c18v3 00:13:16'), front: 'Arithmetic shifts as arithmetic',
      back: 'Shift left = <b>× 2</b>; shift right = <b>÷ 2</b>, keeping the sign.' },
    { id: 't6-f48', subtopic: 't6-shifting', src: c('c18v3 00:12:21', 'c18v3 00:12:56'), front: 'What is logical shifting for?',
      back: 'Strings of bits that need not be numbers — e.g. a bit stream over USB or Bluetooth read one bit at a time.' },

    /* t6-multireg */
    { id: 't6-f49', subtopic: 't6-multireg', src: c('c19v1 00:00:54', 'c19v1 00:01:24', 'c19v1 00:05:04'), front: 'Synchronous clear (CLR) vs. asynchronous reset',
      back: '<b>CLR:</b> zeros are put in all flip-flops <b>at the clock edge</b> (through the mux).<br><b>Reset:</b> zeros immediately, independent of the clock.' },
    { id: 't6-f50', subtopic: 't6-multireg', src: c('c19v1 00:03:18', 'c19v1 00:03:55'), front: 'Lecture’s multi-function register: function table (CLR, LD)',
      back: tbl(['CLR', 'LD', 'function'], [['0', '0', 'keep'], ['0', '1', 'load'], ['1', '0', 'clear'], ['1', '1', 'keep']]) },
    { id: 't6-f51', subtopic: 't6-multireg', src: c('c19v1 00:05:31', 'c19v1 00:07:47', 'c19v1 00:09:14'), front: 'Multi-function register: what feeds the 4:1 mux inputs of bit i?',
      back: 'I0 = Q<sub>i</sub> (keep), I1 = D<sub>i</sub> (load), I2 = constant 0 (clear), I3 = Q<sub>i</sub> (keep).',
      backDiagram: { kind: 'component', shape: 'mux', label: '4:1', inputs: ['I0: Qi', 'I1: Di', 'I2: 0', 'I3: Qi'], select: ['S1 = CLR', 'S0 = LD'], outputs: ['to DFFi D'] } },
    { id: 't6-f52', subtopic: 't6-multireg', src: c('c19v1 00:06:49', 'c19v1 00:07:07'), front: 'Why connect CLR → S1 and LD → S0?',
      back: 'Then (CLR, LD) read as a binary number is exactly the mux input number 0–3 of the function-table row.' },
    { id: 't6-f53', subtopic: 't6-multireg', src: c('c19v1 00:11:14', 'c19v1 00:11:31'), front: 'Is a block diagram enough to describe a multi-function register?',
      back: 'No — it must come with the <b>function table</b> saying what each control combination does.' },

    /* t6-shiftreg */
    { id: 't6-f54', subtopic: 't6-shiftreg', src: c('c19v2 00:01:22', 'c19v2 00:01:38', 'c19v2 00:03:02'), front: 'Lecture’s 3-bit shift register: function table (SHR, LD)',
      back: tbl(['SHR', 'LD', 'function'], [['0', '0', 'keep'], ['0', '1', 'load'], ['1', '0', 'shift right'], ['1', '1', 'keep']]) },
    { id: 't6-f55', subtopic: 't6-shiftreg', src: c('c19v2 00:05:24', 'c19v2 00:06:16', 'c19v2 00:06:41'), front: 'Shift-right register: what feeds mux input I2 of flip-flop i?',
      back: '<b>Q<sub>i+1</sub></b>, the bit to its left (flip-flop 0 gets Q1, flip-flop 1 gets Q2); the MSB flip-flop gets <b>SRI</b>.' },
    { id: 't6-f56', subtopic: 't6-shiftreg', src: c('c19v2 00:10:46', 'c19v2 00:11:00', 'c19v2 00:11:22'), front: 'Shift right in (SRI): logical vs. arithmetic',
      back: '<b>Logical:</b> SRI = 0.<br><b>Arithmetic:</b> SRI = MSB, i.e. Q2 in the 3-bit register.' },
    { id: 't6-f57', subtopic: 't6-shiftreg', src: suppGuide('Shift-register types SISO and SIPO'), front: 'SISO and SIPO shift registers (supplemental)',
      back: '<b>SISO:</b> serial in, serial out (one bit per clock in and out).<br><b>SIPO:</b> serial in, parallel out — collects a bit stream into a word.' },
    { id: 't6-f58', subtopic: 't6-shiftreg', src: suppGuide('Shift-register types PISO and PIPO'), front: 'PISO and PIPO registers (supplemental)',
      back: '<b>PISO:</b> parallel load, serial out — sends a word one bit at a time.<br><b>PIPO:</b> parallel in, parallel out — an ordinary register.' },
    { id: 't6-f59', subtopic: 't6-shiftreg', src: supp('Serial loading of a shift register'), front: 'How many clock edges to shift an n-bit word into a serial-in register?',
      back: '<b>n</b> — one bit enters per rising edge.' },

    /* t6-timing */
    { id: 't6-f60', subtopic: 't6-timing', src: c('c19v3 00:04:04', 'c19v3 00:04:58'), front: 'Clock-to-Q delay t<sub>CQ</sub>',
      back: 'Time after the active (rising) edge until the output Q assumes its new value.' },
    { id: 't6-f61', subtopic: 't6-timing', src: c('c19v3 00:06:23', 'c19v3 00:07:03'), front: 'Setup time',
      back: 'Minimum time the input must be <b>stable before</b> the active clock edge for correct data to be stored.' },
    { id: 't6-f62', subtopic: 't6-timing', src: c('c19v3 00:07:39', 'c19v3 00:08:20'), front: 'Hold time',
      back: 'Minimum time the input must be <b>stable after</b> the active clock edge for correct data to be stored.' },
    { id: 't6-f63', subtopic: 't6-timing', src: c('c19v3 00:03:18', 'c19v3 00:09:52'), front: 'Which timing parameters refer to the input, and which to the output?',
      back: 'Setup and hold → the <b>input</b> signal. t<sub>CQ</sub> → the <b>output</b>. All are measured from the active clock edge.' },
    { id: 't6-f64', subtopic: 't6-timing', src: supp('Minimum clock period and maximum frequency'), front: 'Minimum clock period / maximum frequency (supplemental)',
      back: '<span class="mono">T<sub>CLK</sub> ≥ t<sub>CQ</sub> + t<sub>logic,max</sub> + t<sub>setup</sub></span>, <span class="mono">f<sub>max</sub> = 1/T<sub>min</sub></span>. Hold: t<sub>CQ</sub> + t<sub>logic,min</sub> ≥ t<sub>hold</sub> (independent of the clock).' },

    /* t6-counters */
    { id: 't6-f65', subtopic: 't6-counters', src: c('c20v1 00:01:39', 'c20v1 00:02:28'), front: 'Counting up vs. counting down',
      back: 'Up: next = current + 1 (<b>increment</b>, incrementer). Down: next = current − 1 (<b>decrement</b>, decrementer).' },
    { id: 't6-f66', subtopic: 't6-counters', src: c('c20v1 00:03:21', 'c20v1 00:04:37'), front: '3-bit up counter after 111',
      back: '111 + 001 = 1000 → keep 3 bits → <b>000</b>; the carry is discarded (or brought out). The counter <b>wraps around</b>.' },
    { id: 't6-f67', subtopic: 't6-counters', src: c('c20v1 00:05:20', 'c20v1 00:05:57'), front: '3-bit down counter after 000',
      back: '000 − 001 = 000 + 111 (two’s complement) = <b>111</b>; sequence …, 001, 000, 111, 110, …' },
    { id: 't6-f68', subtopic: 't6-counters', src: supp('Number of states of an n-bit counter; mod-N counters'), front: 'States of an n-bit binary counter; a mod-N counter (supplemental)',
      back: 'An n-bit counter cycles through <b>2<sup>n</sup></b> values. A mod-N counter cycles 0 … N−1 and needs ⌈log<sub>2</sub> N⌉ flip-flops.' },

    /* t6-counterdesign */
    { id: 't6-f69', subtopic: 't6-counterdesign', src: c('c20v2 00:00:26', 'c20v2 00:01:05', 'c20v2 00:02:01', 'c20v2 00:10:05'), front: 'Lecture’s 3-bit up counter: inputs and outputs',
      back: 'Inputs: CLK, reset (asynchronous), CLR (synchronous clear), CNT (count). Outputs: C2..0 (the count) and TC (terminal count).',
      backDiagram: { kind: 'component', shape: 'counter', label: '3-bit up counter', inputs: ['CLR', 'CNT', 'reset'], outputs: ['C2..0', 'TC'], clock: true } },
    { id: 't6-f70', subtopic: 't6-counterdesign', src: c('c20v2 00:03:12', 'c20v2 00:04:35'), front: 'Terminal count of a 3-bit up counter',
      back: 'TC = 1 at the maximum value before wrapping, 111: <span class="mono">TC = C2·C1·C0</span>.' },
    { id: 't6-f71', subtopic: 't6-counterdesign', src: c('c20v2 00:05:06', 'c20v2 00:06:54', 'c20v2 00:12:22'), front: 'What is inside the lecture’s counter?',
      back: 'A multi-function register (CLR, LD) whose D inputs come from an <b>incrementer</b> (Q + 1); <b>CNT drives LD</b>; a 3-input AND of Q2, Q1, Q0 gives TC.' },
    { id: 't6-f72', subtopic: 't6-counterdesign', src: supp('D-input equations of a 3-bit binary up counter'), front: 'D-flip-flop equations of a 3-bit up counter (supplemental)',
      back: '<span class="mono">D0 = Q0′, D1 = Q1 ⊕ Q0, D2 = Q2 ⊕ Q1Q0</span>' },
    { id: 't6-f73', subtopic: 't6-counterdesign', src: suppGuide('Ripple vs. synchronous counters'), front: 'Ripple vs. synchronous counter (supplemental)',
      back: '<b>Synchronous:</b> all flip-flops share one clock and change together. <b>Ripple:</b> each stage is clocked by the previous stage’s output — simpler, but delays add up and outputs pass through wrong intermediate values.' },
    { id: 't6-f74', subtopic: 't6-counterdesign', src: suppGuide('Designing a mod-N synchronous counter'), front: 'How do the unused states of a mod-N counter help the design? (supplemental)',
      back: 'States that never occur (e.g. 110, 111 for mod 6) are <b>don’t-cares</b> in every next-state K-map, which gives smaller D equations.' },

    /* t6-timers */
    { id: 't6-f75', subtopic: 't6-timers', src: c('c20v3 00:00:07', 'c20v3 00:00:59'), front: 'Timer',
      back: 'A sequential circuit that generates a <b>pulse at a specified (possibly repeating) time interval</b>; the pulse can last one full clock cycle.' },
    { id: 't6-f76', subtopic: 't6-timers', src: c('c20v3 00:01:45', 'c20v3 00:09:14'), front: 'What sets a timer’s time per count?',
      back: 'The counter inside counts once per clock cycle, so the <b>clock period</b> (e.g. a 1 µs oscillator → 1 µs per count).' },
    { id: 't6-f77', subtopic: 't6-timers', src: c('c20v3 00:06:09', 'c20v4 00:09:46'), front: 'Why does the lecture’s timer decrement the upper bound?',
      back: 'For N counts it must count N−1, …, 1, 0 — since 0 is counted too, the start value is N − 1.' },
    { id: 't6-f78', subtopic: 't6-timers', src: c('c20v4 00:10:32', 'c20v4 00:11:19'), front: 'Why does the lecture’s timer have a mux before the counter?',
      back: 'So the counter is loaded from the decrementer directly at the <b>first</b> edge, instead of waiting for the load register to be loaded first.' },
    { id: 't6-f79', subtopic: 't6-timers', src: c('c20v4 00:05:58', 'c20v4 00:07:37'), front: 'What reloads the timer’s counter after each interval?',
      back: 'Its load input is <b>LD OR TC</b>: when the count reaches 000, TC = 1 makes load = 1 and the next edge reloads N − 1.' },
    { id: 't6-f80', subtopic: 't6-timers', src: c('c20v4 00:00:23', 'c20v4 00:08:00'), front: 'Timer with upper bound 5 and a 1 µs clock: what is the output?',
      back: 'Counter 100 → 011 → 010 → 001 → 000 → 100 …; T = 1 for one 1 µs cycle every <b>5 µs</b>.' },

    /* t6-jkt */
    { id: 't6-f81', subtopic: 't6-jkt', src: suppGuide('JK flip-flops'), front: 'JK flip-flop characteristic table (supplemental)',
      back: tbl(['J K', 'Q⁺'], [['0 0', 'Q (hold)'], ['0 1', '0 (reset)'], ['1 0', '1 (set)'], ['1 1', 'Q′ (toggle)']]),
      frontDiagram: { kind: 'component', shape: 'jkff', inputs: ['J', 'K'], outputs: ['Q', QN], clock: true } },
    { id: 't6-f82', subtopic: 't6-jkt', src: suppGuide('JK flip-flops'), front: 'JK characteristic equation (supplemental)', back: '<span class="mono">Q⁺ = J·Q′ + K′·Q</span>' },
    { id: 't6-f83', subtopic: 't6-jkt', src: suppGuide('T flip-flops'), front: 'T flip-flop: behavior and equation (supplemental)',
      back: 'T = 0 hold, T = 1 toggle: <span class="mono">Q⁺ = T ⊕ Q</span>. From a DFF: D = T ⊕ Q; from a JK: J = K = T.',
      frontDiagram: { kind: 'component', shape: 'tff', inputs: ['T'], outputs: ['Q'], clock: true } },
    { id: 't6-f84', subtopic: 't6-jkt', src: supp('JK excitation table'), front: 'JK excitation table (supplemental)',
      back: tbl(['Q → Q⁺', 'J K'], [['0 → 0', '0 X'], ['0 → 1', '1 X'], ['1 → 0', 'X 1'], ['1 → 1', 'X 0']]) },
    { id: 't6-f85', subtopic: 't6-jkt', src: supp('T and D excitation tables'), front: 'T and D excitation (supplemental)',
      back: '<b>T</b> = 1 exactly when the bit must change (0→1 or 1→0). <b>D</b> = the next value Q⁺.' },
    { id: 't6-f86', subtopic: 't6-jkt', src: supp('T flip-flop as a frequency divider'), front: 'T flip-flop with T = 1 (supplemental)',
      back: 'Toggles at every rising edge → Q is a square wave at <b>half the clock frequency</b>.',
      backDiagram: tm([['CLK', TF_CLK], ['Q', TF_Q]], true) },

    /* final-exam emphasis */
    { id: 't6-f87', subtopic: 't6-intro', src: guide('weight 11%, tier-3 priority — “1–2 questions on shift-register behavior or counter timing diagrams.”'),
      front: 'How much of the final is Topic 6, and what is typically asked?',
      back: 'About <b>11%</b>: usually 1–2 questions on <b>shift-register behavior</b> or <b>counter timing diagrams</b>; timing parameters (setup, hold, propagation delay) as definitions only.' },
  ];

  /* ================================================================== questions */
  // shared question waveforms
  const Q19_S = '0110000010', Q19_R = '0000110000', Q19_Q = srQ(Q19_S, Q19_R, '0');
  const Q28_E = '011100001110', Q28_D = '010011010010', Q28_Q = latchQ(Q28_E, Q28_D, '0');
  const DUTY = '0000000111'.repeat(2);
  const Q51_LD = ['0', '1', '0', '1'], Q51_D = ['0101', '1001', '0110', '1111'];
  const Q51_Q = run('0011', Q51_LD.map((ld, k) => [ld, Q51_D[k]]), (q, [ld, d]) => (ld === '1' ? d : q));
  const fsmCounter = (vals, nextIdx, outIdx) => ({ kind: 'fsm', type: 'moore', layout: 'circle', initial: 's0',
    states: vals.map((v, i) => ({ id: 's' + i, label: v, output: i === outIdx ? '1' : '0' })),
    transitions: vals.map((_, i) => ({ from: 's' + i, to: 's' + nextIdx(i), label: '1' })) });
  const B3 = ['000', '001', '010', '011', '100', '101', '110', '111'];

  const questions = [
    /* ---------------------------------------------------------------- t6-intro */
    { id: 't6-q1', subtopic: 't6-intro', type: 'mc', difficulty: 1, src: c('c17v1 00:05:01', 'c17v1 00:05:41'),
      prompt: 'The output of a <b>sequential</b> circuit is a function of …',
      choices: ['its inputs and its current state', 'its present inputs only', 'its current state only', 'the clock frequency only'],
      answer: 0,
      explanation: 'Sequential output = f(inputs, current state). “Present inputs only” is the definition of a combinational circuit; the state alone ignores the inputs; the clock decides when the state changes, not what the output is.' },
    { id: 't6-q2', subtopic: 't6-intro', type: 'tf', difficulty: 1, src: c('c17v1 00:15:00'),
      prompt: 'In an <b>asynchronous</b> sequential circuit, the inputs can affect the behavior and outputs at any time.',
      answer: true,
      explanation: 'True. Asynchronous circuits have no “conductor”: inputs matter at any time. Synchronous circuits respond only at discrete instants set by the clock.' },
    { id: 't6-q3', subtopic: 't6-intro', type: 'multi', difficulty: 2, src: c('c17v1 00:10:43', 'c18v1 00:03:08', 'c20v1 00:00:00'),
      prompt: 'Select all the <b>sequential</b> circuits.',
      choices: ['A 4-bit register', 'An up counter', 'A memory that stores data at an address and reads it back later', 'A 4:1 multiplexer', 'A full adder', 'A D flip-flop'],
      answers: [0, 1, 2, 5],
      explanation: 'Registers, counters, memories and flip-flops all store state. A multiplexer and a full adder compute their outputs from the present inputs only — they are combinational (datapath components from Topic 5).' },
    { id: 't6-q4', subtopic: 't6-intro', type: 'mc', difficulty: 2, src: c('c17v1 00:06:03', 'c17v1 00:11:22'),
      prompt: 'Which task <b>requires</b> a sequential circuit?',
      choices: ['Output 1 when the last three bits received one per clock tick were 1, 0, 1', 'Output 1 when a 3-bit input currently equals 101', 'Output A ⊕ B', 'Output the larger of two 4-bit inputs'],
      answer: 0,
      explanation: 'Recognizing the last three bits of a stream means remembering earlier inputs — that is state, so the circuit is sequential. The other three outputs depend only on the inputs present right now, so combinational logic suffices.' },
    { id: 't6-q5', subtopic: 't6-intro', type: 'match', difficulty: 2, src: c('c17v1 00:06:03', 'c17v1 00:09:49', 'c17v1 00:13:44', 'c17v1 00:15:00'),
      prompt: 'Match each term with its description.',
      pairs: [
        ['Current state', 'Reached through the past sequence of inputs; kept in the memory element'],
        ['Synchronous', 'Inputs matter only at discrete instants of time set by a clock'],
        ['Asynchronous', 'Inputs can affect the circuit at any time'],
        ['Combinational logic (inside a sequential circuit)', 'Computes the outputs and the state update from the inputs and the current state'],
      ],
      explanation: 'These are the four building ideas of Class 17 Video 1: the state, the two timing styles, and the logic box of the block diagram.' },
    { id: 't6-q6', subtopic: 't6-intro', type: 'tf', difficulty: 2, src: c('c17v1 00:15:34', 'c17v1 00:15:53'),
      prompt: 'Synchronous and asynchronous sequential circuits differ in <i>what</i> their outputs are a function of.',
      answer: false,
      explanation: 'False. For both, outputs are a function of the series of inputs and the current state. They differ in <i>timing</i>: discrete instants (synchronous) vs. any time (asynchronous).' },

    /* ---------------------------------------------------------------- t6-clock */
    { id: 't6-q7', subtopic: 't6-clock', type: 'numeric', difficulty: 1, src: c('c17v2 00:03:18'),
      prompt: 'A clock has a period of 5 ns. What is its frequency, in MHz?', answer: 200,
      steps: ['f = 1 / T = 1 / (5 × 10<sup>−9</sup> s)', '= 0.2 × 10<sup>9</sup> Hz = 200 × 10<sup>6</sup> Hz = 200 MHz'],
      explanation: 'Frequency is the reciprocal of the period.' },
    { id: 't6-q8', subtopic: 't6-clock', type: 'numeric', difficulty: 1, src: c('c17v2 00:03:18'),
      prompt: 'A clock runs at 25 MHz. What is its period, in ns?', answer: 40,
      steps: ['T = 1 / f = 1 / (25 × 10<sup>6</sup> Hz)', '= 0.04 × 10<sup>−6</sup> s = 40 × 10<sup>−9</sup> s = 40 ns'],
      explanation: 'Period is the reciprocal of the frequency.' },
    { id: 't6-q9', subtopic: 't6-clock', type: 'numeric', difficulty: 2, src: c('c17v2 00:05:20', 'c17v2 00:05:46'),
      prompt: 'Each slot of this clock waveform lasts 1 ns. What is the duty cycle, in percent?',
      diagram: tm([['CLK', DUTY]]), answer: 30,
      steps: ['One period: the pattern repeats every 10 slots → T = 10 ns.', 'The clock is 1 for 3 of those slots → 3 ns.', 'Duty cycle = 3 ns / 10 ns = 0.30 = 30%.'],
      explanation: 'Duty cycle is the fraction of the period in which the signal is active (1).' },
    { id: 't6-q10', subtopic: 't6-clock', type: 'numeric', difficulty: 2, src: c('c17v2 00:03:18', 'c17v2 00:04:16'),
      prompt: 'For the same clock (1 ns per slot), what is the frequency, in MHz?',
      diagram: tm([['CLK', DUTY]]), answer: 100,
      steps: ['The waveform repeats every 10 slots → T = 10 ns.', 'f = 1 / 10 ns = 0.1 × 10<sup>9</sup> Hz = 100 MHz.'],
      explanation: 'Read the period from one repetition (e.g. from one rising edge to the next), then take the reciprocal. The duty cycle does not affect the frequency.' },
    { id: 't6-q11', subtopic: 't6-clock', type: 'numeric', difficulty: 2, src: c('c17v2 00:03:18', 'c17v2 00:05:20'),
      prompt: 'A 200 MHz clock has a 30% duty cycle. For how many ns is it 1 in each period?', answer: 1.5, tolerance: 0.001,
      steps: ['T = 1 / 200 MHz = 5 ns.', 'Time high = 0.30 × 5 ns = 1.5 ns.'],
      explanation: 'Multiply the period by the duty cycle.' },
    { id: 't6-q12', subtopic: 't6-clock', type: 'mc', difficulty: 1, src: c('c18v2 00:03:09', 'c18v3 00:01:12'),
      prompt: 'What is a falling (negative) clock edge?',
      choices: ['The instant the clock changes from 1 to 0', 'The instant the clock changes from 0 to 1', 'Any time the clock is 0', 'The middle of the time the clock is 1'],
      answer: 0,
      explanation: 'Falling = 1 → 0. The 0 → 1 change is the rising (positive) edge; “any time the clock is 0” is a level, not an edge.' },
    { id: 't6-q13', subtopic: 't6-clock', type: 'tf', difficulty: 1, src: c('c17v2 00:06:09', 'c17v2 00:06:51'),
      prompt: 'A clock signal must have a 50% duty cycle.',
      answer: false,
      explanation: 'False. The lecture shows 50%, 10% and 90% clocks and says any amount in between is possible.' },
    { id: 't6-q14', subtopic: 't6-clock', type: 'numeric', difficulty: 1, src: c('c20v3 00:08:59', 'c20v3 00:09:14'),
      prompt: 'The timer lecture uses a “1 microsecond oscillator” (period 1 µs). What is its frequency, in MHz?', answer: 1,
      steps: ['f = 1 / T = 1 / (1 × 10<sup>−6</sup> s) = 10<sup>6</sup> Hz', '= 1 MHz'],
      explanation: 'A 1 µs period is a 1 MHz clock.' },

    /* ---------------------------------------------------------------- t6-srlatch */
    { id: 't6-q15', subtopic: 't6-srlatch', type: 'mc', difficulty: 1, src: c('c17v3 00:05:41'),
      prompt: 'An SR latch receives S = 1, R = 0. What happens?',
      choices: ['It is set: Q = 1, Q′ = 0', 'It is reset: Q = 0, Q′ = 1', 'It keeps the previous value', 'It enters the forbidden state'],
      answer: 0,
      explanation: 'S = 1 sets the latch (Q = 1). Reset is 01, keep is 00, forbidden is 11.' },
    { id: 't6-q16', subtopic: 't6-srlatch', type: 'tf', difficulty: 1, src: c('c17v3 00:07:13'),
      prompt: 'With S = R = 0, an SR latch keeps its previous value.',
      answer: true,
      explanation: 'True. SR = 00 is the “remember” input: Q stays 1 after a set and stays 0 after a reset.' },
    { id: 't6-q17', subtopic: 't6-srlatch', type: 'mc', difficulty: 2, src: c('c17v3 00:08:49'),
      prompt: 'A NOR-based SR latch receives S = R = 1. What are Q and Q′?',
      choices: ['Q = 0 and Q′ = 0', 'Q = 1 and Q′ = 1', 'Q = 1 and Q′ = 0', 'Q = 0 and Q′ = 1'],
      answer: 0,
      explanation: 'Each NOR gate has a 1 on one input, so both outputs are 0 — which is why 11 is forbidden: Q and Q′ are no longer complements. (Q = Q′ = 1 is what the NAND latch does with its forbidden 00.)' },
    { id: 't6-q18', subtopic: 't6-srlatch', type: 'short', difficulty: 2, src: c('c17v3 00:05:41', 'c17v3 00:07:13'),
      prompt: 'An SR latch starts with Q = 0. The inputs SR are applied in this order: 10, 00, 01, 00, 00, 10. Type Q after each input as a 6-bit string (first input first).',
      normalize: 'binary', width: 6, accept: ['110001'],
      steps: ['10 → set → 1', '00 → keep → 1', '01 → reset → 0', '00 → keep → 0', '00 → keep → 0', '10 → set → 1', 'Q = 1, 1, 0, 0, 0, 1 → 110001'],
      explanation: 'Only 10 and 01 change Q; 00 holds whatever was stored last.' },
    { id: 't6-q19', subtopic: 't6-srlatch', type: 'short', difficulty: 3, src: c('c17v3 00:05:41', 'c17v3 00:06:18', 'c17v3 00:07:13'),
      prompt: 'An SR latch (Q = 0 at the start) receives the S and R waveforms below. Type Q in each of the 10 slots as a 10-bit string.',
      diagram: tm([['S', Q19_S], ['R', Q19_R]]),
      normalize: 'binary', width: 10, accept: [Q19_Q],
      solutionDiagram: tm([['S', Q19_S], ['R', Q19_R], ['Q', Q19_Q]]),
      steps: ['Slot 0: SR = 00 → keep 0.', 'Slots 1–2: SR = 10 → set → 1, 1.', 'Slot 3: 00 → keep 1.', 'Slots 4–5: SR = 01 → reset → 0, 0.', 'Slots 6–7: 00 → keep 0, 0.', 'Slot 8: 10 → set → 1.', 'Slot 9: 00 → keep 1.', `Q = ${Q19_Q}`],
      explanation: 'Read the inputs slot by slot: set, reset, or keep the last value.' },
    { id: 't6-q20', subtopic: 't6-srlatch', type: 'mc', difficulty: 2, src: c('c17v3 00:09:03', 'c17v3 00:10:10', 'c17v3 00:10:37'),
      prompt: 'Why is S = R = 1 forbidden for the SR latch?',
      choices: ['Q and Q′ both become 0, and when both inputs return to 0 together the latch may not settle (metastability)', 'It makes the latch toggle on every clock edge', 'It sets the latch twice, which wastes power', 'It permanently damages the NOR gates'],
      answer: 0,
      explanation: 'With 11 the outputs are no longer complements, and the release from 11 to 00 can leave the cross-coupled gates unable to settle. The SR latch has no clock to toggle on, and nothing is damaged — the problem is logical.' },
    { id: 't6-q21', subtopic: 't6-srlatch', type: 'boolexpr', difficulty: 3, src: supp('SR latch characteristic equation (with SR = 11 as a don’t-care)'),
      prompt: 'Write the minimal SOP for the SR latch’s next state Q⁺ in terms of S, R and the present Q. Treat SR = 11 as a don’t-care.',
      vars: ['S', 'R', 'Q'], minterms: [1, 4, 5], dontcares: [6, 7], answer: "S + R'Q", form: 'sop', maxLiterals: 3,
      solutionDiagram: kmapOf(['S', 'R', 'Q'], [1, 4, 5], [6, 7], ['S', "R'Q"]),
      steps: ['Rows SRQ: 000 → 0 (keep 0), 001 → 1 (keep 1), 010 → 0, 011 → 0 (reset), 100 → 1, 101 → 1 (set), 110/111 → X.', 'Q⁺ = Σm(1, 4, 5) + d(6, 7).', 'Group m4, m5 with X6, X7 → S.', 'Group m1, m5 → R′Q.', 'Q⁺ = S + R′Q (3 literals).'],
      explanation: 'The latch is 1 next if it is set (S) or if it already holds 1 and is not reset (R′Q).' },
    { id: 't6-q22', subtopic: 't6-srlatch', type: 'tf', difficulty: 2, src: supp('NAND (S′R′) latch'),
      prompt: 'In a latch built from cross-coupled NAND gates (active-low inputs), applying 1 to both inputs holds the stored value.',
      answer: true,
      explanation: 'True. The NAND latch’s inputs are active-low: 11 is “no request” (hold), 01 sets, 10 resets and 00 is forbidden. (Supplemental — the lecture only builds the NOR latch.)' },
    { id: 't6-q23', subtopic: 't6-srlatch', type: 'match', difficulty: 1, src: c('c17v3 00:05:41', 'c17v3 00:06:18', 'c17v3 00:07:13', 'c17v3 00:09:11'),
      prompt: 'Match each SR input with what the NOR SR latch does.',
      pairs: [['SR = 10', 'Set: Q = 1'], ['SR = 01', 'Reset: Q = 0'], ['SR = 00', 'Keep the previous Q'], ['SR = 11', 'Forbidden (Q = Q′ = 0)']],
      explanation: 'This is the function table you must be able to reproduce.' },

    /* ---------------------------------------------------------------- t6-dlatch */
    { id: 't6-q24', subtopic: 't6-dlatch', type: 'mc', difficulty: 1, src: c('c17v4 00:08:37', 'c17v4 00:08:54'),
      prompt: 'A D latch has E = 1. What is Q?',
      choices: ['A copy of D', 'The previous value, whatever D is', 'Always 1', 'The complement of D'],
      answer: 0,
      explanation: 'With E = 1 the latch is transparent: D = 1 sets, D = 0 resets, so Q = D. Holding happens with E = 0.' },
    { id: 't6-q25', subtopic: 't6-dlatch', type: 'mc', difficulty: 2, src: c('c17v4 00:07:58', 'c17v4 00:08:25'),
      prompt: 'Inside a D latch, E = 1 and D = 1. What do the AND gates send to the SR latch, and what is Q?',
      choices: ['S = 1, R = 0 → set, Q = 1', 'S = 0, R = 1 → reset, Q = 0', 'S = 0, R = 0 → keep', 'S = 1, R = 1 → forbidden'],
      answer: 0,
      explanation: 'S = E·D = 1·1 = 1 and R = E·D′ = 1·0 = 0: the SR latch is set and Q = 1 = D. S = R = 1 can never happen because D and D′ are never both 1.' },
    { id: 't6-q26', subtopic: 't6-dlatch', type: 'boolexpr', difficulty: 2, src: c('c17v4 00:03:24', 'c17v4 00:04:01'),
      prompt: 'Write the expression for the internal <b>R</b> input of the D latch in terms of E and D.',
      vars: ['E', 'D'], answer: "ED'", maxLiterals: 2,
      steps: ['The bottom AND gate receives the enable E and D through the inverter.', 'R = E·D′.'],
      explanation: 'S = E·D and R = E·D′: R is 1 only when the latch is enabled and D = 0, which resets it.' },
    { id: 't6-q27', subtopic: 't6-dlatch', type: 'boolexpr', difficulty: 3, src: supp('D latch characteristic equation'),
      prompt: 'Write the minimal SOP for the D latch’s next state Q⁺ in terms of E, D and the present Q.',
      vars: ['E', 'D', 'Q'], minterms: [1, 3, 6, 7], answer: "ED + E'Q", form: 'sop', maxLiterals: 4,
      solutionDiagram: kmapOf(['E', 'D', 'Q'], [1, 3, 6, 7], [], ['ED', "E'Q"]),
      steps: ['E = 0: Q⁺ = Q → rows EDQ 001 and 011 are 1 (m1, m3).', 'E = 1: Q⁺ = D → rows 110 and 111 are 1 (m6, m7).', 'Group m6, m7 → ED; group m1, m3 → E′Q.', 'Q⁺ = ED + E′Q (4 literals) — a 2:1 mux with E as the select.'],
      explanation: 'Enabled, the latch copies D; disabled, it keeps Q.' },
    { id: 't6-q28', subtopic: 't6-dlatch', type: 'short', difficulty: 3, src: c('c17v4 00:05:21', 'c17v4 00:08:37'),
      prompt: 'A D latch (Q = 0 at the start) receives the E and D waveforms below. Type Q in each of the 12 slots as a 12-bit string.',
      diagram: tm([['E', Q28_E], ['D', Q28_D]]),
      normalize: 'binary', width: 12, accept: [Q28_Q],
      solutionDiagram: tm([['E', Q28_E], ['D', Q28_D], ['Q', Q28_Q]]),
      steps: ['Slot 0: E = 0 → hold 0.', 'Slots 1–3: E = 1 → Q follows D: 1, 0, 0.', 'Slots 4–7: E = 0 → hold 0 (the 1s on D in slots 4, 5 and 7 are ignored).', 'Slots 8–10: E = 1 → follow D: 0, 0, 1.', 'Slot 11: E = 0 → hold 1.', `Q = ${Q28_Q}`],
      explanation: 'Level-sensitive: while E = 1 the output tracks every change of D; while E = 0 it holds the last value it saw.' },
    { id: 't6-q29', subtopic: 't6-dlatch', type: 'mc', difficulty: 2, src: c('c17v4 00:10:48', 'c17v4 00:11:46'),
      prompt: 'A D latch has the clock connected to its enable. When can its output change?',
      choices: ['Any time during the whole interval CLK = 1, whenever D changes', 'Only at the rising edge', 'Only at the falling edge', 'Only while CLK = 0'],
      answer: 0,
      explanation: 'A latch is level-sensitive: during the entire high phase it copies D, so several changes of D can pass through. Changing only at the rising edge is the flip-flop’s behavior.' },
    { id: 't6-q30', subtopic: 't6-dlatch', type: 'tf', difficulty: 1, src: c('c17v4 00:10:48', 'c17v4 00:12:06'),
      prompt: 'A D latch is level-sensitive: what matters is the level of its enable, not an edge.',
      answer: true,
      explanation: 'True. It stores whatever is on D for as long as E = 1, which is exactly why the lecture moves on to the edge-triggered flip-flop.' },

    /* ---------------------------------------------------------------- t6-dff */
    { id: 't6-q31', subtopic: 't6-dff', type: 'mc', difficulty: 2, src: c('c18v1 00:00:34', 'c18v1 00:16:25'),
      prompt: 'A positive-edge D flip-flop captured D = 1 at a rising edge. While CLK stays 1, D changes to 0. What is Q until the next rising edge?',
      choices: ['1 — it keeps the value captured at the edge', '0 — it follows D while CLK = 1', '0 — it resets when D changes', 'Unknown — changing D during CLK = 1 is forbidden'],
      answer: 0,
      explanation: 'The flip-flop only samples at the rising edge and holds that value through the high and low phases. Following D while CLK = 1 is what a D latch does.' },
    { id: 't6-q32', subtopic: 't6-dff', type: 'tf', difficulty: 1, src: c('c17v5 00:00:08', 'c18v1 00:16:41'),
      prompt: 'Between rising edges, changes on D do not affect the Q of a positive-edge D flip-flop.',
      answer: true,
      explanation: 'True. Q only takes D’s value at a rising edge (ignoring the asynchronous reset).' },
    { id: 't6-q33', subtopic: 't6-dff', type: 'short', difficulty: 2, src: c('c18v1 00:00:34', 'c17v5 00:00:23'),
      prompt: 'A positive-edge D flip-flop (Q = 0 at the start) receives CLK and D below. Type Q right after each of the 5 rising edges as a 5-bit string.',
      diagram: tm([['CLK', DF_CLK], ['D', DF_D]], true),
      normalize: 'binary', width: 5, accept: [atEdges(DF_CLK, DF_FF)],
      solutionDiagram: tm([['CLK', DF_CLK], ['D', DF_D], ['Q', DF_FF]], true),
      steps: ['Edge 1: D = 1 just before the edge → Q = 1.', 'Edge 2: D = 0 → Q = 0.', 'Edge 3: D = 0 (the short pulse on D during the second high phase is over) → Q = 0.', 'Edge 4: D = 1 → Q = 1.', 'Edge 5: D = 1 (D only falls after this edge) → Q = 1.', 'Q = 10011'],
      explanation: 'Look only at D at each rising edge; what D does in between is ignored.' },
    { id: 't6-q34', subtopic: 't6-dff', type: 'mc', difficulty: 3, src: c('c17v4 00:11:46', 'c17v5 00:00:08'),
      prompt: 'The same CLK and D drive a D latch (E = CLK) and a positive-edge D flip-flop; both start with Q = 0. Which statement is true?',
      diagram: tm([['CLK', DF_CLK], ['D', DF_D]], true),
      choices: ['Only the latch’s Q responds to the short D pulse in the second period; the flip-flop’s Q stays 0 from edge 2 until edge 4', 'Only the flip-flop’s Q responds to the short pulse', 'Both Q outputs respond to the short pulse', 'Neither responds; both Q outputs stay 0 from edge 2 until edge 4'],
      answer: 0,
      solutionDiagram: tm([['CLK', DF_CLK], ['D', DF_D], ['Q (latch)', DF_LATCH], ['Q (flip-flop)', DF_FF]], true),
      steps: ['The pulse on D is 1 only during the second high phase, between rising edges 2 and 3.', 'The latch is transparent while CLK = 1, so its Q goes to 1 with the pulse and then holds that 1 through the following low phase, until CLK rises again with D = 0.', 'The flip-flop samples D only at edges: at edge 2 and edge 3 D is 0, so Q stays 0 until edge 4 samples D = 1.'],
      explanation: 'This is the lecture’s reason for flip-flops: a latch lets every change during the enable window through, an edge-triggered flip-flop samples only at the edge.' },
    { id: 't6-q35', subtopic: 't6-dff', type: 'mc', difficulty: 1, src: c('c17v5 00:04:02', 'c17v5 00:04:08'),
      prompt: 'In the master–servant D flip-flop, which latch is enabled while CLK = 1?',
      choices: ['The servant', 'The master', 'Both latches', 'Neither latch'],
      answer: 0,
      explanation: 'The servant’s enable is CLK itself; the master’s enable is CLK through a NOT gate, so the master is enabled while CLK = 0. They are never enabled at the same time — that is what blocks D from racing straight through.' },
    { id: 't6-q36', subtopic: 't6-dff', type: 'tf', difficulty: 1, src: c('c18v1 00:01:47', 'c20v2 00:00:44'),
      prompt: 'Raising the reset input of a D flip-flop makes Q = 0 without waiting for a clock edge, whatever D is.',
      answer: true,
      explanation: 'True. The reset is asynchronous: “no matter when the reset becomes active everything goes to zero”, independent of the clock and of D.' },
    { id: 't6-q37', subtopic: 't6-dff', type: 'mc', difficulty: 2, src: supp('Negative-edge-triggered flip-flops'),
      prompt: 'A <b>negative</b>-edge-triggered D flip-flop captures D when …',
      choices: ['the clock goes from 1 to 0', 'the clock goes from 0 to 1', 'the clock is 1', 'the clock is 0'],
      answer: 0,
      explanation: 'Negative (falling) edge = 1 → 0. The course’s flip-flops use the positive edge (0 → 1); “while the clock is 1/0” describes latches, not edge-triggered devices. (Supplemental.)' },
    { id: 't6-q38', subtopic: 't6-dff', type: 'multi', difficulty: 2, src: c('c17v5 00:02:45', 'c17v5 00:02:58', 'c17v5 00:04:02'),
      prompt: 'Select all statements that are true for the master–servant D flip-flop.',
      choices: ['The external D input goes to the master latch', 'The master’s enable is CLK passed through a NOT gate', 'The servant’s enable is CLK itself', 'Both latches are enabled while CLK = 1', 'Q follows D for the whole time CLK = 1'],
      answers: [0, 1, 2],
      explanation: 'The master takes the external D and is enabled by CLK′; the servant is enabled by CLK and passes the master’s value to Q. Because their enables are opposite, they are never enabled together, and Q changes only at the rising edge — not during the whole high phase.' },

    /* ---------------------------------------------------------------- t6-register */
    { id: 't6-q39', subtopic: 't6-register', type: 'numeric', difficulty: 1, src: c('c18v1 00:04:22'),
      prompt: 'How many D flip-flops does a 16-bit register need?', answer: 16,
      steps: ['One D flip-flop stores one bit.', '16 bits → 16 flip-flops.'],
      explanation: 'An n-bit register is n D flip-flops sharing a clock and a reset.' },
    { id: 't6-q40', subtopic: 't6-register', type: 'multi', difficulty: 1, src: c('c18v1 00:09:39', 'c18v1 00:10:05'),
      prompt: 'Which signals are shared by all four flip-flops of the lecture’s 4-bit register?',
      choices: ['The clock', 'The reset', 'The data input D<sub>i</sub>', 'The output Q<sub>i</sub>'],
      answers: [0, 1],
      explanation: 'Clock and reset are common so that every bit updates (or resets) at the same time. Each flip-flop has its own data bit D<sub>i</sub> and its own output Q<sub>i</sub>.' },
    { id: 't6-q41', subtopic: 't6-register', type: 'short', difficulty: 3, src: c('c18v1 00:15:27', 'c18v1 00:16:41'),
      prompt: 'A basic 4-bit register holds 0000. D = 1001 is applied before edge 1. While CLK is still 1 after edge 1, D changes to 0101; then, while CLK is 0 before edge 2, D changes to 1110. What does the register hold right after edge 2?',
      normalize: 'binary', width: 4, accept: ['1110'],
      steps: ['Edge 1 stores the value on D at that edge: Q = 1001.', 'D changing to 0101 and then 1110 between edges does not affect Q.', 'Edge 2 stores the value on D at that edge, 1110.'],
      explanation: 'A basic register loads at every rising edge, and only what is on D at the edge counts. 0101 was never on D at an edge, so it is never stored.' },
    { id: 't6-q42', subtopic: 't6-register', type: 'tf', difficulty: 1, src: c('c18v1 00:13:23', 'c18v1 00:14:49'),
      prompt: 'In a basic register, if the inputs change while CLK = 0, the outputs change immediately.',
      answer: false,
      explanation: 'False. While the clock is 0 all flip-flops hold their previous value; new inputs are only stored at the next rising edge.' },
    { id: 't6-q43', subtopic: 't6-register', type: 'mc', difficulty: 2, src: c('c18v3 00:00:50', 'c18v3 00:01:12'),
      prompt: 'A register holds 1011 and CLK = 0. Reset goes to 1. What happens?',
      choices: ['The register becomes 0000 right away', 'The register becomes 0000 at the next rising edge', 'The register keeps 1011 because there is no clock edge', 'The register loads whatever is on D'],
      answer: 0,
      explanation: 'Reset = 1 makes the content 0000 irrespective of the clock — even if the clock is 0, 1, rising or falling. Waiting for an edge describes the synchronous CLR of the multi-function register.' },
    { id: 't6-q44', subtopic: 't6-register', type: 'mc', difficulty: 2, src: c('c18v1 00:15:36', 'c18v1 00:16:41'),
      prompt: 'Read the timing diagram of this basic 4-bit register (Q starts at 0000). What does Q3Q2Q1Q0 hold right after edge 2?',
      diagram: tm([['CLK', RG_CLK], ['D3', RG_D[3]], ['D2', RG_D[2]], ['D1', RG_D[1]], ['D0', RG_D[0]]], true),
      choices: ['0110', '1001', '0000', '1111'],
      answer: 0,
      solutionDiagram: tm([['CLK', RG_CLK], ['D3', RG_D[3]], ['D2', RG_D[2]], ['D1', RG_D[1]], ['D0', RG_D[0]], ['Q3', RG_Q[3]], ['Q2', RG_Q[2]], ['Q1', RG_Q[1]], ['Q0', RG_Q[0]]], true),
      steps: ['Edge 1 stores D = 1001.', 'Just after edge 1 the inputs change to D3D2D1D0 = 0110.', 'Edge 2 stores 0110.'],
      explanation: '1001 is what edge 1 stored; at edge 2 the inputs read 0110. 0000 was the starting value, and 1111 never appears on D.' },

    /* ---------------------------------------------------------------- t6-loadreg */
    { id: 't6-q45', subtopic: 't6-loadreg', type: 'mc', difficulty: 1, src: c('c18v2 00:01:46', 'c18v2 00:02:10'),
      prompt: 'What does the LD input add to a basic register?',
      choices: ['Control over when it loads: with LD = 0 it keeps its value even at rising edges', 'A second clock input', 'The ability to shift right', 'An asynchronous clear'],
      answer: 0,
      explanation: 'A basic register loads at every rising edge. The load register stores new data only when LD = 1 at the edge and keeps the old value otherwise. Shifting and clearing are added later by multi-function registers.' },
    { id: 't6-q46', subtopic: 't6-loadreg', type: 'tf', difficulty: 2, src: c('c18v2 00:08:10', 'c18v2 00:09:08'),
      prompt: 'If the two mux inputs of a load register were swapped (I1 ← Q<sub>i</sub>, I0 ← D<sub>i</sub>), the register would load new data when LD = 0 instead of LD = 1.',
      answer: true,
      explanation: 'True. The mux passes I1 when its select (LD) is 1 and I0 when it is 0. The lecture stresses using input 1 for the new data precisely so that LD = 1 means load.' },
    { id: 't6-q47', subtopic: 't6-loadreg', type: 'short', difficulty: 3, src: c('c18v3 00:01:34', 'c18v3 00:03:46'),
      prompt: 'A 4-bit load register starts at 0000. At four rising edges (LD, D) = (1, 1010), (0, 0111), (1, 0111), (0, 0000). What does it hold after the fourth edge?',
      normalize: 'binary', width: 4, accept: ['0111'],
      steps: ['Edge 1: LD = 1 → load 1010.', 'Edge 2: LD = 0 → keep 1010 (0111 ignored).', 'Edge 3: LD = 1 → load 0111.', 'Edge 4: LD = 0 → keep 0111 (0000 ignored).'],
      explanation: 'Each edge either loads D (LD = 1) or keeps Q (LD = 0).' },
    { id: 't6-q48', subtopic: 't6-loadreg', type: 'boolexpr', difficulty: 2, src: c('c18v2 00:05:32', 'c18v2 00:09:08'),
      prompt: 'Write the minimal SOP for the next state Q⁺ of one load-register bit, with L = LD, D = the data bit and Q = the present value.',
      vars: ['L', 'D', 'Q'], minterms: [1, 3, 6, 7], answer: "LD + L'Q", form: 'sop', maxLiterals: 4,
      steps: ['L = 0: the mux passes Q → Q⁺ = Q (rows LDQ 001, 011).', 'L = 1: the mux passes D → Q⁺ = D (rows 110, 111).', 'Q⁺ = L′Q + LD — the 2:1 mux equation (4 literals).'],
      explanation: 'The mux selects Q when LD = 0 and D when LD = 1. (The written equation is the standard mux expression; the lecture describes the same behavior.)' },
    { id: 't6-q49', subtopic: 't6-loadreg', type: 'numeric', difficulty: 1, src: c('c18v2 00:04:44', 'c18v2 00:10:43'),
      prompt: 'How many 2:1 multiplexers does an 8-bit load register need?', answer: 8,
      steps: ['Each flip-flop needs its own keep-or-load choice.', 'One 2:1 mux per bit → 8 muxes, all selects tied to LD.'],
      explanation: 'One mux per flip-flop.' },
    { id: 't6-q50', subtopic: 't6-loadreg', type: 'mc', difficulty: 3, src: c('c18v2 00:02:36', 'c18v2 00:03:09', 'c19v3 00:06:23'),
      prompt: 'LD is pulsed to 1 while CLK = 0 and returns to 0 well before the next rising edge. Does the load register load the data?',
      choices: ['No — LD must be 1 at the rising edge (and stable for the setup time before it)', 'Yes — any LD pulse is remembered until the next edge', 'Yes — it loads immediately while LD = 1', 'Only if CLK was 1 during the pulse'],
      answer: 0,
      steps: ['The register only changes at a rising edge.', 'At that edge LD = 0, so every mux selects I0 = Q.', 'The edge stores the old value: no load.'],
      explanation: 'Nothing remembers the LD pulse: the mux is combinational and the flip-flops only look at their D inputs at the edge. In real hardware LD must also be stable for the setup time before the edge.' },
    { id: 't6-q51', subtopic: 't6-loadreg', type: 'short', difficulty: 2, src: c('c18v2 00:02:36', 'c18v2 00:02:50'),
      prompt: `A 4-bit load register holds 0011. In the four clock periods below, D = ${Q51_D.join(', ')}. What does it hold right after the third rising edge?`,
      diagram: tm([['CLK', CK(4)], ['LD', held(Q51_LD)]], true),
      normalize: 'binary', width: 4, accept: [Q51_Q[2]],
      solutionDiagram: tm([['CLK', CK(4)], ['LD', held(Q51_LD)], ...bitsAfter('Q', Q51_Q, '0011')], true),
      steps: ['Edge 1: LD = 0 → keep 0011.', 'Edge 2: LD = 1 → load 1001.', `Edge 3: LD = 0 → keep 1001 (0110 ignored).`, '(Edge 4 would load 1111.)'],
      explanation: 'Only the edges with LD = 1 change the content.' },

    /* ---------------------------------------------------------------- t6-shifting */
    { id: 't6-q52', subtopic: 't6-shifting', type: 'short', difficulty: 1, src: c('c18v3 00:06:48', 'c18v3 00:07:30'),
      prompt: 'Shift 0110 left by one bit (4 bits).', normalize: 'binary', width: 4, accept: [shl('0110')],
      steps: ['Every bit moves one place left; the MSB 0 falls out.', 'A 0 is shifted in at the LSB → 1100.'],
      explanation: 'Left shifts always shift in 0.' },
    { id: 't6-q53', subtopic: 't6-shifting', type: 'short', difficulty: 2, src: c('c18v3 00:09:24'),
      prompt: 'Logically shift 1001 right by one bit (4 bits).', normalize: 'binary', width: 4, accept: [shrL('1001')],
      steps: ['The LSB 1 falls out; the rest moves right: _100.', 'Logical shift right puts 0 in the MSB → 0100.'],
      explanation: 'Logical right shifts always shift in 0.' },
    { id: 't6-q54', subtopic: 't6-shifting', type: 'short', difficulty: 2, src: c('c18v3 00:09:38'),
      prompt: 'Arithmetically shift 1001 right by one bit (4 bits).', normalize: 'binary', width: 4, accept: [shrA('1001')],
      steps: ['The LSB 1 falls out; the rest moves right: _100.', 'Arithmetic shift right copies the old MSB (1) → 1100.', 'As two’s complement: 1001 = −7 → 1100 = −4 (÷2, rounded toward −∞ — a standard detail the lecture does not discuss).'],
      explanation: 'The MSB is copied so a negative number stays negative.' },
    { id: 't6-q55', subtopic: 't6-shifting', type: 'mc', difficulty: 2, src: c('c18v3 00:10:16', 'c18v3 00:11:52'),
      prompt: 'For which <b>two’s-complement</b> values do a logical and an arithmetic right shift give <b>different</b> results?',
      choices: ['Negative values (MSB = 1)', 'Positive values (MSB = 0)', 'Odd values only', 'Every value'],
      answer: 0,
      explanation: 'The two shifts differ only in the bit put into the MSB: logical inserts 0, arithmetic copies the old MSB. When the MSB is 0 (positive values) both insert 0, so the results differ exactly for negative values. Odd or even only decides which bit falls out of the LSB, and that is the same for both shifts.' },
    { id: 't6-q56', subtopic: 't6-shifting', type: 'numeric', difficulty: 2, src: c('c18v3 00:09:38', 'c18v3 00:13:16'),
      prompt: 'The 8-bit two’s-complement value 11101000 is shifted arithmetically right by one bit. What is the result in decimal?', answer: fromTwos(shrA('11101000')),
      steps: ['11101000 as two’s complement: 232 − 256 = −24.', `Arithmetic shift right: drop the LSB, copy the MSB → ${shrA('11101000')}.`, `${shrA('11101000')} = 244 − 256 = −12 (= −24 ÷ 2).`],
      explanation: 'Arithmetic right shift divides by 2 and preserves the sign.' },
    { id: 't6-q57', subtopic: 't6-shifting', type: 'numeric', difficulty: 3, src: c('c18v3 00:07:30', 'c18v3 00:12:56'),
      prompt: 'The 8-bit value 00010011 is shifted left twice. What is the result in decimal?', answer: parseInt(shl(shl('00010011')), 2),
      steps: ['00010011 = 16 + 2 + 1 = 19.', `First shift left → ${shl('00010011')} = 38.`, `Second shift left → ${shl(shl('00010011'))} = 64 + 8 + 4 = 76.`, 'Check: 19 × 2 × 2 = 76; only 0s fell out of the MSB, so nothing was lost.'],
      explanation: 'Each left shift multiplies by 2 as long as no 1 is shifted out (and, for signed values, the sign bit does not change).' },
    { id: 't6-q58', subtopic: 't6-shifting', type: 'tf', difficulty: 1, src: c('c18v3 00:07:49', 'c18v3 00:08:12'),
      prompt: 'For a shift <b>left</b>, arithmetic and logical shifting produce the same result.',
      answer: true,
      explanation: 'True. A left shift always shifts in 0, whether the number is signed or unsigned and whether the shift is called arithmetic or logical.' },
    { id: 't6-q59', subtopic: 't6-shifting', type: 'short', difficulty: 3, src: c('c18v3 00:09:38', 'c18v3 00:13:16'),
      prompt: 'The 4-bit two’s-complement value 1000 (−8) is shifted arithmetically right twice. What is the result?', normalize: 'binary', width: 4, accept: [shrA(shrA('1000'))],
      steps: ['First shift: drop the LSB, copy the MSB 1 → 1100 (−4).', 'Second shift: → 1110 (−2).', 'Check: −8 ÷ 2 ÷ 2 = −2.'],
      explanation: 'Copying the MSB each time keeps the number negative while halving it.' },
    { id: 't6-q60', subtopic: 't6-shifting', type: 'match', difficulty: 2, src: c('c18v3 00:07:30', 'c18v3 00:09:24', 'c18v3 00:09:38'),
      prompt: 'The 4-bit value 1101 is shifted by one bit. Match each operation with its result.',
      pairs: [['Shift left', shl('1101')], ['Logical shift right', shrL('1101')], ['Arithmetic shift right', shrA('1101')]],
      explanation: 'Left: 1 falls out, 0 enters at the LSB → 1010. Right: the LSB 1 falls out; logical inserts 0 → 0110, arithmetic copies the MSB 1 → 1110.' },

    /* ---------------------------------------------------------------- t6-multireg */
    { id: 't6-q61', subtopic: 't6-multireg', type: 'mc', difficulty: 1, src: c('c19v1 00:01:24', 'c19v1 00:05:04'),
      prompt: 'How does the synchronous <b>clear</b> (CLR) of the multi-function register differ from the asynchronous <b>reset</b>?',
      choices: ['CLR puts zeros in at the next clock edge; reset zeros the register immediately', 'CLR zeros the register immediately; reset waits for the clock edge', 'CLR only clears bit 0', 'There is no difference'],
      answer: 0,
      explanation: 'CLR goes through the mux (constant 0 on input I2), so it takes effect at the clock edge. Reset acts on the flip-flops directly, independent of the clock.' },
    { id: 't6-q62', subtopic: 't6-multireg', type: 'mc', difficulty: 2, src: c('c19v1 00:07:07', 'c19v1 00:08:47'),
      prompt: 'In the lecture’s multi-function register, (CLR, LD) = (0, 1) at a rising edge. What is stored?',
      choices: ['The external inputs D (mux input I1)', 'All zeros (mux input I2)', 'The current value (mux input I0)', 'The current value (mux input I3)'],
      answer: 0,
      explanation: 'With CLR → S1 and LD → S0, (0, 1) selects input 1, which carries D: a load. Input 2 is the constant 0 (clear) and inputs 0 and 3 keep.' },
    { id: 't6-q63', subtopic: 't6-multireg', type: 'short', difficulty: 3, src: c('c19v1 00:03:18', 'c19v1 00:07:07'),
      prompt: 'The lecture’s 2-bit multi-function register holds Q1Q0 = 11. At five rising edges (CLR, LD, D1D0) = (0, 0, 01), (0, 1, 01), (1, 1, 10), (1, 0, 10), (0, 1, 10). What does it hold after the fifth edge?',
      normalize: 'binary', width: 2, accept: ['10'],
      steps: ['(0, 0): keep → 11.', '(0, 1): load → 01.', '(1, 1): keep (lecture table) → 01.', '(1, 0): clear → 00.', '(0, 1): load → 10.'],
      explanation: 'Look up each (CLR, LD) pair in the function table: 00 keep, 01 load, 10 clear, 11 keep.' },
    { id: 't6-q64', subtopic: 't6-multireg', type: 'match', difficulty: 2, src: c('c19v1 00:07:47', 'c19v1 00:08:47', 'c19v1 00:09:14'),
      prompt: 'Match the 4:1 mux inputs in front of flip-flop i of the lecture’s multi-function register with what is connected to them.',
      pairs: [['I0 and I3', 'Q<sub>i</sub> (keep)'], ['I1', 'D<sub>i</sub> (load)'], ['I2', 'Constant 0 (clear)']],
      explanation: '(CLR, LD) = 00 and 11 keep, 01 loads, 10 clears; the mux input number equals (CLR, LD) read as binary.' },
    { id: 't6-q65', subtopic: 't6-multireg', type: 'tf', difficulty: 1, src: c('c19v1 00:03:29', 'c19v1 00:08:09'),
      prompt: 'In the lecture’s function table, CLR = 1 together with LD = 1 clears the register.',
      answer: false,
      explanation: 'False. In the lecture’s table, (CLR, LD) = 11 <b>keeps</b> the current value; only 10 clears. (Some textbook designs give clear priority — always read the table you are given.)' },
    { id: 't6-q66', subtopic: 't6-multireg', type: 'boolexpr', difficulty: 3, src: c('c19v1 00:03:18', 'c19v1 00:06:49'),
      prompt: 'Write the minimal SOP for the next state Q⁺ of one bit of the lecture’s multi-function register, with C = CLR, L = LD, D = data bit, Q = present value.',
      vars: ['C', 'L', 'D', 'Q'], minterms: [1, 3, 6, 7, 13, 15], answer: "C'L'Q + C'LD + CLQ", form: 'sop', maxLiterals: 9,
      solutionDiagram: kmapOf(['C', 'L', 'D', 'Q'], [1, 3, 6, 7, 13, 15], [], ["C'L'Q", "C'LD", 'CLQ']),
      steps: ['The 4:1 mux gives Q⁺ = C′L′·I0 + C′L·I1 + CL′·I2 + CL·I3.', 'Substitute I0 = Q, I1 = D, I2 = 0, I3 = Q: Q⁺ = C′L′Q + C′LD + CLQ.', 'Minterms (CLDQ): 0001, 0011 (keep), 0110, 0111 (load), 1101, 1111 (keep) = Σm(1, 3, 6, 7, 13, 15).', 'Each of m1, m6, m13 is covered by only one prime implicant, so all three terms are essential: 9 literals is minimal.'],
      explanation: 'The clear row contributes nothing (its mux input is 0). The algebra matches the K-map minimum. (The lecture gives the function table and the mux wiring; writing them as an equation is standard.)' },
    { id: 't6-q67', subtopic: 't6-multireg', type: 'numeric', difficulty: 2, src: c('c19v1 00:05:31'),
      prompt: 'A multi-function register must support 6 different functions. What is the minimum number of mux select lines per bit?', answer: 3,
      steps: ['k select lines choose among 2<sup>k</sup> mux inputs.', '2<sup>2</sup> = 4 &lt; 6 ≤ 8 = 2<sup>3</sup>.', 'So 3 select lines (an 8:1 mux, with two inputs unused or repeated).'],
      explanation: 'The lecture’s four functions need a 4:1 mux (2 selects); six need an 8:1 mux.' },

    /* ---------------------------------------------------------------- t6-shiftreg */
    { id: 't6-q68', subtopic: 't6-shiftreg', type: 'mc', difficulty: 1, src: c('c19v2 00:10:46'),
      prompt: 'For a <b>logical</b> shift right, what value is connected to the shift-right-in (SRI) input?',
      choices: ['0', 'The MSB, Q2', 'The LSB, Q0', '1'],
      answer: 0,
      explanation: 'Logical shift right always inserts 0. Copying the MSB (Q2) is the arithmetic shift.' },
    { id: 't6-q69', subtopic: 't6-shiftreg', type: 'mc', difficulty: 2, src: c('c19v2 00:06:16'),
      prompt: 'In the lecture’s 3-bit shift-right register, what is connected to input I2 of the mux in front of flip-flop 1?',
      choices: ['Q2', 'Q0', 'Q1', 'SRI'],
      answer: 0,
      explanation: 'Shifting right stores flip-flop 2’s value into flip-flop 1, so I2 of flip-flop 1’s mux is Q2. Q1 is its keep input, Q0 would be a left shift, and SRI feeds flip-flop 2.' },
    { id: 't6-q70', subtopic: 't6-shiftreg', type: 'short', difficulty: 2, src: c('c19v2 00:05:24', 'c19v2 00:10:46'),
      prompt: 'The lecture’s 3-bit shift register holds Q2Q1Q0 = 101 with SRI = 0. (SHR, LD) = (1, 0) at one rising edge. What does it hold?', normalize: 'binary', width: 3, accept: [shrIn('101', '0')],
      steps: ['Q1 → Q0: Q0 = 0.', 'Q2 → Q1: Q1 = 1.', 'SRI → Q2: Q2 = 0.', 'Q2Q1Q0 = 010.'],
      explanation: 'A logical shift right: the 1 in Q0 falls out and a 0 enters at the MSB.' },
    { id: 't6-q71', subtopic: 't6-shiftreg', type: 'short', difficulty: 3, src: c('c19v2 00:06:41', 'c19v2 00:08:01'),
      prompt: 'A 4-bit shift-right register (like the lecture’s 3-bit one, with serial input SRI entering at Q3) starts at 0000. With shifting enabled, SRI = 1, 1, 0, 1 at four rising edges (first bit first). What is Q3Q2Q1Q0 after the fourth edge?',
      normalize: 'binary', width: 4, accept: [run('0000', ['1', '1', '0', '1'], shrIn)[3]],
      steps: ['Edge 1: 1 enters Q3 → 1000.', 'Edge 2: 1 enters → 1100.', 'Edge 3: 0 enters → 0110.', 'Edge 4: 1 enters → 1011.', 'The first bit received is now in Q0 and the last in Q3.'],
      explanation: 'Serial in, parallel out: after 4 edges the four bits are side by side in the register.' },
    { id: 't6-q72', subtopic: 't6-shiftreg', type: 'numeric', difficulty: 2, src: suppGuide('Serial-in, parallel-out (SIPO) shift registers'),
      prompt: 'An 8-bit serial-in, parallel-out (SIPO) shift register receives one bit per clock edge. How many rising edges does it take to collect a full byte?', answer: 8,
      steps: ['Each rising edge shifts in one bit.', '8 bits → 8 edges.'],
      explanation: 'A SIPO register converts a serial stream into a parallel word, one bit per clock. (The SIPO name is supplemental.)' },
    { id: 't6-q73', subtopic: 't6-shiftreg', type: 'match', difficulty: 2, src: suppGuide('Shift-register types SISO, SIPO, PISO and PIPO'),
      prompt: 'Match each register type with a description.',
      pairs: [['SISO', 'Bits enter and leave one per clock — a delay line'], ['SIPO', 'Collects a serial bit stream into a parallel word'], ['PISO', 'Loads a word in parallel and sends it out one bit at a time'], ['PIPO', 'Loads and outputs all bits at once — an ordinary register']],
      explanation: 'S = serial, P = parallel; the first letter is how data comes in, the last how it goes out. (Supplemental naming, listed on the final guide.)' },
    { id: 't6-q74', subtopic: 't6-shiftreg', type: 'tf', difficulty: 1, src: c('c19v2 00:11:00', 'c19v2 00:11:22'),
      prompt: 'To make the lecture’s 3-bit register shift <b>arithmetically</b> right, SRI is connected to Q2.',
      answer: true,
      explanation: 'True. Arithmetic shifting copies the MSB, and in the 3-bit register the MSB is stored in flip-flop 2 (Q2).' },
    { id: 't6-q75', subtopic: 't6-shiftreg', type: 'mc', difficulty: 1, src: c('c19v2 00:01:22', 'c19v2 00:04:18'),
      prompt: 'In the lecture’s 3-bit shift register, (SHR, LD) = (1, 1). What happens at the rising edge?',
      choices: ['It keeps its value', 'It shifts right', 'It loads D', 'It shifts right and then loads D'],
      answer: 0,
      explanation: 'The lecture’s table keeps the value when both controls are equal (00 or 11); mux inputs I0 and I3 both carry Q<sub>i</sub>. A single edge can only store one choice.' },
    { id: 't6-q76', subtopic: 't6-shiftreg', type: 'short', difficulty: 3, src: c('c19v2 00:03:02', 'c19v2 00:11:22'),
      prompt: 'The lecture’s 3-bit shift register holds 100 and has SRI wired to Q2 (arithmetic). At four rising edges (SHR, LD) = (1, 0), (1, 0), (0, 1) with D = 011, (1, 0). What does it hold after the fourth edge?',
      normalize: 'binary', width: 3, accept: ['001'],
      steps: ['Edge 1: shift right, SRI = Q2 = 1 → 110.', 'Edge 2: shift right, SRI = 1 → 111.', 'Edge 3: load → 011.', 'Edge 4: shift right, SRI = Q2 = 0 → 001.'],
      explanation: 'SRI follows the current MSB, so after loading 011 the arithmetic shift brings in a 0.' },
    { id: 't6-q77', subtopic: 't6-shiftreg', type: 'numeric', difficulty: 1, src: c('c19v2 00:02:07'),
      prompt: 'How many 4:1 multiplexers does the lecture’s 3-bit shift register (keep / load / shift right) use?', answer: 3,
      steps: ['There are four options (two control bits) → a 4:1 mux.', 'One mux per flip-flop → 3 muxes.'],
      explanation: 'Three bits, three flip-flops, three 4:1 muxes.' },

    /* ---------------------------------------------------------------- t6-timing */
    { id: 't6-q78', subtopic: 't6-timing', type: 'match', difficulty: 1, src: c('c19v3 00:04:58', 'c19v3 00:06:23', 'c19v3 00:08:20'),
      prompt: 'Match each flip-flop timing parameter with its definition.',
      pairs: [['Clock-to-Q delay t<sub>CQ</sub>', 'Time after the active edge until Q shows the new value'], ['Setup time', 'Minimum time the input must be stable before the active edge'], ['Hold time', 'Minimum time the input must stay stable after the active edge']],
      explanation: 'All three are measured from the active (rising) clock edge; t<sub>CQ</sub> concerns the output, setup and hold the input.' },
    { id: 't6-q79', subtopic: 't6-timing', type: 'tf', difficulty: 1, src: c('c19v3 00:06:23'),
      prompt: 'Setup time is measured <b>after</b> the active clock edge.',
      answer: false,
      explanation: 'False. Setup time is the minimum time the input must be stable <i>before</i> the edge; hold time is the one after the edge.' },
    { id: 't6-q80', subtopic: 't6-timing', type: 'mc', difficulty: 2, src: c('c19v3 00:08:20', 'c19v3 00:07:03'),
      prompt: 'A flip-flop has t<sub>hold</sub> = 0.5 ns. Its D input changes 0.2 ns <b>after</b> the rising edge. What is the problem?',
      choices: ['A hold-time violation — incorrect data may be stored', 'A setup-time violation', 'A clock-to-Q violation', 'No problem — changes after the edge never matter'],
      answer: 0,
      explanation: 'D had to stay stable for 0.5 ns after the edge but changed after 0.2 ns, so the hold requirement is broken. Setup concerns the time before the edge; t<sub>CQ</sub> is a delay of the output, not a requirement on D.' },
    { id: 't6-q81', subtopic: 't6-timing', type: 'numeric', difficulty: 3, src: supp('Maximum clock frequency f_max = 1 / (t_CQ + t_logic,max + t_setup)'),
      prompt: 't<sub>CQ</sub> = 3 ns, the slowest logic path between two registers is 12 ns, and t<sub>setup</sub> = 5 ns. What is the maximum clock frequency, in MHz?', answer: 50,
      steps: ['T<sub>min</sub> = t<sub>CQ</sub> + t<sub>logic,max</sub> + t<sub>setup</sub> = 3 + 12 + 5 = 20 ns.', 'f<sub>max</sub> = 1 / 20 ns = 0.05 × 10<sup>9</sup> Hz = 50 MHz.'],
      explanation: 'The clock period must cover the flip-flop delay, the slowest logic path and the setup time of the next flip-flop. (Supplemental formula — the lecture defers it to a later class.)' },
    { id: 't6-q82', subtopic: 't6-timing', type: 'numeric', difficulty: 2, src: supp('Minimum clock period T ≥ t_CQ + t_logic + t_setup'),
      prompt: 't<sub>CQ</sub> = 0.5 ns, t<sub>logic,max</sub> = 3 ns, t<sub>setup</sub> = 0.5 ns. What is the minimum clock period, in ns?', answer: 4, tolerance: 0.001,
      steps: ['T<sub>min</sub> = 0.5 + 3 + 0.5', '= 4 ns'],
      explanation: 'Add the three delays on the register-to-register path. (Supplemental formula.)' },
    { id: 't6-q83', subtopic: 't6-timing', type: 'mc', difficulty: 3, src: supp('Hold-time constraint t_CQ + t_logic,min ≥ t_hold'),
      prompt: 'A path has t<sub>CQ</sub> + t<sub>logic,min</sub> = 0.3 ns, but the receiving flip-flop needs t<sub>hold</sub> = 0.5 ns. Which fix works?',
      choices: ['Add delay to that short path (e.g. buffers)', 'Lower the clock frequency', 'Raise the clock frequency', 'Use a clock with a larger duty cycle'],
      answer: 0,
      steps: ['The new value races through the short path and reaches D 0.3 ns after the edge — before the 0.5 ns hold window ends.', 'The hold check t<sub>CQ</sub> + t<sub>logic,min</sub> ≥ t<sub>hold</sub> does not contain the clock period.', 'So only lengthening the short path (or a flip-flop with a smaller hold time) helps.'],
      explanation: 'Changing the clock period fixes setup problems, not hold problems; duty cycle does not enter the constraint either. (Supplemental.)' },
    { id: 't6-q84', subtopic: 't6-timing', type: 'mc', difficulty: 1, src: c('c19v3 00:00:06', 'c19v3 00:02:29'),
      prompt: 'What timing does this course assume in its problems and labs for flip-flops?',
      choices: ['Ideal timing: right after the rising edge the new value is stored and on Q', 'A fixed 10 ns clock-to-Q delay', 'Setup and hold times must be computed for every problem', 'Flip-flops change on both clock edges'],
      answer: 0,
      explanation: 'The lecture says problems and labs use “quote-unquote ideal conditions”, while you must still know that setup, hold and clock-to-Q exist.' },

    /* ---------------------------------------------------------------- t6-counters */
    { id: 't6-q85', subtopic: 't6-counters', type: 'short', difficulty: 1, src: c('c20v1 00:01:39'),
      prompt: 'A 3-bit up counter holds 011. What does it hold after the next counting edge?', normalize: 'binary', width: 3, accept: [inc('011')],
      steps: ['next = current + 1', '011 + 001 = 100'],
      explanation: 'Counting up increments the value by one.' },
    { id: 't6-q86', subtopic: 't6-counters', type: 'numeric', difficulty: 1, src: c('c20v1 00:03:03', 'c20v1 00:04:37'),
      prompt: 'How many different values does a 4-bit binary up counter go through before it wraps around to its starting value?', answer: 16,
      steps: ['4 bits → 2<sup>4</sup> patterns, 0000 to 1111.', 'After 1111 it wraps to 0000, so it cycles through 16 values.'],
      explanation: 'An n-bit counter counts modulo 2<sup>n</sup>.' },
    { id: 't6-q87', subtopic: 't6-counters', type: 'numeric', difficulty: 2, src: c('c20v1 00:03:21', 'c20v1 00:04:37'),
      prompt: 'A 4-bit up counter holds 1101. After 5 counting edges, what does it hold (in decimal)?', answer: (13 + 5) % 16,
      steps: ['1101 = 13.', '13 → 14 → 15 → (wrap) 0 → 1 → 2.', 'Equivalently (13 + 5) mod 16 = 18 mod 16 = 2.'],
      explanation: 'After 1111 the counter wraps to 0000 and keeps counting.' },
    { id: 't6-q88', subtopic: 't6-counters', type: 'short', difficulty: 2, src: c('c20v1 00:05:20', 'c20v1 00:05:57'),
      prompt: 'A 3-bit down counter holds 010. What does it hold after three counting edges?', normalize: 'binary', width: 3, accept: [dec(dec(dec('010')))],
      steps: ['010 − 1 = 001.', '001 − 1 = 000.', '000 − 1 = 000 + 111 (two’s complement of 001) = 111.'],
      explanation: 'The down counter wraps from 000 to 111.' },
    { id: 't6-q89', subtopic: 't6-counters', type: 'mc', difficulty: 2, src: c('c20v1 00:02:09', 'c20v1 00:05:20'),
      prompt: 'Which counter does this state diagram describe? (Each arrow is taken at a rising edge while counting is enabled.)',
      diagram: fsmCounter(B3, i => (i + 7) % 8, 0),
      choices: ['A 3-bit down counter', 'A 3-bit up counter', 'A mod-7 up counter', 'A shift register'],
      answer: 0,
      explanation: 'Every arrow goes from a value to the value one smaller, and 000 goes to 111: counting down with wrap-around through all 8 values. An up counter’s arrows would go 000 → 001 → …; a mod-7 counter has 7 states.' },
    { id: 't6-q90', subtopic: 't6-counters', type: 'numeric', difficulty: 3, src: supp('Mod-N (e.g. decade) counters'),
      prompt: 'A mod-10 up counter (0, 1, …, 9, 0, …) holds 7. What does it hold after 25 counting edges?', answer: (7 + 25) % 10,
      steps: ['A mod-10 counter returns to the same value every 10 edges.', '25 = 2 × 10 + 5, so 25 edges act like 5 edges.', '7 + 5 = 12 → 12 mod 10 = 2.'],
      explanation: '(7 + 25) mod 10 = 2. (Mod-N counters are supplemental.)' },
    { id: 't6-q91', subtopic: 't6-counters', type: 'numeric', difficulty: 2, src: supp('Flip-flops needed for a mod-N counter'),
      prompt: 'What is the minimum number of flip-flops for a mod-12 counter?', answer: 4,
      steps: ['k flip-flops can hold 2<sup>k</sup> states.', '2<sup>3</sup> = 8 &lt; 12 ≤ 16 = 2<sup>4</sup>.', 'So 4 flip-flops (4 of the 16 states unused).'],
      explanation: '⌈log<sub>2</sub> 12⌉ = 4. (Supplemental.)' },
    { id: 't6-q92', subtopic: 't6-counters', type: 'tf', difficulty: 1, src: c('c20v1 00:04:01', 'c20v1 00:04:12'),
      prompt: 'When a 3-bit up counter goes from 111 to 000, the carry out of the MSB is stored as a fourth bit in the counter.',
      answer: false,
      explanation: 'False. The counter has only three bits, so the carry is discarded — some counters bring it out as a separate carry-out signal, but it is not stored in the count.' },

    /* ---------------------------------------------------------------- t6-counterdesign */
    { id: 't6-q93', subtopic: 't6-counterdesign', type: 'boolexpr', difficulty: 2, src: c('c20v3 00:04:04', 'c20v3 00:04:18'),
      prompt: 'For a 3-bit <b>down</b> counter, terminal count is reached at 000. Write TC in terms of C2, C1, C0.',
      vars: ['C2', 'C1', 'C0'], answer: "C2'C1'C0'", maxLiterals: 3,
      steps: ['A down counter counts 111, …, 001, 000 and then wraps.', 'TC = 1 only for C2C1C0 = 000.', 'The minterm for 000 is C2′C1′C0′.'],
      explanation: 'Terminal count marks the last value before wrapping: 111 for an up counter, 000 for a down counter.' },
    { id: 't6-q94', subtopic: 't6-counterdesign', type: 'mc', difficulty: 2, src: c('c20v2 00:12:22', 'c20v2 00:12:41'),
      prompt: 'In the lecture’s 3-bit up counter, which signal drives the LD input of the internal multi-function register?',
      choices: ['CNT', 'CLR', 'TC', 'The clock'],
      answer: 0,
      explanation: '“Count equals 1 makes load equal to 1”: each edge with CNT = 1 loads the incrementer’s output. CLR drives the register’s CLR, TC is an output, and the clock goes to the clock input.' },
    { id: 't6-q95', subtopic: 't6-counterdesign', type: 'short', difficulty: 2, src: c('c20v2 00:12:41', 'c20v2 00:13:44'),
      prompt: 'The lecture’s counter holds C = 101 with CLR = 0 and CNT = 1. What is on the incrementer’s output just before the next rising edge?', normalize: 'binary', width: 3, accept: [inc('101')],
      steps: ['The incrementer’s input is the register output Q = 101.', 'It outputs Q + 1 = 101 + 001 = 110.', 'At the next edge (LD = CNT = 1) 110 is loaded.'],
      explanation: 'The incrementer always shows the next count; the edge stores it.' },
    { id: 't6-q96', subtopic: 't6-counterdesign', type: 'short', difficulty: 3, src: c('c20v2 00:01:05', 'c20v2 00:01:38', 'c20v2 00:14:22'),
      prompt: 'The lecture’s 3-bit up counter holds 000. At six rising edges (CLR, CNT) = (0, 1), (0, 1), (0, 0), (0, 1), (1, 0), (0, 1). What is C after the sixth edge?',
      normalize: 'binary', width: 3, accept: ['001'],
      steps: ['(0, 1): count → 001.', '(0, 1): count → 010.', '(0, 0): keep → 010.', '(0, 1): count → 011.', '(1, 0): synchronous clear → 000.', '(0, 1): count → 001.'],
      explanation: 'CLR = 1 clears at the edge; CNT = 1 increments; both 0 keeps.' },
    { id: 't6-q97', subtopic: 't6-counterdesign', type: 'boolexpr', difficulty: 3, src: supp('Next-state (D input) equations of a binary up counter'),
      prompt: 'A 3-bit up counter (000 → 001 → … → 111 → 000) is built from D flip-flops. Write D2 in terms of Q2, Q1, Q0 (any equivalent form; ⊕ allowed).',
      vars: ['Q2', 'Q1', 'Q0'], answer: 'Q2 ⊕ Q1Q0',
      solutionDiagram: tt(['Q2', 'Q1', 'Q0'], [['D2', 'Q2 ⊕ Q1Q0']]),
      steps: ['Next bit 2 is 1 for present states 011→100, 100→101, 101→110, 110→111: Σm(3, 4, 5, 6).', 'Bit 2 flips exactly when Q1 = Q0 = 1 (a carry into bit 2).', 'D2 = Q2 ⊕ Q1Q0 (as minimal SOP: Q2Q1′ + Q2Q0′ + Q2′Q1Q0).'],
      explanation: 'Any expression with the same truth table is accepted.' },
    { id: 't6-q98', subtopic: 't6-counterdesign', type: 'boolexpr', difficulty: 3, src: suppGuide('Designing a mod-N synchronous counter with D flip-flops'),
      prompt: 'A mod-6 counter goes 000 → 001 → 010 → 011 → 100 → 101 → 000 (states 110 and 111 never occur). Write the minimal SOP for D1.',
      vars: ['Q2', 'Q1', 'Q0'], minterms: [1, 2], dontcares: [6, 7], answer: "Q2'Q1'Q0 + Q1Q0'", form: 'sop', maxLiterals: 5,
      solutionDiagram: kmapOf(['Q2', 'Q1', 'Q0'], [1, 2], [6, 7], ["Q2'Q1'Q0", "Q1Q0'"]),
      steps: ['Next bit 1: 000→001: 0, 001→010: 1, 010→011: 1, 011→100: 0, 100→101: 0, 101→000: 0.', 'D1 = Σm(1, 2) + d(6, 7).', 'm2 groups with X6: Q1Q0′.', 'm1 (001) has no adjacent 1 or X (000, 011 and 101 are 0s), so it stays Q2′Q1′Q0.', 'D1 = Q2′Q1′Q0 + Q1Q0′ (5 literals).'],
      explanation: 'The don’t-cares only help m2; m1 must be covered on its own.' },
    { id: 't6-q99', subtopic: 't6-counterdesign', type: 'boolexpr', difficulty: 3, src: suppGuide('Designing a mod-N synchronous counter with D flip-flops'),
      prompt: 'For the same mod-6 counter (000 → … → 101 → 000; 110, 111 unused), write the minimal SOP for D2.',
      vars: ['Q2', 'Q1', 'Q0'], minterms: [3, 4], dontcares: [6, 7], answer: "Q1Q0 + Q2Q0'", form: 'sop', maxLiterals: 4,
      solutionDiagram: kmapOf(['Q2', 'Q1', 'Q0'], [3, 4], [6, 7], ['Q1Q0', "Q2Q0'"]),
      steps: ['Next bit 2 is 1 for 011→100 and 100→101: Σm(3, 4) + d(6, 7).', 'm3 with X7 → Q1Q0.', 'm4 with X6 → Q2Q0′.', 'D2 = Q1Q0 + Q2Q0′ (4 literals).'],
      explanation: 'Using the unused states as don’t-cares shrinks both terms.' },
    { id: 't6-q100', subtopic: 't6-counterdesign', type: 'boolexpr', difficulty: 2, src: suppGuide('Terminal count of a mod-N counter'),
      prompt: 'A mod-6 up counter (000 … 101, then 000) should raise TC in state 101. States 110 and 111 never occur. Write the minimal TC in terms of C2, C1, C0.',
      vars: ['C2', 'C1', 'C0'], minterms: [5], dontcares: [6, 7], answer: 'C2C0', maxLiterals: 2,
      steps: ['TC = Σm(5) + d(6, 7).', 'Group m5 (101) with X7 (111) → C2C0.', 'No other used state has C2 = C0 = 1, so TC = C2C0.'],
      explanation: 'Without the don’t-cares it would be C2C1′C0; the unused state 111 lets C1 drop out.' },
    { id: 't6-q101', subtopic: 't6-counterdesign', type: 'tf', difficulty: 1, src: c('c20v2 00:01:05', 'c20v2 00:01:30'),
      prompt: 'In the lecture’s counter, CLR = 1 clears the count at the next positive clock edge, not immediately.',
      answer: true,
      explanation: 'True. CLR is a synchronous clear (“if clear is equal to 1 and on positive edge of clock the content … is put to all zeros”). The separate reset input is the one that acts immediately.' },
    { id: 't6-q102', subtopic: 't6-counterdesign', type: 'mc', difficulty: 2, src: supp('Mod-N counters'),
      prompt: 'Which counter does this state diagram describe? (Each arrow is taken at a rising edge while counting is enabled; the state output is TC.)',
      diagram: fsmCounter(B3.slice(0, 6), i => (i + 1) % 6, 5),
      choices: ['A mod-6 up counter', 'A 3-bit up counter that counts to 111', 'A mod-6 down counter', 'A 6-bit counter'],
      answer: 0,
      explanation: 'Six states, 000 up to 101, then back to 000: a mod-6 up counter with TC = 1 in 101. A full 3-bit counter would also visit 110 and 111; a 6-bit counter would have 64 states.' },
    { id: 't6-q103', subtopic: 't6-counterdesign', type: 'mc', difficulty: 3, src: c('c20v2 00:03:12', 'c20v2 00:12:22'),
      prompt: 'The lecture’s 3-bit up counter starts at 000 and receives the CNT waveform below. After which rising edge does TC first become 1?',
      diagram: tm([['CLK', CK(9, 2)], ['CNT', held(CT_CNT, 2)]], true),
      choices: ['Edge 8', 'Edge 7', 'Edge 9', 'TC never becomes 1 here'],
      answer: 0,
      solutionDiagram: tm([['CLK', CK(9, 2)], ['CNT', held(CT_CNT, 2)], ...bitsAfter('C', CT_Q, '000', 2), ['TC', andW(...bitsAfter('C', CT_Q, '000', 2).map(s => s[1]))]], true),
      steps: ['Edges 1–3 count: 001, 010, 011.', 'Edge 4 has CNT = 0: the count stays 011.', 'Edges 5–8 count: 100, 101, 110, 111.', 'TC = C2·C1·C0 becomes 1 at edge 8 (and the count wraps to 000 at edge 9).'],
      explanation: 'Without the pause TC would come at edge 7; the one period with CNT = 0 delays everything by one edge.' },

    /* ---------------------------------------------------------------- t6-timers */
    { id: 't6-q104', subtopic: 't6-timers', type: 'mc', difficulty: 1, src: c('c20v3 00:00:07', 'c20v3 00:00:59'),
      prompt: 'What is a timer, as defined in the lecture?',
      choices: ['A sequential circuit that generates a pulse at a specified (possibly repeating) time interval', 'A combinational circuit that converts a count into seconds', 'A flip-flop with two clock inputs', 'An oscillator that produces the clock'],
      answer: 0,
      explanation: 'A timer uses a counter to produce a pulse after a set number of clock cycles, repeatedly if desired. The oscillator only provides the clock the timer counts.' },
    { id: 't6-q105', subtopic: 't6-timers', type: 'short', difficulty: 2, src: c('c20v3 00:06:38', 'c20v4 00:00:59'),
      prompt: 'The lecture’s timer gets the upper bound 110 (six). What is on the decrementer’s output?', normalize: 'binary', width: 3, accept: [dec('110')],
      steps: ['DEC subtracts 1.', '110 − 001 = 101 (five).', 'Counting 101, 100, …, 000 gives 6 counts.'],
      explanation: 'The decrementer turns the upper bound N into the start value N − 1.' },
    { id: 't6-q106', subtopic: 't6-timers', type: 'numeric', difficulty: 2, src: c('c20v4 00:06:45', 'c20v4 00:08:29'),
      prompt: 'The lecture’s timer runs from a 1 µs clock with upper bound 5. How many microseconds are there from one T pulse to the next?', answer: 5,
      steps: ['The counter goes 100, 011, 010, 001, 000 and reloads: 5 counts per interval.', 'One count per clock cycle = 1 µs.', '5 × 1 µs = 5 µs.'],
      explanation: 'Interval = upper bound × clock period.' },
    { id: 't6-q107', subtopic: 't6-timers', type: 'numeric', difficulty: 3, src: supp('Choosing a timer count from the clock frequency'),
      prompt: 'A timer like the lecture’s runs from a 100 MHz clock and must pulse every 1 µs. What value (decimal) ends up loaded into its count-down counter?', answer: 99,
      steps: ['T<sub>CLK</sub> = 1 / 100 MHz = 10 ns.', 'Counts per interval N = 1 µs / 10 ns = 100.', 'Start value = N − 1 = 99.'],
      explanation: 'The decrementer turns the upper bound 100 into 99, so the counter counts 99 … 0 = 100 cycles.' },
    { id: 't6-q108', subtopic: 't6-timers', type: 'numeric', difficulty: 3, src: supp('Bits needed to hold a count'),
      prompt: 'How many bits must the counter of the previous timer have to hold the start value 99?', answer: 7,
      steps: ['2<sup>6</sup> = 64 ≤ 99 &lt; 128 = 2<sup>7</sup>.', '99 = 1100011<sub>2</sub> — 7 bits.'],
      explanation: 'The lecture notes its design works for any upper bound up to the largest number the bits can represent.' },
    { id: 't6-q109', subtopic: 't6-timers', type: 'tf', difficulty: 2, src: c('c20v4 00:08:00', 'c20v4 00:08:29'),
      prompt: 'In the lecture’s timer example, the T pulse lasts one full clock cycle (1 µs).',
      answer: true,
      explanation: 'True. TC is 1 while the count is 000, which lasts until the next edge reloads the counter: one clock period, 1 µs.' },
    { id: 't6-q110', subtopic: 't6-timers', type: 'mc', difficulty: 3, src: c('c20v4 00:09:46', 'c20v4 00:10:14'),
      prompt: 'Suppose the decrementer were removed, so the timer loads the upper bound 5 itself into the count-down counter. How often would T pulse?',
      choices: ['Every 6 clock cycles', 'Every 5 clock cycles', 'Every 4 clock cycles', 'It would never pulse'],
      answer: 0,
      steps: ['The counter would count 5, 4, 3, 2, 1, 0 before reloading.', 'That is 6 values, one per clock cycle.', 'So T would come every 6 cycles — one cycle too many.'],
      explanation: 'This is exactly why the lecture inserts the decrementer: counting down to and including 0 adds one count.' },
    { id: 't6-q111', subtopic: 't6-timers', type: 'short', difficulty: 3, src: c('c20v4 00:01:22', 'c20v4 00:06:45', 'c20v4 00:08:29'),
      prompt: 'The lecture’s timer has upper bound 4, so edge 1 loads the counter with 011 and the counter counts down from there, reloading after it reaches 000. What does the counter hold right after edge 7?',
      normalize: 'binary', width: 3, accept: [run('xxx', ['1', '0', '0', '0', '0', '0', '0'], (q, ld) => (ld === '1' || q === '000' ? dec('100') : dec(q)))[6]],
      steps: ['Edge 1: load 011.', 'Edges 2–4: 010, 001, 000 (TC = 1, T pulse).', 'Edge 5: TC = 1 made load = 1 → reload 011.', 'Edges 6–7: 010, 001.'],
      explanation: 'The pattern repeats every 4 edges: 011, 010, 001, 000.' },
    { id: 't6-q112', subtopic: 't6-timers', type: 'mc', difficulty: 2, src: c('c20v4 00:05:58', 'c20v4 00:07:37'),
      prompt: 'In the lecture’s timer, what makes the count-down counter reload its start value after reaching 000?',
      choices: ['TC = 1 makes the counter’s load input (LD OR TC) equal to 1', 'The external LD input pulses again', 'The decrementer resets the counter', 'The asynchronous reset'],
      answer: 0,
      explanation: 'The counter’s load is the OR of the external LD and TC. After the first load LD stays 0, so TC alone triggers each reload, and the mux supplies the stored start value.' },

    /* ---------------------------------------------------------------- t6-jkt */
    { id: 't6-q113', subtopic: 't6-jkt', type: 'mc', difficulty: 1, src: supp('T flip-flop behavior'),
      prompt: 'A T flip-flop has T = 1 at a rising edge. What happens to Q?',
      choices: ['It toggles', 'It holds', 'It resets to 0', 'It sets to 1'],
      answer: 0,
      explanation: 'T = 1 toggles (Q⁺ = Q′); T = 0 holds. (Supplemental.)' },
    { id: 't6-q114', subtopic: 't6-jkt', type: 'boolexpr', difficulty: 2, src: supp('JK flip-flop characteristic equation'),
      prompt: 'Write the minimal SOP for the JK flip-flop’s next state Q⁺ in terms of J, K and the present Q.',
      vars: ['J', 'K', 'Q'], minterms: [1, 4, 5, 6], answer: "JQ' + K'Q", form: 'sop', maxLiterals: 4,
      solutionDiagram: kmapOf(['J', 'K', 'Q'], [1, 4, 5, 6], [], ["JQ'", "K'Q"]),
      steps: ['Rows JKQ: 000 → 0, 001 → 1 (hold); 010 → 0, 011 → 0 (reset); 100 → 1, 101 → 1 (set); 110 → 1, 111 → 0 (toggle).', 'Q⁺ = Σm(1, 4, 5, 6).', 'Group m4, m6 → JQ′; group m1, m5 → K′Q.', 'Q⁺ = JQ′ + K′Q (4 literals).'],
      explanation: 'The flip-flop becomes 1 if it is 0 and J asks for 1, or if it is 1 and K does not ask for 0.' },
    { id: 't6-q115', subtopic: 't6-jkt', type: 'boolexpr', difficulty: 2, src: supp('T flip-flop characteristic equation'),
      prompt: 'Write the T flip-flop’s next state Q⁺ in terms of T and Q (any equivalent form; ⊕ allowed).',
      vars: ['T', 'Q'], answer: 'T ⊕ Q',
      steps: ['T = 0: Q⁺ = Q (rows TQ 00 → 0, 01 → 1).', 'T = 1: Q⁺ = Q′ (rows 10 → 1, 11 → 0).', 'Q⁺ = Σm(1, 2) = T′Q + TQ′ = T ⊕ Q.'],
      explanation: 'That is why a D flip-flop with D = T ⊕ Q behaves as a T flip-flop.' },
    { id: 't6-q116', subtopic: 't6-jkt', type: 'match', difficulty: 2, src: supp('JK excitation table'),
      prompt: 'Match each required transition with the JK inputs that produce it (X = don’t care).',
      pairs: [['0 → 0', 'J = 0, K = X'], ['0 → 1', 'J = 1, K = X'], ['1 → 0', 'J = X, K = 1'], ['1 → 1', 'J = X, K = 0']],
      explanation: 'From 0, K does not matter (both hold and reset give 0, both set and toggle give 1). From 1, J does not matter (hold/set give 1, reset/toggle give 0).' },
    { id: 't6-q117', subtopic: 't6-jkt', type: 'short', difficulty: 3, src: supp('JK flip-flop behavior'),
      prompt: 'A JK flip-flop starts at Q = 1. At six rising edges JK = 00, 01, 10, 11, 11, 00. Type Q after each edge as a 6-bit string (first edge first).',
      normalize: 'binary', width: 6, accept: [atEdges(CK(6), jkQ(CK(6), held(['0', '0', '1', '1', '1', '0']), held(['0', '1', '0', '1', '1', '0']), '1'))],
      steps: ['00: hold → 1', '01: reset → 0', '10: set → 1', '11: toggle → 0', '11: toggle → 1', '00: hold → 1', 'Q = 101011'],
      explanation: 'Hold, reset, set, toggle — read each pair from the characteristic table.' },
    { id: 't6-q118', subtopic: 't6-jkt', type: 'numeric', difficulty: 2, src: supp('T flip-flop as a frequency divider'),
      prompt: 'A T flip-flop with T = 1 is clocked at 100 MHz. What is the frequency of its Q output, in MHz?', answer: 50,
      steps: ['Q toggles at every rising edge.', 'A full Q period (0 → 1 → 0) takes two clock periods.', 'f<sub>Q</sub> = 100 MHz / 2 = 50 MHz.'],
      explanation: 'A toggling flip-flop divides the clock frequency by two — the basis of ripple counters.' },
    { id: 't6-q119', subtopic: 't6-jkt', type: 'mc', difficulty: 3, src: supp('T excitation table'),
      prompt: 'When designing a counter with T flip-flops, the T input of a bit must be 1 exactly when …',
      choices: ['that bit must change in the next state', 'that bit is 1 in the next state', 'that bit is 1 in the present state', 'that bit is 0 in the present state'],
      answer: 0,
      explanation: 'T = 1 toggles, so T must be 1 precisely for 0→1 and 1→0 transitions. “Bit is 1 in the next state” is the D-flip-flop rule (D = Q⁺); the present value alone does not say whether the bit changes. (For an up counter that happens when all lower bits are 1; for a down counter, when they are all 0.)' },
    { id: 't6-q120', subtopic: 't6-jkt', type: 'boolexpr', difficulty: 3, src: supp('T-flip-flop counter design'),
      prompt: 'A 3-bit up counter is built from T flip-flops. Write the minimal T2 in terms of Q2, Q1, Q0.',
      vars: ['Q2', 'Q1', 'Q0'], minterms: [3, 7], answer: 'Q1Q0', maxLiterals: 2,
      steps: ['Bit 2 changes on 011 → 100 and 111 → 000.', 'T2 = Σm(3, 7).', 'Group {3, 7} → Q1Q0.'],
      explanation: 'Bit 2 toggles when both lower bits are 1 (a carry comes in). Likewise T1 = Q0 and T0 = 1.' },
  ];

  /* ================================================================== practice generators (catalogue ids, README §5) */
  const practice = [
    { gen: 'srLatch', label: 'SR latch: trace Q through a sequence of S, R inputs', subtopic: 't6-srlatch' },
    { gen: 'dffTrace', label: 'D flip-flop: Q after each rising edge', subtopic: 't6-dff' },
    { gen: 'registerLoad', label: 'Load register: load or keep at each edge', subtopic: 't6-loadreg' },
    { gen: 'shiftRegister', label: 'Shift register (4-bit): contents after each shift', subtopic: 't6-shiftreg', params: { bits: 4 } },
    { gen: 'shiftRegister', label: 'Shift register (8-bit): contents after each shift', subtopic: 't6-shiftreg', params: { bits: 8 } },
    { gen: 'counterSeq', label: 'Counters: next states (up/down, mod-N)', subtopic: 't6-counters' },
  ];

  Study.registerSection({
    id: 't6', order: 6,
    title: 'Synchronous Sequential Logic',
    short: 'Sequential',
    hub: '../#topic-6',
    summary: 'Storing bits: sequential vs. combinational logic, the clock, SR and D latches, the edge-triggered D flip-flop, basic, load, multi-function and shift registers, setup/hold/clock-to-Q timing, counters and timers.',
    finalWeight: 11,
    sources: [
      { file: V.c17v1, title: 'Class 17 · Intro to Synchronous Sequential Logic' },
      { file: V.c17v2, title: 'Class 17 · Clock' },
      { file: V.c17v3, title: 'Class 17 · SR Latch' },
      { file: V.c17v4, title: 'Class 17 · D Latch' },
      { file: V.c17v5, title: 'Class 17 · D Flip-Flop (partial upload)' },
      { file: V.c18v1, title: 'Class 18 · 4-bit Register' },
      { file: V.c18v2, title: 'Class 18 · 4-bit Load Register' },
      { file: V.c18v3, title: 'Class 18 · Shifting' },
      { file: V.c19v1, title: 'Class 19 · Multi-function Registers' },
      { file: V.c19v2, title: 'Class 19 · Multi-function Shift Register' },
      { file: V.c19v3, title: 'Class 19 · Setup, Hold, and Clock-to-Q Delay' },
      { file: V.c20v1, title: 'Class 20 · How Counters Work' },
      { file: V.c20v2, title: 'Class 20 · Counter Design' },
      { file: V.c20v3, title: 'Class 20 · Timers (1/2)' },
      { file: V.c20v4, title: 'Class 20 · Timers (2/2)' },
    ],
    gaps: [
      'Class 17 Video 5 (D flip-flop, Topic_6/class19_video5) is a partial upload: the transcript stops at 4:35, right after the master–servant block diagram. How the two latches hand the value over at the clock edge is supplemental here.',
      'Several videos point to in-class work that is not mirrored: more D flip-flop operation (Class 18 Video 1 at 0:24), worked multi-function register examples (Class 18 Video 3 at 5:34), the counter with load and the down counter (Class 20 Video 2 at 14:44 — Class 20 Video 3 at 3:04 uses the count-down counter with load as a ready-made box), and the shift-left question (Class 19 Video 2 at 12:02). Versions of these in the app are worked out here and marked as such.',
      'The zyBook participation activities that the SR-latch video relies on (step-by-step SR latch animation, the metastability section; Class 17 Video 3 at 2:14 and 8:40) are not mirrored.',
      'The maximum clock frequency from t_CQ, logic delay and t_setup is announced for later classes (Class 19 Video 3 at 9:37) but is not in the mirrored lectures; the formula and its problems are supplemental.',
      'JK and T flip-flops, the NAND (S′R′) and gated SR latches, ripple counters, mod-N counter design from next-state equations and the SISO/SIPO/PISO/PIPO names are listed on the hub’s Final Exam page but are not taught in any mirrored Topic 6 lecture; that material is supplemental.',
      'No Topic 6 slides are mirrored; every diagram here is redrawn from the transcripts.',
    ],
    subtopics, lessons, flashcards, questions, practice,
  });
})();
