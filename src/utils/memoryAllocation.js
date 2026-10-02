/**
 * Fixed-partition memory allocation.
 *
 * A partition is `{ id, size, process }` where `process` is either null (free)
 * or `{ id, label, size, color }`. All sizes are in KB.
 *
 * Placement policies:
 *   first → first free partition that is large enough
 *   best  → smallest free partition that is large enough
 *   worst → largest free partition of all
 */

export function createBlocks(sizes) {
  return sizes.map((size, index) => ({ id: `M${index + 1}`, size, process: null }));
}

/** Returns the index of the partition the policy would choose, or -1 if none fits. */
function findSlot(blocks, size, algorithm) {
  let chosen = -1;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.process || block.size < size) continue;

    if (algorithm === 'first') return index;
    if (algorithm === 'best' && (chosen === -1 || block.size < blocks[chosen].size)) chosen = index;
    if (algorithm === 'worst' && (chosen === -1 || block.size > blocks[chosen].size)) chosen = index;
  }

  return chosen;
}

/** Allocates `request` ({ id, label, size, color }) using the chosen policy. */
export function allocate(blocks, request, algorithm) {
  const index = findSlot(blocks, request.size, algorithm);
  if (index === -1) {
    return { blocks, ok: false, index: -1, reason: 'no-fit' };
  }

  const next = blocks.map((block, blockIndex) =>
    blockIndex === index ? { ...block, process: { ...request } } : block
  );

  return { blocks: next, ok: true, index, reason: 'placed' };
}

/** Frees a partition by index. */
export function release(blocks, index) {
  if (index < 0 || index >= blocks.length) return blocks;
  return blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, process: null } : block));
}

/** Frees every partition held by a process id (used by "release all"). */
export function releaseByProcess(blocks, processId) {
  return blocks.map((block) =>
    block.process && block.process.id === processId ? { ...block, process: null } : block
  );
}

/**
 * Memory statistics.
 *
 * internal fragmentation = space wasted INSIDE allocated partitions
 *                          (partition size − requested size)
 * external fragmentation = free memory that cannot satisfy a large request
 *                          because it is scattered in separate partitions
 */
export function summarize(blocks) {
  const total = blocks.reduce((sum, block) => sum + block.size, 0);
  const allocatedBytes = blocks.reduce((sum, block) => sum + (block.process ? block.size : 0), 0);
  const processBytes = blocks.reduce((sum, block) => sum + (block.process ? block.process.size : 0), 0);
  const freeBytes = total - allocatedBytes;
  const freeBlocks = blocks.filter((block) => !block.process);
  const largestFree = freeBlocks.reduce((max, block) => Math.max(max, block.size), 0);
  const internalFragmentation = allocatedBytes - processBytes;
  const externalFragmentation = freeBytes > 0 ? (freeBytes - largestFree) / freeBytes : 0;

  return {
    total,
    allocatedBytes,
    processBytes,
    freeBytes,
    internalFragmentation,
    externalFragmentation,
    freeBlockCount: freeBlocks.length,
    allocatedBlockCount: blocks.length - freeBlocks.length,
    largestFree,
    utilization: total ? allocatedBytes / total : 0
  };
}

/** Human sentence describing why a request failed — used in the event log. */
export function explainFailure(blocks, request, algorithm) {
  const free = blocks.filter((block) => !block.process);
  const largest = free.reduce((max, block) => Math.max(max, block.size), 0);
  const label = algorithm === 'first' ? 'First Fit' : algorithm === 'best' ? 'Best Fit' : 'Worst Fit';
  return (
    `${label} could not place ${request.label} (${request.size} KB): the largest free partition is ` +
    `${largest} KB, so external fragmentation has made the remaining ${largest < request.size ? 'holes' : 'space'} unusable.`
  );
}
