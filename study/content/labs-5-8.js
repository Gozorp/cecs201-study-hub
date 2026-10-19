/* CECS 201 Study — Section labs (part 2 of 2): Labs 5–8, Verilog & Vivado.
   Extends the 'labs' section registered by content/labs-1-4.js with subtopics lab5…lab8.
   Sources: every Lab 5–8 transcript (read end to end), the Lab 4 Vectors video (Lab 6 reuses it) and Always/Case video
   (blocking vs nonblocking, the MUX), plus the Topic 5/6/7 lectures that the Lab 6 page asks students to re-watch
   (half/full adder, ripple adder, subtractor, MUX) and that Labs 7–8 build on (clock, registers, FSM encoding).
   Code that appears only on the (unmirrored) slides is reconstructed from the narration and flagged as such.
   Every Verilog snippet whose behaviour is stated in an answer was checked with Icarus Verilog 12. */
(function () {
  'use strict';
  const Study = window.Study;
  const L = Study.logic;

  /* ---------- transcript files ---------- */
  const V = {
    vif: 'Lab_5/Verilog_IF.mp4.vtt',
    hier: 'Lab_5/Verilog_Hierarchy.mp4.vtt',
    simh: 'Lab_5/Vivado_simulate_hierarchy.mp4.vtt',
    vec: 'Lab_4/Verilog_vectors.mp4.vtt',
    alw: 'Lab_4/Verilog_always_case-v2.mp4.vtt',
    idk: 'Lab_1/Verilog_id_key_module_01.mp4.vtt',
    clk: 'Lab_7/Verilog_CLK_generator.mp4.vtt',
    reg: 'Lab_7/Verilog_Register.mp4.vtt',
    fsm1: 'Lab_8/Verilog_FSM_01.mp4.vtt',
    fsm2: 'Lab_8/Verilog_FSM_02.mp4.vtt',
    mux: 'Topic_5/class10_video1.mp4.vtt',
    ha: 'Topic_5/class16_video2.mp4.vtt',
    fa: 'Topic_5/class16_video3.mp4.vtt',
    rca: 'Topic_5/class17_video1.mp4.vtt',
    sub: 'Topic_5/class17_video2.mp4.vtt',
    tclk: 'Topic_6/class19_video2.mp4.vtt',
    treg: 'Topic_6/class20_video1.mp4.vtt',
    tld: 'Topic_6/class20_video2.mp4.vtt',
    fdef: 'Topic_7/class25_video1.mp4.vtt',
    mealy: 'Topic_7/class25_video4.mp4.vtt',
    enc: 'Topic_7/class27_video1.mp4.vtt',
  };
  const at = (k, ...ts) => ts.map(t => V[k] + '#' + t);
  const course = (...refLists) => ({ type: 'course', refs: [].concat(...refLists) });
  const supp = note => ({ type: 'supplemental', note });

  /* ---------- supplemental notes ---------- */
  const S_VLOG = 'Standard Verilog (IEEE 1364-2001) behaviour, as in Ciletti or Palnitkar; not stated in the mirrored lab videos. Checked by simulation in Icarus Verilog.';
  const S_PRACT = 'Practice problem written for this app from course constructs; standard Verilog, answer checked by simulation in Icarus Verilog.';
  const S_LOGIC = 'Standard logic-design material (e.g. Mano & Ciletti); answer checked by truth-table equivalence.';
  const S_VIVADO = 'Standard Vivado simulator behaviour (AMD/Xilinx UG900); not shown in the mirrored lab videos.';
  const NS_L5 = 'Lab 5 handout, Verilog-if-v01.pdf and Verilog-hiarachical-v01.pdf are not mirrored.';
  const NS_L6 = 'Lab 6 handout (which adders/subtractors/MUX/XOR modules to write) is not mirrored, and no mirrored transcript shows the “XOR gate (always and case)” video.';
  const NS_L7 = 'Lab 7 handout and the slides Verilog-clk_generator-v1.pdf / Verilog-register-v1.pdf are not mirrored (exact registers, counters and test cases).';
  const NS_L8 = 'Lab 8 handout (the lab’s own state diagram and required state encoding) and Verilog-fsm-v1.pdf are not mirrored.';

  /* ---------- HTML helpers (code is escaped) ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const c = s => '<code>' + esc(s) + '</code>';
  const pre = (...lines) => '<pre><code>' + esc(lines.join('\n')) + '</code></pre>';
  const code = (...lines) => lines.join('\n');
  const table = (head, rows) =>
    '<table><thead><tr>' + head.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr>' + r.map(x => '<td>' + x + '</td>').join('') + '</tr>').join('') + '</tbody></table>';

  /* ---------- diagram helpers (checked at load time) ---------- */
  const tt = (vars, outs) => ({ kind: 'truthtable', vars, outputs: outs.map(([name, expr]) => ({ name, values: L.truthTable(expr, vars).rows.map(r => r.out) })) });
  const comp = (shape, label, inputs, outputs, extra) => Object.assign({ kind: 'component', shape, label, inputs, outputs }, extra || {});
  // Timing spec. A signal is [name, wave] (0/1 per slot) or [name, values[]] for a bus: a bus becomes '=' where the
  // value changes and '.' where it repeats, with its values in `data` (per signal, and all buses in order at the top level).
  function tm(signals, edges) {
    const out = [], all = [];
    let n = null;
    for (const [name, w] of signals) {
      if (Array.isArray(w)) {
        let wave = '';
        const data = [];
        w.forEach((v, i) => { if (i === 0 || v !== w[i - 1]) { wave += '='; data.push(String(v)); } else wave += '.'; });
        out.push({ name, wave, data });
        all.push(...data);
        if (n === null) n = w.length; else if (w.length !== n) throw new Error('labs-5-8: bus length for ' + name);
      } else {
        if (!/^[01x]+$/.test(w)) throw new Error('labs-5-8: bad wave for ' + name + ': ' + w);
        if (n === null) n = w.length; else if (w.length !== n) throw new Error('labs-5-8: wave length for ' + name);
        out.push({ name, wave: w });
      }
    }
    const spec = { kind: 'timing', signals: out };
    if (all.length) spec.data = all;
    if (edges) spec.edges = true;
    return spec;
  }
  // Two slots per clock cycle: slot 2k = CLK low (inputs for cycle k are applied at the falling edge that starts it),
  // slot 2k+1 = CLK high; the rising edge at the start of slot 2k+1 samples the inputs of cycle k.
  const clkWave = n => '01'.repeat(n);
  const perCycle = vals => vals.flatMap(v => [v, v]);
  // value of a register that updates at rising edges: after(k) holds from slot 2k+1 to slot 2k+2
  function regSlots(afterEdge, before) {
    const out = [];
    for (let i = 0; i < afterEdge.length * 2; i++) {
      const k = Math.floor((i - 1) / 2);              // last rising edge at or before slot i
      out.push(i === 0 ? before : afterEdge[k]);
    }
    return out;
  }
  const bitsOf = (vals, j, w) => vals.map(v => v.padStart(w, '0')[w - 1 - j]).join('');

  // Ripple addition a + b + cin: c[i] = carry INTO bit i (c[0] = cin), c[n] = carry out of the MSB.
  function add(a, b, cin = 0) {
    const n = a.length, cy = [cin];
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = Number(a[n - 1 - i]) + Number(b[n - 1 - i]) + cy[i];
      s = String(t & 1) + s;
      cy.push(t >> 1);
    }
    return { s, c: cy, cout: cy[n], v: cy[n] ^ cy[n - 1] };
  }
  // Column-aligned diagram (same convention as t2/t5): carry row = carry into each column plus the carry out on the left.
  function addDiagram(a, b, cin = 0) {
    const r = add(a, b, cin), n = a.length;
    return { kind: 'arith', op: '+', rows: [a, b], carry: r.c.slice().reverse().join(''), result: String(r.cout) + r.s, width: n + 1 };
  }
  const flip = s => [...s].map(x => (x === '1' ? '0' : '1')).join('');

  /* ---------- the Lab 8 / Lab 5 example FSM (Moore, 4 states, input en, 4-bit output) ---------- */
  const FSM = {
    states: ['S0', 'S1', 'S2', 'S3'],
    out: { S0: '1111', S1: '0111', S2: '0011', S3: '0001' },
    next: (s, en) => (en ? ['S1', 'S2', 'S3', 'S0'][['S0', 'S1', 'S2', 'S3'].indexOf(s)] : s),
  };
  // per-cycle inputs -> state after each rising edge (reset has priority)
  function fsmRun(resets, ens) {
    const st = [];
    let s = 'S0';
    resets.forEach((r, k) => { s = r ? 'S0' : FSM.next(s, ens[k]); st.push(s); });
    return st;
  }
  const dgFsm = {
    kind: 'fsm', type: 'moore', initial: 's0', layout: 'circle',
    states: FSM.states.map(s => ({ id: s.toLowerCase(), label: s, output: FSM.out[s] })),
    transitions: FSM.states.flatMap(s => [
      { from: s.toLowerCase(), to: s.toLowerCase(), label: 'en=0' },
      { from: s.toLowerCase(), to: FSM.next(s, 1).toLowerCase(), label: 'en=1' },
    ]),
  };
  // Mealy variant: same states, output wrap = 1 while in S3 with en = 1
  const dgMealy = {
    kind: 'fsm', type: 'mealy', initial: 's0', layout: 'circle',
    states: FSM.states.map(s => ({ id: s.toLowerCase(), label: s })),
    transitions: FSM.states.flatMap(s => [
      { from: s.toLowerCase(), to: s.toLowerCase(), label: '0/0' },
      { from: s.toLowerCase(), to: FSM.next(s, 1).toLowerCase(), label: s === 'S3' ? '1/1' : '1/0' },
    ]),
  };
  // simulation run used in Lab 5 (debugging) and Lab 8 (testbench): 9 clock cycles
  const RUN_RST = [1, 0, 0, 0, 0, 0, 0, 0, 0];
  const RUN_EN = [0, 1, 1, 0, 1, 1, 1, 1, 0];
  const RUN_ST = fsmRun(RUN_RST, RUN_EN);      // S0 S1 S2 S2 S3 S0 S1 S2 S2
  const runSlots = regSlots(RUN_ST, 'S0');
  const runEn = perCycle(RUN_EN);
  const dgRun = tm([
    ['clk', clkWave(RUN_EN.length)],
    ['reset', perCycle(RUN_RST).join('')],
    ['en', runEn.join('')],
    ['state', runSlots],
    ['nstate', runSlots.map((s, i) => FSM.next(s, runEn[i]))],   // combinational: follows state and en at once
    ['out', runSlots.map(s => FSM.out[s])],
  ], true);
  if (RUN_ST.join(' ') !== 'S0 S1 S2 S2 S3 S0 S1 S2 S2') throw new Error('labs-5-8: FSM run changed');
  // Mealy timing: wrap(i) = state(i) == S3 && en(i)
  const MEALY_RST = [1, 0, 0, 0, 0, 0, 0];
  const MEALY_EN = [0, 1, 1, 1, 0, 1, 0];
  const MEALY_ST = fsmRun(MEALY_RST, MEALY_EN);  // S0 S1 S2 S3 S3 S0 S0
  const mealySlots = regSlots(MEALY_ST, 'S0');
  const mealyEn = perCycle(MEALY_EN);
  const dgMealyRun = tm([
    ['clk', clkWave(MEALY_EN.length)],
    ['en', mealyEn.join('')],
    ['state', mealySlots],
    ['wrap (Mealy)', mealySlots.map((s, i) => (s === 'S3' && mealyEn[i] ? '1' : '0')).join('')],
    ['out (Moore)', mealySlots.map(s => FSM.out[s])],
  ], true);
  if (MEALY_ST.join(' ') !== 'S0 S1 S2 S3 S3 S0 S0') throw new Error('labs-5-8: Mealy run changed');

  /* ---------- reusable code ---------- */
  const CODE_IF1 = code(
    'module mux2_if(',
    '    input a,',
    '    input b,',
    '    input sel,',
    '    output reg f              // assigned inside always, so it is a reg',
    '    );',
    '    always @(sel, a, b)       // sel (tested) + a, b (right-hand sides)',
    '    begin',
    '        if (sel == 1)',
    '            f = a;            // one statement: no begin/end needed',
    '        else',
    '            f = b;',
    '    end',
    'endmodule');
  const CODE_IF2 = code(
    'always @(sel, a, b)',
    'begin',
    '    if (sel == 1)',
    '    begin                     // two statements -> begin ... end',
    '        f = a;',
    '        g = ~a;',
    '    end',
    '    else',
    '    begin',
    '        f = b;                // stand-in expressions: the slide is not mirrored',
    '        g = a & b;',
    '    end',
    'end');
  const CODE_PRIO = code(
    'module prio(input a, input b, input c, output reg y);',
    '    always @*',
    '    begin',
    '        if (a)              // checked first',
    '            y = b;',
    '        else if (b)         // only looked at when a = 0',
    '            y = c;',
    '        else                // a = 0 and b = 0',
    "            y = 1'b0;",
    '    end',
    'endmodule');
  const CODE_LATCH = code(
    '// Latch: when en = 0 nothing assigns y, so y must remember its old value',
    'always @*',
    '    if (en)',
    '        y = d;',
    '',
    '// Fix 1: complete the if',
    'always @*',
    '    if (en)',
    '        y = d;',
    '    else',
    "        y = 1'b0;",
    '',
    '// Fix 2: give y a default first (the habit used in the Lab 8 FSM code)',
    'always @*',
    'begin',
    "    y = 1'b0;",
    '    if (en)',
    '        y = d;',
    'end');
  const CODE_EQ1 = code(
    'module eq1(                      // 1-bit comparator, in the style of P. Chu\'s example',
    '    input  wire i0, i1,',
    '    output wire eq',
    '    );',
    '    wire p0, p1;                 // internal signals',
    '    assign eq = p0 | p1;',
    '    assign p0 = ~i0 & ~i1;       // both bits 0',
    '    assign p1 = i0 & i1;         // both bits 1',
    'endmodule');
  const CODE_EQ2 = code(
    'module eq2(',
    '    input  wire [1:0] a, b,',
    '    output wire aeqb',
    '    );',
    '    wire e0, e1;                 // declare internal wires before using them',
    '',
    '    // two instances of eq1, each with a unique instance name',
    '    eq1 eq_bit0_unit (.i0(a[0]), .i1(b[0]), .eq(e0));',
    '    eq1 eq_bit1_unit (.i0(a[1]), .i1(b[1]), .eq(e1));',
    '',
    '    // a and b are equal only if both bit pairs are equal',
    '    assign aeqb = e0 & e1;',
    'endmodule');
  const CODE_HA_FA = code(
    'module half_adder(input x, input y, output s, output c);',
    '    assign s = x ^ y;            // S = x\'y + xy\' = x XOR y',
    '    assign c = x & y;            // C = xy',
    'endmodule',
    '',
    'module full_adder(input x, input y, input z, output s, output c);',
    '    assign s = x ^ y ^ z;        // = sum of minterms 1, 2, 4, 7',
    '    assign c = (x & y) | (x & z) | (y & z);',
    'endmodule');
  const CODE_ADD4 = code(
    'module adder4(',
    '    input  [3:0] a,',
    '    input  [3:0] b,',
    '    input        cin,',
    '    output [3:0] s,',
    '    output       cout',
    '    );',
    '    wire [3:1] c;                // carries between the stages',
    '',
    '    full_adder fa0 (.x(a[0]), .y(b[0]), .z(cin),  .s(s[0]), .c(c[1]));',
    '    full_adder fa1 (.x(a[1]), .y(b[1]), .z(c[1]), .s(s[1]), .c(c[2]));',
    '    full_adder fa2 (.x(a[2]), .y(b[2]), .z(c[2]), .s(s[2]), .c(c[3]));',
    '    full_adder fa3 (.x(a[3]), .y(b[3]), .z(c[3]), .s(s[3]), .c(cout));',
    'endmodule');
  const CODE_ADDSUB = code(
    'module addsub4(',
    '    input  [3:0] a,',
    '    input  [3:0] b,',
    '    input        m,              // 0 = add, 1 = subtract',
    '    output [3:0] s,',
    '    output       c,              // carry out (unsigned result)',
    '    output       v               // overflow (signed, two\'s complement)',
    '    );',
    '    wire [3:0] bx;',
    '    wire [4:1] cy;               // cy[i] = carry out of bit i-1',
    '',
    '    assign bx = b ^ {4{m}};      // each bit: b XOR m  (m = 1 flips b)',
    '',
    '    full_adder fa0 (.x(a[0]), .y(bx[0]), .z(m),     .s(s[0]), .c(cy[1]));  // Cin = m',
    '    full_adder fa1 (.x(a[1]), .y(bx[1]), .z(cy[1]), .s(s[1]), .c(cy[2]));',
    '    full_adder fa2 (.x(a[2]), .y(bx[2]), .z(cy[2]), .s(s[2]), .c(cy[3]));',
    '    full_adder fa3 (.x(a[3]), .y(bx[3]), .z(cy[3]), .s(s[3]), .c(cy[4]));',
    '',
    '    assign c = cy[4];',
    '    assign v = cy[4] ^ cy[3];    // carries out of bit 3 and bit 2 differ',
    'endmodule');
  const CODE_MUX3 = code(
    '// 1) continuous assignment with the ternary (?:) operator',
    'assign out = sel ? in1 : in0;',
    '',
    '// 2) always + if            (out declared "output reg")',
    'always @(in0, in1, sel)',
    '    if (sel == 1) out = in1;',
    '    else          out = in0;',
    '',
    '// 3) always + case          (out declared "output reg")',
    'always @(in0, in1, sel)',
    '    case (sel)',
    "        1'b0:    out = in0;",
    "        1'b1:    out = in1;",
    "        default: out = 1'bz;   // \"funky\" value: something is not connected",
    '    endcase');
  const CODE_MUX4 = code(
    'module mux4_4b(',
    '    input  [3:0] in0, in1, in2, in3,',
    '    input  [1:0] sel,',
    '    output reg [3:0] out',
    '    );',
    '    always @*',
    '        case (sel)',
    "            2'b00:   out = in0;",
    "            2'b01:   out = in1;",
    "            2'b10:   out = in2;",
    "            2'b11:   out = in3;",
    "            default: out = 4'bzzzz;",
    '        endcase',
    'endmodule');
  const CODE_XOR = code(
    'module xor_case(input a, input b, output reg f);',
    '    always @(a, b)',
    '        case ({a, b})            // concatenate the inputs: one row of the truth table per item',
    "            2'b00:   f = 1'b0;",
    "            2'b01:   f = 1'b1;",
    "            2'b10:   f = 1'b1;",
    "            2'b11:   f = 1'b0;",
    "            default: f = 1'bz;   // a or b is x/z: flag it",
    '        endcase',
    'endmodule');
  const CODE_TB_CLK = code(
    '`timescale 1ns / 1ps',
    'module reg8_tb();',
    '    reg        clk_tb;',
    '    reg        reset_tb;',
    '    reg  [7:0] din_tb;',
    '    wire [7:0] q_tb;',
    '',
    '    reg8 uut (.clk(clk_tb), .reset(reset_tb), .din(din_tb), .q(q_tb));',
    '',
    '    // clock generator: inside the testbench, OUTSIDE the initial block',
    '    always',
    '        #50 clk_tb = ~clk_tb;    // flip every 50 ns -> period 100 ns',
    '',
    '    initial',
    '    begin',
    '        clk_tb = 0;              // the clock\'s first value goes INSIDE initial',
    '        reset_tb = 1;',
    "        din_tb = 8'h3C;",
    '        #30 reset_tb = 0;',
    "        #100 din_tb = 8'hA7;",
    '        #200 $finish;',
    '    end',
    'endmodule');
  const CODE_REG8 = code(
    'module reg8(',
    '    input            clk,',
    '    input            reset,',
    '    input      [7:0] din,',
    '    output reg [7:0] q',
    '    );',
    '    always @(posedge clk, posedge reset)   // only clock and reset',
    '        if (reset)                         // reset has priority',
    "            q <= 8'h00;                    // all zeros (hex 00)",
    '        else                               // a rising clock edge',
    '            q <= din;',
    'endmodule');
  const CODE_LDCNT = code(
    '// load register: update only when ld = 1',
    'always @(posedge clk, posedge reset)',
    '    if (reset)',
    "        q <= 8'h00;",
    '    else if (ld)',
    '        q <= din;         // no "else q <= q;" needed: q keeps its value',
    '',
    '// counter with count enable',
    'always @(posedge clk, posedge reset)',
    '    if (reset)',
    "        q <= 4'b0000;",
    '    else if (en)',
    '        q <= q + 1;       // increment on each rising edge while en = 1');
  const CODE_SHIFT = code(
    '// nonblocking: both right-hand sides are read first, then q1 and q2 update together',
    'always @(posedge clk)',
    'begin',
    '    q1 <= d;',
    '    q2 <= q1;             // the OLD q1',
    'end',
    '',
    '// blocking: q1 changes immediately, so q2 copies the NEW q1',
    'always @(posedge clk)',
    'begin',
    '    q1 = d;',
    '    q2 = q1;',
    'end');
  const CODE_FSM = code(
    'module fsm_example(',
    '    input            clk,',
    '    input            reset,',
    '    input            en,',
    '    output reg [3:0] out',
    '    );',
    '    // state encoding: explicit, simple binary',
    "    localparam [1:0] S0 = 2'b00,",
    "                     S1 = 2'b01,",
    "                     S2 = 2'b10,",
    "                     S3 = 2'b11;",
    '    reg [1:0] state, nstate;      // current state, next state',
    '',
    '    // segment 1: state register (sequential)',
    '    always @(posedge clk, posedge reset)',
    '        if (reset)',
    '            state <= S0;          // all zeros',
    '        else',
    '            state <= nstate;',
    '',
    '    // segment 2: next-state logic (combinational)',
    '    always @*',
    '    begin',
    '        nstate = state;           // default: every output of this block gets a value',
    '        case (state)',
    '            S0: nstate = en ? S1 : S0;',
    '            S1: nstate = en ? S2 : S1;',
    '            S2: nstate = en ? S3 : S2;',
    '            S3: nstate = en ? S0 : S3;',
    '            default: nstate = S0;',
    '        endcase',
    '    end',
    '',
    '    // segment 3: Moore output logic (combinational, depends on state only)',
    '    always @*',
    '    begin',
    "        out = 4'b0000;            // a value no state produces: easy to spot in simulation",
    '        case (state)',
    "            S0: out = 4'b1111;",
    "            S1: out = 4'b0111;",
    "            S2: out = 4'b0011;",
    "            S3: out = 4'b0001;",
    "            default: out = 4'b0000;",
    '        endcase',
    '    end',
    'endmodule');
  const CODE_FSM_TB = code(
    '`timescale 1ns / 1ps',
    'module fsm_example_tb();',
    '    reg        clk_tb, reset_tb, en_tb;',
    '    wire [3:0] out_tb;',
    '',
    '    fsm_example uut (.clk(clk_tb), .reset(reset_tb), .en(en_tb), .out(out_tb));',
    '',
    '    always #50 clk_tb = ~clk_tb;  // Lab 7 clock generator: rising edges at 50, 150, 250 ... ns',
    '',
    '    initial',
    '    begin',
    '        clk_tb = 0;',
    '        reset_tb = 1; en_tb = 0;  // start in S0',
    '        #100 reset_tb = 0;        // inputs change at falling edges (t = 100, 200, ...)',
    '        en_tb = 1;',
    '        #200 en_tb = 0;           // the edges at 150 and 250 ns see en = 1',
    '        #100 en_tb = 1;           // the edge at 350 ns sees en = 0: state holds',
    '        #400 en_tb = 0;',
    '        #200 $finish;',
    '    end',
    'endmodule');
  const CODE_MEALY = code(
    '// Mealy output: depends on the state AND the input',
    'always @*',
    'begin',
    "    wrap = 1'b0;                  // default",
    '    if (state == S3 && en)',
    "        wrap = 1'b1;              // 1 while in S3 with en = 1 (about to return to S0)",
    'end');

  /* ======================================================================= LAB 5 */
  const lab5Lessons = [
    { id: 'lab5-l1', subtopic: 'lab5', title: 'if / else inside an always block', minutes: 7, needsSource: NS_L5 + ' The else-branch expressions of the second if example are only on the slide.',
      src: course(at('vif', '00:00:08', '00:00:43', '00:00:57', '00:02:11'), at('alw', '00:09:55')),
      blocks: [
        { type: 'text', html: `<p><b>The idea.</b> An ${c('if')} statement is a <b>procedural</b> statement, like ${c('case')} in Lab 4. The instructor’s rule: an ${c('if')} statement “needs to be enclosed within an always statement”, and that always block has its own ${c('begin … end')}. (In a testbench, procedural statements can also sit inside ${c('initial begin … end')}.)</p>
<ul><li>If the expression in the parentheses is <b>true</b>, the <b>if</b> part runs.</li>
<li>If it is <b>false</b>, the <b>else</b> part runs. So you have two ways to assign a value to the register ${c('f')}.</li>
<li>${c('f')} is assigned inside ${c('always')}, so it must be declared ${c('reg')} (Lab 4: anything assigned procedurally is a reg).</li></ul>` },
        { type: 'code', lang: 'verilog', code: CODE_IF1 },
        { type: 'callout', tone: 'tip', html: `<b>Sensitivity list for a combinational if.</b> Put in the variable you test in the parentheses (${c('sel')}) <i>and</i> every variable on the right-hand side (${c('a')}, ${c('b')}): everything whose change should re-evaluate the if. ${c('always @*')} (Lab 4) does this for you.` },
        { type: 'text', html: `<p><b>More than one statement in a branch.</b> The second example on the slide does two things in its if branch: ${c('f')} becomes ${c('a')} and ${c('g')} becomes ${c('~a')}. A branch with more than one statement needs its own ${c('begin … end')}; a branch with a single statement can do without it.</p>` },
        { type: 'code', lang: 'verilog', code: CODE_IF2 },
        { type: 'callout', tone: 'note', html: 'The slides (Verilog-if-v01.pdf) are not mirrored. The if-branch (<code>f = a; g = ~a;</code>) is narrated in the video; the else-branch expressions are not, so <code>f = b; g = a &amp; b;</code> above is a stand-in.' },
        { type: 'example', title: 'Trace the two-statement if', problem: `Using the second code block, what are ${c('f')} and ${c('g')} when ${c('sel = 0')}, ${c('a = 1')}, ${c('b = 1')}?`,
          steps: [
            `${c('sel == 1')} is false, so the <b>else</b> block runs; both of its statements run, in order.`,
            `${c('f = b')} gives f = 1.`,
            `${c('g = a & b')} gives g = 1·1 = 1.`,
            'The if block (f = a, g = ~a) does not run at all for this input.',
          ], answer: 'f = 1, g = 1' },
        { type: 'check', question: { id: 'lab5-l1-c1', type: 'tf', difficulty: 1,
          prompt: `True or false: the line ${c('if (sel == 1) f = a;')} must be written as ${c('if (sel == 1) begin f = a; end')} or it will not compile.`,
          answer: false,
          explanation: 'A branch with a single statement does not need begin … end. You need begin … end only when a branch holds more than one statement (like f = a; g = ~a;).',
          src: course(at('vif', '00:02:11', '00:02:44')) } },
        { type: 'check', question: { id: 'lab5-l1-c2', type: 'mc', difficulty: 2,
          prompt: `Which sensitivity list is right for this combinational block?` + pre('always @( ??? )', '    if (sel == 1) f = a;', '    else          f = b;'),
          choices: [c('always @(sel, a, b)'), c('always @(sel)'), c('always @(a, b)'), c('always @(posedge sel)')],
          answer: 0,
          explanation: 'List the tested variable (sel) and every right-hand-side variable (a and b): f must be re-evaluated whenever any of them changes. With only sel, a change on a or b would not update f; posedge sel is for sequential logic, not a combinational if.',
          src: course(at('vif', '00:00:57', '00:01:39')) } },
      ] },

    { id: 'lab5-l2', subtopic: 'lab5', title: 'else if chains and the latch trap', minutes: 7,
      src: course(at('fsm2', '00:03:25', '00:04:02', '00:04:36')),
      blocks: [
        { type: 'text', html: `<p><b>else if.</b> You can chain conditions: ${c('if (…) … else if (…) … else …')}. The conditions are tested <b>in order</b> and the first true one wins, so an earlier condition has <b>priority</b> over a later one. (The Lab 5 video shows only the plain if/else; the chain and its priority are standard Verilog — supplemental.)</p>` },
        { type: 'code', lang: 'verilog', code: CODE_PRIO },
        { type: 'example', title: 'Turn the priority chain into a Boolean function', problem: `Find a minimal SOP for ${c('y')} in module ${c('prio')}.`,
          steps: [
            'Branch 1 runs when a = 1 and gives y = b: contributes <b>a·b</b>.',
            'Branch 2 runs only when a = 0 and b = 1 and gives y = c: contributes <b>a′·b·c</b>.',
            'Branch 3 (a = 0, b = 0) gives y = 0: contributes nothing.',
            'y = ab + a′bc = b(a + a′c) = b(a + c) (absorption: a + a′c = a + c).',
            'y = <b>ab + bc</b> — 4 literals. A simulation of all 8 input rows agrees.',
          ], answer: 'y = ab + bc' },
        { type: 'callout', tone: 'warn', html: `<b>The latch trap.</b> In a combinational always block every output must get a value on every path. The Lab 8 video explains why: if some path forgets to assign an output, “the tool will instantiate a memory element or a latch” to remember its old value. An ${c('if')} with no ${c('else')} is the classic way to cause this.` },
        { type: 'code', lang: 'verilog', code: CODE_LATCH },
        { type: 'callout', tone: 'tip', html: 'The instructor’s habit (Lab 8): right after <code>begin</code>, before the case/if, give every output of the combinational block a default value. Then no path can leave an output unassigned.' },
        { type: 'check', question: { id: 'lab5-l2-c1', type: 'boolexpr', difficulty: 2, vars: ['S', 'A', 'B'], answer: "SA + S'B", form: 'sop', maxLiterals: 4,
          prompt: `Write a minimal SOP for ${c('f')} in terms of S, A, B:` + pre('always @*', '    if (s) f = a;', '    else   f = b;'),
          explanation: 'When s = 1 the if branch gives f = a, contributing S·A; when s = 0 the else branch gives f = b, contributing S′·B. This is the 2-to-1 MUX equation, and it is already minimal (4 literals).',
          steps: ['s = 1 → f = a: term S·A.', 's = 0 → f = b: term S′·B.', 'f = SA + S′B (4 literals; no smaller SOP exists).'],
          src: supp(S_LOGIC) } },
      ] },

    { id: 'lab5-l3', subtopic: 'lab5', title: 'Hierarchical design: eq2 built from two eq1 instances', minutes: 9, needsSource: 'Verilog-hiarachical-v01.pdf (exact eq1/eq2 code on the slide) and the P. Chu book are not mirrored.',
      src: course(at('hier', '00:00:12', '00:00:53', '00:01:34', '00:02:12', '00:02:28', '00:03:08', '00:03:49', '00:04:21', '00:04:56', '00:05:09')),
      blocks: [
        { type: 'text', html: `<p><b>The idea.</b> Big designs are built <b>hierarchically</b>: a top module instantiates smaller modules (sub-modules) and wires them together. As designers we treat a sub-module as a <b>black box</b> — we only need to know its ports and what it does. The Lab 5 example (from P. Chu, <i>FPGA Prototyping by Verilog Examples</i>) builds a 2-bit equality comparator ${c('eq2')} from two 1-bit comparators ${c('eq1')}.</p>
<p>${c('eq1')} has two 1-bit inputs (${c('i0')}, ${c('i1')}) and one 1-bit output (${c('eq')}); it outputs 1 when the two bits are equal. It is coded structurally, with gates. Its code is on the (unmirrored) slide; the version below follows the book’s style: two product terms ORed together.</p>` },
        { type: 'diagram', diagram: tt(['i0', 'i1'], [["eq = i0'i1' + i0·i1", "i0'i1' + i0 i1"]]), caption: 'eq1: eq = 1 exactly when i0 = i1 (an XNOR).' },
        { type: 'code', lang: 'verilog', code: CODE_EQ1 },
        { type: 'example', title: 'Build eq2 (a[1:0] equals b[1:0]?)', problem: 'Write module eq2 using two instances of eq1.',
          steps: [
            '<b>Schematic first.</b> Compare bit 0 of a with bit 0 of b, and bit 1 of a with bit 1 of b. aeqb = 1 only if <i>both</i> pairs are equal: aeqb = e0 · e1.',
            `<b>Declare the internal wires</b> ${c('wire e0, e1;')}. A 1-bit wire is the default in Verilog, so this could be omitted, but the instructor strongly suggests declaring everything before using it.`,
            `<b>First instance.</b> Module name, then a meaningful instance name, then the connections: ${c('eq1 eq_bit0_unit (.i0(a[0]), .i1(b[0]), .eq(e0));')}`,
            `<b>Second instance</b> with a <i>different</i> name: ${c('eq1 eq_bit1_unit (.i0(a[1]), .i1(b[1]), .eq(e1));')} Each instance in a design needs a unique identifier.`,
            `<b>The AND gate</b> as a continuous assignment: ${c('assign aeqb = e0 & e1;')}`,
          ], answer: 'module eq2 below' },
        { type: 'code', lang: 'verilog', code: CODE_EQ2 },
        { type: 'diagram', diagram: {
          kind: 'circuit', inputs: ['a0', 'b0', 'a1', 'b1'],
          gates: [{ id: 'e0', type: 'XNOR', in: ['a0', 'b0'] }, { id: 'e1', type: 'XNOR', in: ['a1', 'b1'] }, { id: 'g', type: 'AND', in: ['e0', 'e1'] }],
          outputs: [{ name: 'aeqb', from: 'g' }] }, caption: 'eq2 flattened: each eq1 instance acts as an XNOR (e0, e1); one AND combines them.' },
        { type: 'callout', tone: 'note', html: `<b>Named (dot) connections.</b> With ${c('.port(signal)')} you may list the connections in any order, e.g. ${c('(.eq(e1), .i0(a[1]), .i1(b[1]))')}. The instructor’s advice for beginners: keep it “vanilla” — use the dot notation and connect the ports in order. In Lab 1–2 testbenches you always used one instance name (${c('uut')}); inside one design with two units the names must differ.` },
        { type: 'check', question: { id: 'lab5-l3-c1', type: 'numeric', difficulty: 1, answer: 0,
          prompt: `In ${c('eq2')}, ${c("a = 2'b10")} and ${c("b = 2'b11")}. What is ${c('aeqb')}?`,
          steps: ['e0 = (a[0] == b[0]) = (0 == 1) = 0.', 'e1 = (a[1] == b[1]) = (1 == 1) = 1.', 'aeqb = e0 &amp; e1 = 0 &amp; 1 = 0.'],
          explanation: 'Bit 0 differs, so eq_bit0_unit outputs e0 = 0 and the AND makes aeqb = 0 even though bit 1 matches.',
          src: course(at('hier', '00:01:34', '00:04:56')) } },
        { type: 'check', question: { id: 'lab5-l3-c2', type: 'mc', difficulty: 2,
          prompt: 'Both eq1 instances in eq2 are named <code>eq_unit</code>. What happens?',
          choices: ['The design fails to compile: two instances in the same module cannot share a name', 'It compiles; the second instance silently replaces the first', 'It compiles and works, because the port connections differ', 'It compiles, but Vivado renames the second instance in simulation'],
          answer: 0,
          explanation: 'Every instance in a module needs a unique identifier (the video: “each time that you instantiate unit, its name needs to be unique”). Icarus Verilog, for example, reports “eq_unit has already been declared in this scope”.',
          src: course(at('hier', '00:03:41', '00:03:49')) } },
      ] },

    { id: 'lab5-l4', subtopic: 'lab5', title: 'Simulating and debugging a hierarchical design in Vivado', minutes: 6, needsSource: 'The FSM example testbench (fsm_example_tb) used in the video is not mirrored; the waveform is reconstructed.',
      src: course(at('simh', '00:00:06', '00:00:51', '00:01:10', '00:01:22', '00:01:42', '00:01:58', '00:02:24', '00:02:38', '00:03:04', '00:03:11')),
      blocks: [
        { type: 'text', html: `<p><b>Why this matters.</b> A normal behavioral simulation shows the testbench’s own signals. When something is wrong <i>inside</i> the unit under test — or inside one of its sub-modules — you need to see those internal signals too. The video uses the FSM example’s testbench (${c('fsm_example_tb')}), but the tip works for “any module that has hierarchical structure”.</p>` },
        { type: 'example', title: 'See the signals inside uut', problem: 'Add the internal signals of the unit under test to the waveform.',
          steps: [
            'Run a regular behavioral simulation of the testbench. The signals listed next to the waveform are the testbench’s own (here those of fsm_example_tb).',
            'Look at the <b>Scope</b> pane: it shows the hierarchy — the testbench and, inside it, the FSM instance <code>uut</code>. If a level had more levels below it you would see a “+” and could open it further.',
            'Drag the <code>uut</code> module with the mouse into the waveform’s signal-name pane.',
            'The new rows are <b>empty</b>: during the run those internal values were not recorded.',
            'Relaunch (restart) the simulation with the button at the top of the window. Now the internal signals are recorded and drawn.',
            'Use <i>expand all</i> and zoom in to read the values; switch the 4-bit output to <b>binary</b> radix so 1111 → 0111 → … is easy to read.',
            'Check the behavior: while reset = 1 the state is 0; when enable is 0 the current state is preserved; later the current state is 1 and the next state is 2, and so on.',
          ], answer: 'Internal signals (state, next state, out) appear after the relaunch.' },
        { type: 'diagram', diagram: dgRun, caption: 'A run of the Lab 8 example FSM as you would read it after adding uut to the wave (reconstructed: the transcript narrates reset → state 0, enable = 0 holds the state, out 1111 → 0111 …). Edges at 50, 150, 250 … ns.' },
        { type: 'callout', tone: 'tip', html: '<b>Debugging across module boundaries</b> (a supplemental method that builds on this tip): work out by hand what each internal signal should be for one input, then compare against the wave. The first sub-module whose output is wrong while its inputs are right is where the bug is.' },
        { type: 'check', question: { id: 'lab5-l4-c1', type: 'mc', difficulty: 2,
          prompt: 'You dragged <code>uut</code> into the waveform window, but its rows show no values. What should you do?',
          choices: ['Relaunch (restart) the simulation so the internal values are recorded', 'Add uut’s signals to the testbench port list', 'Re-run synthesis before simulating again', 'Change the radix of the empty rows to binary'],
          answer: 0,
          explanation: 'The internal values were not recorded during the first run, so nothing can be drawn for them. Relaunching the simulation records them. A testbench has no ports, synthesis is not needed for behavioral simulation, and the radix only changes how existing values are shown.',
          src: course(at('simh', '00:01:22', '00:01:42')) } },
      ] },
  ];

  const lab5Cards = [
    { id: 'lab5-f1', subtopic: 'lab5', front: `Where must an ${c('if')} statement be written?`, back: `Inside an ${c('always')} block (it is a procedural statement; in a testbench it can also sit in ${c('initial')}). The always block has its own ${c('begin … end')}.`, src: course(at('vif', '00:00:08', '00:02:27')) },
    { id: 'lab5-f2', subtopic: 'lab5', front: `When does a branch of an ${c('if')} need ${c('begin … end')}?`, back: 'When it holds <b>more than one</b> statement (e.g. <code>f = a; g = ~a;</code>). A single statement can do without.', src: course(at('vif', '00:02:11', '00:02:44')) },
    { id: 'lab5-f3', subtopic: 'lab5', front: `What goes in the sensitivity list of a combinational always block containing ${c('if (sel == 1) f = a; else f = b;')}?`, back: `The tested variable and every right-hand-side variable: ${c('always @(sel, a, b)')} — or ${c('always @*')}.`, src: course(at('vif', '00:00:57', '00:01:39')) },
    { id: 'lab5-f4', subtopic: 'lab5', front: `What logic does ${c('if (s) f = a; else f = b;')} describe?`, back: 'A 2-to-1 multiplexer: f = s·a + s′·b (s = 1 picks a, s = 0 picks b).', src: course(at('vif', '00:00:29', '00:00:52')) },
    { id: 'lab5-f5', subtopic: 'lab5', front: `In an ${c('if … else if … else')} chain, which branch runs when two conditions are true?`, back: 'The <b>first</b> true one (top to bottom): earlier conditions have priority. Standard Verilog (supplemental).', src: supp(S_VLOG) },
    { id: 'lab5-f6', subtopic: 'lab5', front: 'A combinational always block leaves an output unassigned on some path (e.g. <code>if (en) y = d;</code> with no else). What does the tool build?', back: 'A memory element — a <b>latch</b> — to hold the old value. Fix: an else, or a default assignment at the top of the block.', src: course(at('fsm2', '00:04:02', '00:04:36')) },
    { id: 'lab5-f7', subtopic: 'lab5', front: 'What is hierarchical design?', back: 'A top module instantiates smaller modules (black boxes known only by their ports and function) and connects them; most big designs are made this way, reusing earlier designs.', src: course(at('hier', '00:00:25', '00:05:09', '00:05:20')) },
    { id: 'lab5-f8', subtopic: 'lab5', front: `Module ${c('eq1')}: ports and function?`, back: 'Inputs i0, i1 (1 bit each), output eq (1 bit); eq = 1 when the two bits are equal: eq = i0′i1′ + i0·i1.', backDiagram: tt(['i0', 'i1'], [['eq', "i0'i1' + i0 i1"]]), src: course(at('hier', '00:00:43', '00:00:53')) },
    { id: 'lab5-f9', subtopic: 'lab5', front: 'Two instances of the same module inside one design: what must differ?', back: 'Their <b>instance names</b> (e.g. eq_bit0_unit and eq_bit1_unit). Each instance needs a unique identifier.', src: course(at('hier', '00:03:41', '00:03:49', '00:04:12')) },
    { id: 'lab5-f10', subtopic: 'lab5', front: `With named connections ${c('.i0(a[0])')}, does the order of the connections matter?`, back: 'No — dot notation lets you shuffle the order. The instructor still suggests keeping them in port order while you are a beginner.', src: course(at('hier', '00:04:21', '00:04:46')) },
    { id: 'lab5-f11', subtopic: 'lab5', front: `Why declare ${c('wire e0, e1;')} if Verilog would create 1-bit wires by default?`, back: 'Because the instructor strongly suggests that everything gets properly declared before use — a typo then becomes an error instead of a silent new wire.', src: course(at('hier', '00:02:28', '00:02:44')) },
    { id: 'lab5-f12', subtopic: 'lab5', front: 'Vivado simulator: where do you find <code>uut</code> and how do you see its internal signals?', back: 'In the <b>Scope</b> pane (the hierarchy). Drag uut into the wave’s name pane, then <b>relaunch</b> the simulation — the values were not recorded in the first run.', src: course(at('simh', '00:00:51', '00:01:10', '00:01:42')) },
    { id: 'lab5-f13', subtopic: 'lab5', front: 'Reading a multi-bit output like 1111 → 0111 in the wave: which radix helps?', back: '<b>Binary</b> — the instructor switches the FSM output to binary format to read it.', src: course(at('simh', '00:02:24', '00:02:32')) },
  ];

  const lab5Questions = [
    { id: 'lab5-q1', subtopic: 'lab5', type: 'mc', difficulty: 1,
      prompt: `Where does an ${c('if')} statement belong in a synthesizable module?`,
      choices: [`Inside an ${c('always')} block, as a procedural statement`, `Directly in the module body, next to the ${c('assign')} statements`, 'In the port list, after the port declarations', `Only inside a testbench’s ${c('initial')} block`],
      answer: 0,
      explanation: 'if is procedural: it must be enclosed in an always block (testbenches may also use it inside initial). It cannot stand in the module body like assign, and it has nothing to do with the port list. Design modules use it inside always all the time, so “only in a testbench” is wrong.',
      src: course(at('vif', '00:00:08', '00:02:27')) },
    { id: 'lab5-q2', subtopic: 'lab5', type: 'tf', difficulty: 1,
      prompt: `True or false: if the if-branch must assign both ${c('f')} and ${c('g')}, those two statements have to be wrapped in ${c('begin … end')}.`,
      answer: true,
      explanation: 'Without begin … end only the first statement belongs to the if; the second no longer depends on the condition, and an else after it becomes a syntax error (checked in Icarus Verilog). More than one statement in a branch needs begin … end.',
      src: course(at('vif', '00:02:03', '00:02:11')) },
    { id: 'lab5-q3', subtopic: 'lab5', type: 'mc', difficulty: 2,
      prompt: 'This block simulates wrongly. With sel = 0, a change on which input <b>fails to update f</b> even though f should change?' + pre('always @(sel, a)', '    if (sel == 1) f = a;', '    else          f = b;'),
      choices: ['b — the block is not re-run when only b changes, so f keeps a stale value', 'a — with sel = 0, f should follow a, but it does not', 'sel — a variable that is tested cannot also be in the sensitivity list', 'None — an always block re-runs whenever any signal in the module changes'],
      answer: 0,
      explanation: 'b is used on a right-hand side but missing from the sensitivity list, so a change on b alone does not trigger the block: f stays stale until sel or a changes. (Simulated: sel = 0, a = 0, b 0 → 1 left f = 0.) With sel = 0, f should equal b, not a; a change on a re-runs the block and the else branch again gives f = b, which is correct. Fix: always @(sel, a, b) or always @*.',
      src: course(at('vif', '00:00:57', '00:01:46')) },
    { id: 'lab5-q4', subtopic: 'lab5', type: 'boolexpr', difficulty: 2, vars: ['S', 'A', 'B'], answer: "SB + S'A", form: 'sop', maxLiterals: 4,
      prompt: `Write the minimal SOP for ${c('f')}, using S for sel and A, B for a, b:` + pre('always @(sel, a, b)', '    if (sel == 1) f = b;', '    else          f = a;'),
      steps: ['sel = 1 → f = b: term S·B.', 'sel = 0 → f = a: term S′·A.', 'f = S·B + S′·A — 4 literals, already minimal.'],
      explanation: 'Read each branch as “condition AND value”, then OR the branches. Careful: here the if-branch takes <b>b</b>, so the answer is S·B + S′·A, not the usual S·A + S′·B.',
      src: course(at('vif', '00:00:29', '00:00:52')) },
    { id: 'lab5-q5', subtopic: 'lab5', type: 'boolexpr', difficulty: 3, vars: ['A', 'B', 'C'], answer: "A'B + AC", form: 'sop', maxLiterals: 4,
      prompt: 'Write a minimal SOP for <code>y</code>:' + pre('always @*', 'begin', '    if (!a)', '        y = b;', '    else if (c)', "        y = 1'b1;", '    else', "        y = 1'b0;", 'end'),
      steps: [
        'Branch 1 runs when a = 0 and gives y = b: term A′·B.',
        'Branch 2 runs only when a = 1 and c = 1 and gives y = 1: term A·C.',
        'Branch 3 (a = 1, c = 0) gives 0.',
        'y = A′B + AC. The two terms share no variable that could be eliminated (minterms 2, 3, 5, 7), so 4 literals is minimal.',
      ],
      explanation: 'An else-if branch is reached only when every earlier condition is false, so its condition must include the negation of the earlier ones (here a = 1). Simulating all 8 rows gives y = 1 for minterms 2, 3, 5 and 7, which is exactly A′B + AC.',
      src: supp(S_VLOG) },
    { id: 'lab5-q6', subtopic: 'lab5', type: 'mc', difficulty: 2,
      prompt: 'What hardware does this combinational block describe?' + pre('always @*', '    if (en)', '        y = d;'),
      choices: ['A latch: when en = 0 nothing assigns y, so y holds its previous value', 'An AND gate: y = en · d', 'A 2-to-1 MUX that outputs 0 when en = 0', 'A rising-edge D flip-flop clocked by en'],
      answer: 0,
      explanation: 'y is not assigned when en = 0, so it must remember its old value: the tool instantiates a memory element (a latch). It is not an AND gate or a MUX with 0 — those would need an explicit else y = 0. It is level-sensitive (no posedge), so it is not an edge-triggered flip-flop.',
      src: course(at('fsm2', '00:04:02', '00:04:36')) },
    { id: 'lab5-q7', subtopic: 'lab5', type: 'multi', difficulty: 3,
      prompt: 'Which changes make the block in the previous question purely combinational (no latch)? Select all that apply.' + pre('always @*', '    if (en)', '        y = d;'),
      choices: [`Add ${c("else y = 1'b0;")}`, `Put ${c("y = 1'b0;")} at the top of the block, before the if (inside begin … end)`, `Change ${c('always @*')} to ${c('always @(en, d)')}`, `Change ${c('y = d')} to ${c('y <= d')}`],
      answers: [0, 1],
      explanation: 'Both a complete else and a default assignment give y a value on every path, so nothing has to be remembered. Listing en and d explicitly is the same sensitivity as @*, and switching to a nonblocking assignment does not add the missing path — the latch stays.',
      src: course(at('fsm2', '00:04:02', '00:04:36')) },
    { id: 'lab5-q8', subtopic: 'lab5', type: 'match', difficulty: 1,
      prompt: 'Match each piece of the eq2 design to its role.',
      pairs: [
        [c('module eq1 … endmodule'), 'Defines the 1-bit comparator once'],
        [c('eq1 eq_bit0_unit ( … );'), 'Places one instance of eq1 inside eq2'],
        [c('.i0(a[0])'), 'Connects port i0 of the instance to bit 0 of a'],
        [c('wire e0, e1;'), 'Internal signals that carry each comparator’s result'],
        [c('assign aeqb = e0 & e1;'), 'The AND gate that combines the two results'],
      ],
      explanation: 'A module is defined once and then instantiated as many times as needed; named connections attach ports to signals; internal wires join the instances; the continuous assignment adds the final AND.',
      src: course(at('hier', '00:02:12', '00:03:15', '00:04:56')) },
    { id: 'lab5-q9', subtopic: 'lab5', type: 'short', difficulty: 1, accept: ['e1'], normalize: 'text',
      prompt: `Complete the second instance of eq2: ${c('eq1 eq_bit1_unit (.i0(a[1]), .i1(b[1]), .eq(____));')}`,
      explanation: 'The bit-1 comparator’s output goes on the internal wire e1, which the final assign ANDs with e0.',
      src: course(at('hier', '00:03:41', '00:04:56')) },
    { id: 'lab5-q10', subtopic: 'lab5', type: 'tf', difficulty: 2,
      prompt: `True or false: ${c('eq1 eq_bit1_unit (.eq(e1), .i0(a[1]), .i1(b[1]));')} builds exactly the same circuit as ${c('eq1 eq_bit1_unit (.i0(a[1]), .i1(b[1]), .eq(e1));')}.`,
      answer: true,
      explanation: 'With dot (named) notation each connection names its port, so the order can be shuffled. (With positional connections the order would matter.) The instructor still recommends keeping the order while you are learning.',
      src: course(at('hier', '00:04:21', '00:04:46')) },
    { id: 'lab5-q11', subtopic: 'lab5', type: 'numeric', difficulty: 2, answer: 4,
      prompt: 'You build a 4-bit comparator <code>eq4</code> from two <code>eq2</code> instances (one for bits 1:0, one for bits 3:2) plus an AND, reusing eq2 unchanged. How many <code>eq1</code> instances exist in the whole design hierarchy?',
      steps: ['eq4 contains 2 instances of eq2.', 'Each eq2 contains 2 instances of eq1.', '2 × 2 = 4 eq1 instances in total.'],
      explanation: 'Hierarchy multiplies: every eq2 instance brings its own two eq1 instances. This reuse of earlier designs to make bigger ones is exactly what the hierarchy video promises for later labs.',
      src: course(at('hier', '00:05:20', '00:05:39')) },
    { id: 'lab5-q12', subtopic: 'lab5', type: 'mc', difficulty: 3,
      prompt: 'Debugging eq2: with <code>a = 2\'b10</code> and <code>b = 2\'b10</code> the output aeqb is 0. After adding uut’s internals to the wave you see <code>e0 = 1</code> and <code>e1 = 0</code>. Where is the bug most likely?',
      choices: ['In the port connections of eq_bit1_unit (e.g. it compares a[1] with the wrong bit of b)', 'In the port connections of eq_bit0_unit', 'In the line <code>assign aeqb = e0 &amp; e1;</code>', 'In the testbench: a and b are not really equal'],
      answer: 0,
      explanation: 'a[1] = b[1] = 1, so a correct eq_bit1_unit must give e1 = 1; it gives 0, so look at that instance first. (Simulated: connecting .i1(b[0]) instead of .i1(b[1]) produces exactly e1 = 0 here.) e0 = 1 is correct, so eq_bit0_unit is fine; 1 &amp; 0 = 0 is the correct AND of the values shown; and the inputs really are equal.',
      src: course(at('simh', '00:03:11', '00:03:25')) },
    { id: 'lab5-q13', subtopic: 'lab5', type: 'boolexpr', difficulty: 3, vars: ['A1', 'A0', 'B1', 'B0'], answer: "(A1'B1' + A1 B1)(A0'B0' + A0 B0)",
      prompt: 'Write <code>aeqb</code> of eq2 as a Boolean expression in A1, A0, B1, B0 (any correct form; XNOR may be typed as ⊙).',
      steps: [
        'eq_bit0_unit: e0 = A0′B0′ + A0·B0 (equal when both 0 or both 1).',
        'eq_bit1_unit: e1 = A1′B1′ + A1·B1.',
        'aeqb = e0 · e1 = (A1′B1′ + A1B1)(A0′B0′ + A0B0) = (A1 ⊙ B1)(A0 ⊙ B0).',
      ],
      solutionDiagram: tt(['A1', 'A0', 'B1', 'B0'], [['aeqb', "(A1'B1' + A1 B1)(A0'B0' + A0 B0)"]]),
      explanation: 'Flattening the hierarchy just substitutes each instance’s equation. The result is 1 on the four rows where A1A0 = B1B0 (minterms 0, 5, 10, 15).',
      src: course(at('hier', '00:01:34', '00:01:50', '00:04:56')) },
    { id: 'lab5-q14', subtopic: 'lab5', type: 'mc', difficulty: 1,
      prompt: 'In the Vivado simulator, which pane shows the design hierarchy (the testbench and, inside it, the unit under test)?',
      choices: ['The Scope pane', 'The Tcl Console', 'The Sources → Constraints folder', 'The Messages tab'],
      answer: 0,
      explanation: 'The Scope pane lists the testbench and the uut instance (with a “+” to open further levels). The Tcl Console takes commands, constraints are for implementation, and Messages lists errors and warnings.',
      src: course(at('simh', '00:00:51', '00:01:10')) },
    { id: 'lab5-q15', subtopic: 'lab5', type: 'tf', difficulty: 1,
      prompt: 'True or false: in the FSM example’s simulation, while enable is 0 the current state is preserved.',
      answer: true,
      explanation: 'The video points this out in the wave: when enable becomes 0 the current state stays the same; only with enable = 1 does the machine move on to the next state.',
      src: course(at('simh', '00:02:49', '00:02:53')) },
    { id: 'lab5-q16', subtopic: 'lab5', type: 'mc', difficulty: 2,
      prompt: 'Why are the uut rows empty right after you drag uut into the waveform window?',
      choices: ['Those internal values were not recorded during the run that already happened', 'Internal signals of a sub-module can never be shown, only its ports', 'The uut signals are shown only in hexadecimal until you change the radix', 'Vivado shows internal signals only for synthesized designs'],
      answer: 0,
      explanation: 'The simulator recorded only the signals that were in the wave when it ran. Relaunching the simulation records the newly added internal signals. Internal signals can be shown, radix does not hide values, and this is behavioral simulation (no synthesis needed).',
      src: course(at('simh', '00:01:22', '00:01:46')) },
    { id: 'lab5-q17', subtopic: 'lab5', type: 'short', difficulty: 1, accept: ['binary', 'bin', 'base 2', 'binary radix'], normalize: 'text',
      prompt: 'Which radix did the instructor choose to read the FSM’s 4-bit output (all ones, then 0111, …) in the wave?',
      explanation: 'Binary: each bit of the output pattern is visible, so 1111 → 0111 → 0011 … is easy to follow.',
      src: course(at('simh', '00:02:24', '00:02:32')) },
    { id: 'lab5-q18', subtopic: 'lab5', type: 'mc', difficulty: 2,
      prompt: 'Which of these is a <b>correct</b> hierarchical instantiation inside eq2?',
      choices: [c('eq1 eq_bit0_unit (.i0(a[0]), .i1(b[0]), .eq(e0));'), c('eq1 (.i0(a[0]), .i1(b[0]), .eq(e0));'), c('eq_bit0_unit eq1 (.i0(a[0]), .i1(b[0]), .eq(e0));'), c('eq1 eq_bit0_unit (i0 = a[0], i1 = b[0], eq = e0);')],
      answer: 0,
      explanation: 'The pattern is: module name, instance name, then (.port(signal), …). A module instance must have a name; the module name comes first, the instance name second; and port connections use the dot notation, not “=”.',
      src: course(at('hier', '00:02:55', '00:03:41')) },
  ];

  /* ======================================================================= LAB 6 */
  // Instructor's examples: 0111 + 0110 (Topic 5 class 16 video 2), 5 - 3 = 0101 + 1101 (class 17 video 1)
  const ADD76 = add('0111', '0110');
  const SUB53 = add('0101', '1101');
  const SUB63 = add('0110', flip('0011'), 1);
  if (ADD76.s !== '1101' || ADD76.cout !== 0 || SUB53.s !== '0010' || SUB53.cout !== 1 || SUB53.v !== 0 || SUB63.s !== '0011' || SUB63.cout !== 1 || SUB63.v !== 0) throw new Error('labs-5-8: Lab 6 arithmetic changed');
  const stageRows = (a, b, cin) => {
    const r = add(a, b, cin), n = a.length;
    return [...Array(n).keys()].map(i => ['fa' + i, a[n - 1 - i], b[n - 1 - i], String(r.c[i]), r.s[n - 1 - i], String(r.c[i + 1])]);
  };

  const lab6Lessons = [
    { id: 'lab6-l1', subtopic: 'lab6', title: 'Vectors at work: slicing, concatenation and result widths', minutes: 7,
      src: course(at('vec', '00:03:49', '00:04:15', '00:05:22', '00:05:51', '00:06:36'), at('idk', '00:06:47')),
      blocks: [
        { type: 'text', html: `<p><b>Recap of the vectors video</b> (Lab 6 reuses the Lab 4 video):</p>
<ul><li>The dimensions go <b>between the keyword and the name</b>, and for an n-bit vector they are always ${c('[n-1:0]')}: ${c('wire [2:0] three_bit_w;')}, ${c('reg [7:0] q;')}.</li>
<li><b>Bit-select</b>: ${c('x[2]')} is one bit. Assigning the three bits one by one is the same as assigning the whole vector at once.</li>
<li><b>Part-select</b>: ${c('bus[7:0]')} and ${c('bus[15:8]')} are the lower and upper 8 bits of a 16-bit bus.</li>
<li><b>Concatenation</b> with curly braces: ${c("{1'b0, one_bit_w, x[1]}")} — the first item becomes the most significant bit.</li>
<li>Selected bits and parts can be on the <b>left</b> side (assign to them) or on the <b>right</b> side (read them).</li></ul>` },
        { type: 'example', title: 'Read pieces of a 16-bit bus', problem: `${c("wire [15:0] bus = 16'hA5C3;")} — find ${c('bus[15:8]')}, ${c('bus[7:0]')}, ${c('bus[11:4]')}, ${c('bus[13]')} and ${c('{bus[3:0], bus[7:4]}')}.`,
          steps: [
            'Write the bus in binary, one hex digit per 4 bits: A5C3 = 1010 0101 1100 0011 (bit 15 on the left, bit 0 on the right).',
            'bus[15:8] = the left byte = 1010 0101 = <b>A5</b>; bus[7:0] = 1100 0011 = <b>C3</b>.',
            'bus[11:4] = bits 11 down to 4 = 0101 1100 = <b>5C</b>.',
            'bus[13]: bits 15–12 are 1, 0, 1, 0, so bit 13 = <b>1</b>.',
            '{bus[3:0], bus[7:4]} = {0011, 1100} = 0011 1100 = <b>3C</b> (the two nibbles of the low byte swapped).',
          ], answer: 'A5, C3, 5C, 1, 3C' },
        { type: 'diagram', diagram: { kind: 'bits', bits: '1010010111000011', groups: 4 }, caption: "16'hA5C3, grouped by hex digit (bit 15 on the left)." },
        { type: 'text', html: `<p><b>Result widths.</b> Lab 1’s adder already used a vector trick: ${c('temp_out')} is one bit wider than the inputs, the sum goes into it, and ${c('out')} and ${c('carry')} are “portions of temp out”. A concatenation on the left side does the same job in one line (standard Verilog, supplemental).</p>` },
        { type: 'code', lang: 'verilog', code: code(
          '// Lab 1 style: a wider internal vector, then slices',
          'wire [3:0] temp_out;',
          'assign temp_out = in0 + in1;      // in0, in1 are [2:0]',
          'assign out      = temp_out[2:0];',
          'assign carry    = temp_out[3];',
          '',
          '// the same thing with a concatenation on the left-hand side',
          'assign {carry, out} = in0 + in1;  // 4-bit target: the carry is kept') },
        { type: 'callout', tone: 'warn', html: `Two n-bit numbers can add up to an (n + 1)-bit result. If the target is only n bits — ${c('assign s = a + b;')} with a 4-bit ${c('s')} — the carry is simply dropped (checked in simulation: 1011 + 0110 gives s = 0001 and the carry is lost).` },
        { type: 'check', question: { id: 'lab6-l1-c1', type: 'short', difficulty: 1, normalize: 'binary', width: 3, accept: ['011'],
          prompt: `${c("one_bit_w = 1'b1")} and ${c("two_bit_w = 2'b10")}. What 3-bit value does ${c("assign three_bit_w = {1'b0, one_bit_w, two_bit_w[1]};")} produce?`,
          steps: ['MSB: the constant 1′b0 → 0.', 'Middle: one_bit_w → 1.', 'LSB: two_bit_w[1], the left bit of 10 → 1.', 'Result: 011.'],
          explanation: 'Concatenation places the items left to right, MSB first: {0, 1, 1} = 011.',
          src: course(at('vec', '00:05:51', '00:06:36')) } },
        { type: 'check', question: { id: 'lab6-l1-c2', type: 'short', difficulty: 2, normalize: 'hex', accept: ['5A'],
          prompt: `${c("wire [15:0] bus = 16'h35A9;")} What is ${c('bus[11:4]')} in hex?`,
          steps: ['35A9 = 0011 0101 1010 1001.', 'Bits 11..4 are the middle two hex digits: 0101 1010.', '0101 1010 = 5A.'],
          explanation: 'Because 4 and 12 are multiples of 4, bus[11:4] is exactly hex digits 2 and 1 (counting from 0 at the right): 5 and A.',
          src: course(at('vec', '00:05:22', '00:05:48')) } },
      ] },

    { id: 'lab6-l2', subtopic: 'lab6', title: 'Adders in Verilog: half adder, full adder, 4-bit ripple adder', minutes: 9,
      src: course(at('ha', '00:02:22', '00:04:22', '00:04:46', '00:05:38'), at('fa', '00:01:07', '00:02:12', '00:06:53', '00:08:45'), at('rca', '00:00:21', '00:01:27', '00:02:10')),
      blocks: [
        { type: 'text', html: `<p>The Lab 6 page asks you to re-watch the adder and subtractor lectures. Here they are turned into Verilog.</p>
<ul><li><b>Half adder</b>: inputs x, y; outputs S (sum) and C (carry). From the truth table, C = xy and S = x′y + xy′ — “remember, this is XOR”, so S = x ⊕ y.</li>
<li><b>Full adder</b>: every bit after bit 0 also has a carry in, so it needs three inputs x, y, z and two outputs. From the K-maps, C = xz + yz + xy, while S cannot be grouped at all: S = Σm(1, 2, 4, 7) = x′y′z + x′yz′ + xy′z′ + xyz. That sum of minterms is the 3-input XOR, S = x ⊕ y ⊕ z (an identity you can check by truth table).</li>
<li><b>4-bit ripple adder</b>: one full adder per bit; the carry out of stage i is the carry in of stage i + 1.</li></ul>` },
        { type: 'diagram', diagram: tt(['x', 'y', 'z'], [['C', 'xy + xz + yz'], ['S', 'x ⊕ y ⊕ z']]), caption: 'Full adder truth table (course notation x, y, z → C, S).' },
        { type: 'code', lang: 'verilog', code: CODE_HA_FA },
        { type: 'example', title: 'Build adder4 from four full adders (hierarchy again)', problem: 'Write a 4-bit ripple-carry adder with inputs a[3:0], b[3:0], cin and outputs s[3:0], cout, using module full_adder.',
          steps: [
            'One full adder per bit: fa0 for bit 0 … fa3 for bit 3. Each instance gets a unique name (Lab 5).',
            `The three carries between the stages are internal signals: declare ${c('wire [3:1] c;')} (c[i] = carry into bit i).`,
            `fa0 adds a[0], b[0] and the external ${c('cin')}; its carry out goes to ${c('c[1]')}.`,
            `fa1 and fa2 take the previous carry and pass theirs on: c[1] → fa1 → c[2] → fa2 → c[3].`,
            `fa3’s carry out is the adder’s ${c('cout')}.`,
          ], answer: 'module adder4 below' },
        { type: 'code', lang: 'verilog', code: CODE_ADD4 },
        { type: 'diagram', diagram: comp('adder', '4-bit adder (adder4)', ['a[3:0]', 'b[3:0]', 'cin'], ['s[3:0]', 'cout']), caption: 'The compact block: 4-bit buses in and out, plus the two carries.' },
        { type: 'example', title: 'Trace the instructor’s 0111 + 0110 through adder4', problem: 'a = 0111 (7), b = 0110 (6), cin = 0. Give each stage’s sum and carry.',
          steps: [
            table(['stage', 'a<sub>i</sub>', 'b<sub>i</sub>', 'carry in', 's<sub>i</sub>', 'carry out'], stageRows('0111', '0110', 0)),
            's = s3 s2 s1 s0 = 1101, cout = 0.',
            '1101 = 13 = 7 + 6, and with cout = 0 the unsigned result fits in 4 bits.',
          ], answer: 's = 1101, cout = 0' },
        { type: 'diagram', diagram: addDiagram('0111', '0110'), caption: '0111 + 0110 with the carry row (carry into each column; the leftmost digit is cout).' },
        { type: 'check', question: { id: 'lab6-l2-c1', type: 'boolexpr', difficulty: 2, vars: ['X', 'Y', 'Z'], answer: 'YZ + XZ + XY', minterms: [3, 5, 6, 7], form: 'sop', maxLiterals: 6,
          prompt: 'Write the full adder’s carry C as a minimal SOP in X, Y, Z.',
          steps: ['C = 1 for minterms 3, 5, 6, 7 (at least two inputs are 1).', 'Each of the three pairs (3,7), (5,7), (6,7) is a group of two; minterm 7 is shared.', 'C = YZ + XZ + XY — 6 literals.'],
          solutionDiagram: { kind: 'kmap', vars: ['X', 'Y', 'Z'], minterms: [3, 5, 6, 7], groups: [{ cells: [3, 7], label: 'YZ' }, { cells: [5, 7], label: 'XZ' }, { cells: [6, 7], label: 'XY' }] },
          explanation: 'The three groups of two all overlap on minterm 7 — the K-map the instructor draws for the carry. No group of four exists, so 6 literals is minimal.',
          src: course(at('fa', '00:06:00', '00:06:53')) } },
      ] },

    { id: 'lab6-l3', subtopic: 'lab6', title: 'Subtractor and adder-subtractor: XOR as a controlled inverter', minutes: 9,
      src: course(at('rca', '00:05:41', '00:10:12', '00:13:31', '00:15:04', '00:15:47'), at('sub', '00:03:32', '00:04:05', '00:07:01', '00:08:44', '00:09:10', '00:09:53', '00:11:50', '00:13:08')),
      blocks: [
        { type: 'text', html: `<p><b>Subtract by adding.</b> In two’s complement, the same adder works for signed numbers. X − Y = X + (−Y), and −Y is “flip, then add one”. In hardware: flip each bit of Y with a NOT gate, and get the +1 for free by setting the adder’s <b>Cin = 1</b>. So X − Y = X + Y′ + 1.</p>` },
        { type: 'example', title: 'The instructor’s 5 − 3', problem: 'Compute 0101 − 0011 with a 4-bit adder.',
          steps: [
            '+3 = 0011; flip → 1100; add 1 → 1101 = −3.',
            '0101 + 1101: bit 0: 1 + 1 = 0 carry 1; bit 1: 0 + 0 + 1 = 1 carry 0; bit 2: 1 + 1 = 0 carry 1; bit 3: 0 + 1 + 1 = 0 carry 1.',
            'Result 0010 = +2, with a carry out of 1 that is dropped.',
            'Overflow? The carry into the MSB (1) and the carry out of it (1) are the same, so <b>no overflow</b>.',
          ], answer: '0010 (+2), no overflow' },
        { type: 'diagram', diagram: addDiagram('0101', '1101'), caption: '0101 + 1101 (= 5 + (−3)); carry row = carry into each column, leftmost digit = carry out.' },
        { type: 'text', html: `<p><b>One circuit for both.</b> Addition is A + B with Cin = 0; subtraction is A + B′ with Cin = 1. What changes is only the second operand (B or B′) and Cin (0 or 1). A MUX could choose, but the simpler trick is an <b>XOR gate</b> per bit with a control signal:</p>
<ul><li>x ⊕ 0 = x·0′ + x′·0 = x — the bit passes;</li>
<li>x ⊕ 1 = x·1′ + x′·1 = x′ — the bit is flipped.</li></ul>
<p>With control <b>m</b> (0 = add, 1 = subtract) feeding every XOR <i>and</i> Cin, you get an adder-subtractor. Two flags: <b>C</b> (carry out — the unsigned result) and <b>V</b> = carry out of bit 3 ⊕ carry out of bit 2 (signed overflow: “if they are different there is an overflow”).</p>` },
        { type: 'diagram', diagram: {
          kind: 'circuit', inputs: ['B3', 'B2', 'B1', 'B0', 'M'],
          gates: [{ id: 'x3', type: 'XOR', in: ['B3', 'M'] }, { id: 'x2', type: 'XOR', in: ['B2', 'M'] }, { id: 'x1', type: 'XOR', in: ['B1', 'M'] }, { id: 'x0', type: 'XOR', in: ['B0', 'M'] }],
          outputs: [{ name: 'Y3', from: 'x3' }, { name: 'Y2', from: 'x2' }, { name: 'Y1', from: 'x1' }, { name: 'Y0', from: 'x0' }] }, caption: 'The XOR row in front of the adder: Y = B when M = 0, Y = B′ when M = 1. M also drives Cin.' },
        { type: 'code', lang: 'verilog', code: CODE_ADDSUB },
        { type: 'callout', tone: 'note', html: `${c('{4{m}}')} is <b>replication</b> (supplemental standard Verilog): four copies of m, i.e. 1111 when m = 1 and 0000 when m = 0, so ${c('b ^ {4{m}}')} XORs every bit of b with m. A one-line behavioral version is ${c('assign {c, s} = a + (b ^ {4{m}}) + m;')} — checked against the structural module for all 512 input combinations.` },
        { type: 'example', title: 'Run addsub4 with m = 1: 6 − 3', problem: 'a = 0110, b = 0011, m = 1. Find s, c and v.',
          steps: [
            'XOR row: b ⊕ 1111 = 1100; Cin = m = 1.',
            table(['stage', 'a<sub>i</sub>', '(b⊕m)<sub>i</sub>', 'carry in', 's<sub>i</sub>', 'carry out'], stageRows('0110', '1100', 1)),
            's = 0011 (+3). c = carry out of bit 3 = 1.',
            'Carry out of bit 2 = 1 and carry out of bit 3 = 1 → v = 1 ⊕ 1 = 0: no signed overflow (6 − 3 = 3 fits).',
          ], answer: 's = 0011, c = 1, v = 0' },
        { type: 'check', question: { id: 'lab6-l3-c1', type: 'numeric', difficulty: 2, answer: 1,
          prompt: 'addsub4 with m = 0 adds a = 0101 and b = 0100. What is the overflow flag v (0 or 1)?',
          steps: ['m = 0: b passes unchanged, Cin = 0.', 'bit 0: 1 + 0 = 1, c0; bit 1: 0 + 0 = 0, c0; bit 2: 1 + 1 = 0, carry 1; bit 3: 0 + 0 + 1 = 1, carry 0.', 's = 1001. Carry out of bit 2 = 1, carry out of bit 3 = 0.', 'v = 0 ⊕ 1 = 1: overflow (5 + 4 = 9 does not fit in −8…+7; 1001 reads as −7).'],
          explanation: 'Two positive numbers produced a negative-looking result — the classic signed overflow, detected because the last two carries differ.',
          src: course(at('sub', '00:12:31', '00:13:53')) } },
      ] },

    { id: 'lab6-l4', subtopic: 'lab6', title: 'MUX and XOR with always and case (re-watch)', minutes: 7, needsSource: NS_L6,
      src: course(at('alw', '00:01:51', '00:04:55', '00:07:48', '00:08:19', '00:08:50', '00:09:55', '00:10:50'), at('mux', '00:04:45', '00:06:15', '00:07:10')),
      blocks: [
        { type: 'text', html: `<p><b>Recap from Lab 4’s Always/Case video.</b> ${c('case')} is a procedural statement, so it lives inside ${c('always')}; it works like a switch statement. The case expression is compared with each item <b>in order</b> and the first match runs. A ${c('default')} at the bottom “catches” unexpected values — the instructor gives it a “funky” value like ${c("1'bz")} (high impedance) so a missing connection shows up in simulation. Anything assigned in the always block is declared ${c('reg')}. For the sensitivity list, list every input (data <i>and</i> select) or use ${c('always @*')}.</p>
<p><b>MUX (Topic 5).</b> Inputs I0, I1, select S0, output Y: S0 = 0 forwards whatever is on I0; S0 = 1 forwards I1.</p>` },
        { type: 'code', lang: 'verilog', code: CODE_MUX3 },
        { type: 'code', lang: 'verilog', code: CODE_MUX4 },
        { type: 'callout', tone: 'note', html: 'The Lab 4 files (mux_4to1_4b_case_tb.v etc.) are not mirrored; mux4_4b is an illustrative 4-to-1, 4-bit MUX written the same way.' },
        { type: 'example', title: 'XOR gate with always and case', problem: 'Describe f = a ⊕ b behaviorally with a case statement.',
          steps: [
            'Write the truth table: ab = 00 → 0, 01 → 1, 10 → 1, 11 → 0.',
            `Make the case expression the concatenation ${c('{a, b}')}, so each truth-table row is one 2-bit case item.`,
            `One item per row: ${c("2'b00: f = 1'b0;")} … ${c("2'b11: f = 1'b0;")}`,
            `Add ${c("default: f = 1'bz;")} — reached only if a or b is x or z (e.g. unconnected).`,
            `f is assigned in always, so declare it ${c('output reg f')}; list a and b in the sensitivity list.`,
          ], answer: 'module xor_case below' },
        { type: 'code', lang: 'verilog', code: CODE_XOR },
        { type: 'diagram', diagram: tt(['a', 'b'], [['f = a ⊕ b', 'a ⊕ b']]), caption: 'The truth table the case items copy, row by row.' },
        { type: 'check', question: { id: 'lab6-l4-c1', type: 'short', difficulty: 1, normalize: 'binary', width: 4, accept: ['1010'],
          prompt: `In ${c('mux4_4b')}, in0 = 0001, in1 = 0110, in2 = 1010, in3 = 1111 and ${c("sel = 2'b10")}. What is ${c('out')}? Type all 4 bits.`,
          steps: ["sel = 2'b10 matches the item 2'b10.", 'That item assigns out = in2.', 'out = 1010.'],
          explanation: 'sel = 10 in binary is 2, so the MUX forwards in2 (simulated: out = 1010).',
          src: course(at('alw', '00:06:33', '00:07:13')) } },
      ] },
  ];

  const lab6Cards = [
    { id: 'lab6-f1', subtopic: 'lab6', front: 'Where do the dimensions of a vector go, and what are they for n bits?', back: `Between the keyword and the name, always ${c('[n-1:0]')}: ${c('wire [2:0] three_bit_w;')}`, src: course(at('vec', '00:03:49', '00:04:02')) },
    { id: 'lab6-f2', subtopic: 'lab6', front: 'Bit-select vs part-select', back: `${c('x[2]')} picks one bit; ${c('bus[7:0]')} picks a range (here the lower 8 bits of a 16-bit bus). Both can be read or assigned.`, src: course(at('vec', '00:04:15', '00:05:22', '00:06:36')) },
    { id: 'lab6-f3', subtopic: 'lab6', front: `What does ${c("{1'b0, a, b[1]}")} do?`, back: 'Concatenation (curly braces): joins the items into one vector, first item = MSB. Here: 0, then a, then bit 1 of b.', src: course(at('vec', '00:05:51', '00:06:14')) },
    { id: 'lab6-f4', subtopic: 'lab6', front: 'Half adder equations (inputs x, y)', back: 'S = x′y + xy′ = x ⊕ y; C = xy. One XOR and one AND.', backDiagram: tt(['x', 'y'], [['C', 'xy'], ['S', 'x ⊕ y']]), src: course(at('ha', '00:04:22', '00:04:46', '00:05:38')) },
    { id: 'lab6-f5', subtopic: 'lab6', front: 'Full adder equations (inputs x, y, z)', back: 'C = xy + xz + yz; S = Σm(1, 2, 4, 7) = x′y′z + x′yz′ + xy′z′ + xyz (= x ⊕ y ⊕ z).', src: course(at('fa', '00:06:53', '00:08:45')) },
    { id: 'lab6-f6', subtopic: 'lab6', front: 'Why can a half adder handle only bit 0?', back: 'Every higher bit has three inputs — its two operand bits plus the carry from the bit below — so it needs a full adder.', src: course(at('fa', '00:00:48', '00:01:25')) },
    { id: 'lab6-f7', subtopic: 'lab6', front: 'Ripple-carry adder: how are the full adders connected?', back: 'Carry out of stage i → carry in of stage i + 1; Cin enters stage 0; Cout leaves the last stage.', src: course(at('rca', '00:01:21', '00:01:35')) },
    { id: 'lab6-f8', subtopic: 'lab6', front: 'Subtractor from an adder: X − Y = ?', back: 'X + Y′ + 1: a NOT gate on every bit of Y, and Cin = 1 supplies the +1.', src: course(at('rca', '00:15:04', '00:15:47')) },
    { id: 'lab6-f9', subtopic: 'lab6', front: 'Why an XOR in front of each B input of an adder-subtractor?', back: 'x ⊕ 0 = x and x ⊕ 1 = x′: with control m (0 add, 1 subtract) on every XOR — and on Cin — the circuit computes A + B or A + B′ + 1.', src: course(at('sub', '00:09:10', '00:10:28')) },
    { id: 'lab6-f10', subtopic: 'lab6', front: 'Adder-subtractor flags C and V', back: 'C = carry out (unsigned result); V = carry out of bit 3 ⊕ carry out of bit 2 — signed overflow when they differ.', src: course(at('sub', '00:11:50', '00:13:08', '00:13:53')) },
    { id: 'lab6-f11', subtopic: 'lab6', front: `${c('assign {cout, s} = a + b;')} with 4-bit a, b, s — what is cout?`, back: 'The carry out: the 5-bit target makes the addition 5 bits wide, and cout gets bit 4. (Standard Verilog, supplemental; checked in simulation.)', src: supp(S_VLOG) },
    { id: 'lab6-f12', subtopic: 'lab6', front: 'Why does the instructor give a case statement a “funky” default like 1′bz?', back: 'The select can only be 0 or 1 in a good circuit; landing in default (high impedance on the output) flags a bad connection or a select never set in the testbench.', src: course(at('alw', '00:10:50', '00:11:41')) },
    { id: 'lab6-f13', subtopic: 'lab6', front: 'Why must the output of a case-based MUX be declared reg?', back: 'It is assigned by a procedural assignment inside an always block, and anything assigned there must be a reg.', src: course(at('alw', '00:09:55', '00:10:15')) },
  ];

  const lab6Questions = [
    { id: 'lab6-q1', subtopic: 'lab6', type: 'numeric', difficulty: 1, answer: 16,
      prompt: `How many bits wide is ${c('wire [15:0] bus;')}?`,
      steps: ['[15:0] runs from bit 15 down to bit 0.', '15 − 0 + 1 = 16 bits.'],
      explanation: 'An n-bit vector is declared [n−1:0], so [15:0] is a 16-bit bus.',
      src: course(at('vec', '00:04:02', '00:05:36')) },
    { id: 'lab6-q2', subtopic: 'lab6', type: 'mc', difficulty: 1,
      prompt: 'Which line declares a 4-bit vector (bus) named d?',
      choices: [c('wire [3:0] d;'), c('wire [4:0] d;'), c('wire d [3:0];'), c('wire 4 d;')],
      answer: 0,
      explanation: 'The dimensions go between the keyword and the name, as [n−1:0] = [3:0]. [4:0] is 5 bits; putting the range after the name declares an array of four separate 1-bit wires, not a 4-bit vector; “wire 4 d” is not valid syntax.',
      src: course(at('vec', '00:03:49', '00:04:02')) },
    { id: 'lab6-q3', subtopic: 'lab6', type: 'short', difficulty: 2, normalize: 'hex', accept: ['5C'],
      prompt: `${c("wire [15:0] bus = 16'hA5C3;")} What is ${c('bus[11:4]')}, in hex?`,
      steps: ['A5C3 = 1010 0101 1100 0011 (bit 15 at the left).', 'bits 15..12 = 1010, 11..8 = 0101, 7..4 = 1100, 3..0 = 0011.', 'bus[11:4] = 0101 1100 = 5C.'],
      explanation: 'A part-select keeps the bits in order; 11:4 spans the middle two hex digits. (Simulated: 5c.)',
      src: course(at('vec', '00:05:22', '00:05:48')) },
    { id: 'lab6-q4', subtopic: 'lab6', type: 'short', difficulty: 2, normalize: 'binary', width: 4, accept: ['1101'],
      prompt: `${c("reg [3:0] x = 4'b1011;")} What is ${c('{x[0], x[3:1]}')}? Type all 4 bits.`,
      steps: ['x[0] = 1 (the rightmost bit of 1011).', 'x[3:1] = the left three bits = 101.', '{1, 101} = 1101.'],
      explanation: 'Moving bit 0 to the front of the other three bits is a rotate right by one position. (Simulated: 1101.)',
      src: course(at('vec', '00:05:51', '00:06:36')) },
    { id: 'lab6-q5', subtopic: 'lab6', type: 'boolexpr', difficulty: 2, vars: ['X', 'Y', 'Z'], minterms: [1, 2, 4, 7],
      prompt: 'Write the full adder’s sum S in X, Y, Z (any correct form; ⊕ or ^ for XOR is fine).',
      steps: ['S = 1 when an odd number of inputs are 1: minterms 1, 2, 4, 7.', 'In the K-map no two of these cells are adjacent, so the SOP is the sum of minterms: X′Y′Z + X′YZ′ + XY′Z′ + XYZ.', 'The same function is the 3-input XOR: S = X ⊕ Y ⊕ Z.'],
      explanation: 'The instructor finds that the biggest circle for S has size 1 and writes the four minterms. Either that form or the XOR form is accepted.',
      src: course(at('fa', '00:08:28', '00:08:45')) },
    { id: 'lab6-q6', subtopic: 'lab6', type: 'mc', difficulty: 3,
      prompt: `${c('a')}, ${c('b')} and ${c('s')} are 4-bit; ${c('cout')} is 1 bit. With ${c("a = 4'b1011")} and ${c("b = 4'b0110")}, what does ${c('assign {cout, s} = a + b;')} give?`,
      choices: ['cout = 1, s = 0001', 'cout = 0, s = 0001', 'cout = 0, s = 10001', 'cout = 1, s = 1110'],
      answer: 0,
      steps: ['1011 + 0110 = 11 + 6 = 17.', '17 = 1 0001 in 5 bits.', 'The 5-bit target {cout, s} makes the addition 5 bits wide: cout = 1, s = 0001.'],
      explanation: 'A concatenation on the left side widens the context to 5 bits, so the carry is kept (simulated). Writing only assign s = a + b; would keep s = 0001 and lose the carry; s cannot hold 5 bits; and 1110 is not the sum.',
      src: supp(S_VLOG) },
    { id: 'lab6-q7', subtopic: 'lab6', type: 'tf', difficulty: 2,
      prompt: `True or false: with 4-bit ${c('a')}, ${c('b')} and ${c('s')}, the line ${c('assign s = a + b;')} keeps the carry out of the addition somewhere in ${c('s')}.`,
      answer: false,
      explanation: 'The result is truncated to the 4 bits of s and the carry is dropped (1011 + 0110 gives s = 0001; truncation is standard Verilog behaviour, checked in simulation). To keep it, make the target 5 bits, e.g. {cout, s}, or use a one-bit-wider temp vector as Lab 1 does with temp_out.',
      src: course(at('idk', '00:06:47', '00:07:03')) },
    { id: 'lab6-q8', subtopic: 'lab6', type: 'short', difficulty: 3, normalize: 'binary', width: 4, accept: ['1110'],
      prompt: 'addsub4 (the adder-subtractor) gets a = 0011, b = 0101 and m = 1. What is s? Type all 4 bits.',
      steps: ['m = 1: b ⊕ 1111 = 1010 and Cin = 1.', '0011 + 1010 + 1: bit 0: 1 + 0 + 1 = 0 carry 1; bit 1: 1 + 1 + 1 = 1 carry 1; bit 2: 0 + 0 + 1 = 1 carry 0; bit 3: 0 + 1 + 0 = 1 carry 0.', 's = 1110, c = 0, v = 0.', 'Check: 3 − 5 = −2, and −2 in 4-bit two’s complement is 1110.'],
      solutionDiagram: addDiagram('0011', '1010', 1),
      explanation: 'Subtraction is A + B′ + 1. Here the carry out is 0 (an unsigned borrow happened) and v = 0 because the signed result −2 fits. (Simulated: s = 1110, c = 0, v = 0.)',
      src: course(at('sub', '00:04:05', '00:05:25', '00:09:53')) },
    { id: 'lab6-q9', subtopic: 'lab6', type: 'numeric', difficulty: 3, answer: 1,
      prompt: 'addsub4 computes (−4) − 7: a = 1100, b = 0111, m = 1. What is the overflow flag v?',
      steps: ['m = 1: b ⊕ 1111 = 1000, Cin = 1.', '1100 + 1000 + 1: bit 0: 0 + 0 + 1 = 1 carry 0; bit 1: 0 + 0 = 0 carry 0; bit 2: 1 + 0 = 1 carry 0; bit 3: 1 + 1 = 0 carry 1.', 's = 0101; carry out of bit 2 = 0, carry out of bit 3 = 1.', 'v = 1 ⊕ 0 = 1.'],
      solutionDiagram: addDiagram('1100', '1000', 1),
      explanation: '−4 − 7 = −11 is below −8, so it cannot be represented in 4 bits; the result 0101 (+5) is wrong and v = 1 flags it. (Simulated: s = 0101, c = 1, v = 1.)',
      src: course(at('sub', '00:12:31', '00:13:53')) },
    { id: 'lab6-q10', subtopic: 'lab6', type: 'mc', difficulty: 2,
      prompt: 'All signals are 4-bit. Which assignment computes <code>a − b</code> (two’s complement)?',
      choices: [c('assign d = a + ~b + 1;'), c('assign d = a + b + 1;'), c('assign d = ~a + b + 1;'), c('assign d = a + ~b;')],
      answer: 0,
      explanation: 'a − b = a + b′ + 1: flip b and add one. a + b + 1 never negates b; ~a + b + 1 computes b − a; a + ~b is one too small (a − b − 1). For a = 6, b = 2 the four lines give 0100, 1001, 1100 and 0011 (simulated).',
      src: course(at('rca', '00:10:12', '00:15:47')) },
    { id: 'lab6-q11', subtopic: 'lab6', type: 'match', difficulty: 1,
      prompt: 'Match each adder-subtractor fact to what it gives.',
      pairs: [
        ['m = 0', 'B passes unchanged and Cin = 0: A + B'],
        ['m = 1', 'B is flipped and Cin = 1: A + B′ + 1 = A − B'],
        ['x ⊕ 0', 'x'],
        ['x ⊕ 1', 'x′'],
        ['carry out of bit 3 ⊕ carry out of bit 2', 'V, the signed overflow flag'],
      ],
      explanation: 'The XOR is a controlled inverter, the same control drives Cin, and the overflow flag compares the last two carries.',
      src: course(at('sub', '00:07:01', '00:09:10', '00:13:08')) },
    { id: 'lab6-q12', subtopic: 'lab6', type: 'short', difficulty: 2, normalize: 'binary', width: 4, accept: ['0110'],
      prompt: `${c('mux4_4b')} has in0 = 0001, in1 = 0110, in2 = 1010, in3 = 1111. What is ${c('out')} when ${c("sel = 2'b01")}? Type all 4 bits.` + pre('case (sel)', "    2'b00:   out = in0;", "    2'b01:   out = in1;", "    2'b10:   out = in2;", "    2'b11:   out = in3;", "    default: out = 4'bzzzz;", 'endcase'),
      steps: ["sel = 01 is compared with the items in order: 00 no, 01 yes.", 'That item runs: out = in1.', 'out = 0110.'],
      explanation: 'The case expression is matched to the first equal item and only that statement executes. (Simulated: 0110.)',
      src: course(at('alw', '00:06:33', '00:07:22')) },
    { id: 'lab6-q13', subtopic: 'lab6', type: 'mc', difficulty: 2,
      prompt: `In ${c('mux4_4b')}, when does ${c("default: out = 4'bzzzz;")} run?`,
      choices: ['When sel is not one of 00, 01, 10, 11 — e.g. x or z because it is not connected or never set', 'When sel = 2′b11, because it is the last value', 'After every other item, to reset out', 'Never — Verilog removes default items from a full case'],
      answer: 0,
      explanation: 'A 2-bit sel that is 0/1 always matches one of the four items. Only an unknown or floating sel reaches default, and the z output then tells you “something went wrong” (simulated: sel = x1 gives zzzz). Only one item runs per evaluation.',
      src: course(at('alw', '00:08:19', '00:08:40', '00:10:50')) },
    { id: 'lab6-q14', subtopic: 'lab6', type: 'short', difficulty: 1, accept: ['XOR', 'exclusive or', 'exclusive-or', 'xor gate'], normalize: 'text',
      prompt: 'Which gate does this block describe?' + pre('always @(a, b)', '    case ({a, b})', "        2'b00: f = 1'b0;", "        2'b01: f = 1'b1;", "        2'b10: f = 1'b1;", "        2'b11: f = 1'b0;", "        default: f = 1'bz;", '    endcase'),
      explanation: 'f = 1 exactly when a and b differ: that is XOR (f = a ⊕ b).',
      src: supp(S_PRACT) },
    { id: 'lab6-q15', subtopic: 'lab6', type: 'mc', difficulty: 2,
      prompt: 'A case table gives f = 1 for {a, b} = 00 and 11, and f = 0 for 01 and 10. Which continuous assignment is equivalent?',
      choices: [c('assign f = ~(a ^ b);'), c('assign f = a ^ b;'), c('assign f = ~(a & b);'), c('assign f = a | ~b;')],
      answer: 0,
      explanation: 'f = 1 when a = b: XNOR, the complement of XOR. a ^ b is the opposite; ~(a &amp; b) is NAND (1 for 00, 01, 10); a | ~b is 1 for 00, 10, 11.',
      src: supp(S_LOGIC) },
    { id: 'lab6-q16', subtopic: 'lab6', type: 'multi', difficulty: 3,
      prompt: 'About module adder4 (four full_adder instances). Select all statements that are true.',
      choices: [
        `${c('wire [3:1] c;')} declares the three internal carries between stages`,
        'Each full_adder instance needs its own instance name',
        `${c('cin')} goes to fa0 and fa3’s carry out is ${c('cout')}`,
        'The four instance lines must be written in bit order fa0 … fa3, or the circuit changes',
        `The carries ${c('c[3:1]')} must be declared ${c('reg')} because they change`,
      ],
      answers: [0, 1, 2],
      explanation: 'Instances describe hardware that exists concurrently, so the order of the instance lines does not change the circuit. Signals driven by instance outputs (or assign) are wires; reg is for procedural assignments.',
      src: course(at('hier', '00:03:41'), at('rca', '00:01:21', '00:01:35')) },
    { id: 'lab6-q17', subtopic: 'lab6', type: 'numeric', difficulty: 2, answer: 2,
      prompt: 'adder4 adds 0111 + 0110 with cin = 0. How many of the four full adders produce a carry out of 1?',
      steps: ['fa0: 1 + 0 + 0 = 1 → carry 0.', 'fa1: 1 + 1 + 0 = 10 → carry 1.', 'fa2: 1 + 1 + 1 = 11 → carry 1.', 'fa3: 0 + 0 + 1 = 1 → carry 0.', 'Two stages (fa1, fa2) carry.'],
      solutionDiagram: addDiagram('0111', '0110'),
      explanation: 'In the carry row 01100 (read right to left: into bit 0, 1, 2, 3, then the carry out) the 1s are the carries into bits 2 and 3 — produced by fa1 and fa2 — and the carry out of fa3 is 0.',
      src: course(at('ha', '00:00:49', '00:01:38')) },
    { id: 'lab6-q18', subtopic: 'lab6', type: 'tf', difficulty: 1,
      prompt: 'True or false: a half adder’s sum output is the XOR of its two inputs.',
      answer: true,
      explanation: 'S = x′y + xy′, which the instructor points out is XOR; the carry is C = xy.',
      src: course(at('ha', '00:04:38', '00:04:59')) },
    { id: 'lab6-q19', subtopic: 'lab6', type: 'mc', difficulty: 2,
      prompt: 'Which continuous assignment gives the <b>carry</b> output of the full adder (inputs x, y, z)?',
      choices: [c('assign c = (x & y) | (x & z) | (y & z);'), c('assign c = x ^ y ^ z;'), c('assign c = x & y & z;'), c('assign c = (x | y) & z;')],
      answer: 0,
      explanation: 'C = xy + xz + yz: the carry is 1 when at least two inputs are 1. x ^ y ^ z is the sum; x &amp; y &amp; z misses rows like 011; (x | y) &amp; z = xz + yz misses 110 (1 + 1 + 0 does carry).',
      src: course(at('fa', '00:06:53')) },
    { id: 'lab6-q20', subtopic: 'lab6', type: 'mc', difficulty: 3,
      prompt: `In ${c('adder4')} (${c('wire [3:1] c;')} holds the carries, c[i] = carry into bit i), which line correctly instantiates the full adder for <b>bit 2</b>?`,
      choices: [
        c('full_adder fa2 (.x(a[2]), .y(b[2]), .z(c[2]), .s(s[2]), .c(c[3]));'),
        c('full_adder fa2 (.x(a[2]), .y(b[2]), .z(c[3]), .s(s[2]), .c(c[2]));'),
        c('full_adder fa2 (.x(a[2]), .y(b[2]), .z(cin), .s(s[2]), .c(c[3]));'),
        c('full_adder fa2 (.x(a[2]), .y(b[2]), .z(c[2]), .s(s[3]), .c(c[3]));'),
      ],
      answer: 0,
      explanation: 'Bit 2 takes the carry coming from bit 1 (c[2]) and produces the carry into bit 3 (c[3]); its sum goes to s[2]. The second line swaps carry in and out, the third ignores the carry from bit 1 (only bit 0 uses cin), and the fourth writes the sum into the wrong bit.',
      src: course(at('rca', '00:01:21', '00:01:35'), at('hier', '00:03:15')) },
  ];

  /* ======================================================================= LAB 7 */
  // load-register trace (lesson): per clock cycle k = 0..4; reset during cycle 0
  const LR_RST = [1, 0, 0, 0, 0];
  const LR_LD = [0, 1, 0, 1, 0];
  const LR_DIN = ['3C', '3C', 'A7', 'A7', '55'];
  const LR_Q = (() => { let q = '00'; return LR_RST.map((r, k) => (q = r ? '00' : LR_LD[k] ? LR_DIN[k] : q)); })();
  if (LR_Q.join(' ') !== '00 3C 3C A7 A7') throw new Error('labs-5-8: load register trace changed');
  const dgLoad = tm([
    ['clk', clkWave(LR_LD.length)],
    ['reset', perCycle(LR_RST).join('')],
    ['ld', perCycle(LR_LD).join('')],
    ['din', perCycle(LR_DIN)],
    ['q', regSlots(LR_Q, '00')],
  ], true);
  // shift register: nonblocking vs blocking, d per cycle, q1 = q2 = 0 at the start
  const SH_D = [1, 0, 1, 1];
  const SH_NB = (() => { let q1 = 0, q2 = 0; return SH_D.map(d => { [q1, q2] = [d, q1]; return [q1, q2]; }); })();
  const SH_B = (() => { let q1 = 0, q2 = 0; return SH_D.map(d => { q1 = d; q2 = q1; return [q1, q2]; }); })();
  const dgShift = tm([
    ['clk', clkWave(SH_D.length)],
    ['d', perCycle(SH_D).join('')],
    ['q1 (nonblocking)', regSlots(SH_NB.map(p => String(p[0])), '0').join('')],
    ['q2 (nonblocking)', regSlots(SH_NB.map(p => String(p[1])), '0').join('')],
    ['q2 (blocking)', regSlots(SH_B.map(p => String(p[1])), '0').join('')],
  ], true);

  // question lab7-q9: load register with a reset pulse at edge 3 (asynchronous: q clears as soon as reset rises)
  const Q9_RST = [1, 0, 0, 1, 0, 0, 0];
  const Q9_LD = [0, 1, 0, 1, 0, 1, 0];
  const Q9_DIN = ['00', '5A', 'C3', 'C3', 'FF', '81', '7E'];
  const Q9_Q = (() => { let q = '00'; return Q9_RST.map((r, k) => (q = r ? '00' : Q9_LD[k] ? Q9_DIN[k] : q)); })();
  if (Q9_Q.join(' ') !== '00 5A 5A 00 00 81 81') throw new Error('labs-5-8: q9 trace changed');
  const q9Rst = perCycle(Q9_RST);
  const dgQ9 = tm([
    ['clk', clkWave(Q9_LD.length)],
    ['reset', q9Rst.join('')],
    ['ld', perCycle(Q9_LD).join('')],
    ['din', perCycle(Q9_DIN)],
    ['q', regSlots(Q9_Q, '00').map((v, i) => (q9Rst[i] ? '00' : v))],
  ], true);
  // question lab7-q11: two edges, d = 1 then 0
  const Q11_D = [1, 0];
  const Q11_NB = (() => { let q1 = 0, q2 = 0; return Q11_D.map(d => { [q1, q2] = [d, q1]; return [q1, q2]; }); })();
  if (Q11_NB[1].join('') !== '01') throw new Error('labs-5-8: q11 trace changed');
  const dgQ11 = tm([
    ['clk', clkWave(2)],
    ['d', perCycle(Q11_D).join('')],
    ['q1', regSlots(Q11_NB.map(p => String(p[0])), '0').join('')],
    ['q2', regSlots(Q11_NB.map(p => String(p[1])), '0').join('')],
  ], true);

  const lab7Lessons = [
    { id: 'lab7-l1', subtopic: 'lab7', title: 'A clock generator in the testbench', minutes: 7, needsSource: 'Verilog-clk_generator-v1.pdf (the testbench code, lines 16–17) is not mirrored; the code is reconstructed from the narration.',
      src: course(at('clk', '00:00:09', '00:00:29', '00:01:08', '00:01:21', '00:01:45', '00:02:07', '00:02:23'), at('tclk', '00:03:18', '00:05:05')),
      blocks: [
        { type: 'text', html: `<p><b>Why.</b> Sequential circuits need a clock: a <b>periodical</b> signal. Its period T<sub>CLK</sub> = 1 / f<sub>CLK</sub>, and its <b>duty cycle</b> is the fraction of the period in which it is active (1). The easiest clock to make in Verilog has a <b>50 % duty cycle</b>.</p>
<p>Instead of coding “clock becomes 1 after 50 ns, then 0 after another 50 ns …” by hand, two lines do it forever:</p>` },
        { type: 'code', lang: 'verilog', code: CODE_TB_CLK },
        { type: 'callout', tone: 'exam', html: `<b>Placement rule (from the video).</b> The ${c('always')} clock generator goes <b>inside the testbench but outside the initial block</b>. The clock’s <b>first value</b> (${c('clk_tb = 0;')}) goes <b>inside</b> the initial block. Each time the delay expires, the always statement assigns the clock the NOT of its current value.` },
        { type: 'example', title: 'Period, frequency and edges of always #50', problem: `With ${c('`timescale 1ns / 1ps')}, ${c('clk_tb = 0')} at time 0 and ${c('always #50 clk_tb = ~clk_tb;')}, find the period, the frequency and the first three rising edges.`,
          steps: [
            'The clock flips every 50 time units = 50 ns, so it is 0 for 50 ns and 1 for 50 ns: a 50 % duty cycle.',
            'Period = 50 + 50 = <b>100 ns</b>.',
            'f = 1 / T = 1 / (100 × 10<sup>−9</sup> s) = 10<sup>7</sup> Hz = <b>10 MHz</b>.',
            'It starts at 0 and first becomes 1 at t = 50 ns; after that every 100 ns: rising edges at <b>50, 150, 250 ns</b>.',
          ], answer: 'T = 100 ns, f = 10 MHz, rising edges at 50, 150, 250 ns' },
        { type: 'diagram', diagram: tm([['clk_tb (starts at 0)', '01010101'], ['clk_tb (starts at 1)', '10101010']], true), caption: 'One slot = 50 ns. Starting with clk_tb = 1 instead of 0 flips the waveform.' },
        { type: 'callout', tone: 'warn', html: `<b>Two classic mistakes</b> (standard Verilog, checked in simulation): (1) forgetting the initial value — the clock starts as ${c('x')}, and ${c('~x')} is still ${c('x')}, so the clock never toggles; (2) writing the ${c('always')} <i>inside</i> ${c('initial begin … end')} — always is a block of its own at module level, so that is a syntax error.` },
        { type: 'check', question: { id: 'lab7-l1-c1', type: 'numeric', difficulty: 1, answer: 10,
          prompt: `${c('`timescale 1ns / 1ps')}, ${c('initial clk = 0;')} and ${c('always #5 clk = ~clk;')}. What is the clock period in ns?`,
          steps: ['The clock flips every 5 ns.', 'One period = one low half + one high half = 5 + 5 = 10 ns.'],
          explanation: 'The delay in always #N is half the period for a 50 % duty-cycle clock, so the period is 2N = 10 ns (100 MHz).',
          src: course(at('clk', '00:01:45', '00:02:11')) } },
        { type: 'check', question: { id: 'lab7-l1-c2', type: 'mc', difficulty: 1,
          prompt: `Where does ${c('always #50 clk_tb = ~clk_tb;')} go?`,
          choices: ['In the testbench, outside the initial block', 'Inside the testbench’s initial begin … end', 'Inside the module under test (the register)', 'In the constraints file'],
          answer: 0,
          explanation: 'The video is explicit: inside the testbench, but outside the initial statement (only clk_tb’s first value goes inside initial). The design itself receives the clock as an input; constraints map pins on the board.',
          src: course(at('clk', '00:01:08', '00:01:21')) } },
      ] },

    { id: 'lab7-l2', subtopic: 'lab7', title: 'Registers in Verilog: posedge clk, reset, load and count', minutes: 9, needsSource: NS_L7,
      src: course(at('reg', '00:00:18', '00:01:07', '00:01:21', '00:01:43', '00:02:03', '00:02:27', '00:02:48', '00:02:56', '00:03:17', '00:03:45', '00:04:21', '00:04:52', '00:05:19')),
      blocks: [
        { type: 'text', html: `<p><b>The 8-bit basic register</b> from the lab: inputs ${c('clk')}, ${c('reset')} and ${c('din[7:0]')}; output ${c('q[7:0]')}, declared as a reg because it is assigned in an always block. The code is short, but every part matters:</p>
<ul><li>The sensitivity list has <b>only clock and reset</b>, both on the <b>positive edge</b>: the register is updated only when one of them goes from 0 to 1.</li>
<li><b>Reset has priority</b>: when reset = 1 you do not care about any other signal — the content becomes zero. So the first thing the block asks is ${c('if (reset)')}; ${c("8'h00")} is eight zeros written in hex.</li>
<li>Otherwise (a rising clock edge with reset = 0) ${c('q')} takes the data input. At all other times q keeps its old value.</li></ul>` },
        { type: 'code', lang: 'verilog', code: CODE_REG8 },
        { type: 'diagram', diagram: comp('register', '8-bit register (reg8)', ['din[7:0]', 'reset'], ['q[7:0]'], { clock: true }), caption: 'Block diagram: data in, reset, clock; q out.' },
        { type: 'callout', tone: 'exam', html: `<b>The rule for sequential circuits:</b> only clock and reset go on the sensitivity list (here on their positive edges). Load, count-enable and any other control signals of multifunction registers <b>never</b> go on it — they are tested inside the always block.` },
        { type: 'code', lang: 'verilog', code: CODE_LDCNT },
        { type: 'callout', tone: 'tip', html: `<b>Load register hint:</b> use ${c('ld')} in an if; you do not need the else part ${c('q <= q;')} — a reg keeps its value unless it is updated, so “hold” happens implicitly. <b>Counter hint:</b> incrementing is just ${c('q <= q + 1;')} in the proper part of the always block.` },
        { type: 'example', title: 'Trace the load register', problem: 'reset is 1 during the first clock cycle, then 0. At the following rising edges ld, din are: (1, 3C), (0, A7), (1, A7), (0, 55). What is q after each edge?',
          steps: [
            'Edge 0: reset = 1 → q = 00 (reset wins, whatever ld and din are).',
            'Edge 1: ld = 1 → q = din = <b>3C</b>.',
            'Edge 2: ld = 0 → no update: q stays <b>3C</b> even though din changed to A7.',
            'Edge 3: ld = 1 → q = <b>A7</b>.',
            'Edge 4: ld = 0 → q stays <b>A7</b> (din = 55 is ignored).',
          ], answer: 'q = 00, 3C, 3C, A7, A7' },
        { type: 'diagram', diagram: dgLoad, caption: 'Load register trace (two slots per clock cycle; inputs change at falling edges, q changes only at rising edges with ld = 1). Checked in Icarus Verilog.' },
        { type: 'callout', tone: 'note', html: `<b>Asynchronous vs synchronous reset</b> (supplemental terms). Because ${c('posedge reset')} is in the sensitivity list, the instructor’s register clears <b>as soon as</b> reset rises — even between clock edges (an asynchronous reset; checked in simulation). With ${c('always @(posedge clk)')} alone and ${c('if (reset)')} inside, reset would act only at a clock edge (a synchronous reset).` },
        { type: 'check', question: { id: 'lab7-l2-c1', type: 'multi', difficulty: 2,
          prompt: 'A load register with count enable has signals clk, reset, ld, en and din. Which belong in its sensitivity list? Select all that apply.',
          choices: [c('posedge clk'), c('posedge reset'), c('ld'), c('en'), c('din')],
          answers: [0, 1],
          explanation: 'Only clock and reset — the general rule for sequential circuits in this course. ld, en and din are examined inside the block at each rising edge.',
          src: course(at('reg', '00:02:56', '00:03:32')) } },
      ] },

    { id: 'lab7-l3', subtopic: 'lab7', title: 'Nonblocking vs blocking assignments in clocked blocks', minutes: 6,
      src: course(at('alw', '00:13:06', '00:13:53', '00:14:34', '00:15:13', '00:15:56', '00:16:17'), at('fsm2', '00:01:33', '00:02:02')),
      blocks: [
        { type: 'text', html: `<p>Inside always and initial blocks statements run in sequence, and there are two kinds of procedural assignment (Lab 4 video):</p>
<ul><li><b>Blocking</b> ${c('=')}: the variable gets the value <b>immediately</b>, before the next statement runs. That is how combinational circuits work, so use it for combinational logic (${c('always @*')}).</li>
<li><b>Nonblocking</b> ${c('<=')} (not “less than or equal”): the variable is assigned only <b>at the end of the always block</b>. That is characteristic of sequential circuits, so use it in blocks triggered by ${c('posedge clk')} / ${c('posedge reset')} — registers, counters and the FSM state register in Lab 8.</li></ul>` },
        { type: 'code', lang: 'verilog', code: CODE_SHIFT },
        { type: 'example', title: 'Why it matters: a 2-stage shift register', problem: 'q1 = q2 = 0 and d = 1 at the first rising edge, d = 0 at the second. What are q1 and q2 after each edge, for each version?',
          steps: [
            'Nonblocking, edge 1: both right sides are read first (d = 1, old q1 = 0), then both update: q1 = 1, q2 = 0.',
            'Nonblocking, edge 2: read d = 0 and old q1 = 1 → q1 = 0, q2 = 1. The 1 moved one stage per clock: a real shift register.',
            'Blocking, edge 1: q1 = d = 1 immediately; then q2 = q1 reads the <i>new</i> q1 → q2 = 1.',
            'Blocking, edge 2: q1 = 0, then q2 = 0. q2 is just a copy of q1 — the second stage has disappeared.',
          ], answer: 'nonblocking: (1,0) then (0,1); blocking: (1,1) then (0,0)' },
        { type: 'diagram', diagram: dgShift, caption: 'd = 1, 0, 1, 1 at four edges. With nonblocking assignments q2 is q1 delayed by one clock; with blocking ones q2 just equals q1. Checked in Icarus Verilog.' },
        { type: 'check', question: { id: 'lab7-l3-c1', type: 'tf', difficulty: 1,
          prompt: `True or false: in ${c('always @(posedge clk, posedge reset)')} blocks, the course uses nonblocking assignments (${c('<=')}).`,
          answer: true,
          explanation: 'Nonblocking assignments are meant for sequential circuits; blocking (=) is for combinational always blocks. The Lab 8 state register follows the same rule.',
          src: course(at('alw', '00:15:13', '00:15:56'), at('fsm2', '00:01:33')) } },
      ] },
  ];

  const lab7Cards = [
    { id: 'lab7-f1', subtopic: 'lab7', front: 'Code for a 50 %-duty-cycle clock in a testbench (toggle every 50 ns)', back: `${c('always #50 clk_tb = ~clk_tb;')} — outside the initial block — plus ${c('clk_tb = 0;')} inside the initial block.`, src: course(at('clk', '00:00:58', '00:01:39')) },
    { id: 'lab7-f2', subtopic: 'lab7', front: 'Clock generator: what goes inside the initial block, and what outside?', back: 'Inside: only the clock’s first value (clk_tb = 0). Outside, still in the testbench: the always statement that keeps toggling it.', src: course(at('clk', '00:01:08', '00:01:31')) },
    { id: 'lab7-f3', subtopic: 'lab7', front: 'What changes if the clock starts at 1 instead of 0?', back: 'The waveform is flipped: high for the first half period, then low, and so on.', src: course(at('clk', '00:02:23', '00:02:29')) },
    { id: 'lab7-f4', subtopic: 'lab7', front: 'Clock period vs frequency', back: 'T<sub>CLK</sub> = 1 / f<sub>CLK</sub>. Example: T = 100 ns ↔ f = 10 MHz; T = 10 ns ↔ f = 100 MHz.', src: course(at('tclk', '00:03:05', '00:03:18')) },
    { id: 'lab7-f5', subtopic: 'lab7', front: 'Duty cycle', back: 'The fraction of the period in which the signal is active (1). always #N toggling gives 50 %; 10 % or 90 % clocks also exist.', src: course(at('tclk', '00:04:51', '00:05:20', '00:06:09')) },
    { id: 'lab7-f6', subtopic: 'lab7', front: 'The instructor’s 8-bit register: sensitivity list and body', back: `${c('always @(posedge clk, posedge reset)')} ${c("if (reset) q <= 8'h00; else q <= din;")}`, src: course(at('reg', '00:01:07', '00:02:45')) },
    { id: 'lab7-f7', subtopic: 'lab7', front: 'Why is reset tested first in the register’s always block?', back: 'Reset has priority: when reset = 1 the content must become zero no matter what the other signals are.', src: course(at('reg', '00:01:43', '00:02:12')) },
    { id: 'lab7-f8', subtopic: 'lab7', front: 'Which signals go on a sequential always block’s sensitivity list?', back: 'Only clock and reset (here on posedge). Load, count-enable and other controls never do.', src: course(at('reg', '00:02:56', '00:03:32')) },
    { id: 'lab7-f9', subtopic: 'lab7', front: `Load register: do you need ${c('else q <= q;')}?`, back: 'No. A reg keeps its value unless it is updated again, so holding happens implicitly.', src: course(at('reg', '00:04:21', '00:04:52')) },
    { id: 'lab7-f10', subtopic: 'lab7', front: 'How does a counter count in Verilog?', back: `${c('q <= q + 1;')} in the right branch of the clocked always block (e.g. under if (en)), so it increments on each rising clock edge.`, src: course(at('reg', '00:04:52', '00:05:26')) },
    { id: 'lab7-f11', subtopic: 'lab7', front: `Nonblocking assignment ${c('<=')}`, back: 'The variable gets the value only at the end of the always block. Use it for sequential circuits (clocked blocks).', src: course(at('alw', '00:15:13', '00:15:56')) },
    { id: 'lab7-f12', subtopic: 'lab7', front: `Blocking assignment ${c('=')}`, back: 'The variable gets the value immediately, before the next statement. Use it for combinational logic.', src: course(at('alw', '00:13:53', '00:14:43')) },
    { id: 'lab7-f13', subtopic: 'lab7', front: 'Asynchronous vs synchronous reset', back: `Asynchronous: ${c('posedge reset')} is in the sensitivity list, so q clears at once (the course’s style). Synchronous: only ${c('posedge clk')} is listed, so reset acts at the next clock edge. (Terms are supplemental.)`, src: supp(S_VLOG) },
    { id: 'lab7-f14', subtopic: 'lab7', front: `What is ${c("8'h00")}?`, back: 'An 8-bit constant written in hex: 00 hex = 0000 0000 binary. The register’s reset value.', src: course(at('reg', '00:02:12', '00:02:22')) },
  ];

  const lab7Questions = [
    { id: 'lab7-q1', subtopic: 'lab7', type: 'numeric', difficulty: 1, answer: 100,
      prompt: `With ${c('`timescale 1ns / 1ps')}, ${c('clk_tb = 0')} in the initial block and ${c('always #50 clk_tb = ~clk_tb;')}, what is the clock period in ns?`,
      steps: ['clk_tb flips every 50 ns.', 'Low 50 ns + high 50 ns = 100 ns.'],
      explanation: 'Each #50 is half a period, so T = 100 ns (10 MHz) — the instructor’s 50 ns example.',
      src: course(at('clk', '00:00:42', '00:02:11')) },
    { id: 'lab7-q2', subtopic: 'lab7', type: 'numeric', difficulty: 2, answer: 100,
      prompt: `What is the frequency, in MHz, of the clock made by ${c('initial clk = 0;')} and ${c('always #5 clk = ~clk;')} with ${c('`timescale 1ns / 1ps')}?`,
      steps: ['Half period = 5 ns, so T = 10 ns.', 'f = 1 / T = 1 / (10 × 10<sup>−9</sup> s) = 10<sup>8</sup> Hz.', '10<sup>8</sup> Hz = 100 MHz.'],
      explanation: 'Use T = 1/f with the full period (10 ns), not the toggle delay (5 ns); 1/5 ns would give 200 MHz, which is wrong.',
      src: course(at('tclk', '00:03:18')) },
    { id: 'lab7-q3', subtopic: 'lab7', type: 'tf', difficulty: 1,
      prompt: 'True or false: if the testbench sets the clock to 1 (instead of 0) in the initial block, the clock waveform is flipped.',
      answer: true,
      explanation: 'The always statement just keeps inverting whatever value the clock has, so starting at 1 gives high-then-low halves instead of low-then-high.',
      src: course(at('clk', '00:02:23', '00:02:29')) },
    { id: 'lab7-q4', subtopic: 'lab7', type: 'mc', difficulty: 2,
      prompt: `A testbench has ${c('always #5 clk = ~clk;')} but no line ever gives ${c('clk')} a first value. What does the simulation show?`,
      choices: ['clk stays x (unknown) for the whole simulation', 'clk starts at 0 and toggles normally', 'clk starts at 1 and toggles normally', 'A compile error: always needs an initial value'],
      answer: 0,
      explanation: 'A reg starts as x, and ~x is still x, so the clock never becomes 0 or 1 (simulated: clk_noinit = x). It compiles fine; that is why the instructor puts clk_tb = 0 inside the initial block.',
      src: supp(S_VLOG) },
    { id: 'lab7-q5', subtopic: 'lab7', type: 'numeric', difficulty: 2, answer: 10,
      prompt: `${c('clk_tb = 0')} at t = 0 and ${c('always #50 clk_tb = ~clk_tb;')} (1 ns units). How many rising edges happen from t = 0 to t = 1000 ns?`,
      steps: ['The first rising edge is at t = 50 ns (0 → 1).', 'Then one every period (100 ns): 50, 150, 250, …, 950 ns.', 'The next one, 1050 ns, is past the end.', '(950 − 50) / 100 + 1 = 10 rising edges.'],
      explanation: 'Counting starts at 50 ns, not at 0, because the clock starts low. (Simulated: 10 edges by t = 1000 ns.)',
      src: course(at('clk', '00:01:45', '00:02:42')) },
    { id: 'lab7-q6', subtopic: 'lab7', type: 'mc', difficulty: 2,
      prompt: `${c('initial clk = 0;')} and ${c('always #5 clk = ~clk;')} (1 ns units). When is the first rising edge?`,
      choices: ['t = 5 ns', 't = 0 ns', 't = 10 ns', 't = 2.5 ns'],
      answer: 0,
      explanation: 'clk is 0 at t = 0 and flips to 1 after the first 5 ns delay; it falls at 10 ns and rises again at 15 ns (simulated: rising edges at 5, 15, 25 ns).',
      src: course(at('clk', '00:01:31', '00:02:01')) },
    { id: 'lab7-q7', subtopic: 'lab7', type: 'mc', difficulty: 1,
      prompt: 'Which always header matches the instructor’s 8-bit register with reset?',
      choices: [c('always @(posedge clk, posedge reset)'), c('always @*'), c('always @(clk, reset, din)'), c('always @(posedge clk, posedge reset, din)')],
      answer: 0,
      explanation: 'The register is re-evaluated only on the positive edge of clock or reset. @* and level-sensitive lists describe combinational logic, and data inputs never go on a sequential block’s list.',
      src: course(at('reg', '00:01:07', '00:01:38')) },
    { id: 'lab7-q8', subtopic: 'lab7', type: 'tf', difficulty: 2,
      prompt: `True or false: a load register must include ${c('else q <= q;')}, otherwise q is lost whenever ld = 0.`,
      answer: false,
      explanation: 'The value of a reg is preserved unless it is updated again, so the hold case happens implicitly — the instructor says you do not need to write that else.',
      src: course(at('reg', '00:04:21', '00:04:52')) },
    { id: 'lab7-q9', subtopic: 'lab7', type: 'short', difficulty: 3, normalize: 'hex', accept: ['81'],
      prompt: 'The load register (<code>if (reset) q &lt;= 8\'h00; else if (ld) q &lt;= din;</code>, asynchronous reset) sees these values at seven rising edges. What is q (hex) after the last edge?' +
        table(['edge', 'reset', 'ld', 'din'], [['0', '1', '0', '00'], ['1', '0', '1', '5A'], ['2', '0', '0', 'C3'], ['3', '1', '1', 'C3'], ['4', '0', '0', 'FF'], ['5', '0', '1', '81'], ['6', '0', '0', '7E']]),
      steps: ['Edge 0: reset → 00.', 'Edge 1: ld = 1 → 5A.', 'Edge 2: ld = 0 → stays 5A.', 'Edge 3: reset = 1 has priority over ld = 1 → 00.', 'Edge 4: ld = 0 → stays 00.', 'Edge 5: ld = 1 → 81.', 'Edge 6: ld = 0 → stays 81.'],
      solutionDiagram: dgQ9,
      explanation: 'Reset is checked first, so at edge 3 the load is ignored (with the asynchronous reset, q actually clears as soon as reset rises, before that edge). After that, only edges with ld = 1 change q. (Simulated in Icarus Verilog: 00, 5A, 5A, 00, 00, 81, 81.)',
      src: course(at('reg', '00:01:43', '00:02:12', '00:04:04')) },
    { id: 'lab7-q10', subtopic: 'lab7', type: 'numeric', difficulty: 3, answer: 3,
      prompt: 'A 4-bit counter (<code>if (reset) q &lt;= 0; else if (en) q &lt;= q + 1;</code>) is reset, then sees en = 1 for 5 rising edges, en = 0 for 3 edges, and en = 1 for 14 edges. What is q (decimal)?',
      steps: ['After reset q = 0.', 'en = 1 for 5 edges: q = 5.', 'en = 0 for 3 edges: q holds at 5.', 'en = 1 for 14 edges: 5 + 14 = 19.', 'A 4-bit q wraps at 16: 19 mod 16 = 3.'],
      explanation: 'q + 1 is truncated to 4 bits, so 1111 + 1 = 0000 and the count wraps. (Simulated: 3.)',
      src: course(at('reg', '00:04:52', '00:05:26')) },
    { id: 'lab7-q11', subtopic: 'lab7', type: 'mc', difficulty: 3,
      prompt: 'q1 = q2 = 0. At the first rising edge d = 1, at the second d = 0. With the <b>nonblocking</b> version, what are (q1, q2) after the second edge?' + pre('always @(posedge clk)', 'begin', '    q1 <= d;', '    q2 <= q1;', 'end'),
      choices: ['(0, 1)', '(0, 0)', '(1, 1)', '(1, 0)'],
      answer: 0,
      steps: ['Edge 1: read d = 1 and old q1 = 0 → q1 = 1, q2 = 0.', 'Edge 2: read d = 0 and old q1 = 1 → q1 = 0, q2 = 1.'],
      solutionDiagram: dgQ11,
      explanation: 'Nonblocking assignments update at the end of the block, so q2 gets the old q1: the 1 shifts from q1 to q2. (0, 0) is what the blocking version gives — q2 would copy the new q1. (Simulated: nb 01, blocking 00.)',
      src: course(at('alw', '00:15:13', '00:15:56')) },
    { id: 'lab7-q12', subtopic: 'lab7', type: 'match', difficulty: 2,
      prompt: 'Match each register feature to its description.',
      pairs: [
        [c('posedge reset') + ' in the sensitivity list', 'q clears as soon as reset rises (asynchronous reset)'],
        [c('if (ld) q <= din;'), 'Load register: update only when the load signal is 1'],
        [c('if (en) q <= q + 1;'), 'Counter: increment on each rising edge while enabled'],
        [c('q <= din;'), 'Nonblocking: assigned at the end of the always block'],
        [c('always #50 clk_tb = ~clk_tb;'), 'Testbench clock generator'],
      ],
      explanation: 'These are the building blocks of the Lab 7 code: the asynchronous reset, the load and count-enable branches, nonblocking assignment, and the testbench clock.',
      src: course(at('reg', '00:01:21', '00:04:04', '00:05:19'), at('clk', '00:00:58')) },
    { id: 'lab7-q13', subtopic: 'lab7', type: 'mc', difficulty: 2,
      prompt: 'The instructor’s register holds q = 3C. Reset rises to 1 halfway between two clock edges. When does q become 00?',
      choices: ['Immediately, when reset rises', 'At the next rising clock edge', 'At the next falling clock edge', 'Never — reset needs ld = 1 too'],
      answer: 0,
      explanation: 'posedge reset is in the sensitivity list, so the always block runs the moment reset rises and the reset branch clears q (simulated: q read 00 one nanosecond after reset rose mid-cycle, long before the next clock edge). Waiting for a clock edge would be a synchronous reset.',
      src: course(at('reg', '00:01:21', '00:01:58')) },
    { id: 'lab7-q14', subtopic: 'lab7', type: 'short', difficulty: 1, normalize: 'binary', width: 8, accept: ['00000000'],
      prompt: `Write the reset value ${c("8'h00")} as 8 binary digits.`,
      steps: ['Each hex digit is 4 bits: 0 → 0000.', '00 hex → 0000 0000.'],
      explanation: '8\'h00 means an 8-bit constant whose hex value is 00: all eight bits are zero.',
      src: course(at('reg', '00:02:12', '00:02:22')) },
    { id: 'lab7-q15', subtopic: 'lab7', type: 'mc', difficulty: 2,
      prompt: 'Which block describes a register with a <b>synchronous</b> reset (reset acts only at a rising clock edge)?',
      choices: [
        pre('always @(posedge clk)', "    if (reset) q <= 8'h00;", '    else       q <= din;'),
        pre('always @(posedge clk, posedge reset)', "    if (reset) q <= 8'h00;", '    else       q <= din;'),
        pre('always @*', "    if (reset) q = 8'h00;", '    else       q = din;'),
        pre('always @(posedge reset)', "    q <= 8'h00;"),
      ],
      answer: 0,
      explanation: 'With only posedge clk listed, the reset branch can run only at a clock edge (synchronous). The second block is the course’s asynchronous version; the third is combinational (no storage on an edge); the fourth never loads din.',
      src: supp(S_VLOG) },
    { id: 'lab7-q16', subtopic: 'lab7', type: 'numeric', difficulty: 3, answer: 20,
      prompt: 'What is the duty cycle (in %) of this testbench clock?' + pre('initial clk = 0;', 'always', 'begin', '    #80 clk = 1;', '    #20 clk = 0;', 'end'),
      steps: ['clk is 0 from t = 0 to 80 ns, then 1 from 80 to 100 ns, then the always block repeats.', 'Period = 80 + 20 = 100 ns.', 'Time high = 20 ns.', 'Duty cycle = 20 / 100 = 20 %.'],
      explanation: 'Duty cycle is the fraction of the period in which the clock is 1. Unequal delays make a non-50 % clock (simulated: high 200 of 1000 one-ns samples).',
      src: course(at('tclk', '00:05:05', '00:06:26')) },
    { id: 'lab7-q17', subtopic: 'lab7', type: 'mc', difficulty: 1,
      prompt: 'Why is q declared <code>output reg [7:0] q</code> in the register module?',
      choices: ['Because q is assigned inside an always block', 'Because every output port must be a reg', 'Because reg makes q 8 bits wide', 'Because only regs can be connected to a testbench'],
      answer: 0,
      explanation: 'Ports are wires by default; anything assigned procedurally (inside always) must be declared reg. The width comes from [7:0], not from reg, and testbenches connect to wires.',
      src: course(at('reg', '00:00:29', '00:00:42'), at('alw', '00:09:55')) },
    { id: 'lab7-q18', subtopic: 'lab7', type: 'multi', difficulty: 2,
      prompt: `A testbench (1 ns time units) contains ${c('initial clk_tb = 0;')} and ${c('always #50 clk_tb = ~clk_tb;')}. Select all statements that are true.`,
      choices: ['The clock period is 100 ns', 'The duty cycle is 50 %', 'The first rising edge is at t = 0', 'The clock frequency is 20 MHz', 'The always statement must be moved inside the initial block'],
      answers: [0, 1],
      steps: ['Low for 50 ns, high for 50 ns → period 100 ns, duty cycle 50 / 100 = 50 %.', 'f = 1 / 100 ns = 10 MHz (20 MHz would need a 50 ns period).', 'clk_tb starts at 0 and first rises at t = 50 ns.'],
      explanation: 'The toggle delay is half the period. The always statement belongs outside the initial block — only the first value goes inside.',
      src: course(at('clk', '00:00:29', '00:01:08', '00:01:45'), at('tclk', '00:03:18')) },
  ];

  /* ======================================================================= LAB 8 */
  // next-state equations of the example FSM with binary encoding (state = Q1 Q0, input E = en)
  const NS_Q1 = "Q1 Q0' + Q1 E' + Q1' Q0 E", NS_Q0 = "Q0' E + Q0 E'";
  const FSM_CODE = { S0: '00', S1: '01', S2: '10', S3: '11' };
  (function checkNextState() {
    for (const s of FSM.states) for (const e of [0, 1]) {
      const env = { Q1: +FSM_CODE[s][0], Q0: +FSM_CODE[s][1], E: e };
      const want = FSM_CODE[FSM.next(s, e)];
      const got = '' + L.evalBool(L.parseBool(NS_Q1), env) + L.evalBool(L.parseBool(NS_Q0), env);
      if (got !== want) throw new Error('labs-5-8: next-state equations wrong at ' + s + ' en=' + e);
    }
  })();
  const nsRows = FSM.states.flatMap(s => [0, 1].map(e => [s + ' = ' + FSM_CODE[s], String(e), FSM.next(s, e) + ' = ' + FSM_CODE[FSM.next(s, e)]]));

  // question lab8-q10: S1 branch swapped (S1: nstate = en ? S1 : S2;)
  const BUG_RST = [1, 0, 0, 0, 0, 0];
  const BUG_EN = [0, 1, 1, 1, 0, 1];
  const BUG_ST = (() => { let s = 'S0'; return BUG_EN.map((e, k) => (s = BUG_RST[k] ? 'S0' : s === 'S1' ? (e ? 'S1' : 'S2') : FSM.next(s, e))); })();
  if (BUG_ST.join(' ') !== 'S0 S1 S1 S1 S2 S3') throw new Error('labs-5-8: buggy run changed');
  const dgBug = tm([
    ['clk', clkWave(BUG_EN.length)],
    ['reset', perCycle(BUG_RST).join('')],
    ['en', perCycle(BUG_EN).join('')],
    ['state', regSlots(BUG_ST, 'S0')],
  ], true);

  const lab8Lessons = [
    { id: 'lab8-l1', subtopic: 'lab8', title: 'A Moore FSM in Verilog: three blocks, three segments', minutes: 8, needsSource: 'Lab 8 handout: the state encoding the lab actually requires.',
      src: course(at('fsm1', '00:00:12', '00:00:19', '00:00:41', '00:00:53', '00:01:09', '00:01:48', '00:02:10', '00:02:31', '00:02:47', '00:03:02', '00:03:33', '00:03:55', '00:04:13'), at('enc', '00:02:46', '00:09:34')),
      blocks: [
        { type: 'text', html: `<p><b>Three blocks.</b> A Moore FSM consists of three separate blocks: a <b>state register</b> (synchronous sequential — it memorizes which state the FSM is in) and two combinational blocks, the <b>next-state logic</b> and the <b>output logic</b>. Transitions happen on the positive clock edge.</p>
<p><b>Three segments.</b> Straight from that diagram comes the <b>three-segment coding style</b> used in this course: one always block for the state register, one combinational always block for the next-state logic, and one for the output logic (which can be so simple that it becomes a plain ${c('assign')}).</p>` },
        { type: 'diagram', diagram: dgFsm, caption: 'The lab example (Moore): start in S0; en = 1 moves to the next state, en = 0 stays. The 4-bit output loses a 1 in each state: 1111, 0111, 0011, 0001, then back.' },
        { type: 'text', html: `<p><b>State encoding.</b> Before the three segments, the code gives each state an explicit value. This part is optional — designers can let the tool optimize the state assignment — but in the lab you encode explicitly, with ${c('localparam')} (local parameter). The video uses simple binary encoding; your lab will use a different encoding, with the same procedure.</p>` },
        { type: 'code', lang: 'verilog', code: code(
          "localparam [1:0] S0 = 2'b00,     // binary encoding, as in the video",
          "                 S1 = 2'b01,",
          "                 S2 = 2'b10,",
          "                 S3 = 2'b11;",
          'reg [1:0] state, nstate;',
          '',
          '// Gray encoding (adjacent states differ in one bit): only these lines change',
          "// localparam [1:0] S0 = 2'b00, S1 = 2'b01, S2 = 2'b11, S3 = 2'b10;") },
        { type: 'callout', tone: 'tip', html: `<b>Why S0 = 00?</b> From the Topic 7 encoding lecture: it is customary and useful to encode the starting state as all zeros, because reset clears every bit of the state register — and that puts the FSM in its starting state. The same lecture says the lab assignment uses <b>Gray</b> encoding; follow your Lab 8 handout for the exact codes.` },
        { type: 'check', question: { id: 'lab8-l1-c1', type: 'mc', difficulty: 1,
          prompt: 'Which three segments make up the course’s Verilog FSM coding style?',
          choices: ['State register, next-state logic, output logic', 'Testbench, clock generator, state register', 'Input decoder, state register, output register', 'Initial block, always block, assign block'],
          answer: 0,
          explanation: 'The three segments mirror the three blocks of the FSM: one sequential (state register) and two combinational (next-state and output logic). The testbench and clock generator are outside the design.',
          src: course(at('fsm1', '00:00:53', '00:01:36')) } },
        { type: 'check', question: { id: 'lab8-l1-c2', type: 'numeric', difficulty: 1, answer: 2,
          prompt: 'With binary encoding, how many bits does the state register of the 4-state example FSM need?',
          steps: ['n bits give 2<sup>n</sup> codes.', '2<sup>1</sup> = 2 &lt; 4 states, 2<sup>2</sup> = 4 ≥ 4 states.', 'So 2 bits: S0 … S3 = 00 … 11.'],
          explanation: 'That is why the code declares reg [1:0] state and localparam [1:0] S0 … S3.',
          src: course(at('enc', '00:02:00', '00:02:21')) } },
      ] },

    { id: 'lab8-l2', subtopic: 'lab8', title: 'The three segments line by line', minutes: 10, needsSource: NS_L8 + ' The FSM code here is reconstructed from the narration (signal names and line numbers may differ).',
      src: course(at('fsm2', '00:00:18', '00:00:43', '00:01:07', '00:01:33', '00:02:17', '00:02:41', '00:02:57', '00:03:25', '00:03:59', '00:04:36', '00:05:12', '00:05:45', '00:06:11', '00:06:24', '00:06:53', '00:07:24')),
      blocks: [
        { type: 'code', lang: 'verilog', code: CODE_FSM },
        { type: 'text', html: `<p><b>Segment 1 — state register.</b> The same code as the Lab 7 basic register: clock and reset on the sensitivity list; on reset the state becomes all zeros (S0); otherwise, on every rising edge, ${c('state <= nstate')}. This part is always the same — the interesting work happens in the segment that computes the next state. Because it describes a synchronous sequential element it uses the <b>nonblocking</b> assignment.</p>
<p><b>Segment 2 — next-state logic</b> (combinational). No clock or reset in the sensitivity list. To be explicit you would list every input of this circuit — here ${c('state')} and ${c('en')} — but the wildcard ${c('@*')} is easier and saves you from an incomplete list.</p>
<ul><li>First give the block’s output a value: ${c('nstate = state;')}. Every output of a combinational block must always be assigned; if a complicated case forgot one (say B), the tool would instantiate a memory element — a latch — for it. So, right after begin and before the case, initialize all outputs.</li>
<li>Then ${c('case (state)')}: for S0, ${c('nstate = en ? S1 : S0;')} — the ternary operator: if the expression in parentheses is true the result is the first value, otherwise the second. So the next state is S1 if en is 1, and stays S0 if en is 0.</li>
<li>Finally a ${c('default')} branch, in case the state is, by accident or mistake, none of these.</li></ul>
<p><b>Segment 3 — output logic</b> (combinational). Same sensitivity list and same habit of assigning every output first. The difference: no conditions — this is a Moore FSM, so each output corresponds to a state, copied straight from the state diagram. The instructor likes to put something <b>unused</b> (“unused states”) in the initial and default assignments — here the output 0000, which no state produces — so that if something goes wrong in simulation there is an indicator that none of the states was matched.</p>` },
        { type: 'example', title: 'From the next-state code to equations', problem: 'With binary encoding state = Q1 Q0 and input E = en, derive Q1⁺ and Q0⁺.',
          steps: [
            table(['state', 'en', 'next state'], nsRows),
            'Q0⁺ = 1 for (Q1Q0, E) = (00, 1), (01, 0), (10, 1), (11, 0): Q0⁺ = Q0′E + Q0E′ = Q0 ⊕ E (Q0 toggles when en = 1).',
            'Q1⁺ = 1 for (01, 1), (10, 0), (10, 1), (11, 0): K-map groups Q1Q0′ (minterms 4, 5), Q1E′ (4, 6) and the lone Q1′Q0E (3).',
            'Q1⁺ = Q1Q0′ + Q1E′ + Q1′Q0E = Q1 ⊕ (Q0·E) — Q1 toggles when Q0 = 1 and en = 1, like a 2-bit counter.',
          ], answer: "Q1⁺ = Q1Q0′ + Q1E′ + Q1′Q0E,  Q0⁺ = Q0′E + Q0E′" },
        { type: 'diagram', diagram: tt(['Q1', 'Q0', 'E'], [['Q1⁺', NS_Q1], ['Q0⁺', NS_Q0]]), caption: 'Next-state truth table of the example (E = en). The synthesis tool derives this from segment 2 for you.' },
        { type: 'callout', tone: 'note', html: `<b>Moore vs Mealy output logic.</b> In a Moore FSM the output function depends on the state only (h: state → output). In a Mealy FSM each combination of state and input gives the output, so segment 3 also reads the inputs (supplemental Verilog sketch):` },
        { type: 'code', lang: 'verilog', code: CODE_MEALY },
        { type: 'check', question: { id: 'lab8-l2-c1', type: 'boolexpr', difficulty: 2, vars: ['Q1', 'Q0', 'E'], answer: NS_Q0, form: 'sop', maxLiterals: 4,
          prompt: 'Write Q0⁺ (bit 0 of the next state) of the example FSM as a minimal SOP, with state = Q1 Q0 (binary encoding) and E = en.',
          steps: ['en = 0: the state holds, so Q0⁺ = Q0.', 'en = 1: S0→S1 (0→1), S1→S2 (1→0), S2→S3 (0→1), S3→S0 (1→0): Q0⁺ = Q0′.', 'Q0⁺ = Q0E′ + Q0′E (minterms 1, 2, 5, 6) — 4 literals; Q1 drops out.'],
          solutionDiagram: { kind: 'kmap', vars: ['Q1', 'Q0', 'E'], minterms: [1, 2, 5, 6], groups: [{ cells: [1, 5], label: "Q0'E" }, { cells: [2, 6], label: "Q0E'" }] },
          explanation: 'Bit 0 toggles exactly when en = 1, which is Q0 ⊕ E; as an SOP that is Q0′E + Q0E′.',
          src: course(at('fsm2', '00:05:45', '00:06:03')) } },
      ] },

    { id: 'lab8-l3', subtopic: 'lab8', title: 'Simulating the FSM, and how a Mealy output behaves in time', minutes: 8,
      src: course(at('simh', '00:00:24', '00:02:14', '00:02:38', '00:03:04'), at('clk', '00:01:08'), at('mealy', '00:00:06', '00:01:34')),
      blocks: [
        { type: 'text', html: `<p><b>The testbench</b> combines what you already know: instantiate the FSM as ${c('uut')}, generate the clock with the Lab 7 clock generator, hold reset at 1 first, then drive ${c('en')}. Change inputs away from the rising edges (here at the falling edges) so it is clear which value each edge samples. To see ${c('state')} and ${c('nstate')} inside uut, use the Lab 5 trick: drag uut into the wave and relaunch.</p>` },
        { type: 'code', lang: 'verilog', code: CODE_FSM_TB },
        { type: 'example', title: 'Predict the waveform', problem: 'For the testbench above, give the state and out after each rising edge (50, 150, …, 850 ns).',
          steps: [
            table(['edge (ns)', 'reset', 'en', 'state after', 'out'], RUN_ST.map((s, k) => [String(50 + 100 * k), String(RUN_RST[k]), String(RUN_EN[k]), s, FSM.out[s]])),
            'While reset = 1 the state is S0 (out = 1111).',
            'en = 0 at 350 ns and 850 ns: the state holds.',
            'S3 with en = 1 wraps around to S0 (550 ns).',
          ], answer: 'S0, S1, S2, S2, S3, S0, S1, S2, S2' },
        { type: 'diagram', diagram: dgRun, caption: 'The predicted run (checked against an Icarus Verilog simulation of fsm_example and this testbench). state changes only at rising edges.' },
        { type: 'text', html: `<p><b>Moore vs Mealy in time.</b> The lecture warns that a Mealy FSM “works slightly differently with respect to time”. A Moore output changes only when the state changes (at a clock edge). A Mealy output also depends on the input, so it can change <b>in the middle of a clock cycle</b>, as soon as the input changes. Below, the Mealy output ${c('wrap')} (1 in S3 while en = 1) next to the Moore output.</p>` },
        { type: 'diagram', diagram: dgMealy, caption: 'Mealy version of the example: arcs are labeled en/wrap.' },
        { type: 'diagram', diagram: dgMealyRun, caption: 'wrap rises the moment state = S3 and en = 1 hold together — once right after the edge that enters S3 (en still 1), and again mid-cycle when en returns to 1. out (Moore) changes only at edges.' },
        { type: 'check', question: { id: 'lab8-l3-c1', type: 'mc', difficulty: 2,
          prompt: 'Which output block makes the FSM a <b>Mealy</b> machine?',
          choices: [
            pre('always @*', "    if (state == S3 && en) z = 1'b1;", "    else                   z = 1'b0;"),
            pre('always @*', '    case (state)', "        S3:      z = 1'b1;", "        default: z = 1'b0;", '    endcase'),
            pre('assign z = (state == S3);'),
            pre('always @(posedge clk)', '    z <= (state == S3);'),
          ],
          answer: 0,
          explanation: 'Only the first output depends on an input (en) as well as the state: Mealy. The second and third depend on the state alone (Moore). The fourth is a registered output that also depends only on the state.',
          src: course(at('fdef', '00:06:18', '00:06:48'), at('mealy', '00:00:06', '00:00:19')) } },
      ] },
  ];

  const lab8Cards = [
    { id: 'lab8-f1', subtopic: 'lab8', front: 'The three blocks of a Moore FSM', back: 'State register (synchronous sequential), next-state logic (combinational), output logic (combinational).', src: course(at('fsm1', '00:00:19', '00:00:47')) },
    { id: 'lab8-f2', subtopic: 'lab8', front: 'Three-segment coding style', back: 'One always block per FSM block: a clocked always for the state register, an always @* for the next-state logic, an always @* (or an assign) for the output logic.', src: course(at('fsm1', '00:00:53', '00:01:48')) },
    { id: 'lab8-f3', subtopic: 'lab8', front: `What does ${c('localparam')} do in the FSM code?`, back: `Declares local parameters — named constants for the state codes, e.g. ${c("localparam [1:0] S0 = 2'b00, S1 = 2'b01, …;")} (explicit state encoding).`, src: course(at('fsm1', '00:02:40', '00:02:55')) },
    { id: 'lab8-f4', subtopic: 'lab8', front: 'Is explicit state encoding required?', back: 'No — it is optional; the tool can optimize the state assignment. The lab asks for explicit encoding.', src: course(at('fsm1', '00:02:10', '00:02:31', '00:04:36')) },
    { id: 'lab8-f5', subtopic: 'lab8', front: `${c('localparam')} vs ${c('parameter')}`, back: 'A parameter can be overridden from outside when the module is instantiated; a localparam cannot — the right choice for fixed state codes. (Standard Verilog, supplemental.)', src: supp(S_VLOG) },
    { id: 'lab8-f6', subtopic: 'lab8', front: 'Why encode the start state S0 as all zeros?', back: 'Reset clears every bit of the state register, so reset puts the FSM into its starting state.', src: course(at('enc', '00:02:46', '00:03:18')) },
    { id: 'lab8-f7', subtopic: 'lab8', front: 'State register segment', back: `${c('always @(posedge clk, posedge reset) if (reset) state <= S0; else state <= nstate;')} — the Lab 7 basic register, always the same.`, src: course(at('fsm2', '00:00:22', '00:01:21')) },
    { id: 'lab8-f8', subtopic: 'lab8', front: 'Which assignment does the state register use, and why?', back: `Nonblocking (${c('<=')}): it is a synchronous sequential element, and nonblocking is characteristic of sequential circuits.`, src: course(at('fsm2', '00:01:33', '00:02:10')) },
    { id: 'lab8-f9', subtopic: 'lab8', front: 'Sensitivity list of the next-state segment', back: `All its inputs — ${c('state')} and ${c('en')} — or, safer, the wildcard ${c('always @*')}. Never clock or reset.`, src: course(at('fsm2', '00:02:29', '00:03:20')) },
    { id: 'lab8-f10', subtopic: 'lab8', front: `Why write ${c('nstate = state;')} before the case?`, back: 'Every output of a combinational block must be assigned on every path; a default first means none can be forgotten, so no latch is inferred. It also means “stay”.', src: course(at('fsm2', '00:03:25', '00:04:53')) },
    { id: 'lab8-f11', subtopic: 'lab8', front: `${c('nstate = en ? S1 : S0;')}`, back: 'Ternary operator: S1 if en is true (1), otherwise S0. The condition may be a variable or a Boolean expression.', src: course(at('fsm2', '00:05:12', '00:06:03')) },
    { id: 'lab8-f12', subtopic: 'lab8', front: 'Moore output segment: what is special?', back: 'No conditions on inputs: each state has one output, copied from the state diagram (S0: out = 1111, …).', src: course(at('fsm2', '00:06:53', '00:07:19')) },
    { id: 'lab8-f13', subtopic: 'lab8', front: 'Why put an unused value in the output segment’s initial/default assignment?', back: 'If something goes wrong in simulation, the output shows a value no state produces (e.g. 0000 in the example) — an indicator that none of the states was matched.', src: course(at('fsm2', '00:07:24', '00:07:44')) },
    { id: 'lab8-f14', subtopic: 'lab8', front: 'Moore vs Mealy', back: 'Moore: output depends on the state only. Mealy: output depends on the state and the input — the lecture notes it “works slightly differently with respect to time”: it can change mid-cycle, as soon as the input changes.', src: course(at('fdef', '00:06:18', '00:06:48'), at('mealy', '00:00:06', '00:01:34')) },
    { id: 'lab8-f15', subtopic: 'lab8', front: 'Binary, Gray and one-hot codes for 4 states', back: 'Binary 00, 01, 10, 11; Gray 00, 01, 11, 10 (one bit changes between neighbors — less switching power); one-hot 0001, 0010, 0100, 1000 (one flip-flop per state; an invalid pattern is obvious).', src: course(at('enc', '00:01:17', '00:04:45', '00:07:32', '00:09:05')) },
  ];

  const lab8Questions = [
    { id: 'lab8-q1', subtopic: 'lab8', type: 'tf', difficulty: 1,
      prompt: 'True or false: in a Moore FSM the outputs depend only on the current state.',
      answer: true,
      explanation: 'That is the Moore definition (h maps each state to an output), and why the Lab 8 output segment has no conditions on the inputs. A Mealy FSM uses state and input.',
      src: course(at('fdef', '00:06:18', '00:06:48')) },
    { id: 'lab8-q2', subtopic: 'lab8', type: 'short', difficulty: 1, accept: ['localparam', 'local param', 'local parameter'], normalize: 'text',
      prompt: 'Which Verilog keyword does the Lab 8 code use to give the states S0 … S3 their explicit values?',
      explanation: 'localparam (local parameter): localparam [1:0] S0 = 2\'b00, S1 = 2\'b01, S2 = 2\'b10, S3 = 2\'b11;',
      src: course(at('fsm1', '00:02:40', '00:02:55')) },
    { id: 'lab8-q3', subtopic: 'lab8', type: 'mc', difficulty: 2,
      prompt: 'Why is it customary to encode the starting state S0 as all zeros?',
      choices: ['Reset clears the state register to all zeros, which then is the start state', 'All-zero codes use the fewest flip-flops', 'The synthesis tool rejects any other code for S0', 'Gray code requires the first code to be 00'],
      answer: 0,
      explanation: 'The reset branch clears every bit (state &lt;= S0 = 00), so reset lands in the start state. The number of flip-flops depends only on the encoding width; any code would be accepted by the tool; and the Gray choice of the first code is a convention, not a rule.',
      src: course(at('enc', '00:02:46', '00:03:18')) },
    { id: 'lab8-q4', subtopic: 'lab8', type: 'short', difficulty: 2, normalize: 'binary', width: 4, accept: ['0001'],
      prompt: 'The example FSM is reset, then the next four rising edges see en = 1, 1, 0, 1. What is <code>out</code> after the fourth of those edges? Type all 4 bits.',
      steps: ['After reset: S0.', 'en = 1 → S1.', 'en = 1 → S2.', 'en = 0 → stays S2.', 'en = 1 → S3.', 'Moore output of S3: 0001.'],
      solutionDiagram: dgFsm,
      explanation: 'Follow one arc per edge; en = 0 is a self-loop. In S3 the output is 0001.',
      src: course(at('fsm1', '00:03:33', '00:04:31')) },
    { id: 'lab8-q5', subtopic: 'lab8', type: 'short', difficulty: 3, normalize: 'binary', width: 4, accept: ['0011'],
      prompt: 'After reset, en is held at 1 for 10 rising edges. What is the example FSM’s 4-bit output then?',
      steps: ['Each edge with en = 1 moves one state forward: S0 → S1 → S2 → S3 → S0 …', 'The machine cycles every 4 edges, so after 10 edges it has moved 10 mod 4 = 2 states past S0.', 'State S2 → out = 0011.'],
      solutionDiagram: dgFsm,
      explanation: 'S3 with en = 1 goes back to S0, so the state index is (number of en = 1 edges) mod 4.',
      src: course(at('fsm1', '00:04:13', '00:04:31')) },
    { id: 'lab8-q6', subtopic: 'lab8', type: 'mc', difficulty: 2,
      prompt: 'Which header fits the <b>next-state</b> segment of the FSM?',
      choices: [c('always @*'), c('always @(posedge clk, posedge reset)'), c('always @(en)'), c('always @(posedge en)')],
      answer: 0,
      explanation: 'Next-state logic is combinational: it must react to every input (state and en), which the wildcard @* covers. posedge clk/reset belongs to the state register; @(en) forgets state; posedge en would make it edge-triggered.',
      src: course(at('fsm2', '00:02:29', '00:03:20')) },
    { id: 'lab8-q7', subtopic: 'lab8', type: 'mc', difficulty: 2,
      prompt: `What is the main purpose of ${c('nstate = state;')} as the first line of the next-state always block?`,
      choices: ['nstate gets a value on every path, so no latch is inferred (and the default is “stay”)', 'It copies the state into the state register', 'It makes the block run on the clock edge', 'It resets the FSM to S0'],
      answer: 0,
      explanation: 'Every output of a combinational block must always be assigned; a default first guarantees it. The state register (segment 1) is what updates state, and it alone reacts to the clock and reset.',
      src: course(at('fsm2', '00:03:25', '00:04:53')) },
    { id: 'lab8-q8', subtopic: 'lab8', type: 'boolexpr', difficulty: 3, vars: ['Q1', 'Q0', 'E'], answer: NS_Q1, form: 'sop', maxLiterals: 7,
      prompt: 'Example FSM, binary encoding (state = Q1 Q0) and E = en. Write Q1⁺, bit 1 of the next state, as a minimal SOP.',
      steps: [
        'List the transitions: en = 0 holds; en = 1 goes 00 → 01 → 10 → 11 → 00.',
        'Q1⁺ = 1 for (Q1 Q0 E) = 011 (S1, en = 1 → S2), 100 and 101 (S2 → S2 or S3), 110 (S3 holds): minterms 3, 4, 5, 6.',
        'Groups: (4, 5) = Q1Q0′, (4, 6) = Q1E′; minterm 3 has no 1-neighbor → Q1′Q0E.',
        'Q1⁺ = Q1Q0′ + Q1E′ + Q1′Q0E — 7 literals (each group is essential).',
      ],
      solutionDiagram: { kind: 'kmap', vars: ['Q1', 'Q0', 'E'], minterms: [3, 4, 5, 6], groups: [{ cells: [4, 5], label: "Q1Q0'" }, { cells: [4, 6], label: "Q1E'" }, { cells: [3], label: "Q1'Q0E" }] },
      explanation: 'The same function is Q1 ⊕ (Q0·E): bit 1 toggles when bit 0 is 1 and en = 1, like a counter. The SOP form needs 7 literals.',
      src: course(at('fsm2', '00:04:55', '00:06:19')) },
    { id: 'lab8-q9', subtopic: 'lab8', type: 'boolexpr', difficulty: 2, vars: ['Q1', 'Q0'], answer: "Q1' + Q0'", form: 'sop', maxLiterals: 2,
      prompt: 'Example FSM, binary encoding (S0 = 00 … S3 = 11 in Q1 Q0). Write <code>out[1]</code> (bit 1 of 1111, 0111, 0011, 0001) as a minimal SOP in Q1, Q0.',
      steps: ['Bit 1 of each output: S0 1111 → 1, S1 0111 → 1, S2 0011 → 1, S3 0001 → 0.', 'out[1] = 0 only in S3 (Q1 Q0 = 11), so out[1] = (Q1Q0)′.', 'De Morgan: out[1] = Q1′ + Q0′ — 2 literals.'],
      solutionDiagram: { kind: 'kmap', vars: ['Q1', 'Q0'], minterms: [0, 1, 2], groups: [{ cells: [0, 1], label: "Q1'" }, { cells: [0, 2], label: "Q0'" }] },
      explanation: 'A Moore output is a function of the state bits only — this is what segment 3 synthesizes to. Bit 1 counts from the right (bit 0 is the rightmost).',
      src: course(at('fsm2', '00:06:53', '00:07:19')) },
    { id: 'lab8-q10', subtopic: 'lab8', type: 'mc', difficulty: 3,
      prompt: 'In simulation, after reset and with en = 1, the state goes 0 → 1 and then <b>stays at 1</b> while en = 1; when en drops to 0 it moves to 2. Which next-state line is wrong?',
      diagram: dgBug,
      choices: [c('S1: nstate = en ? S1 : S2;'), c('S0: nstate = en ? S1 : S0;'), c('S2: nstate = en ? S3 : S2;'), c('default: nstate = S0;')],
      answer: 0,
      explanation: 'The S1 branch has its two values swapped: it stays in S1 when en = 1 and leaves when en = 0 — exactly the observed behavior (reproduced in Icarus Verilog). The S0 line is correct (the machine did reach 1), the S2 line only matters once the machine is already in S2, so it cannot keep it in S1, and default only matters for invalid states.',
      src: course(at('simh', '00:03:04', '00:03:25'), at('fsm2', '00:05:45', '00:06:03')) },
    { id: 'lab8-q11', subtopic: 'lab8', type: 'tf', difficulty: 2,
      prompt: `True or false: the state register segment should use nonblocking assignments, e.g. ${c('state <= nstate;')}.`,
      answer: true,
      explanation: 'The state register is a synchronous sequential element, and nonblocking assignment is characteristic of sequential circuits; the combinational segments use blocking (=).',
      src: course(at('fsm2', '00:01:33', '00:02:10')) },
    { id: 'lab8-q12', subtopic: 'lab8', type: 'match', difficulty: 1,
      prompt: 'Match each encoding to the code it gives (4 states S0 … S3).',
      pairs: [['Binary, S3', '11'], ['Gray, S3', '10'], ['One-hot, S3', '1000'], ['One-hot, S0', '0001']],
      explanation: 'Binary counts 00, 01, 10, 11; Gray goes 00, 01, 11, 10 (one bit changes each step); one-hot sets only bit i for state i, so S0 = 0001 and S3 = 1000.',
      src: course(at('enc', '00:01:31', '00:05:19', '00:08:49')) },
    { id: 'lab8-q13', subtopic: 'lab8', type: 'multi', difficulty: 2,
      prompt: 'Which belong in the <b>output-logic</b> segment of the Lab 8 Moore FSM? Select all that apply.',
      choices: [c('always @*'), `A default assignment first, e.g. ${c("out = 4'b0000;")}`, `${c('case (state)')} with one output value per state`, `Conditions on the input, e.g. ${c('if (en) out = …')}`, `${c('out <= …')} inside ${c('always @(posedge clk)')}`],
      answers: [0, 1, 2],
      explanation: 'The output logic is combinational (always @*, blocking assignments, every output assigned first) and, for a Moore machine, depends only on the state. Testing en would make it Mealy; a clocked block would add a register.',
      src: course(at('fsm2', '00:06:24', '00:07:19')) },
    { id: 'lab8-q14', subtopic: 'lab8', type: 'numeric', difficulty: 2, answer: 2,
      prompt: 'An FSM has 5 states. How many <b>more</b> flip-flops does one-hot encoding need than binary encoding?',
      steps: ['Binary: 2<sup>2</sup> = 4 &lt; 5 ≤ 2<sup>3</sup> = 8, so 3 bits.', 'One-hot: one bit per state, so 5 bits.', '5 − 3 = 2 more flip-flops.'],
      explanation: 'The Topic 7 encoding lecture uses exactly this 5-state example: 3 bits in binary or Gray, 5 bits in one-hot.',
      src: course(at('enc', '00:02:00', '00:02:21', '00:08:06')) },
    { id: 'lab8-q15', subtopic: 'lab8', type: 'mc', difficulty: 3,
      prompt: 'The Mealy version adds <code>wrap = (state == S3) &amp;&amp; en</code>. The FSM is in S3 with en = 0; halfway through the clock cycle en changes to 1. When does wrap become 1?',
      choices: ['Immediately, when en changes — in the middle of the cycle', 'At the next rising clock edge', 'One full clock cycle after the next rising edge', 'Never: in S3 the output is fixed at 0001'],
      answer: 0,
      explanation: 'A Mealy output is combinational in both state and input, so it follows en at once; at the next rising edge the machine leaves S3 and wrap drops again. Only the Moore output (0001 in S3) waits for state changes. (The lecture says only that Mealy timing differs and refers to the book; the mid-cycle detail is standard material.)',
      src: course(at('mealy', '00:00:06', '00:01:34')) },
    { id: 'lab8-q16', subtopic: 'lab8', type: 'mc', difficulty: 2,
      prompt: `In the next-state segment, what does ${c('S2: nstate = en ? S3 : S2;')} mean?`,
      choices: ['In S2: go to S3 if en is 1, otherwise stay in S2', 'In S2: go to S3 if en is 0, otherwise stay in S2', 'Go to S2 or S3 at random, depending on timing', 'Set en to S3 or S2'],
      answer: 0,
      explanation: 'condition ? a : b gives a when the condition is true and b when it is false. Here the condition is en.',
      src: course(at('fsm2', '00:05:12', '00:06:03')) },
    { id: 'lab8-q17', subtopic: 'lab8', type: 'mc', difficulty: 1,
      prompt: 'In the example FSM, what happens when en = 0?',
      choices: ['The FSM stays in its current state', 'The FSM returns to S0', 'The FSM moves to the previous state', 'The output becomes 0000'],
      answer: 0,
      explanation: 'en = 0 is a self-loop on every state; only en = 1 moves to the next state (and reset returns to S0). 0000 is the unused default value, not a normal output.',
      src: course(at('fsm1', '00:03:46', '00:03:52')) },
    { id: 'lab8-q18', subtopic: 'lab8', type: 'boolexpr', difficulty: 3, vars: ['Q1', 'Q0'], answer: "Q1'Q0'",
      prompt: 'The lab asks for a different encoding: suppose Gray, S0 = 00, S1 = 01, S2 = 11, S3 = 10 (in Q1 Q0). Write <code>out[3]</code> (the leftmost bit of 1111, 0111, 0011, 0001) as a Boolean expression in Q1, Q0.',
      steps: ['out[3] is 1 only in S0 (1111); it is 0 in S1, S2 and S3.', 'With Gray encoding S0 = 00.', 'out[3] = Q1′Q0′.'],
      explanation: 'Changing the encoding changes the output equations but not the Verilog segments — only the localparam lines change. (A simulation of the Gray version gives the same outputs per state.)',
      needsSource: 'Lab 8 handout: the lab’s actual state encoding.',
      src: course(at('fsm1', '00:02:31', '00:02:40'), at('enc', '00:09:34')) },
  ];

  /* ======================================================================= REGISTER */
  Study.extendSection('labs', {
    sources: [
      { file: V.vif, title: 'Lab 5 Video 1: Verilog — if Statement' },
      { file: V.hier, title: 'Lab 5 Video 2: Verilog — Hierarchy' },
      { file: V.simh, title: 'Lab 5 Video 3: Simulating and Debugging Hierarchical Design' },
      { file: V.clk, title: 'Lab 7 Video 1: Verilog — Clock (CLK) Generator' },
      { file: V.reg, title: 'Lab 7 Video 2: Verilog — Register' },
      { file: V.fsm1, title: 'Lab 8 Video 1: Verilog FSM (Part 1)' },
      { file: V.fsm2, title: 'Lab 8 Video 2: Verilog FSM (Part 2)' },
      { file: V.ha, title: 'Topic 5 — Addition and Half Adder (Lab 6 re-watch)' },
      { file: V.fa, title: 'Topic 5 — Full Adder (Lab 6 re-watch)' },
      { file: V.rca, title: 'Topic 5 — Adder / building a subtractor (Lab 6 re-watch)' },
      { file: V.sub, title: 'Topic 5 — Subtractor and adder-subtractor (Lab 6 re-watch)' },
      { file: V.tclk, title: 'Topic 6 — Clock (period, frequency, duty cycle; cross-reference for Lab 7)' },
      { file: V.treg, title: 'Topic 6 — 4-bit Register (cross-reference for Lab 7)' },
      { file: V.tld, title: 'Topic 6 — 4-bit Load Register (cross-reference for Lab 7)' },
      { file: V.fdef, title: 'Topic 7 — FSM Definition, Moore vs Mealy (cross-reference for Lab 8)' },
      { file: V.mealy, title: 'Topic 7 — FSM (Mealy) Operation (cross-reference for Lab 8)' },
      { file: V.enc, title: 'Topic 7 — FSM State Encoding (cross-reference for Lab 8)' },
    ],
    gaps: [
      'Lab assignment handouts for Labs 5–8 (the exact modules to build, required test cases and report questions) and the Lab 5–8 Canvas quizzes are not in the repo. Items that depend on them are flagged “needs source”; every question here is written from the videos, not taken from those quizzes.',
      'The Lab 5–8 slide PDFs are not mirrored: Verilog-if-v01.pdf, Verilog-hiarachical-v01.pdf, Verilog-clk_generator-v1.pdf, Verilog-register-v1.pdf, Verilog-fsm-v1.pdf (and Verilog-vectors-v0.pdf). Code that appears only on a slide — the if examples, eq1/eq2, the clock-generator testbench, the 8-bit register, the FSM and its testbench — is reconstructed from the narration (and, for eq1/eq2, from the cited P. Chu book example) and may differ in detail from the slides. In the if video the else-branch expressions are not narrated; stand-ins are used.',
      'Lab 6 has no video of its own: its page reuses “Verilog — Vectors” (Lab 4) and asks students to re-watch the adder, subtractor, MUX and “XOR gate (always and case)” videos. The adder/subtractor/MUX lectures are mapped to Topic 5 and the Lab 4 Always/Case video; no mirrored transcript shows an XOR gate written with always/case, so that example is supplemental. Which modules Lab 6 actually requires is not known.',
      'Lab 7: the in-class load-register examples “done on Blackboard” and the lab’s multifunction register/counter specification are not mirrored; the video gives only hints (load signal in an if, count with q <= q + 1). The clock video narrates a 50 ns toggle; the exact slide code (lines 16–17) is reconstructed. Asynchronous vs synchronous reset terminology is supplemental.',
      'Lab 8: the Canvas page labels do not match the videos (they are FSM Part 1 and Part 2 by file name). The video says the lab uses a different state encoding than the binary one shown; the Topic 7 encoding lecture says the lab assignment uses Gray encoding — confirm with the Lab 8 handout. Mealy-machine Verilog is not shown in any lab video; the Mealy examples here are supplemental, built on the Topic 7 definitions.',
      '“Simulating and Debugging Hierarchical Design” uses the FSM example testbench (fsm_example_tb), whose code is not mirrored; the waveform shown here is reconstructed from the narration and from the reconstructed FSM.',
      'P. Chu, FPGA Prototyping by Verilog Examples (source of the eq1/eq2 hierarchy example) is not in the repo.',
    ],
    subtopics: [
      { id: 'lab5', title: 'Lab 5 — if statements & hierarchical design' },
      { id: 'lab6', title: 'Lab 6 — Vectors, adders, subtractors, MUX & XOR' },
      { id: 'lab7', title: 'Lab 7 — Clock generator & registers' },
      { id: 'lab8', title: 'Lab 8 — FSMs in Verilog' },
    ],
    lessons: [...lab5Lessons, ...lab6Lessons, ...lab7Lessons, ...lab8Lessons],
    flashcards: [...lab5Cards, ...lab6Cards, ...lab7Cards, ...lab8Cards],
    questions: [...lab5Questions, ...lab6Questions, ...lab7Questions, ...lab8Questions],
    // Catalogue generators that drill the logic behind Labs 5–8 (the Verilog itself has no generator).
    practice: [
      { gen: 'comparator', label: 'Lab 5: 4-bit comparator — GT / EQ / LT (eq2 grown up)', subtopic: 'lab5' },
      { gen: 'rippleAdd', label: 'Lab 6: trace a 4-bit ripple-carry adder stage by stage', subtopic: 'lab6' },
      { gen: 'addSub', label: 'Lab 6: adder-subtractor with control M (XOR on B, Cin = M)', subtopic: 'lab6' },
      { gen: 'signedSub', label: 'Lab 6: 4-bit two’s-complement subtraction — A + B′ + 1 and overflow', subtopic: 'lab6', params: { bits: 4 } },
      { gen: 'muxSelect', label: 'Lab 6: 4-to-1 MUX — which input reaches the output?', subtopic: 'lab6', params: { inputs: 4 } },
      { gen: 'dffTrace', label: 'Lab 7: what does a flip-flop hold after each rising edge?', subtopic: 'lab7' },
      { gen: 'registerLoad', label: 'Lab 7: load register — load or hold at each edge', subtopic: 'lab7' },
      { gen: 'counterSeq', label: 'Lab 7: counter next states (q <= q + 1 and friends)', subtopic: 'lab7' },
      { gen: 'fsmTrace', label: 'Lab 8: trace an FSM through an input sequence', subtopic: 'lab8' },
      { gen: 'stateBits', label: 'Lab 8: how many state flip-flops — binary vs one-hot', subtopic: 'lab8' },
    ],
  });
})();
