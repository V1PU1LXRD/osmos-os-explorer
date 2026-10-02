import { useMemo, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import {
  MEMORY_PARTITIONS,
  MEMORY_REQUESTS,
  MEMORY_ALGORITHMS,
  MEMORY_TOTAL_KB
} from '../../data/memoryData.js';
import {
  createBlocks,
  allocate,
  release,
  releaseByProcess,
  summarize,
  explainFailure
} from '../../utils/memoryAllocation.js';
import { kb, percent } from '../../utils/format.js';

const BLOCK_HEIGHTS = { small: 30, large: 44 };

/**
 * Memory Matrix — fixed partitions with three placement policies.
 * State: which requests have been attempted (in order), the chosen policy,
 * and the resulting partition table. All logic lives in utils/memoryAllocation.
 */
export default function MemoryMatrix() {
  const [algorithm, setAlgorithm] = useState('first');
  const [placed, setPlaced] = useState([]); // ids of successfully placed requests
  const [failed, setFailed] = useState([]); // ids that could not be placed
  const [blocks, setBlocks] = useState(() => createBlocks(MEMORY_PARTITIONS));
  const [log, setLog] = useState([]);
  const [justPlaced, setJustPlaced] = useState(null);

  const stats = useMemo(() => summarize(blocks), [blocks]);

  const attempt = (request) => {
    if (placed.includes(request.id) || failed.includes(request.id)) return;

    const outcome = allocate(blocks, request, algorithm);
    if (outcome.ok) {
      setBlocks(outcome.blocks);
      setPlaced((list) => [...list, request.id]);
      setJustPlaced(outcome.index);
      setTimeout(() => setJustPlaced(null), 700);
      setLog((entries) =>
        [
          `${algorithmLabel(algorithm)} placed ${request.label} (${request.size} KB) into partition ${outcome.index + 1} — leftover ${blocks[outcome.index].size - request.size} KB.`,
          ...entries
        ].slice(0, 8)
      );
    } else {
      setFailed((list) => [...list, request.id]);
      setLog((entries) => [explainFailure(blocks, request, algorithm), ...entries].slice(0, 8));
    }
  };

  const freePartition = (index) => {
    setBlocks((current) => release(current, index));
    setLog((entries) => [`Partition ${index + 1} released.`, ...entries].slice(0, 8));
  };

  const releaseAll = () => {
    setBlocks((current) => {
      let next = current;
      placed.forEach((id) => {
        next = releaseByProcess(next, id);
      });
      return next;
    });
    setLog((entries) => ['All process memory released — fragmentation pattern remains visible.', ...entries].slice(0, 8));
  };

  const reset = () => {
    setBlocks(createBlocks(MEMORY_PARTITIONS));
    setPlaced([]);
    setFailed([]);
    setLog([]);
    setJustPlaced(null);
  };

  return (
    <>
      <ModuleSummary>
        Memory here is a fixed set of <b>partitions</b>. When a process asks for space, a <b>placement policy</b>{' '}
        decides which free partition receives it. Same requests, different policies → very different outcomes. Watch
        what happens to <b>P4 (200 KB)</b> under each policy.
      </ModuleSummary>

      {/* Policy picker */}
      <div className="control-row">
        <div className="segmented" role="group" aria-label="Placement policy">
          {MEMORY_ALGORITHMS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={algorithm === entry.id ? 'is-active' : ''}
              onClick={() => {
                setAlgorithm(entry.id);
                reset();
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn" onClick={releaseAll} disabled={!placed.length}>
          Release all
        </button>
      </div>

      {/* Request queue */}
      <div>
        <div className="sub-heading">Memory requests (in order)</div>
        <div className="req-list">
          {MEMORY_REQUESTS.map((request) => {
            const state = placed.includes(request.id) ? 'placed' : failed.includes(request.id) ? 'failed' : '';
            return (
              <button
                key={request.id}
                type="button"
                className={`req-chip ${state}`}
                onClick={() => attempt(request)}
                disabled={Boolean(state)}
                title={`Allocate ${request.size} KB with ${algorithmLabel(algorithm)}`}
              >
                <span className="req-dot" style={{ background: request.color }} aria-hidden />
                {request.label} · {request.size} KB
                {state === 'placed' && <span aria-hidden> ✓</span>}
                {state === 'failed' && <span aria-hidden> ✕</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Partition wall */}
      <div>
        <div className="sub-heading">Main memory — {MEMORY_PARTITIONS.length} partitions</div>
        <div className="mem-grid" role="img" aria-label="Fixed-partition memory map">
          {blocks.map((block, index) => {
            const isFree = !block.process;
            const tooSmall = isFree && block.size < Math.min(...MEMORY_REQUESTS.map((r) => r.size));
            return (
              <div
                key={block.id}
                className={[
                  'mem-block',
                  !isFree && 'is-allocated',
                  justPlaced === index && 'is-just-placed',
                  isFree && tooSmall && 'is-free-hint'
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ '--block-h': `${block.size >= 128 ? BLOCK_HEIGHTS.large : BLOCK_HEIGHTS.small}px` }}
              >
                <div className="mem-block-fill" style={{ width: block.process ? '100%' : '0%', '--pid-color': block.process?.color }} />
                <div className="mem-block-inner">
                  <div className="mem-label">
                    <span className="mem-name">{block.id}</span>
                    <span>{kb(block.size)}</span>
                    {block.process ? (
                      <>
                        <span style={{ color: block.process.color }}>●</span>
                        <span className="mem-name">
                          {block.process.label} ({block.process.size} KB)
                        </span>
                        <span className="mem-waste" style={{ color: 'var(--text-faint)' }}>
                          waste {block.size - block.process.size} KB
                        </span>
                        <span className="mem-row-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => freePartition(index)}
                            aria-label={`Release partition ${index + 1}`}
                          >
                            <X size={11} aria-hidden /> free
                          </button>
                        </span>
                      </>
                    ) : (
                      <span style={{ color: tooSmall ? 'var(--magenta)' : 'var(--green)' }}>
                        {tooSmall ? 'too small for any request' : 'free'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <Stat label="Total" value={kb(stats.total)} />
        <Stat label="Allocated" value={kb(stats.allocatedBytes)} tone="warn" />
        <Stat label="Free" value={kb(stats.freeBytes)} tone="good" />
        <Stat label="Utilisation" value={percent(stats.utilization)} />
        <Stat label="Free blocks" value={`${stats.freeBlockCount} of ${blocks.length}`} />
        <Stat label="Internal frag." value={kb(stats.internalFragmentation)} tone="warn" />
        <Stat label="External frag." value={percent(stats.externalFragmentation)} tone="bad" />
      </div>

      {/* Event log */}
      {log.length > 0 && (
        <ul className="event-log" aria-live="polite">
          {log.map((entry, index) => (
            <li key={`${entry}-${index}`} className={index === 0 ? 'is-new' : ''}>
              <time>{String(log.length - index).padStart(2, '0')}</time>
              <span>{entry}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Fragmentation explainer */}
      <div className="note is-warn">
        <span className="note-title">Fragmentation, plainly</span>
        <b>Internal fragmentation</b> is the waste <i>inside</i> an allocated partition — the 256 KB partition holding a
        120 KB process wastes 136 KB. <b>External fragmentation</b> is free memory that is <i>useless</i> because it is
        scattered: after First Fit places P1–P3, more than 100 KB may still be free, yet P4 (200 KB) fits nowhere. That
        gap between "free" and "usable" is the whole lesson.
      </div>

      <Learned>
        <b>First Fit</b> is fast and leaves big holes alone; <b>Best Fit</b> minimises each allocation's waste but
        produces unusable slivers; <b>Worst Fit</b> consumes the big holes first and fails earliest. Fixed partitions
        always waste space — real operating systems switch to <b>paging</b>, which cuts memory into equal-sized frames
        so any free frame can serve any page.
      </Learned>
    </>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone}`}>{value}</div>
    </div>
  );
}

function algorithmLabel(id) {
  return { first: 'First Fit', best: 'Best Fit', worst: 'Worst Fit' }[id] || id;
}
