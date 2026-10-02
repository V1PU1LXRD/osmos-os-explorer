/**
 * Fixed scheduling dataset for the CPU Scheduler module.
 *
 * The arrival/burst pairs are chosen so that the three policies visibly differ:
 *   P1 arrives first and is long, P3 is a very short job that arrives later
 *   (SJF jumps ahead of it), and the mixture of short/long jobs makes
 *   Round Robin's context switching easy to see.
 */

export const SCHEDULING_DATASET = [
  { id: 'P1', arrival: 0, burst: 7, priority: 3 },
  { id: 'P2', arrival: 2, burst: 4, priority: 1 },
  { id: 'P3', arrival: 4, burst: 1, priority: 2 },
  { id: 'P4', arrival: 5, burst: 4, priority: 4 }
];

export const SCHEDULING_LIMITS = {
  minArrival: 0,
  maxArrival: 9,
  minBurst: 1,
  maxBurst: 12,
  minQuantum: 1,
  maxQuantum: 5
};

export const SCHEDULING_ALGORITHMS = [
  {
    id: 'fcfs',
    label: 'FCFS',
    fullName: 'First Come, First Served',
    tagline: 'Non-preemptive · arrival order',
    explanation:
      'Processes are served strictly in arrival order and run to completion. It is the simplest policy and it ' +
      'never starves anybody, but one long job at the front makes every short job behind it wait. That effect ' +
      'is called the convoy effect, and it is why FCFS usually has the highest average waiting time.',
    why: 'Look at the average waiting time: the long first job pushes everybody else to the right.'
  },
  {
    id: 'sjf',
    label: 'SJF',
    fullName: 'Shortest Job First (non-preemptive)',
    tagline: 'Non-preemptive · smallest burst first',
    explanation:
      'Whenever the CPU becomes free, the scheduler picks the arrived process with the smallest burst time. ' +
      'It provably minimises average waiting time, but it needs to know burst lengths in advance and a stream ' +
      'of short jobs can starve a long one forever.',
    why: 'P3 (burst 1) jumps ahead of everything already waiting, which is what pulls the average down.'
  },
  {
    id: 'rr',
    label: 'Round Robin',
    fullName: 'Round Robin',
    tagline: 'Preemptive · time quantum',
    explanation:
      'Each process gets one time quantum. If it is not finished when the quantum expires it is preempted and ' +
      'sent to the back of the ready queue. Response time becomes excellent and starvation impossible, at the ' +
      'cost of extra context switches and, usually, a slightly worse average waiting time than SJF.',
    why: 'Change the quantum: small values preempt often, large values behave more and more like FCFS.'
  }
];

export const ALGORITHM_BY_ID = SCHEDULING_ALGORITHMS.reduce((map, algorithm) => {
  map[algorithm.id] = algorithm;
  return map;
}, {});
