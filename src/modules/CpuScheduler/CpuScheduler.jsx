import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import { runScheduler, timelineBlocks } from '../../utils/scheduling.js';
import {
  SCHEDULING_DATASET,
  SCHEDULING_ALGORITHMS,
  SCHEDULING_LIMITS,
  ALGORITHM_BY_ID
} from '../../data/schedulingData.js';
import { cx, num } from '../../utils/format.js';

const PALETTE = {
  P1: '#35d6c4',
  P2: '#6c8cff',
  P3: '#f0b429',
  P4: '#3fbf6f',
  P5: '#ff8a5c'
};

/**
 * CPU Scheduler — real FCFS / SJF / RR computations with an animated Gantt.
 * The Gantt reveals block-by-block so the student can watch the policy work.
 */
export default function CpuScheduler() {
  const [algorithm, setAlgorithm] = useState('fcfs');
  const [quantum, setQuantum] = useState(2);
  const [playhead, setPlayhead] = useState(Infinity);
  const [playing, setPlaying] = useState(true);

  const processes = SCHEDULING_DATASET;

  const result = useMemo(
    () => runScheduler(algorithm, processes, quantum),
    [algorithm, quantum, processes]
  );
  const blocks = useMemo(() => timelineBlocks(result), [result]);

  // Reset the animation whenever inputs change.
  useEffect(() => {
    setPlayhead(playing ? Infinity : 0);
  }, [algorithm, quantum]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step the playhead while playing.
  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setPlayhead((value) => {
        const total = result.stats.makespan;
        const next = Number.isFinite(value) ? value + 1 : 0;
        return next >= total ? Infinity : next;
      });
    }, 420);
    return () => clearInterval(timer);
  }, [playing, result]);

  const isRevealed = (block) =>
    Number.isFinite(playhead) ? block.start < playhead : true;

  const algorithmInfo = ALGORITHM_BY_ID[algorithm];
  const comparison = compareAverages(processes);
  const lowestWaiting = Math.min(...comparison.map((entry) => entry.avgWaiting));

  return (
    <>
      <ModuleSummary>
        The <b>scheduler</b> decides which ready process gets the CPU. The same four jobs are fed to every policy, so
        the only thing that changes is the <b>decision rule</b> — and that alone moves the average waiting time around
        by whole time units.
      </ModuleSummary>

      {/* Algorithm picker */}
      <div className="control-row">
        <div className="segmented" role="tablist" aria-label="Scheduling algorithm">
          {SCHEDULING_ALGORITHMS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={algorithm === entry.id}
              className={algorithm === entry.id ? 'is-active' : ''}
              onClick={() => setAlgorithm(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {algorithm === 'rr' && (
          <div className="field">
            <label className="field-label" htmlFor="rr-quantum">
              Time quantum: {quantum}
            </label>
            <input
              id="rr-quantum"
              type="range"
              min={SCHEDULING_LIMITS.minQuantum}
              max={SCHEDULING_LIMITS.maxQuantum}
              value={quantum}
              onChange={(event) => setQuantum(Number(event.target.value))}
            />
        </div>
        )}

        <button type="button" className="btn" onClick={() => setPlaying((v) => !v)}>
          {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
          {playing ? 'Pause chart' : 'Play chart'}
      </button>
      </div>

      {/* Gantt — scrolls horizontally rather than crushing its slices */}
      <div className="gantt">
        <div className="gantt-scroll">
          <div className="gantt-lane">
            <span className="gantt-lane-label">CPU</span>
            <div className="gantt-track" role="img" aria-label={`Gantt chart for ${algorithmInfo.fullName}`}>
              {blocks.map((block) => {
                const visible = isRevealed(block);
                const isCurrent = playing && block.start < playhead && block.end > playhead;
                return (
                  <motion.div
                    key={`${block.id}-${block.start}`}
                    className={cx('gantt-block', block.idle && 'is-idle', isCurrent && 'is-animating')}
                    style={{
                      flexGrow: block.duration,
                      background: block.idle ? undefined : PALETTE[block.id] || 'var(--sky)',
                      opacity: visible ? 1 : 0.12
                    }}
                    initial={false}
                    title={
                      block.idle
                        ? `CPU idle ${block.start}–${block.end} (nothing has arrived yet)`
                        : `${block.id} runs ${block.start}–${block.end}`
                    }
                  >
                    <span>{block.idle ? 'idle' : block.id}</span>
                    <span className="gantt-sub">{visible ? block.duration : ''}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
          <div className="gantt-scale">
            <span />
            <div className="gantt-scale-track">
              {Array.from({ length: result.stats.makespan + 1 }, (_, tickValue) => (
                <i key={tickValue} style={{ left: `${(tickValue / result.stats.makespan) * 100}%` }}>
                  {tickValue}
                </i>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics table */}
      <div>
        <div className="sub-heading">Computed metrics — {algorithmInfo.fullName}</div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival</th>
                <th>Burst</th>
                <th>Completion</th>
                <th>Waiting</th>
                <th>Turnaround</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="pid-chip" style={{ '--pid-color': PALETTE[row.id] || 'var(--sky)' }}>
                      {row.id}
                    </span>
                  </td>
                  <td className="num">{row.arrival}</td>
                  <td className="num">{row.burst}</td>
                  <td className="num">{row.completion}</td>
                  <td className="num">{row.waiting}</td>
                  <td className="num">{row.turnaround}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Average</td>
                <td className="num">{num(result.averages.waiting)}</td>
                <td className="num">{num(result.averages.turnaround)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Algorithm explanation */}
      <div className="note">
        <span className="note-title">{algorithmInfo.tagline}</span>
        {algorithmInfo.explanation}
      </div>
      <div className="note is-warn">
        <span className="note-title">Why this run looks the way it does</span>
        {algorithmInfo.why}
      </div>

      {/* Cross-algorithm comparison */}
      <div>
        <div className="sub-heading">Policy comparison — same jobs, different rules</div>
        <div className="stat-grid">
          {comparison.map((entry) => (
            <div key={entry.id} className="stat">
              <div className="stat-label">{entry.label}</div>
              <div className={`stat-value ${entry.avgWaiting === lowestWaiting ? 'is-good' : ''}`}>
                {num(entry.avgWaiting)}
              </div>
              <div className="muted" style={{ fontSize: 'var(--fs-9)' }}>avg waiting</div>
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          SJF gives the lowest average waiting time here — but only because burst times are known in advance, which
          real systems can only estimate.
        </p>
      </div>

      <Learned>
        <b>FCFS</b> is fair in arrival order but suffers the convoy effect; <b>SJF</b> minimises average waiting time
        but needs burst knowledge and can starve long jobs; <b>Round Robin</b> trades a slightly worse average for
        fast response and no starvation, and its quantum tunes that trade-off.
      </Learned>
    </>
  );
}

/** Runs all three policies once and sorts them by average waiting time. */
function compareAverages(processes) {
  return ['fcfs', 'sjf', 'rr'].map((id) => ({
    id,
    label: ALGORITHM_BY_ID[id].label,
    avgWaiting: runScheduler(id, processes, 2).averages.waiting
  }));
}
