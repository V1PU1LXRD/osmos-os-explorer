/**
 * Resource-allocation scenarios for the Deadlock Observatory.
 *
 * Every resource has exactly one instance, which keeps the wait-for graph and
 * the resource-allocation graph equivalent — the standard textbook case.
 *
 * This is an EDUCATIONAL MODEL of deadlock, not a production detector: it
 * checks for cycles in a single-instance graph.
 */

export const COFFMAN_CONDITIONS = [
  {
    id: 'mutualExclusion',
    label: 'Mutual exclusion',
    detail:
      'At least one resource is non-shareable: only one process may use it at a time. In this model every ' +
      'resource is non-shareable, so this condition is always satisfied.'
  },
  {
    id: 'holdAndWait',
    label: 'Hold and wait',
    detail:
      'A process is holding at least one resource while requesting another one. Without this, a process ' +
      'would release everything before asking for more.'
  },
  {
    id: 'noPreemption',
    label: 'No preemption',
    detail:
      'A resource cannot be taken away from a process; it is released only voluntarily when the process ' +
      'finishes with it. This model never preempts resources.'
  },
  {
    id: 'circularWait',
    label: 'Circular wait',
    detail:
      'There is a closed chain P1 → P2 → … → P1 where each process waits for a resource held by the next one. ' +
      'This is the condition that the cycle detector actually looks for.'
  }
];

export const DEADLOCK_SCENARIOS = [
  {
    id: 'safe',
    label: 'Safe state',
    summary: 'Hold-and-wait is present, but there is no cycle.',
    detail:
      'P1 holds R1 and waits for R2, which P2 holds. P2 is not waiting for anything, so it can finish, ' +
      'release R2 and unblock P1. A deadlock needs all four Coffman conditions — here circular wait is missing.',
    processes: ['P1', 'P2', 'P3'],
    resources: ['R1', 'R2', 'R3'],
    allocation: { P1: ['R1'], P2: ['R2'], P3: [] },
    requests: { P1: ['R2'], P2: [], P3: ['R1'] }
  },
  {
    id: 'cycle2',
    label: 'Circular wait — 2 processes',
    summary: 'P1 holds R1 and waits for R2; P2 holds R2 and waits for R1.',
    detail:
      'This is the smallest possible deadlock. Both processes are blocked forever because neither can ' +
      'release what the other one needs.',
    processes: ['P1', 'P2'],
    resources: ['R1', 'R2'],
    allocation: { P1: ['R1'], P2: ['R2'] },
    requests: { P1: ['R2'], P2: ['R1'] }
  },
  {
    id: 'cycle3',
    label: 'Circular wait — 3 processes',
    summary: 'P1 → P2 → P3 → P1, each waiting on the next.',
    detail:
      'A longer cycle behaves exactly like the two-process case: the wait-for graph has no sink, so no ' +
      'process in the cycle can ever make progress.',
    processes: ['P1', 'P2', 'P3'],
    resources: ['R1', 'R2', 'R3'],
    allocation: { P1: ['R1'], P2: ['R2'], P3: ['R3'] },
    requests: { P1: ['R2'], P2: ['R3'], P3: ['R1'] }
  }
];

export const SCENARIO_BY_ID = DEADLOCK_SCENARIOS.reduce((map, scenario) => {
  map[scenario.id] = scenario;
  return map;
}, {});
