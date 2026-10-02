/**
 * Deadlock detection on a resource-allocation graph where every resource has
 * a single instance (the standard textbook case).
 *
 * The graph is:
 *   { processes: ['P1', …], resources: ['R1', …],
 *     allocation: { P1: ['R1'] },   // resource held by process
 *     requests:   { P1: ['R2'] } }  // resource the process is waiting for
 *
 * Detection uses the standard graph-reduction / cycle-search approach on the
 * derived wait-for graph:
 *   P waits for Q  ⟺  ∃ resource R with  P requests R  and  Q holds R.
 * If P waits (directly or transitively) on itself, the system is deadlocked.
 */

/** Build the derived wait-for graph: map of process id → array of process ids it waits for. */
export function buildWaitForGraph(scenario) {
  const holderOf = {};
  scenario.processes.forEach((process) => {
    (scenario.allocation[process] || []).forEach((resource) => {
      holderOf[resource] = process;
    });
  });

  const waitFor = {};
  scenario.processes.forEach((process) => {
    const waitingOn = new Set();
    (scenario.requests[process] || []).forEach((resource) => {
      const holder = holderOf[resource];
      if (holder && holder !== process) waitingOn.add(holder);
    });
    waitFor[process] = [...waitingOn];
  });

  return waitFor;
}

/**
 * Find every cycle in the wait-for graph using DFS.
 * Returns an array of cycles, each as an array of process ids, e.g. ['P1','P2'].
 */
export function findCycles(scenario) {
  const waitFor = buildWaitForGraph(scenario);
  const cycles = [];
  const seenCycles = new Set();

  const visit = (start, node, path, visiting) => {
    const edges = waitFor[node] || [];
    for (const next of edges) {
      if (next === start) {
        const key = canonicalCycle(path);
        if (!seenCycles.has(key)) {
          seenCycles.add(key);
          cycles.push([...path]);
        }
        continue;
      }
      if (visiting.has(next)) continue;
      visiting.add(next);
      visit(start, next, [...path, next], visiting);
      visiting.delete(next);
    }
  };

  scenario.processes.forEach((process) => {
    visit(process, process, [process], new Set([process]));
  });

  return cycles;
}

/** ['P2','P1'] and ['P1','P2'] describe the same cycle — normalise to one key. */
function canonicalCycle(cycle) {
  const rotations = cycle.map((_, offset) => [...cycle.slice(offset), ...cycle.slice(0, offset)]);
  return rotations.map((rotation) => rotation.join('>')).sort()[0];
}

/**
 * Convenience check used everywhere in the UI.
 * Returns { deadlocked, cycles, involvedProcesses }.
 */
export function detectDeadlock(scenario) {
  const cycles = findCycles(scenario);
  const involved = new Set();
  cycles.forEach((cycle) => cycle.forEach((process) => involved.add(process)));
  return {
    deadlocked: cycles.length > 0,
    cycles,
    involvedProcesses: [...involved]
  };
}

/**
 * Recovery action: terminate `processId`, releasing everything it holds and
 * cancelling everything it waits for. Returns a new scenario plus a sentence
 * explaining exactly what changed.
 */
export function terminateProcess(scenario, processId) {
  const released = scenario.allocation[processId] || [];
  const cancelled = scenario.requests[processId] || [];

  const allocation = { ...scenario.allocation, [processId]: [] };
  const requests = { ...scenario.requests, [processId]: [] };

  // Other processes can no longer wait on resources this process held,
  // because those resources are now free again.
  Object.keys(requests).forEach((other) => {
    if (other === processId) return;
    if (!requests[other].length) return;
    if (!released.some((resource) => requests[other].includes(resource))) return;
    requests[other] = requests[other].filter((resource) => !released.includes(resource));
  });

  const next = { ...scenario, allocation, requests };
  const explanation =
    cancelled.length
      ? `${processId} was terminated: it released ${released.join(', ') || 'no resources'} and cancelled its request(s) for ${cancelled.join(', ') || 'none'}. The circular wait is broken.`
      : `${processId} was terminated: it released ${released.join(', ') || 'no resources'}. The circular wait is broken.`;

  return { scenario: next, explanation };
}
