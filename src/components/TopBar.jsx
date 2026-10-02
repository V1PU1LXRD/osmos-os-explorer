import { Compass, GraduationCap, Info, Maximize2, Minimize2, PanelLeft } from 'lucide-react';
import { projectConfig } from '../config/projectConfig.js';

/**
 * Top command bar.
 *
 * Responsive contract: below 700px the visible text of each action collapses
 * and CSS swaps to icon-only buttons — but the accessible name always stays on
 * the element via aria-label, so the bar is never unlabelled to a screen
 * reader or to a voice-control user. Icons are decorative and hidden.
 *
 * The rail toggle appears only where the rail is a drawer (see app.css).
 */
export default function TopBar({
  onResetView,
  onOpenQuiz,
  onOpenAbout,
  onToggleFullscreen,
  isFullscreen,
  onOpenMenu,
  onToggleRail,
  isRailOpen
}) {
  const actions = [
    { key: 'menu', label: 'Modules', icon: Compass, onClick: onOpenMenu },
    { key: 'reset', label: 'Reset view', icon: Maximize2, onClick: onResetView },
    { key: 'quiz', label: 'Knowledge check', icon: GraduationCap, onClick: onOpenQuiz },
    { key: 'about', label: 'About', icon: Info, onClick: onOpenAbout }
  ];

  return (
    <header className="topbar">
      {onToggleRail && (
        <button
          type="button"
          className="btn btn-sm btn-icon topbar-rail-toggle"
          onClick={onToggleRail}
          aria-label={isRailOpen ? 'Close zone list' : 'Open zone list'}
          aria-expanded={Boolean(isRailOpen)}
          aria-controls="osmos-rail"
          title={isRailOpen ? 'Close zone list' : 'Open zone list'}
        >
          <PanelLeft size={14} aria-hidden />
        </button>
      )}

      <div className="brand">
        <span className="brand-mark">{projectConfig.name}</span>
        <span className="brand-sub">{projectConfig.fullName}</span>
      </div>

      <div className="topbar-spacer" />

      {actions.map(({ key, label, icon: Icon, onClick }) => (
        <button key={key} type="button" className="btn btn-sm" onClick={onClick} aria-label={label} title={label}>
          <Icon size={13} aria-hidden />
          <span className="btn-label">{label}</span>
        </button>
      ))}

      {/* Fullscreen is meaningless on iOS Safari, so it is dropped there. */}
      {typeof document !== 'undefined' && document.fullscreenEnabled && (
        <button
          type="button"
          className="btn btn-sm btn-icon"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={13} aria-hidden /> : <Maximize2 size={13} aria-hidden />}
        </button>
      )}
    </header>
  );
}
