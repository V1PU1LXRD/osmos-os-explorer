import { useEffect } from 'react';
import { Cpu } from 'lucide-react';
import { KERNEL_CORE, ZONES, COLOR_SEMANTICS } from '../data/zones.js';

/**
 * Left rail: the accessible mirror of the constellation.
 *
 * Responsive contract:
 *   wide screens  → a permanent sidebar, always in the tab order
 *   small screens → an off-canvas drawer toggled from the top bar
 *
 * On phones the colour legend and kernel note would push the six zone buttons
 * off-screen, so those two cards collapse behind a disclosure while the zone
 * list — the part that matters — stays visible.
 */
export default function StatusRail({ activeZoneId, onSelectZone, isDrawer, isOpen, onClose, showDetails }) {
  // Escape closes the drawer; the tab key must not escape a modal surface.
  useEffect(() => {
    if (!isDrawer || !isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawer, isOpen, onClose]);

  return (
    <>
      {isDrawer && isOpen && <div className="rail-scrim" onClick={onClose} aria-hidden />}

      <nav
        id="osmos-rail"
        className={`rail${isOpen ? ' is-open' : ''}`}
        aria-label="OS zones"
        aria-hidden={isDrawer && !isOpen ? 'true' : undefined}
        // Keep the closed drawer out of the tab order without unmounting it,
        // so opening it does not lose the user's place.
        {...(isDrawer && !isOpen ? { inert: '' } : {})}
      >
        <div className="rail-section">
          <div className="rail-title">
            <span>Observation zones</span>
            <Cpu size={12} aria-hidden />
          </div>
          <ul className="zone-list">
            {ZONES.map((zone) => (
              <li key={zone.id}>
                <button
                  type="button"
                  className={`zone-row${activeZoneId === zone.id ? ' is-active' : ''}`}
                  onClick={() => {
                    onSelectZone(zone.id);
                    if (isDrawer) onClose?.();
                  }}
                  aria-current={activeZoneId === zone.id ? 'true' : undefined}
                >
                  <span className="zone-dot" style={{ background: zone.color }} aria-hidden />
                  <span className="zone-row-label">{zone.label}</span>
                  <span className="zone-row-code">{zone.code}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {showDetails && (
          <>
            <div className="rail-section">
              <div className="rail-title">
                <span>Colour code</span>
              </div>
              <div className="legend">
                {COLOR_SEMANTICS.map((entry) => (
                  <div key={entry.label} className="legend-row">
                    <span className="legend-swatch" style={{ background: entry.color }} aria-hidden />
                    <span>
                      <b>{entry.label}</b> · {entry.hint}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rail-section">
              <div className="rail-title">
                <span>Kernel core</span>
              </div>
              <p className="kernel-note">
                <b>{KERNEL_CORE.label}</b> — {KERNEL_CORE.short} Every zone talks to it through a system call;
                nothing touches hardware directly.
              </p>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
