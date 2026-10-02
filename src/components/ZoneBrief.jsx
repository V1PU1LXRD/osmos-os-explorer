import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X } from 'lucide-react';
import { ZONE_BY_ID } from '../data/zones.js';

/**
 * Bottom-left card describing the hovered/selected zone, with a clear
 * "Open module" action. AnimatePresence keeps transitions smooth.
 */
export default function ZoneBrief({ zoneId, onOpen, onDismiss }) {
  const zone = ZONE_BY_ID[zoneId];

  return (
    <AnimatePresence mode="wait">
      {zone && (
        <motion.aside
          key={zone.id}
          className="zone-brief"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          aria-live="polite"
        >
          <div className="zone-brief-code" style={{ color: zone.color }}>
            {zone.code} · {zone.short}
          </div>
          <div className="zone-brief-title">
            <h3>{zone.label}</h3>
            <button type="button" className="btn btn-ghost btn-icon" onClick={onDismiss} aria-label="Dismiss description">
              <X size={14} aria-hidden />
            </button>
          </div>
          <p>{zone.description}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn btn-accent" onClick={() => onOpen(zone.id)}>
              Open module <ArrowRight size={13} aria-hidden />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
