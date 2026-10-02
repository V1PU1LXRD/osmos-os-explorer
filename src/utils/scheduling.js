/**
 * Real CPU scheduling algorithms.
 *
 * Every function returns the same shape so the UI can swap policies freely:
 *
 *   {
 *     timeline: [{ id, start, end, preempted?, quantum? }],   // id 'IDLE' = CPU idle
 *     rows:     [{ id, arrival, burst, completion, waiting, turnaround, responseTime, slices }],
 *     averages: { waiting, turnaround, responseTime },
 *     stats:    { makespan, busyTime, idleTime, dispatches, contextSwitches, cpuUtilization }
 *   }
 *
 * Waiting time     = turnaround − burst        (time spent in the ready queue)
 * Turnaround time  = completion − arrival      (total time in the system)
 */

const IDLE = 'IDLE';

function prepare(processes) {
  return processes.map((process, index) => ({ ...process, index, remaining: process.burst }));
}

function byArrivalThenIndex(a, b) {
  return a.arrival - b.arrival || a.index - b.index;
}

/** Builds the shared result object from a finished timeline. */
function buildResult(processes, timeline) {
  const rows = processes.map((process, index) => {
    const blocks = timeline.filter((block) => block.id === process.id);
    const completion = blocks.length ? Math.max(...blocks.map((block) => block.end)) : 0;
    const firstStart = blocks.length ? Math.min(...blocks.map((block) => block.start)) : 0;
    const turnaround = completion - process.arrival;

    return {
      index,
      id: process.id,
      arrival: process.arrival,
      burst: process.burst,
      priority: process.priority,
      completion,
      turnaround,
      waiting: turnaround - process.burst,
      responseTime: firstStart - process.arrival,
      slices: blocks.length
    };
  });

  const makespan = timeline.length ? Math.max(...timeline.map((block) => block.end)) : 0;
  const busyTime = timeline.reduce(
    (total, block) => (block.id === IDLE ? total : total + (block.end - block.start)),
    0
  );

  let dispatches = 0;
  let contextSwitches = 0;
  timeline.forEach((block, index) => {
    if (block.id === IDLE) return;
    dispatches += 1;
    const previous = timeline[index - 1];
    if (previous && previous.id !== IDLE && previous.id !== block.id) contextSwitches += 1;
  });

  const average = (key) => (rows.length ? rows.reduce((sum, row) => sum + row[key], 0) / rows.length : 0);

  return {
    timeline,
    rows,
    averages: {
      waiting: average('waiting'),
      turnaround: average('turnaround'),
      responseTime: average('responseTime')
    },
    stats: {
      makespan,
      busyTime,
      idleTime: makespan - busyTime,
      dispatches,
      contextSwitches,
      cpuUtilization: makespan ? busyTime / makespan : 0
    }
  };
}

/** First Come, First Served — non-preemptive, strictly by arrival order. */
export function fcfs(processes) {
  const list = prepare(processes).sort(byArrivalThenIndex);
  const timeline = [];
  let time = 0;

  list.forEach((process) => {
    if (process.arrival > time) {
      timeline.push({ id: IDLE, start: time, end: process.arrival });
      time = process.arrival;
    }
    timeline.push({ id: process.id, start: time, end: time + process.burst });
    time += process.burst;
  });

  return buildResult(processes, timeline);
}

/** Shortest Job First — non-preemptive: the arrived job with the smallest burst runs next. */
export function sjf(processes) {
  const remaining = prepare(processes);
  const timeline = [];
  let time = 0;

  while (remaining.length) {
    const available = remaining.filter((process) => process.arrival <= time);

    if (!available.length) {
      const nextArrival = Math.min(...remaining.map((process) => process.arrival));
      timeline.push({ id: IDLE, start: time, end: nextArrival });
      time = nextArrival;
      continue;
    }

    available.sort((a, b) => a.burst - b.burst || byArrivalThenIndex(a, b));
    const chosen = available[0];
    timeline.push({ id: chosen.id, start: time, end: time + chosen.burst });
    time += chosen.burst;
    remaining.splice(remaining.indexOf(chosen), 1);
  }

  return buildResult(processes, timeline);
}

/** Round Robin — preemptive, each process receives at most `quantum` units per turn. */
export function roundRobin(processes, quantum) {
  const sliceSize = Math.max(1, Math.round(Number(quantum) || 1));
  const list = prepare(processes);
  const pending = [...list].sort(byArrivalThenIndex);
  const timeline = [];
  const queue = [];
  let cursor = 0;
  let time = 0;
  let completed = 0;

  const admitArrivals = (now) => {
    while (cursor < pending.length && pending[cursor].arrival <= now) {
      queue.push(pending[cursor]);
      cursor += 1;
    }
  };

  admitArrivals(time);

  while (completed < list.length) {
    if (!queue.length) {
      if (cursor >= pending.length) break;
      const nextArrival = pending[cursor].arrival;
      timeline.push({ id: IDLE, start: time, end: nextArrival });
      time = nextArrival;
      admitArrivals(time);
      continue;
    }

    const process = queue.shift();
    const slice = Math.min(sliceSize, process.remaining);
    const start = time;
    time += slice;
    process.remaining -= slice;

    timeline.push({ id: process.id, start, end: time, quantum: sliceSize, preempted: process.remaining > 0 });

    // Jobs that arrived during this slice queue up BEFORE the preempted process.
    admitArrivals(time);

    if (process.remaining > 0) queue.push(process);
    else completed += 1;
  }

  return buildResult(processes, timeline);
}

// Keys must match the ids in src/data/schedulingData.js.
const IMPLEMENTATIONS = { fcfs, sjf, rr: roundRobin };

/** Single entry point used by the module: runScheduler('rr', processes, 3). */
export function runScheduler(algorithmId, processes, quantum = 2) {
  const implementation = IMPLEMENTATIONS[algorithmId];
  if (!implementation) throw new Error(`Unknown scheduling algorithm: ${algorithmId}`);
  if (algorithmId === 'rr') return implementation(processes, quantum);
  return implementation(processes);
}

/** Groups the timeline into idle-free segments for a compact Gantt chart. */
export function timelineBlocks(result) {
  return result.timeline.map((block) => ({
    ...block,
    duration: block.end - block.start,
    idle: block.id === IDLE
  }));
}
