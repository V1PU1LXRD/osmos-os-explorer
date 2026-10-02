import { useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import {
  DEADLOCK_SCENARIOS,
  COFFMAN_CONDITIONS,
  SCENARIO_BY_ID
} from '../../data/deadlockScenarios.js';
import { detectDeadlock, terminateProcess } from '../../utils/deadlockDetection.js';

const W = 460;
const H = 320;
const PROC_X = 92;
const RES_X = W - 92;
const ROW = 54;
const TOP = 64;

/** Layout: processes on the left, resources on the right, one per row. */
function layout(scenario) {
  const positions = { processes: {}, resources: {} };
  scenario.processes.forEach((id, index) => {
    positions.processes[id] = { x: PROC_X, y: TOP + index * ROW };
  });
  scenario.resources.forEach((id, index) => {
    positions.resources[id] = { x: RES_X, y: TOP + index * ROW };
  });
  return positions;
}

/** Edge path from a process to a resource (request) or back (allocation). */
function edgePath(a, b, curve = 0) {
  const mx = (a.x + b.x) / 2 + curve;
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${my}, ${mx} ${my}, ${b.x} ${b.y}`;
}

/**
 * Deadlock Observatory — an educational resource-allocation graph.
 * Real cycle detection runs on every render of the current scenario.
 */
export default function DeadlockObservatory() {
  const [scenario, setScenario] = useState(DEADLOCK_SCENARIOS[0]);
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState(null);

  const detection = useMemo(() => detectDeadlock(scenario), [scenario]);
  const positions = useMemo(() => layout(scenario), [scenario]);
  const involved = new Set(detection.involvedProcesses);

  const loadScenario = (id) => {
    setScenario(SCENARIO_BY_ID[id]);
    setHistory([]);
    setMessage(null);
  };

  const createDeadlock = () => {
    // Pick the canonical two-process circular wait. The copy keeps the object
    // identity distinct from the data module so Undo can always step back.
    const next = { ...SCENARIO_BY_ID.cycle2, id: 'cycle2-live', baseId: 'cycle2' };
    setHistory((h) => (h[h.length - 1] === scenario ? h : [...h, scenario]));
    setScenario(next);
    setMessage({
      tone: 'bad',
      text: 'P1 now holds R1 and waits for R2, while P2 holds R2 and waits for R1. The detector found the cycle — see the highlighted loop.'
    });
  };

  const recover = (processId) => {
    const { scenario: next, explanation } = terminateProcess(scenario, processId);
    setHistory((h) => [...h, scenario]);
    setScenario(next);
    setMessage({ tone: 'good', text: explanation });
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setScenario(previous);
    setMessage(null);
  };

  return (
    <>
      <ModuleSummary>
        Processes are <b>circles</b>, resources are <b>rectangles</b>. A solid arrow means "is held by"; a dashed arrow
        means "is waiting for". A <b>cycle</b> in this graph means deadlock — the detector below recomputes it live.
        This is an <b>educational model</b>: a real detector also handles multi-instance resources.
      </ModuleSummary>

      {/* Scenario picker + actions */}
      <div className="control-row">
        <div className="segmented" role="group" aria-label="Scenario">
          {DEADLOCK_SCENARIOS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={scenario.baseId === entry.id || scenario.id === entry.id ? 'is-active' : ''}
              onClick={() => loadScenario(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-danger" onClick={createDeadlock}>
          <AlertTriangle size={13} aria-hidden /> Create deadlock
        </button>
        {history.length > 0 && (
          <button type="button" className="btn btn-ghost" onClick={undo}>
            <RotateCcw size={13} aria-hidden /> Undo
          </button>
        )}
      </div>

      {/* The graph */}
      <div className="rag">
        <RagSvg scenario={scenario} positions={positions} involved={involved} detection={detection} />
      </div>

      <div className="rag-legend">
        <span>
          <i aria-hidden /> allocation (held by)
        </span>
        <span>
          <i className="dashed" aria-hidden /> request (waits for)
        </span>
        <span>
          <i className="cycle" aria-hidden /> deadlock cycle
        </span>
      </div>

      {/* Detection result */}
      <div className={`note ${detection.deadlocked ? 'is-danger' : 'is-ok'}`} role="status">
        <span className="note-title">
          {detection.deadlocked ? <AlertTriangle size={11} aria-hidden /> : <ShieldCheck size={11} aria-hidden />}
          {' '}Detector output
        </span>
        {detection.deadlocked ? (
          <>
            <b>Deadlock detected.</b> Cycle: {detection.cycles[0].join(' → ')} → {detection.cycles[0][0]}.{' '}
            {involved.size} process{involved.size > 1 ? 'es' : ''} can never proceed.{' '}
            <b>Recovery:</b> terminate one of them below to break the cycle.
          </>
        ) : (
          <>
            <b>No deadlock.</b> The wait-for graph is acyclic, so every request can eventually be satisfied.
            {scenario.requests && Object.values(scenario.requests).some((r) => r.length)
              ? ' Hold-and-wait exists, but nobody is waiting in a loop.'
              : ''}
          </>
        )}
      </div>

      {/* Recovery actions */}
      {detection.deadlocked && (
        <div>
          <div className="sub-heading">Recovery — terminate a process</div>
          <div className="control-row">
            {detection.involvedProcesses.map((processId) => (
              <button key={processId} type="button" className="btn btn-danger" onClick={() => recover(processId)}>
                Terminate {processId}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message from actions */}
      {message && (
        <div className={`note ${message.tone === 'good' ? 'is-ok' : message.tone === 'bad' ? 'is-danger' : ''}`}>
          {message.text}
        </div>
      )}

      {/* Coffman conditions */}
      <div>
        <div className="sub-heading">The four Coffman conditions</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {COFFMAN_CONDITIONS.map((condition, index) => {
            const isBroken = condition.id === 'circularWait' && !detection.deadlocked;
            return (
              <div key={condition.id} className="stat" style={{ padding: '9px 12px' }}>
                <div className="stat-label">
                  C{index + 1} · {condition.label}
                  {isBroken ? ' — absent' : ' — present'}
                </div>
                <div className="muted" style={{ fontSize: 'var(--fs-10)' }}>{condition.detail}</div>
              </div>
            );
          })}
        </div>
        <p className="muted" style={{ marginTop: 8 }}>
          All four must hold simultaneously for deadlock. Recovery here works by forcibly removing one process, which
          breaks <b>circular wait</b> (and, for that process, hold-and-wait too).
        </p>
      </div>

      <Learned>
        Deadlock needs <b>all four</b> Coffman conditions at once. Detect it by finding a cycle in the wait-for graph;
        recover by terminating one process and reclaiming its resources. Prevention attacks a condition (e.g. ordering
        resource requests kills circular wait); avoidance (like Banker's algorithm) refuses unsafe states.
      </Learned>
    </>
  );
}

/* ── SVG graph ─────────────────────────────────────────────────────────── */

function RagSvg({ scenario, positions, involved, detection }) {
  const cycleEdges = collectCycleEdges(scenario, detection);

  const allocationEdges = [];
  scenario.processes.forEach((process) => {
    (scenario.allocation[process] || []).forEach((resource) => {
      allocationEdges.push({
        key: `${resource}->${process}`,
        from: positions.resources[resource],
        to: positions.processes[process]
      });
    });
  });

  const requestEdges = [];
  scenario.processes.forEach((process) => {
    (scenario.requests[process] || []).forEach((resource) => {
      requestEdges.push({
        key: `${process}->${resource}`,
        from: positions.processes[process],
        to: positions.resources[resource]
      });
    });
  });

  return (
    <svg className="rag-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Resource allocation graph">
      {/* Edges */}
      {allocationEdges.map((edge) => (
        <path
          key={edge.key}
          className={`rag-edge ${cycleEdges.has(edge.key) ? 'is-cycle' : ''}`}
          d={edgePath(edge.from, edge.to, 24)}
          markerEnd={`url(#${cycleEdges.has(edge.key) ? 'arrow-cycle' : 'arrow'})`}
        />
      ))}
      {requestEdges.map((edge) => (
        <path
          key={edge.key}
          className={`rag-edge is-request ${cycleEdges.has(edge.key) ? 'is-cycle' : ''}`}
          d={edgePath(edge.from, edge.to, -24)}
          markerEnd={`url(#${cycleEdges.has(edge.key) ? 'arrow-cycle' : 'arrow'})`}
        />
      ))}

      {/* Nodes */}
      {scenario.processes.map((id) => {
        const pos = positions.processes[id];
        const isDead = involved.has(id);
        return (
          <g key={id} className={`rag-node ${isDead ? 'is-involved is-dead' : ''}`}>
            <circle cx={pos.x} cy={pos.y} r={17} className="rag-node-process" />
            <text x={pos.x} y={pos.y + 1} className="rag-node-label">{id}</text>
            {isDead && (
              <text x={pos.x} y={pos.y - 24} className="rag-node-label" style={{ fill: 'var(--magenta)', fontSize: 9 }}>
                blocked
              </text>
            )}
          </g>
        );
      })}
      {scenario.resources.forEach((id) => {
        const pos = positions.resources[id];
        const held = Object.entries(scenario.allocation).find(([, resources]) => resources.includes(id));
        return (
          <g key={id} className={`rag-node ${involved.has(held?.[0]) ? 'is-involved' : ''}`}>
            <rect x={pos.x - 20} y={pos.y - 13} width={40} height={26} rx={3} className="rag-node-resource" />
            <text x={pos.x} y={pos.y + 1} className="rag-node-label">{id}</text>
          </g>
        );
      })}

      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--text-faint)" />
        </marker>
        <marker id="arrow-cycle" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill="var(--magenta)" />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * Collects the edge ids ("resource->process" for allocation, "process->resource"
 * for request) that make up the first detected cycle, so the SVG can highlight them.
 */
function collectCycleEdges(scenario, detection) {
  const keys = new Set();
  if (!detection.deadlocked) return keys;

  const cycle = detection.cycles[0];
  const holderOf = {};
  scenario.processes.forEach((process) => {
    (scenario.allocation[process] || []).forEach((resource) => {
      holderOf[resource] = process;
    });
  });

  for (let i = 0; i < cycle.length; i += 1) {
    const current = cycle[i];
    const next = cycle[(i + 1) % cycle.length];
    // `current` waits for a resource that `next` holds: the two edges that close
    // this link of the loop are the request and the matching allocation.
    (scenario.requests[current] || []).forEach((resource) => {
      if (holderOf[resource] === next) {
        keys.add(`${current}->${resource}`);
        keys.add(`${resource}->${next}`);
      }
    });
  }
  return keys;
}
