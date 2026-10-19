# CECS 201 Study — app and content guide

A Quizlet-style study app for **CECS 201 — Computer Logic Design I**, served by GitHub Pages next to the video hub
(`/study/`). Vanilla HTML/CSS/JS, classic `<script>` tags, no build step, no dependencies. It also works when
`study/index.html` is opened straight from disk.

```
study/
  index.html              app shell: markup + styles; loads the scripts below in this order
  js/core.js              Study namespace, section + generator registries, seeded RNG, utils
  js/logic.js             Boolean expression parser/evaluator, number formats, answer checking
  js/diagrams.js          SVG/HTML renderers for diagram specs (truth tables, K-maps, gates, circuits, FSMs, timing…)
  js/gen-numbers.js       parametric generators: number systems, conversions, signed arithmetic, codes
  js/gen-logic.js         parametric generators: Boolean algebra, K-maps, datapath, sequential, FSM
  js/app.js               UI: routing, views, study modes, progress tracking
  content/*.js            one file per section; each calls Study.registerSection({...})
  tools/validate-content.mjs   node study/tools/validate-content.mjs  — schema + answer checks for all content
```

Script order in `index.html`: `core.js`, `logic.js`, `diagrams.js`, `gen-numbers.js`, `gen-logic.js`, every
`content/*.js`, then `app.js`.

---

## 1. Sections

Exactly these sections, in this order:

| id | order | title | hub link | content file |
|---|---|---|---|---|
| `t1` | 1 | Introduction | `../#topic-1` | `content/t1-intro.js` |
| `t2` | 2 | Numbers and Their Representations | `../#topic-2` | `content/t2-numbers.js` |
| `t3` | 3 | Boolean Algebra and Logic Gates | `../#topic-3` | `content/t3-boolean.js` |
| `t4` | 4 | Combinational Logic | `../#topic-4` | `content/t4-combinational.js` |
| `t5` | 5 | Combinational Datapath Components | `../#topic-5` | `content/t5-datapath.js` |
| `t6` | 6 | Synchronous Sequential Logic | `../#topic-6` | `content/t6-sequential.js` |
| `t7` | 7 | Finite State Machines | `../#topic-7` | `content/t7-fsm.js` |
| `labs` | 8 | Labs 1–8 (Verilog & Vivado) | `../#lab-1` … `../#lab-8` | `content/labs-1-4.js` + `content/labs-5-8.js` (see §1.1) |
| `final` | 9 | Comprehensive Final Exam Review | `../#final-exam` | `content/final.js` |

### 1.1 The Labs section is split across two files

`content/labs-1-4.js` registers the section (`id: 'labs'`) with subtopics `lab1`…`lab4`.
`content/labs-5-8.js` calls `Study.extendSection('labs', {...})` to add subtopics `lab5`…`lab8` and their lessons,
flashcards, questions and practice entries (same keys as a section; arrays are appended). Load order: 1-4 then 5-8.

### 1.2 Section object

```js
Study.registerSection({
  id: 't2', order: 2,
  title: 'Numbers and Their Representations',
  short: 'Numbers',                       // ≤ 14 chars, for tabs/badges
  hub: '../#topic-2',                     // link to the module's videos in the hub
  summary: 'One or two sentences on what the section covers.',
  finalWeight: 19,                        // % of the final (from the hub's Final Exam page); 0 if not tested; omit for labs
  sources: [                              // course materials actually used for this section
    { file: 'Topic_2/class1_video1_number_systems.mp4.vtt', title: 'Number Systems' },
  ],
  gaps: [                                 // material the app could NOT source — shown to students as flags
    'Class 10/11/13 MUX and decoder lectures are Canvas Studio embeds that are not mirrored here; that content is supplemental.',
  ],
  subtopics: [ { id: 't2-positional', title: 'Positional notation' }, … ],
  lessons:    [ … ],                      // §2
  flashcards: [ … ],                      // §3
  questions:  [ … ],                      // §4
  practice:   [ … ],                      // §5 generator entries
});
```

IDs: lowercase, `[a-z0-9-]`, globally unique, stable once published (progress is stored by id).
Convention: `<section>-l<n>` lessons, `<section>-f<n>` cards, `<section>-q<n>` questions (labs: `lab3-q4`).
Every lesson, card and question has a `subtopic` that exists in the section.

### 1.3 Sourcing (required on every lesson, card and question)

```js
src: { type: 'course', refs: ['Topic_2/class2_video_3.mp4.vtt#00:04:10'] }   // file must exist; timestamp hh:mm:ss
src: { type: 'supplemental', note: 'Standard material (e.g. Mano & Ciletti); not in the mirrored lectures.' }
src: { type: 'final-guide', note: 'From the hub’s Final Exam study page (weights, drills).' }
```

`course` means the fact/method is stated in the referenced transcript. If an item mixes both, mark it `course` and say
what is supplemental in the explanation. Never present supplemental material as if the instructor said it.
Flag content that needs a source the repo does not have (lab handouts, quiz questions, slides not transcribed) with
`needsSource: 'what is missing'` on the item and list it in `gaps`.

### 1.4 HTML in content strings

Content strings (`html`, `front`, `back`, `prompt`, choices, `explanation`, steps) may use: `p b strong i em code
sub sup br ul ol li span small kbd pre table thead tbody tr th td`. Classes: `ovl` (overline, e.g.
`<span class="ovl">A</span>`), `mono`, `muted`. No scripts, no inline event handlers, no external images.
Notation in text: use `A'` (prime) for NOT as the course does (the overline is fine for display), `·` or
juxtaposition for AND, `+` for OR, `⊕` for XOR. Bases: `1011<sub>2</sub>`, `2D<sub>16</sub>` or `0x2D`.

---

## 2. Lessons (Learn mode)

```js
{ id: 't2-l3', subtopic: 't2-b2d', title: 'Binary to decimal', minutes: 6, src: {…},
  blocks: [
    { type: 'text', html: '<p>…</p>' },
    { type: 'callout', tone: 'tip' | 'warn' | 'exam' | 'note', html: '…' },
    { type: 'example', title: 'Convert 101101₂', problem: '…html…', steps: ['…', '…'], answer: '45' },
    { type: 'diagram', diagram: { kind: … }, caption: '…' },        // §6
    { type: 'code', lang: 'verilog', code: 'module …' },             // plain text, rendered escaped in <pre>
    { type: 'check', question: { …question without id requirement… } },  // inline practice (§4); id optional
  ] }
```

A good lesson: concept in plain words → worked example with every step → a picture where one helps → 1–3 checks.

## 3. Flashcards

```js
{ id: 't2-f7', subtopic: 't2-twos', front: 'html', back: 'html',
  frontDiagram?: {…}, backDiagram?: {…}, src: {…} }
```

## 4. Questions

Common fields: `id, subtopic, type, difficulty (1 recall | 2 apply | 3 multi-step/analyze), prompt (html),
diagram? (§6, shown with the prompt), solutionDiagram? (§6, shown after answering — e.g. the K-map grouping),
explanation (html — why the answer is right, and why tempting wrong answers are wrong),
steps? (array of html strings — required for calculations and logic derivations), src, tags? (array)`.

| type | extra fields | notes |
|---|---|---|
| `mc` | `choices: [html…]` (3–5), `answer: index` | choices are shuffled by the UI; don't write "all of the above" |
| `multi` | `choices`, `answers: [indices]` | "select all that apply" |
| `tf` | `answer: true \| false` | |
| `match` | `pairs: [[leftHtml, rightHtml], …]` (3–6) | right side shuffled by the UI |
| `short` | `accept: ['…', …]`, `normalize: 'text' \| 'binary' \| 'octal' \| 'decimal' \| 'hex' \| 'list'`, `width?: n`, `leadingZeros?: 'ignore' \| 'exact'` | binary/hex/… strip prefixes (0x, 0b), subscripts and spaces; `width` forces exactly n digits (two's-complement answers); `list` compares a set of whole numbers in any order/format — `1,3,5`, `Σm(1, 3, 5)`, `m 5 3 1` (minterm/maxterm lists) |
| `numeric` | `answer: number`, `tolerance?: number` | |
| `boolexpr` | `vars: ['A','B','C']`, `answer: 'reference expr'` **or** `minterms: [..]`, `dontcares?: [..]`, `form?: 'sop' \| 'pos'`, `maxLiterals?: n` | graded by truth-table equivalence (case-insensitive variables, A is the MSB of minterm indices); `maxLiterals` enforces minimality |

`Study.logic.check(question, input)` grades every type; see `js/logic.js` for accepted notations.

## 5. Practice generators

Generators produce unlimited calculation problems with computed answers and step-by-step solutions. A section lists
the ones it uses:

```js
practice: [ { gen: 'bin2dec', label: 'Binary → decimal', subtopic: 't2-b2d', params: { bits: 8 } }, … ]
```

`Study.gen.make(genId, seed, params)` returns a normal question object (id `g:<gen>:<seed>[:<params json>]`), so
generated questions use the same UI, checking, mistakes and progress as authored ones. Each generator also
registers `{ title, section, difficulty, params (defaults), description }`. Generators don't know the section's
subtopic ids: the UI attributes a generated question to the `subtopic` of the practice entry it came from (and stores
that subtopic with its progress/mistake records).

**Generator catalogue** (ids are fixed — content may reference only these):

Numbers (`js/gen-numbers.js`, section `t2`): `positional` (base-r → decimal, Σ dᵢ·rⁱ; params `base`, `digits`),
`bin2dec` (`bits`), `dec2bin` (`max`), `bin2hex`, `hex2bin`, `bin2oct`, `oct2bin`, `hex2dec`, `dec2hex` (`bits`),
`unsignedAdd` (`bits`; carries shown, carry-out/overflow), `unsignedSub` (`bits`; borrows), `binaryMultiply`
(`bits`, shift-and-add), `signMagnitude` (`bits`), `onesComplement` (`bits`), `twosNegate` (`bits`), `twos2dec`
(`bits`), `dec2twos` (`bits`), `twosRange` (`bits`), `signedAdd` (`bits`; two's complement with overflow rule),
`signedSub` (`bits`; A + B' + 1), `bcd` (decimal ↔ BCD), `parity` (`even`|`odd`), `gray` (binary ↔ Gray), `ascii`
(character ↔ 7-bit code).

Logic (`js/gen-logic.js`): `t3` — `evalExpr` (evaluate at given inputs), `exprMinterms` (Σm list of an
expression), `canonicalSop` (minterms → canonical SOP), `demorgan` (complement an expression), `truthTableFill`
(output column for an expression); `t4` — `kmapMinimize` (`vars` 3|4, `dontcares` bool; minimal SOP checked by
equivalence + `maxLiterals` from an exact minimizer), `primeImplicants` (count of PIs / EPIs); `t5` —
`muxSelect` (`inputs` 2|4|8), `decoderOutput` (`bits` 2|3, active-high/low), `priorityEncoder` (`bits` 4|8),
`rippleAdd` (4-bit, per-stage carries), `comparator` (4-bit GT/EQ/LT), `addSub` (adder-subtractor with control
M); `t6` — `srLatch` (S,R sequence → Q), `dffTrace` (D at rising edges → Q), `shiftRegister` (`bits`, direction,
serial input), `counterSeq` (mod-N up/down next states), `registerLoad` (load/hold control); `t7` — `fsmTrace`
(Moore/Mealy machine from a built-in library + input string → states and outputs), `stateBits` (flip-flops for N
states, binary vs one-hot).

## 6. Diagram specs (`Study.diagrams.render(spec) → HTML string`)

| kind | fields |
|---|---|
| `truthtable` | `vars: [..]`, `outputs: [{ name, expr? , values? }]` (values: array of 0/1/'x' per row, A = MSB), `highlight?: [rowIndex]`, `showIndex?: bool` |
| `kmap` | `vars: [2–4 names]`, `minterms: [..]`, `dontcares?: [..]`, `groups?: [{ cells: [mintermIndex…], label? }]`, `showIndex?: bool` — Gray-code row/column order |
| `gate` | `gate: 'AND'\|'OR'\|'NOT'\|'NAND'\|'NOR'\|'XOR'\|'XNOR'\|'BUF'`, `inputs?: 2–4`, `labels?: { in: [..], out }` |
| `circuit` | `inputs: ['A','B','C']`, `gates: [{ id, type, in: ['A', 'g1', …] }]`, `outputs: [{ name, from }]` — laid out in columns by depth |
| `fsm` | `type: 'moore'\|'mealy'`, `states: [{ id, label?, output? }]`, `transitions: [{ from, to, label }]` (Mealy label `in/out`, Moore label `in`), `initial`, `layout?: 'circle'\|'line'` |
| `timing` | `signals: [{ name, wave }]` — wave chars: `0` `1` `x` (unknown), `.` (repeat previous), `p` (clock period), `=` (bus value from `data`); optional `data: [..]`, `edges?: bool` (mark rising edges) |
| `component` | `shape: 'mux'\|'decoder'\|'encoder'\|'halfadder'\|'fulladder'\|'adder'\|'comparator'\|'srlatch'\|'dlatch'\|'dff'\|'jkff'\|'tff'\|'register'\|'counter'\|'alu'`, `label?`, `inputs: [..]`, `outputs: [..]`, `select?: [..]`, `clock?: bool` |
| `bits` | `bits: '1011'`, `base?: 2`, `weights?: bool` (show rⁱ under each digit), `groups?: n` (box every n digits, e.g. 4 for hex) |
| `arith` | `op: '+'\|'-'\|'×'`, `rows: ['0110', '0111']`, `carry?: '1110'`, `result: '1101'`, `width?: n` — column-aligned |

Every renderer is deterministic, themed with CSS variables, includes an accessible name (`role="img"` +
`aria-label`, or a `<table>` with `<caption>`), and returns an inline error box for an invalid spec instead of
throwing. `Study.diagrams.validate(spec)` returns a list of problems.

## 7. Progress (localStorage key `cecs201_study_v1`)

```js
{ v: 1,
  cards:     { [cardId]: { s: 'mastered' | 'review', t: timestamp } },
  questions: { [qid]: { n: attempts, c: correct, last: 0|1, t } },     // generated: per instance id
  gens:      { [genId]: { n, c } },                                    // generator totals
  mistakes:  { [qid]: { section, subtopic, n: timesWrong, t, streak: correctSinceLastWrong } },  // cleared after 2 correct in a row
  lessons:   { [lessonId]: { done: true, t } },
  quizzes:   [ { section, mode: 'quiz'|'review'|'final', score, total, t, secs?, bySection? } ],   // newest last, capped at 200
}
```

Reads/writes are guarded (corrupt or blocked storage must not break the app). Export/import as JSON from the
Progress page.

**Mastery per subtopic** (0–100) = 50% accuracy on the subtopic's questions over the last attempts (authored +
generated) + 30% flashcards marked mastered + 20% lessons completed; a section's mastery is the mean of its
subtopics. Unstarted subtopics count 0.
