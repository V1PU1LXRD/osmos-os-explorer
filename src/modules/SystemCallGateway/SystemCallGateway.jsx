import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ShieldCheck } from 'lucide-react';
import { ModuleSummary, Learned } from '../shared/ModuleBits.jsx';
import { SYSTEM_CALLS, SYSCALL_STAGES } from '../../data/systemCalls.js';

const STEP_MS = 950;

/**
 * System Call Gateway — walks a request through the five syscall stages.
 * The journey timer is paused while nothing is dispatched.
 */
export default function SystemCallGateway() {
  const [callId, setCallId] = useState(null);
  const [stage, setStage] = useState(-1); // -1 idle, 0..4 walking, 5 done
  const [trace, setTrace] = useState([]);
  const timer = useRef(null);

  const call = SYSTEM_CALLS.find((entry) => entry.id === callId) || null;
  const running = Boolean(call) && stage >= 0 && stage < SYSCALL_STAGES.length;

  // Advance the journey while a call is in flight.
  useEffect(() => {
    if (!running) return undefined;
    timer.current = setTimeout(() => setStage((value) => value + 1), STEP_MS);
    return () => clearTimeout(timer.current);
  }, [running, stage]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const dispatch = (entry) => {
    clearTimeout(timer.current);
    setCallId(entry.id);
    setStage(0);
    setTrace([
      `user  → ${entry.request}`,
      `mode  → ring 3 → ring 0 (trap ${entry.number})`
    ]);
  };

  // Append trace lines as stages complete.
  useEffect(() => {
    if (!call || stage <= 0 || stage > SYSCALL_STAGES.length) return;
    const completed = SYSCALL_STAGES[stage - 1];
    const line = call.stages[completed.id];
    if (!line) return;
    const tag = completed.mode === 'kernel' ? 'kern ' : completed.mode === 'boundary' ? 'gate ' : 'user ';
    setTrace((lines) => [...lines, `${tag}→ ${line}`]);
    if (stage === SYSCALL_STAGES.length) {
      setTrace((lines) => [...lines, `user  ← ${call.result}  ✓ returned to ring 3`]);
    }
  }, [stage, call]);

  const reset = () => {
    clearTimeout(timer.current);
    setCallId(null);
    setStage(-1);
    setTrace([]);
  };

  return (
    <>
      <ModuleSummary>
        Applications run in <b>user mode</b> (ring 3) where privileged hardware access is forbidden. When a program
        needs the disk, the clock or a new process, it performs a <b>system call</b>: the CPU <i>traps</i> into{' '}
        <b>kernel mode</b> (ring 0), the kernel does the work on its behalf, and returns a result.{' '}
        <i>Analogy: a system call is like asking a secured service desk to fetch something from a protected room — you
        never enter the room yourself.</i>
      </ModuleSummary>

      {/* The two regions */}
      <div className="sys-regions" role="img" aria-label="User mode and kernel mode regions">
        <div className="sys-region user">
          <div className="sys-region-kicker">Ring 3 · unprivileged</div>
          <strong style={{ color: 'var(--cyan)' }}>User Mode</strong>
          <p className="muted" style={{ marginTop: 6, fontSize: 'var(--fs-10)' }}>
            Your application. Can compute freely, but every hardware resource — disk, network, memory map, devices —
            is off-limits.
          </p>
        </div>
        <div className="sys-region kernel-side">
          <div className="sys-region-kicker">Ring 0 · privileged</div>
          <strong style={{ color: 'var(--sky)' }}>Kernel Mode</strong>
          <p className="muted" style={{ marginTop: 6, fontSize: 'var(--fs-10)' }}>
            The trusted core. Validates every request, executes the privileged instruction, and owns all shared
            resources.
          </p>
        </div>
      </div>

      {/* Call picker */}
      <div className="control-row">
        {SYSTEM_CALLS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="btn"
            style={callId === entry.id ? { borderColor: entry.tint, color: entry.tint } : undefined}
            onClick={() => dispatch(entry)}
            disabled={running}
          >
            {entry.name}
          </button>
        ))}
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {/* Journey stops */}
      <div>
        <div className="sub-heading">Journey of one system call {call ? `— ${call.name}` : ''}</div>
        <div className="sys-journey" aria-live="polite">
          {SYSCALL_STAGES.map((entry, index) => {
            const state = stage < 0 ? 'idle' : index < stage ? 'done' : index === stage ? 'current' : 'upcoming';
            return (
              <div
                key={entry.id}
                className={[
                  'sys-stop',
                  state === 'done' && 'is-done',
                  state === 'current' && 'is-current'
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="stop-idx">
                  {state === 'done' ? '✓' : index === stage ? '▶' : index + 1}
                </span>
                <div>
                  <div className="stop-name">
                    {entry.label}
                    <span className="chip" style={{ marginLeft: 8 }}>
                      {entry.mode}
                    </span>
                  </div>
                  {call && state !== 'upcoming' && (
                    <div className="stop-detail">{call.stages[entry.id]}</div>
                  )}
                  {state === 'upcoming' && (
                    <div className="stop-detail" style={{ opacity: 0.55 }}>waiting…</div>
                  )}
                </div>
                {index === 1 && (
                  <ArrowDown size={12} aria-hidden style={{ position: 'absolute', left: 4 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Kernel trace */}
      {trace.length > 0 && (
        <div>
          <div className="sub-heading">Kernel trace</div>
          <div className="sys-trace" aria-live="polite">
            {trace.map((line, index) => (
              <div key={index} className={line.includes('✓') ? 't-ok' : line.startsWith('mode') ? 't-mode' : ''}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why protection exists */}
      <div className="note is-warn">
        <span className="note-title">Why hardware access is protected</span>
        If any program could write to the disk controller directly, one bug (or one virus) could destroy every other
        program's data. The kernel is the single, carefully tested gatekeeper: it validates arguments, checks
        permissions, serialises access to shared devices, and confines damage. That is the entire reason the
        user/kernel boundary exists.
      </div>

      <Learned>
        A system call is the <b>only</b> doorway from user code to protected resources. The CPU switches privilege
        rings via a trap, the kernel validates and executes, then switches back. <b>open()</b> returns a file
        descriptor, <b>read()/write()</b> move bytes, <b>createProcess()</b> builds a whole new PCB — and every one of
        them crosses this same gateway.
      </Learned>
    </>
  );
}
