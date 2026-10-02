import { ZONES } from '../data/zones.js';

/**
 * Module picker — the keyboard-first way into any zone, also shown on
 * small screens where the constellation is hidden.
 */
export default function ModuleMenu({ onClose, onPick }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="All modules" onClick={onClose}>
      <div className="overlay-card" onClick={(event) => event.stopPropagation()}>
        <header className="overlay-head">
          <div>
            <span className="overlay-kicker">Observation zones</span>
            <h2>Six ways into the machine</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="overlay-body">
          <div className="fallback-grid" style={{ width: '100%' }}>
            {ZONES.map((zone) => (
              <button
                key={zone.id}
                type="button"
                className="fallback-card"
                style={{ '--zone-color': zone.color }}
                onClick={() => onPick(zone.id)}
              >
                <span className="fc-code">{zone.code}</span>
                <h3>{zone.label}</h3>
                <p>{zone.short}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
