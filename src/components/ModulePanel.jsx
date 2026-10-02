import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, RotateCcw } from 'lucide-react';

/**
 * The learning-module surface.
 *
 * Responsive contract:
 *   phones      → a near-full-height sheet sliding UP from the bottom, with a
 *                 visible drag handle, header buttons inside the safe-area
 *                 inset, and the Reset action pinned above the home indicator
 *   everything  → a drawer sliding IN from the right
 *
 * Both are real <section role="dialog" aria-modal> surfaces: focus moves to the
 * close button on open, Tab is trapped inside, Escape closes, and the page
 * behind cannot scroll while the panel owns the screen.
 */

/** Elements that can receive focus, used for the focus trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ModulePanel({ zone, onClose, onReset, resetLabel = 'Reset simulation', isSheet, children }) {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  // Remember what was focused so it can be handed back on close.
  useEffect(() => {
    if (!zone) return undefined;
    restoreFocusRef.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      const target = restoreFocusRef.current;
      if (target instanceof HTMLElement && document.contains(target)) target.focus();
    };
  }, [zone?.id]);

  useEffect(() => {
    if (!zone) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null
      );
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zone, onClose]);

  // Stop the constellation behind the panel from eating wheel/touch gestures.
  useEffect(() => {
    if (!zone) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [zone]);

  const enter = isSheet ? { y: '102%' } : { x: '102%' };
  const exit = isSheet ? { y: '102%' } : { x: '102%' };

  return (
    <AnimatePresence>
      {zone && (
        <>
          <motion.div
            className="panel-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.section
            ref={panelRef}
            className={`module-panel${zone.wide ? ' wide' : ''}${isSheet ? ' is-sheet' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={`${zone.label} module`}
            initial={enter}
            animate={{ x: 0, y: 0 }}
            exit={exit}
            transition={{ type: 'tween', duration: 0.32, ease: [0.22, 0.9, 0.3, 1] }}
            // A sheet is a full-screen surface; there is no backdrop to click
            // through, so Back must always be present and visible.
            data-sheet={isSheet ? 'true' : undefined}
          >
            {isSheet && <div className="sheet-grip" aria-hidden />}

            <header className="module-head">
              <button type="button" className="btn btn-ghost" onClick={onClose} ref={closeRef}>
                <ChevronLeft size={14} aria-hidden /> Back
              </button>
              <h2>
                <span className="head-swatch" style={{ background: zone.color }} aria-hidden />
                {zone.label}
              </h2>
              <span className="module-head-code">{zone.code}</span>
            </header>

            <div className="module-body">{children}</div>

            <footer className="module-foot">
              <button type="button" className="btn" onClick={onReset}>
                <RotateCcw size={13} aria-hidden /> {resetLabel}
              </button>
            </footer>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
