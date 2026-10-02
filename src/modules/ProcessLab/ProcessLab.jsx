import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, Plus, ArrowRight, RotateCcw } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import {
  DEMO_PROCESSES,
  PROCESS_STATES,
  PROCESS_STATE_ORDER,
  PROCESS_POOL,
  MAX_PROCESSES,
  TICK_MS
} from '../../data/processes.js';
import { makeProcess, tick } from '../../utils/processLifecycle.js';

const STATE_META = PROCESS_STATE_ORDER.reduce((map, id, index) => {
  map[id] = { ...PROCESS_STATES[index], index };
  return map;
}, {});

/**
 * Process Lab — the five-state lifecycle, animated by a real tick loop.
 * Transitions are decided per tick:
 *   new → ready (admitted) → running (scheduled, one at a time)
 *   running → waiting (once per process, at a random-ish threshold)
 *   waiting → ready (after IO_TICKS) → terminated (when burst is exhausted)
 */
export default function ProcessLab() {
  const [processes, setProcesses] = useState(() =>
    DEMO_PROCESSES.map((p) => makeProcess(p.id, p.color, p.burst, p.priority))
  );
  const [running, setRunning] = useState(true);
  const [selected, setSelected] = useState(null);
  const nextId = useRef(6);

  const reset = () => {
    setProcesses(DEMO_PROCESSES.map((p) => makeProcess(p.id, p.color, p.burst, p.priority)));
    setRunning(true);
    setSelected(null);
    nextId.current = 6;
  };

  const addProcess = () => {
    if (processes.length >= MAX_PROCESSES) return;
    const template = PROCESS_POOL[(nextId.current - 6) % PROCESS_POOL.length];
    const id = `P${nextId.current}`;
    nextId.current += 1;
    setProcesses((list) => [...list, makeProcess(id, template.color, template.burst, template.priority)]);
  };

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setProcesses((list) => tick(list));
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  const byState = useMemo(() => {
    const map = PROCESS_STATE_ORDER.reduce((acc, id) => ({ ...acc, [id]: [] }), {});
    processes.forEach((p) => map[p.state].push(p));
    return map;
  }, [processes]);

  const selectedProcess = processes.find((p) => p.id === selected) || null;

  return (
    <>
      <ModuleSummary>
        A <b>process</b> is a program in execution. The kernel records each one in a Process Control Block and moves
        it through five states. Watch the demo processes travel the ring: the CPU column always holds at most one
        running process — the defining constraint of a single-core machine.
      </ModuleSummary>

      {/* State pipeline */}
      <div>
        <div className="sub-heading">Five-state lifecycle</div>
        <div className="plab-flow" role="img" aria-label="Process state diagram">
          {PROCESS_STATES.map((state, index) => (
            <div key={state.id} style={{ display: 'contents' }}>
              <div
                className={[
                  'plab-state',
                  byState[state.id].length ? 'is-populated' : '',
                  state.id === 'running' && byState.running.length ? 'is-cpu' : '',
                  state.id === 'ready' && byState.ready.length > 1 ? 'is-active-state' : ''
                ].join(' ')}
                title={state.summary}
              >
                <div className="st-name">{state.label}</div>
                <div className="st-count">{byState[state.id].length}</div>
              </div>
              {index < PROCESS_STATES.length - 1 && (
                <ArrowRight size={12} className="plab-arrow" aria-hidden />
              )}
            </div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          Waiting → Ready happens on the same row after I/O completes; the diagram omits that return edge for clarity.
        </p>
      </div>

      {/* Process rows */}
      <div>
        <div className="sub-heading">Demo processes</div>
        <div className="plab-rows">
          {processes.map((process) => (
            <ProcessRow
              key={process.id}
              process={process}
              selected={selected === process.id}
              onSelect={() => setSelected(selected === process.id ? null : process.id)}
            />
          ))}
        </div>
      </div>

      {/* Inspector */}
      {selectedProcess && (
        <div className="note">
          <span className="note-title">Inspector — {selectedProcess.id}</span>
          <p style={{ marginBottom: 6 }}>
            <b>{STATE_META[selectedProcess.state].label}</b> — {STATE_META[selectedProcess.state].detail}
          </p>
          <p className="mono" style={{ fontSize: 'var(--fs-10)' }}>
            burst {selectedProcess.burst} · remaining {selectedProcess.remaining} · priority{' '}
            {selectedProcess.priority} · ioUsed {String(selectedProcess.ioUsed)}
          </p>
        </div>
      )}

      <Learned>
        A process is <b>created</b> (PCB allocated), <b>admitted</b> to the ready queue, <b>dispatched</b> onto the CPU,
        may <b>block</b> for I/O, re-enters <b>ready</b>, and finally <b>terminates</b>, releasing its PCB and memory.
        Only one process is Running on a single core; everything else waits its turn.
      </Learned>

      {/* Controls live in the panel footer */}
      <PanelControls
        running={running}
        onToggle={() => setRunning((value) => !value)}
        onAdd={addProcess}
        addDisabled={processes.length >= MAX_PROCESSES}
        onReset={reset}
      />
    </>
  );
}

function ProcessRow({ process, selected, onSelect }) {
  const meta = STATE_META[process.state];
  const fraction = process.remaining / process.burst;
  return (
    <button type="button" className={`plab-row${selected ? ' is-selected' : ''}`} onClick={onSelect}>
      <span className="pid" style={{ color: process.color }}>
        {process.id}
      </span>
      <span className="plab-burst" aria-hidden>
        <i style={{ width: `${Math.max(4, fraction * 100)}%`, background: process.color }} />
      </span>
      <span className="plab-meta">
        {process.burst - process.remaining}/{process.burst} burst · prio {process.priority}
      </span>
      <span className="plab-meta">
        <span className="st-label" style={{ color: toneColor(meta.tone) }}>
          {meta.label}
        </span>
      </span>
    </button>
  );
}

function toneColor(tone) {
  return { neutral: 'var(--text-dim)', process: 'var(--cyan)', cpu: 'var(--amber)', conflict: 'var(--magenta)', ok: 'var(--green)' }[tone] || 'var(--text-dim)';
}

function PanelControls({ running, onToggle, onAdd, addDisabled, onReset }) {
  return (
    <div className="control-row" style={{ marginTop: 'auto' }}>
      <button type="button" className="btn" onClick={onToggle}>
        {running ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
        {running ? 'Pause simulation' : 'Resume simulation'}
      </button>
      <button type="button" className="btn btn-accent" onClick={onAdd} disabled={addDisabled}>
        <Plus size={13} aria-hidden /> Add process
      </button>
      <button type="button" className="btn" onClick={onReset}>
        <RotateCcw size={13} aria-hidden /> Reset
      </button>
    </div>
  );
}
