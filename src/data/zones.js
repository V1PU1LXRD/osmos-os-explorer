/**
 * The six observation zones of the OSMOS universe.
 *
 * Positions are laid out on a ring around the Kernel Core so that the whole
 * system is readable from the default camera and no node hides another one.
 */

const RING_RADIUS = 7.6;
const ZONE_COUNT = 6;

/** Places zone `index` on a ring in the XZ plane, alternating slightly in Y. */
function ringPosition(index) {
  const angle = (index / ZONE_COUNT) * Math.PI * 2 - Math.PI / 2;
  const lift = index % 2 === 0 ? 0.55 : -0.35;
  return [Math.cos(angle) * RING_RADIUS, lift, Math.sin(angle) * RING_RADIUS];
}

const ZONE_DEFINITIONS = [
  {
    id: 'process',
    code: 'PROC',
    label: 'Process Lab',
    shape: 'cluster',
    color: '#35d6c4',
    short: 'Watch processes move through their five states.',
    description:
      'A process is a program in execution. It is born, waits for the CPU, runs, blocks on I/O and finally ' +
      'terminates. This zone animates that journey for a small set of demo processes.'
  },
  {
    id: 'scheduler',
    code: 'CPU',
    label: 'CPU Scheduler',
    shape: 'rings',
    color: '#f0b429',
    short: 'FCFS, SJF and Round Robin compete on a live Gantt chart.',
    description:
      'The scheduler decides which ready process receives the processor. Different policies produce very ' +
      'different waiting and turnaround times — this zone computes them exactly.'
  },
  {
    id: 'memory',
    code: 'MEM',
    label: 'Memory Matrix',
    shape: 'grid',
    color: '#6c8cff',
    short: 'Fixed partitions, First / Best / Worst Fit and fragmentation.',
    description:
      'Main memory is divided into partitions. An allocation policy decides where a new process fits, and ' +
      'the leftovers become fragmentation. This zone makes both visible.'
  },
  {
    id: 'deadlock',
    code: 'DLK',
    label: 'Deadlock Observatory',
    shape: 'knot',
    color: '#ff4d6d',
    short: 'Build a circular wait, detect it, then break it.',
    description:
      'When processes hold resources while waiting for others, the system can freeze forever. This zone ' +
      'draws the resource-allocation graph, finds the cycle and demonstrates a recovery step.'
  },
  {
    id: 'filesystem',
    code: 'FS',
    label: 'File System Vault',
    shape: 'vault',
    color: '#3fbf6f',
    short: 'A navigable directory tree with paths and permissions.',
    description:
      'Files live inside directories inside directories. This zone is a real, editable directory tree ' +
      'with breadcrumb paths and UNIX-style permission strings.'
  },
  {
    id: 'syscall',
    code: 'SYS',
    label: 'System Call Gateway',
    shape: 'gate',
    color: '#7bd1ff',
    short: 'Cross the protected boundary between user and kernel mode.',
    description:
      'Applications never touch hardware directly. They ask the kernel through a system call, and the ' +
      'hardware privilege level changes as the request crosses the gateway.'
  }
];

export const ZONES = ZONE_DEFINITIONS.map((zone, index) => ({
  ...zone,
  position: ringPosition(index),
  index
}));

export const ZONE_BY_ID = ZONES.reduce((map, zone) => {
  map[zone.id] = zone;
  return map;
}, {});

export const KERNEL_CORE = {
  id: 'kernel',
  code: 'KRN',
  label: 'Kernel Core',
  color: '#7bd1ff',
  position: [0, 0, 0],
  short: 'The protected centre that owns every resource.',
  description:
    'The kernel is the only code allowed to execute privileged instructions. Every zone around it requests ' +
    'services from it, and the Kernel Core is what keeps those requests orderly.'
};

/** Colour semantics used by the UI legend — every colour must carry meaning. */
export const COLOR_SEMANTICS = [
  { color: '#35d6c4', label: 'Process activity', hint: 'running, ready, blocked' },
  { color: '#f0b429', label: 'CPU / attention', hint: 'dispatch, time slice' },
  { color: '#ff4d6d', label: 'Conflict', hint: 'deadlock, failure, unsafe' },
  { color: '#3fbf6f', label: 'Completion', hint: 'finished, released, safe' },
  { color: '#6c8cff', label: 'Memory & storage', hint: 'partitions, pages, bytes' },
  { color: '#7bd1ff', label: 'Kernel / privilege', hint: 'kernel mode, syscalls' }
];
