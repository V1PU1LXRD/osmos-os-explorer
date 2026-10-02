import { BookOpen, GraduationCap, LoaderCircle } from 'lucide-react';

/** Concept explanation block at the top of each module. */
export function ModuleSummary({ children }) {
  return (
    <div className="note">
      <span className="note-title">
        <BookOpen size={11} aria-hidden /> Concept
      </span>
      {children}
    </div>
  );
}

/** "What you learned" block — rendered in the module body, per the brief. */
export function Learned({ children }) {
  return (
    <div className="note is-ok">
      <span className="note-title">
        <GraduationCap size={11} aria-hidden /> What you learned
      </span>
      {children}
    </div>
  );
}

/** Tiny inline spinner for lazy module chunks. */
export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="center-note" role="status" aria-live="polite">
      <LoaderCircle size={16} aria-hidden style={{ animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: 8 }}>{label}</div>
    </div>
  );
}

/** Status chip with explicit text (never colour alone). */
export function StatusChip({ tone = 'neutral', children }) {
  const labels = {
    neutral: 'chip',
    good: 'chip is-good',
    warn: 'chip is-warn',
    bad: 'chip is-bad'
  };
  return <span className={labels[tone] || labels.neutral}>{children}</span>;
}
