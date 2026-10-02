/**
 * Knowledge Check — five questions, each one tied to something the student has
 * just manipulated inside a zone. Correct answers are stored as indexes so the
 * component can shuffle nothing and stay deterministic.
 */

export const QUIZ_QUESTIONS = [
  {
    id: 'q-process',
    zone: 'process',
    zoneLabel: 'Process Lab',
    prompt: 'A process is currently in the Running state on a single-core CPU. Which state can it NOT enter directly?',
    options: ['Ready', 'Waiting', 'Terminated', 'New'],
    answer: 3,
    explanation:
      'A process only enters New once, at the moment it is created. From Running it can be preempted back to ' +
      'Ready, block into Waiting on I/O, or finish into Terminated.'
  },
  {
    id: 'q-scheduler',
    zone: 'scheduler',
    zoneLabel: 'CPU Scheduler',
    prompt: 'Round Robin is running with a time quantum of 2. A process with burst time 5 has just used 2 units of CPU. What happens next?',
    options: [
      'It is terminated because the quantum expired',
      'It is preempted and placed at the back of the ready queue with 3 units remaining',
      'It moves to the Waiting state for I/O',
      'It keeps the CPU because it is the shortest job'
    ],
    answer: 1,
    explanation:
      'The quantum limits how long a process may hold the CPU. After 2 units it is preempted, its remaining ' +
      'burst drops to 3, and it joins the end of the ready queue — that is what makes Round Robin fair and ' +
      'responsive.'
  },
  {
    id: 'q-memory',
    zone: 'memory',
    zoneLabel: 'Memory Matrix',
    prompt: 'Which fixed-partition placement policy chooses the smallest free partition that is still large enough?',
    options: ['First Fit', 'Best Fit', 'Worst Fit', 'Next Fit'],
    answer: 1,
    explanation:
      'Best Fit leaves the least wasted space inside the chosen partition, but the leftovers are very small ' +
      'holes that are hard to reuse — which is why it can increase external fragmentation over time.'
  },
  {
    id: 'q-deadlock',
    zone: 'deadlock',
    zoneLabel: 'Deadlock Observatory',
    prompt: 'Terminating one process in a deadlocked cycle and reclaiming its resources directly removes which Coffman condition?',
    options: ['Mutual exclusion', 'No preemption', 'Circular wait', 'None of them'],
    answer: 2,
    explanation:
      'Killing a process deletes its request edges, so the closed chain of waiting disappears — circular wait ' +
      'is broken (and hold-and-wait vanishes for that process too). Mutual exclusion still holds for the ' +
      'resources themselves, which is why they must be released explicitly.'
  },
  {
    id: 'q-syscall',
    zone: 'syscall',
    zoneLabel: 'System Call Gateway',
    prompt: 'Why does an application call write() instead of writing to the disk controller’s registers itself?',
    options: [
      'System calls are always faster than direct access',
      'User-mode code cannot execute privileged instructions or touch protected hardware',
      'The C language provides no other way to write files',
      'Because the kernel compiles the program for the disk'
    ],
    answer: 1,
    explanation:
      'The CPU runs applications in user mode (ring 3) where privileged instructions and device registers are ' +
      'off-limits. A system call is the controlled doorway: the CPU traps into kernel mode (ring 0), the ' +
      'kernel validates the request, performs it, and returns a result.'
  }
];

export const QUIZ_PASS_RATIO = 0.6;
