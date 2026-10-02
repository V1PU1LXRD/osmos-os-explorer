import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import TopBar from './components/TopBar.jsx';
import StatusRail from './components/StatusRail.jsx';
import ZoneBrief from './components/ZoneBrief.jsx';
import ModulePanel from './components/ModulePanel.jsx';
import ModuleMenu from './components/ModuleMenu.jsx';
import KnowledgeCheck from './components/KnowledgeCheck.jsx';
import AboutPanel from './components/AboutPanel.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import BootSequence from './components/BootSequence.jsx';
import ModuleContent from './modules/ModuleContent.jsx';
import { ZONE_BY_ID, ZONES } from './data/zones.js';
import { useReducedMotion } from './utils/useReducedMotion.js';
import { useViewport } from './utils/useViewport.js';

// The constellation is code-split so the boot screen and shell paint first.
const Constellation = lazy(() => import('./scene/Constellation.jsx'));

const RESET_LABELS = {
  process: 'Reset lifecycle',
  scheduler: 'Reset scheduler',
  memory: 'Reset memory',
  deadlock: 'Reset graph',
  filesystem: 'Restore file system',
  syscall: 'Reset gateway'
};

export default function App() {
  const [booted, setBooted] = useState(false);
  const [activeZoneId, setActiveZoneId] = useState(null); // zone the ring focuses
  const [openZoneId, setOpenZoneId] = useState(null); // zone whose panel is open
  const [briefZoneId, setBriefZoneId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);
  const [railOpen, setRailOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const viewport = useViewport();

  // Below the lg breakpoint the rail is an overlay drawer, the module panel is a
  // bottom sheet, and the rail's secondary cards collapse.
  const railIsDrawer = viewport.width < 1024;
  const panelIsSheet = viewport.width < 700;
  const railShowDetails = !viewport.isPhone;

  const openZone = ZONE_BY_ID[openZoneId] || null;
  const briefZone = ZONE_BY_ID[briefZoneId] || null;

  const focusZone = useCallback((zoneId) => {
    setActiveZoneId(zoneId);
    setBriefZoneId(zoneId);
  }, []);

  const openModule = useCallback((zoneId) => {
    setOpenZoneId(zoneId);
    setPanelKey((key) => key + 1); // remount module → fresh simulation state
    setMenuOpen(false);
  }, []);

  const closeModule = useCallback(() => {
    setOpenZoneId(null);
    setPanelKey((key) => key + 1);
  }, []);

  // "Reset view" clears the focus so the ring returns to its neutral orbit.
  const resetView = useCallback(() => {
    setActiveZoneId(null);
    setBriefZoneId(null);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Growing past the drawer breakpoint must not leave an invisible scrim up.
  useEffect(() => {
    if (!railIsDrawer) setRailOpen(false);
  }, [railIsDrawer]);

  // Escape closes the rail drawer before it can swallow panel-level intent.
  useEffect(() => {
    if (!railOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setRailOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [railOpen]);

  // Keyboard shortcuts: 1–6 open zones, R resets view. Bound unconditionally —
  // a device with no keyboard never fires these events, and a touchscreen
  // laptop keeps both its keyboard and its trackpad.
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable]')) return;

      const index = Number(event.key);
      if (index >= 1 && index <= ZONES.length) {
        event.preventDefault();
        focusZone(ZONES[index - 1].id);
        openModule(ZONES[index - 1].id);
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusZone, openModule, resetView]);

  const resetLabel = openZone ? RESET_LABELS[openZone.id] || 'Reset simulation' : 'Reset simulation';

  return (
    <div className="app">
      {!booted && <BootSequence onDone={() => setBooted(true)} />}

      <div className="scene-holder" aria-hidden={!booted}>
        <ErrorBoundary
          fallback={
            <div className="scene-fallback">
              <p>
                The zone map could not be drawn on this device. Every module below is still fully interactive — open one
                from the <b>Modules</b> menu.
              </p>
            </div>
          }
        >
          <Suspense fallback={null}>
            <Constellation activeZoneId={activeZoneId} onSelectZone={focusZone} isCompact={viewport.isPhone} />
          </Suspense>
        </ErrorBoundary>
      </div>

      {booted && (
        <>
          <TopBar
            onResetView={resetView}
            onOpenQuiz={() => setQuizOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
            onToggleFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            onOpenMenu={() => setMenuOpen(true)}
            onToggleRail={() => setRailOpen((open) => !open)}
            isRailOpen={railOpen}
          />

          <StatusRail
            activeZoneId={activeZoneId}
            onSelectZone={focusZone}
            isDrawer={railIsDrawer}
            isOpen={!railIsDrawer || railOpen}
            onClose={() => setRailOpen(false)}
            showDetails={railShowDetails}
          />

          {briefZone && !openZone && (
            <ZoneBrief
              zoneId={briefZone.id}
              onOpen={openModule}
              onDismiss={() => setBriefZoneId(null)}
            />
          )}

          <div className="view-hud">
            <span className="hint">
              {viewport.isTouch ? 'tap a zone to open it' : '1–6 open zones · R reset focus'}
            </span>
            <button type="button" className="btn btn-sm" onClick={resetView}>
              Reset focus
            </button>
          </div>
        </>
      )}

      <ModulePanel
        key={panelKey}
        zone={openZone}
        onClose={closeModule}
        onReset={() => setPanelKey((key) => key + 1)}
        resetLabel={resetLabel}
        isSheet={panelIsSheet}
      >
        {openZone && <ModuleContent zoneId={openZone.id} />}
      </ModulePanel>

      {menuOpen && (
        <ModuleMenu
          onClose={() => setMenuOpen(false)}
          onPick={(zoneId) => {
            focusZone(zoneId);
            openModule(zoneId);
          }}
        />
      )}

      {quizOpen && <KnowledgeCheck onClose={() => setQuizOpen(false)} />}
      {aboutOpen && <AboutPanel onClose={() => setAboutOpen(false)} />}

      {/* Announce reduced-motion mode for anyone wondering why it is calm */}
      {reducedMotion && (
        <span className="sr-only" role="status">
          Reduced motion mode is active: transitions and pulses are minimised.
        </span>
      )}
    </div>
  );
}
