/**
 * OSMOS — single source of project identity.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  EVERYTHING YOU NEED TO PERSONALISE BEFORE SUBMITTING IS IN THIS FILE.   │
 * │                                                                          │
 * │  1. author.name         →  your name                                     │
 * │  2. author.institution  →  your college                                  │
 * │  3. repository          →  your GitHub repo URL                          │
 * │  4. liveDemo            →  your GitHub Pages URL                         │
 * │  5. basePath            →  "/<your-repo-name>/" (must match the repo!)   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `basePath` is imported by vite.config.js, so changing it here is enough for
 * GitHub Pages to find every asset. See README.md → "Deployment".
 */
import { ZONES } from '../data/zones.js';

export const projectConfig = {
  name: 'OSMOS',
  fullName: 'Operating System Model & Observation Space',
  tagline: 'A walk-through of the invisible machine.',
  version: '1.0.0',
  course: 'Operating Systems — Mini Project',

  author: {
    name: 'Vipul Kanhere',
    program: 'B.Tech — Artificial Intelligence & Machine Learning (2nd Year)',
    institution: 'Alard University, Hinjewadi, Pune'
  },

  repository: 'https://github.com/V1PU1LXRD/osmos-os-explorer',
  liveDemo: 'https://V1PU1LXRD.github.io/osmos-os-explorer/',

  // Must match the GitHub repository name, wrapped in slashes.
  basePath: '/osmos-os-explorer/',

  license: 'MIT',

  objective:
    'Explain how an operating system manages processes, CPU time, memory, devices, files and hardware ' +
    'protection by letting the student manipulate a working model of each subsystem instead of reading ' +
    'static notes. Every animation is driven by real algorithms running in the browser.',

  performance:
    'The zone map is built from plain positioned elements rather than WebGL. A measured WebGL scene ran at 4fps ' +
    'in software rendering; the CSS version holds 60fps on the same machine and removes roughly 310KB ' +
    'of gzipped JavaScript.',

  stack: [
    'React 19',
    'Vite',
    'Plain positioned elements + CSS transforms (no WebGL)',
    'Framer Motion',
    'Lucide React',
    'Plain CSS (design tokens)'
  ],

  concepts: [
    'Process lifecycle: New → Ready → Running → Waiting → Terminated',
    'CPU scheduling: FCFS, SJF (non-preemptive), Round Robin',
    'Memory management: fixed partitions, First / Best / Worst Fit, fragmentation',
    "Deadlock: the four Coffman conditions, resource-allocation graph, cycle detection and recovery",
    'File systems: hierarchy, paths, permissions, create / delete / move',
    'User mode vs Kernel mode and the system-call boundary'
  ],

  // Re-exported for convenience so overlays can iterate zones via config.
  zones: ZONES
};

export default projectConfig;
