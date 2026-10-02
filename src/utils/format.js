/** Small formatting + class-name helpers shared by the UI. */

/** Joins truthy class names: cx('a', cond && 'b') → "a b". */
export function cx(...values) {
  return values.filter(Boolean).join(' ');
}

/** 120 → "120 KB", 1024 → "1,024 KB". */
export function kb(value) {
  return `${value.toLocaleString('en-US')} KB`;
}

/** Byte sizes for the file explorer. */
export function bytes(value) {
  if (!Number.isFinite(value)) return '—';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

/** Two decimal places, but no trailing ".00" noise on whole numbers. */
export function num(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(digits);
  return fixed.endsWith('.00') ? String(Math.round(value)) : fixed;
}

/** 0.556 → "55.6%" */
export function percent(value, digits = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

/** Clamps a number into a range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
