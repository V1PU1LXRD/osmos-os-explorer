/**
 * Smoke test for the pure OSMOS algorithms.
 * Run with: node scripts/verify-algorithms.mjs
 *
 * These are the modules the UI trusts to be correct. This script exercises
 * each one against hand-computed expectations so a regression in the maths
 * fails loudly instead of quietly producing a wrong Gantt chart.
 */
import { runScheduler, timelineBlocks } from '../src/utils/scheduling.js';
import { createBlocks, allocate, release, summarize } from '../src/utils/memoryAllocation.js';
import { detectDeadlock, terminateProcess } from '../src/utils/deadlockDetection.js';
import { makeProcess, tick } from '../src/utils/processLifecycle.js';
import { createNode, deleteNode, moveNode, countTree, getNode } from '../src/utils/fileSystem.js';
import { INITIAL_FILE_SYSTEM } from '../src/data/fileSystemTree.js';
import { SCHEDULING_DATASET } from '../src/data/schedulingData.js';
import { MEMORY_PARTITIONS, MEMORY_REQUESTS } from '../src/data/memoryData.js';
import { SCENARIO_BY_ID } from '../src/data/deadlockScenarios.js';

let failures = 0;
let checks = 0;

function check(label, actual, expected) {
  checks += 1;
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        expected ${e}\n        actual   ${a}`);
  } else {
    console.log(`  ok    ${label} = ${a}`);
  }
}

function section(name) {
  console.log(`\n${name}`);
}

/* ── Scheduling ──────────────────────────────────────────────────────── */

section('Scheduling (hand-built 3-process set)');
const TASKS = [
  { id: 'P1', arrival: 0, burst: 5 },
  { id: 'P2', arrival: 1, burst: 3 },
  { id: 'P3', arrival: 2, burst: 8 }
];

const fcfs = runScheduler('fcfs', TASKS);
check('fcfs timeline', fcfs.timeline, [
  { id: 'P1', start: 0, end: 5 },
  { id: 'P2', start: 5, end: 8 },
  { id: 'P3', start: 8, end: 16 }
]);
// P1 waits 0, P2 waits 8-1-3 = 4, P3 waits 16-2-8 = 6.
check('fcfs avg waiting', Number(fcfs.averages.waiting.toFixed(4)), Number((10 / 3).toFixed(4)));
check('fcfs cpu utilisation', Number(fcfs.stats.cpuUtilization.toFixed(4)), 1);

// SJF is only allowed to choose among *arrived* jobs, so with staggered
// arrivals it is non-preemptive and matches FCFS here. That is the correct
// behaviour, not a bug.
check('sjf keeps P1 (only arrived job at t=0)', runScheduler('sjf', TASKS).timeline[0].id, 'P1');
check('sjf equals fcfs when arrivals are staggered', runScheduler('sjf', TASKS).timeline, fcfs.timeline);

// All three jobs arrive together, so SJF must reorder them by burst.
const TOGETHER = [
  { id: 'P1', arrival: 0, burst: 8 },
  { id: 'P2', arrival: 0, burst: 2 },
  { id: 'P3', arrival: 0, burst: 3 }
];
check('sjf reorders simultaneous arrivals', runScheduler('sjf', TOGETHER).timeline.map((b) => b.id), [
  'P2',
  'P3',
  'P1'
]);
check(
  'sjf avg waiting beats fcfs on simultaneous arrivals',
  runScheduler('sjf', TOGETHER).averages.waiting < runScheduler('fcfs', TOGETHER).averages.waiting,
  true
);

const rr = runScheduler('rr', TASKS, 2);
check('rr first quantum slice', rr.timeline[0], { id: 'P1', start: 0, end: 2, quantum: 2, preempted: true });
check('rr slice count for P1 (burst 5, q=2)', rr.rows.find((r) => r.id === 'P1').slices, 3);
check('rr always preempts except on the last slice', rr.timeline[rr.timeline.length - 1].preempted, false);
// Round robin must conserve total work: sum of slices × burst time.
const rrBusy = rr.timeline.filter((b) => b.id !== 'IDLE').reduce((s, b) => s + (b.end - b.start), 0);
check('rr busy time equals total burst', rrBusy, 5 + 3 + 8);
check('rr slices a process only every quantum', rr.timeline[1], { id: 'P2', start: 2, end: 4, quantum: 2, preempted: true });

section('Scheduling (idle gap is recorded, not silently dropped)');
const gapped = runScheduler('fcfs', [
  { id: 'A', arrival: 0, burst: 2 },
  { id: 'B', arrival: 6, burst: 2 }
]);
check('idle block present', timelineBlocks(gapped).filter((b) => b.idle), [
  { id: 'IDLE', start: 2, end: 6, duration: 4, idle: true }
]);

section('Scheduling (shipped dataset runs on every policy)');
for (const id of ['fcfs', 'sjf', 'rr']) {
  const r = runScheduler(id, SCHEDULING_DATASET, 2);
  const total = r.rows.reduce((s, row) => s + row.waiting, 0);
  check(`${id} waiting times sum to avg × count`, Number(r.averages.waiting.toFixed(6)), Number((total / r.rows.length).toFixed(6)));
}

/* ── Memory ───────────────────────────────────────────────────────────── */

section('Memory (first fit is order dependent)');
let blocks = createBlocks([256, 128, 64]);
const req = (id, size) => ({ id, label: id, size, color: '#fff' });

const a1 = allocate(blocks, req('P1', 100), 'first');
check('P1(100) → partition 1', a1.index, 0);
blocks = a1.blocks;

const a2 = allocate(blocks, req('P2', 120), 'first');
check('P2(120) → partition 2', a2.index, 1);
blocks = a2.blocks;

const a3 = allocate(blocks, req('P3', 200), 'first');
check('P3(200) rejected — largest free is 64 KB', a3.ok, false);
check('rejection leaves state untouched', a3.blocks === blocks, true);

const stats = summarize(blocks);
check('internal fragmentation', stats.internalFragmentation, (256 - 100) + (128 - 120));
check('allocated bytes', stats.allocatedBytes, 256 + 128);

blocks = release(blocks, 0);
check('release frees partition 1', blocks[0].process, null);
// Free = 256 + 64 = 320, total = 448, allocated = 128 (the 128 KB partition).
check('utilisation counts whole partitions, not requested bytes', Number(summarize(blocks).utilization.toFixed(4)), Number((128 / 448).toFixed(4)));
check('largest free hole is the 256 KB partition', summarize(blocks).largestFree, 256);
check('external fragmentation = free outside the largest hole', Number(summarize(blocks).externalFragmentation.toFixed(4)), Number((64 / 320).toFixed(4)));

section('Memory (best fit vs worst fit diverge)');
let pool = createBlocks([256, 128, 512]);
const best = allocate(pool, req('P1', 100), 'best');
check('best fit picks the 128 KB hole', best.index, 1);
const worst = allocate(pool, req('P1', 100), 'worst');
check('worst fit picks the 512 KB hole', worst.index, 2);

section('Memory (shipped partitions load)');
check('partitions created', createBlocks(MEMORY_PARTITIONS).map((b) => b.id), MEMORY_PARTITIONS.map((_, i) => `M${i + 1}`));
check('requests are all sized', MEMORY_REQUESTS.every((r) => r.size > 0), true);

/* ── Deadlock ─────────────────────────────────────────────────────────── */

section('Deadlock (cycle detection)');
check('safe scenario is not deadlocked', detectDeadlock(SCENARIO_BY_ID.safe).deadlocked, false);
const two = detectDeadlock(SCENARIO_BY_ID.cycle2);
check('two-process cycle detected', two.deadlocked, true);
check('cycle members', two.cycles[0].sort(), ['P1', 'P2']);
const three = detectDeadlock(SCENARIO_BY_ID.cycle3);
check('three-process cycle detected', three.deadlocked, true);
check('cycle members', three.cycles[0].sort(), ['P1', 'P2', 'P3']);

const recovered = terminateProcess(SCENARIO_BY_ID.cycle2, 'P1');
check('terminating P1 clears the deadlock', detectDeadlock(recovered.scenario).deadlocked, false);
check('terminating does not mutate the original', SCENARIO_BY_ID.cycle2.allocation.P1, ['R1']);

/* ── Process lifecycle ────────────────────────────────────────────────── */

section('Process lifecycle');
let procs = [makeProcess('P1', '#fff', 2, 1)];
procs = tick(procs);
check('new → ready → running in one tick', procs[0].state, 'running');
check('burst consumed', procs[0].remaining, 1);
procs = tick(procs);
check('second tick terminates', procs[0].state, 'terminated');
check('terminated keeps zero remaining', procs[0].remaining, 0);

let io = [makeProcess('P1', '#fff', 6, 1)];
const seen = new Set();
for (let i = 0; i < 12; i += 1) {
  io = tick(io);
  seen.add(io[0].state);
}
check('process blocks for I/O mid-burst', seen.has('waiting'), true);
check('process returns to ready after I/O', seen.has('ready'), true);
check('process reaches terminated', seen.has('terminated'), true);
// Burst 6 with one I/O block of 2 ticks costs 6 + 2 = 8 ticks.
check('lifecycle converges and never revisits new', seen.has('new'), false);

let solo = [makeProcess('P1', '#fff', 1, 1)];
solo = tick(solo);
check('burst-1 process does not block for I/O', solo[0].state, 'terminated');

let pair = [makeProcess('P1', '#fff', 2, 1), makeProcess('P2', '#fff', 2, 2)];
pair = tick(pair);
check('never two runners at once', pair.filter((p) => p.state === 'running').length, 1);
check('only P1 runs on the first tick', pair.find((p) => p.state === 'running').id, 'P1');

/* ── File system ──────────────────────────────────────────────────────── */

section('File system (immutable tree edits)');
const root = createNode(INITIAL_FILE_SYSTEM, ['home'], 'notes.txt', 'file');
check('file created', root.ok, true);
check(
  'original tree is never mutated',
  getNode(INITIAL_FILE_SYSTEM, ['home', 'notes.txt']),
  null
);
check('file reachable at new path', Boolean(getNode(root.tree, ['home', 'notes.txt'])), true);

const dupe = createNode(root.tree, ['home'], 'notes.txt', 'file');
check('duplicate name in same folder is refused', dupe.ok, false);

const removed = deleteNode(root.tree, ['home', 'notes.txt']);
check('file deleted', removed.ok, true);
check('delete is immutable', getNode(root.tree, ['home', 'notes.txt']).name, 'notes.txt');

const moved = moveNode(root.tree, ['home', 'notes.txt'], ['var', 'log'], 'kernel.err');
check('file moved across directories', moved.ok, true);
check('source gone', getNode(moved.tree, ['home', 'notes.txt']), null);
check('destination present', Boolean(getNode(moved.tree, ['var', 'log', 'kernel.err'])), true);
const movedNode = getNode(moved.tree, ['var', 'log', 'kernel.err']);
check('move preserves the file size', movedNode.size, getNode(root.tree, ['home', 'notes.txt']).size);
check('move preserves the permissions', movedNode.permissions, '-rw-r--r--');

const repeat = createNode(INITIAL_FILE_SYSTEM, ['home'], 'notes.txt', 'file');
check(
  'created sizes are deterministic, not Math.random',
  repeat.tree === INITIAL_FILE_SYSTEM || getNode(repeat.tree, ['home', 'notes.txt']).size === getNode(root.tree, ['home', 'notes.txt']).size,
  true
);

const intoItself = moveNode(INITIAL_FILE_SYSTEM, ['home'], ['home', 'student'], 'home');
check('a folder cannot be moved into its own subtree', intoItself.ok, false);

const overwrite = moveNode(INITIAL_FILE_SYSTEM, ['etc', 'hosts'], ['var', 'log'], 'kernel.log');
check('overwriting an existing name is refused', overwrite.ok, false);

check('tree counted', countTree(INITIAL_FILE_SYSTEM).files > 0, true);
check('root has no parent', getNode(INITIAL_FILE_SYSTEM, []) === INITIAL_FILE_SYSTEM, true);

section('File system (illegal operations are refused, not crashed on)');
const bad = createNode(INITIAL_FILE_SYSTEM, ['home', 'nope'], 'x.txt', 'file');
check('write into a missing directory fails', bad.ok, false);
check('missing directory reports a reason', Boolean(bad.message), true);

check('root cannot be deleted', deleteNode(INITIAL_FILE_SYSTEM, []).ok, false);
check('deleting a missing item is refused', deleteNode(INITIAL_FILE_SYSTEM, ['home', 'ghost']).ok, false);
check('slash in a name is refused', createNode(INITIAL_FILE_SYSTEM, ['home'], 'a/b', 'file').ok, false);

/* ── Result ───────────────────────────────────────────────────────────── */

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
