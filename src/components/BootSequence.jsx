import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const BOOT_LINES = [
  { text: 'OSMOS bootloader v1.0 — detecting hardware', ms: 0 },
  { text: 'Loading kernel modules...', ms: 420 },
  { text: 'Mounting virtual file system...', ms: 980 },
  { text: 'Initializing memory map...', ms: 1560 },
  { text: 'Starting process scheduler...', ms: 2140 },
  { text: 'Verifying privilege rings (0/1/3)...', ms: 2640 },
  { text: 'Entering OSMOS...', ms: 3080 }
];

const TOTAL_MS = 3600;

/**
 * A short, honest boot screen: real staged messages, a progress bar and a
 * Skip button. 2–4 s total, never blocking longer than the user allows.
 */
export default function BootSequence({ onDone }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);

  useEffect(() => {
    let raf;
    const tick = (now) => {
      if (!startRef.current) startRef.current = now;
      const delta = now - startRef.current;
      setElapsed(delta);
      if (delta < TOTAL_MS) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  const visible = BOOT_LINES.filter((line) => line.ms <= elapsed);
  const progress = Math.min(1, elapsed / TOTAL_MS);

  return (
    <div className="boot" role="status" aria-label="OSMOS is starting">
      <div className="boot-inner">
        <div className="boot-head">
          <span className="boot-title">OSMOS</span>
          <span className="boot-sub">Operating System Model &amp; Observation Space</span>
        </div>

        <ul className="boot-lines">
          {visible.map((line, index) => (
            <li key={line.text} style={{ animationDelay: `${index * 12}ms` }}>
              <time>[{String((line.ms / 1000).toFixed(2)).padStart(5, '0')}]</time>
              <span>{line.text}</span>
              <span className="status" aria-hidden>
                ok
              </span>
            </li>
          ))}
        </ul>

        <div className="boot-progress" aria-hidden>
          <i style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="boot-actions">
          <span className="muted mono" style={{ fontSize: 'var(--fs-9)' }}>
            {progress < 1 ? 'warming up the kernel…' : 'handing over to the observation deck…'}
          </span>
          <button type="button" className="btn boot-skip" onClick={() => onDone()}>
            Skip intro <ChevronRight size={13} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
