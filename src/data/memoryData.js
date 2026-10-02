/**
 * Fixed-partition memory model (Option A from the brief).
 *
 * The partition order is deliberately irregular — real memory holes are never
 * sorted by size — and it makes the three placement policies behave
 * differently on the same workload:
 *
 *   First Fit  : P1 takes the huge 256 KB hole and later P4 (200 KB) cannot fit.
 *   Best Fit   : every request lands in the tightest hole, all five processes fit.
 *   Worst Fit  : the big holes are consumed first, so P4 cannot fit at all.
 */

export const MEMORY_PARTITIONS = [256, 64, 192, 96, 128, 64, 128, 96]; // KB, total 1024 KB

export const MEMORY_REQUESTS = [
  { id: 'A', label: 'P1', size: 120, color: '#35d6c4' },
  { id: 'B', label: 'P2', size: 60, color: '#6c8cff' },
  { id: 'C', label: 'P3', size: 90, color: '#f0b429' },
  { id: 'D', label: 'P4', size: 200, color: '#ff8a5c' },
  { id: 'E', label: 'P5', size: 140, color: '#3fbf6f' }
];

export const MEMORY_ALGORITHMS = [
  {
    id: 'first',
    label: 'First Fit',
    tagline: 'first hole that is large enough',
    explanation:
      'Scan the partitions from the start and stop at the first free partition that can hold the request. ' +
      'It is the fastest policy to implement and usually leaves the large holes at the end of memory intact.'
  },
  {
    id: 'best',
    label: 'Best Fit',
    tagline: 'tightest hole that still fits',
    explanation:
      'Pick the smallest free partition that can hold the request. Waste inside each partition is minimised, ' +
      'but the leftovers are tiny fragments that are almost never usable again.'
  },
  {
    id: 'worst',
    label: 'Worst Fit',
    tagline: 'largest hole available',
    explanation:
      'Pick the largest free partition so the leftover is big enough to be reused. In practice it destroys ' +
      'the big holes and fails as soon as a large process arrives.'
  }
];

export const MEMORY_TOTAL_KB = MEMORY_PARTITIONS.reduce((sum, size) => sum + size, 0);
