import { useMemo } from 'react';
import { Play } from 'lucide-react';
import { KERNEL_CORE, ZONES } from '../data/zones.js';
import { createRandom, range } from '../utils/random.js';

/**
 * The OSMOS constellation.
 *
 * ── Why there is no WebGL here ───────────────────────────────────────────
 * This project originally rendered the zone map with three.js. A measurement
 * across device classes put it at 4fps with the scene mounted and 60fps with
 * it hidden: the entire sluggishness was the GPU canvas, not the UI. The scene
 * is now built from plain positioned elements, which removed roughly 310 KB of
 * gzipped JavaScript and every draw call with it.
 *
 * ── How the 3D is faked, and why ─────────────────────────────────────────
 * The first CSS attempt used a real perspective stage with nested
 * `preserve-3d` transforms. That is genuinely hard to get right: a child that
 * counter-rotates to face the viewer also flattens its own 3D context, and the
 * ring collapsed into an unreadable cluster.
 *
 * So the orbit is solved directly with trigonometry instead. Each zone sits at
 * a known angle on an ellipse; the ellipse's vertical squash reads as a tilt,
 * and the sine of that angle becomes the node's depth. Depth then drives scale,
 * brightness and stacking order. It is predictable, it costs one layout pass,
 * and it cannot collapse.
 *
 * Everything here is static apart from short hover/focus transitions — see the
 * header of constellation.css for the measurement behind that decision.
 */

/** Vertical squash of the orbit ellipse. Lower reads as a flatter tilt. */
const SQUASH = 0.44;

/**
 * Places a node on the orbit for a given angle.
 * Returns the percentages and the depth (1 = nearest the viewer, -1 = furthest).
 */
function placeOnRing(angleDeg, radius = 50) {
  const radians = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    left: 50 + cos * radius,
    // +sin pushes the node toward the bottom of the screen, so sin > 0 means
    // "in front of" the kernel — which is also nearer the viewer.
    top: 50 + sin * radius * SQUASH,
    depth: sin
  };
}

/** Deterministic star field, placed once and never animated. */
function useStars(count) {
  return useMemo(() => {
    const random = createRandom(11);
    return Array.from({ length: count }, (_, index) => ({
      id: index,
      left: range(random, 0, 100),
      top: range(random, 0, 100),
      size: range(random, 1, 2.4),
      opacity: range(random, 0.12, 0.46)
    }));
  }, [count]);
}

export default function Constellation({ activeZoneId, onSelectZone, isCompact }) {
  const starCount = isCompact ? 20 : 34;
  const stars = useStars(starCount);
  const total = ZONES.length;

  return (
    <div className={`constellation${activeZoneId ? ' has-focus' : ''}`} role="group" aria-label="OSMOS zone map">
      <div className="sky" aria-hidden>
        {stars.map((star) => (
          <i
            key={star.id}
            className="mote"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity
            }}
          />
        ))}
      </div>

      {/* Everything below is positioned inside .stage, so the node percentages
          resolve against the orbit box rather than the whole viewport. */}
      <div className="stage">
        <div className="orbit" aria-hidden>
          {/* Two concentric rings read as an orbit plane rather than a circle. */}
          <span className="orbit-ring orbit-ring-outer" />
          <span className="orbit-ring orbit-ring-inner" />
        </div>

        {ZONES.map((zone, index) => {
          // Offset by -90° so the first zone sits at the front of the ellipse.
          const angle = (360 / total) * index - 90;
          const { left, top, depth } = placeOnRing(angle);
          const active = activeZoneId === zone.id;
          const dimmed = Boolean(activeZoneId) && !active;

          return (
            <div
              key={zone.id}
              className="node-slot"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                // Nearer nodes scale up and sit above farther ones.
                '--depth': depth.toFixed(3),
                '--depth-pct': `${Math.round((depth + 1) * 50)}%`,
                zIndex: 10 + Math.round((depth + 1) * 10)
              }}
            >
              {/* Beam runs from the kernel out to the node. */}
              <span className="beam" style={{ '--tilt': `${(angle + 90) * SQUASH}deg` }} aria-hidden />

              <button
                type="button"
                className={`zone-node${active ? ' is-active' : ''}${dimmed ? ' is-dimmed' : ''}`}
                onClick={() => onSelectZone(zone.id)}
                aria-label={`Open ${zone.label}`}
                aria-pressed={active}
              >
                <span className="node-core" aria-hidden />
                <span className="node-label">
                  <span className="node-label-code">{zone.code}</span>
                  <span className="node-label-text">{zone.label}</span>
                  <Play size={10} strokeWidth={2.6} aria-hidden />
                </span>
              </button>
            </div>
          );
        })}

        {/* Kernel core, dead centre of the orbit. */}
        <div className="kernel" style={{ '--zone-color': KERNEL_CORE.color }}>
          <span className="kernel-halo" aria-hidden />
          <span className="kernel-ring kernel-ring-a" aria-hidden />
          <span className="kernel-ring kernel-ring-b" aria-hidden />
          <span className="kernel-ring kernel-ring-c" aria-hidden />
          <span className="kernel-shell" aria-hidden />
          <span className="kernel-name">{KERNEL_CORE.label}</span>
        </div>
      </div>
    </div>
  );
}
