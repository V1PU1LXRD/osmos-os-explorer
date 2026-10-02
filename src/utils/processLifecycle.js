/**
 * Process lifecycle — the five-state model as pure functions.
 *
 * States: new → ready → running → waiting → ready → terminated
 *
 * One tick is one scheduler decision:
 *   1. every process in `new` is admitted to the ready queue, *   2. processes in `waiting` count their I/O down and return to `ready`,
 *   3. at most one `ready` process is dispatched onto the CPU (lowest priority
 *      number first; the current runner keeps the CPU). A process whose I/O
 *      only just completed is NOT eligible this tick, so the waiting → ready
 *      edge is always visible for one tick instead of being skipped.
 *   4. the runner consumes one unit of burst and either blocks for I/O (once
 *      per lifetime, around the halfway point) or terminates.
 */
import { IO_TICKS } from '../data/processes.js';


/** Build a fresh process record (the user-space half of a PCB). */
export function makeProcess(id, color, burst, priority) {
  return {
    id,
    color,
    burst,
    priority,
    state: 'new',
    remaining: burst,
    ioUsed: false,
    ioTicks: 0
  };
}

/** Advance every process by exactly one tick. Pure: returns new objects only. */
export function tick(processes) {
  // 1. Admit everything still sitting in New.
  let list = processes.map((process) =>
    process.state === 'new' ? { ...process, state: 'ready' } : process
  );

  // 2. Count down I/O; a finished request puts the process back in Ready.
  const justReady = new Set();
  list = list.map((process) => {
    if (process.state !== 'waiting') return process;
    const ioTicks = process.ioTicks - 1;
    if (ioTicks > 0) return { ...process, ioTicks };
    justReady.add(process.id);
    return { ...process, state: 'ready', ioTicks: 0 };
  });

  // 3. Dispatch: keep the current runner, otherwise pick the highest priority
  //    (lowest number) process waiting in Ready.
  if (!list.some((process) => process.state === 'running')) {
    const ready = list.filter((process) => process.state === 'ready' && !justReady.has(process.id));
    if (ready.length) {
      const best = ready.reduce((a, b) => (a.priority <= b.priority ? a : b));
      list = list.map((process) => (process.id === best.id ? { ...process, state: 'running' } : process));
    }
  }

  // 4. Run for one unit.
  const runner = list.find((process) => process.state === 'running');
  if (!runner) return list;

  const willFinish = runner.remaining - 1 <= 0;
  // Block for I/O once per process, around the halfway point, never on the last unit.
  const shouldBlock = !runner.ioUsed && !willFinish && runner.remaining <= Math.ceil(runner.burst / 2);

  return list.map((process) => {
    if (process.id !== runner.id) return process;
    if (willFinish) return { ...process, remaining: 0, state: 'terminated' };
    if (shouldBlock) {
      return { ...process, remaining: process.remaining - 1, state: 'waiting', ioTicks: IO_TICKS, ioUsed: true };
    }
    return { ...process, remaining: process.remaining - 1 };
  });
}
