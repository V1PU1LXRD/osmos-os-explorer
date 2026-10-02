/**
 * Demo data for the Process Lab.
 * Fixed and deterministic so a viva examiner sees the same behaviour twice.
 */

export const PROCESS_STATES = [
  {
    id: 'new',
    label: 'New',
    tone: 'neutral',
    summary: 'The process is being created.',
    detail:
      'The operating system allocates a Process Control Block (PCB) to hold the process id, program counter, ' +
      'registers, memory limits and open files.'
  },
  {
    id: 'ready',
    label: 'Ready',
    tone: 'process',
    summary: 'Loaded in memory, waiting for the CPU.',
    detail:
      'The process could run immediately, but the scheduler has not selected it yet. Many processes can be ' +
      'ready at the same time; they queue up in the ready queue.'
  },
  {
    id: 'running',
    label: 'Running',
    tone: 'cpu',
    summary: 'Executing instructions on the CPU.',
    detail:
      'On a single-core CPU exactly one process runs at a time. It leaves this state when it finishes, is ' +
      'preempted by the scheduler, or blocks on I/O.'
  },
  {
    id: 'waiting',
    label: 'Waiting',
    tone: 'conflict',
    summary: 'Blocked on an I/O or event.',
    detail:
      'The process asked for something slow — a disk read, a keystroke, a lock. It cannot use the CPU until ' +
      'the event completes, so the scheduler gives the CPU to somebody else.'
  },
  {
    id: 'terminated',
    label: 'Terminated',
    tone: 'ok',
    summary: 'Finished; resources are reclaimed.',
    detail:
      'The process has executed its last instruction or was killed. Its PCB and memory are released, and its ' +
      'exit status is handed back to the parent.'
  }
];

export const PROCESS_STATE_ORDER = PROCESS_STATES.map((state) => state.id);

/** The initial process set shown when the lab mounts. */
export const DEMO_PROCESSES = [
  { id: 'P1', burst: 6, priority: 2, color: '#35d6c4' },
  { id: 'P2', burst: 4, priority: 1, color: '#6c8cff' },
  { id: 'P3', burst: 8, priority: 3, color: '#f0b429' },
  { id: 'P4', burst: 3, priority: 2, color: '#3fbf6f' },
  { id: 'P5', burst: 5, priority: 4, color: '#ff8a5c' }
];

/** Colour + burst pool used when the student adds a process by hand. */
export const PROCESS_POOL = [
  { color: '#35d6c4', burst: 5, priority: 2 },
  { color: '#6c8cff', burst: 7, priority: 3 },
  { color: '#f0b429', burst: 2, priority: 1 },
  { color: '#3fbf6f', burst: 6, priority: 4 },
  { color: '#ff8a5c', burst: 4, priority: 2 },
  { color: '#c58bff', burst: 9, priority: 5 }
];

export const MAX_PROCESSES = 9;

/**
 * One scheduler tick = one unit of CPU time.
 * The rules below keep the animation legible: a process blocks at most once per
 * burst, and every blocked process becomes ready again after IO_TICKS.
 */
export const TICK_MS = 900;
export const IO_TICKS = 2;
