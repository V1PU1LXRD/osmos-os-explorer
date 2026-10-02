import { lazy, Suspense } from 'react';
import { Spinner } from './shared/ModuleBits.jsx';

const ProcessLab = lazy(() => import('./ProcessLab/ProcessLab.jsx'));
const CpuScheduler = lazy(() => import('./CpuScheduler/CpuScheduler.jsx'));
const MemoryMatrix = lazy(() => import('./MemoryMatrix/MemoryMatrix.jsx'));
const DeadlockObservatory = lazy(() => import('./DeadlockObservatory/DeadlockObservatory.jsx'));
const FileSystemVault = lazy(() => import('./FileSystemVault/FileSystemVault.jsx'));
const SystemCallGateway = lazy(() => import('./SystemCallGateway/SystemCallGateway.jsx'));

/** Simple loading fallback while a module chunk downloads. */
function ModuleSuspense({ children }) {
  return <Suspense fallback={<Spinner label="Loading module…" />}>{children}</Suspense>;
}

/**
 * Maps a zone id to its learning module. Each module is code-split, so the
 * first paint only carries the shell — the heavy parts arrive on demand.
 */
export default function ModuleContent({ zoneId }) {
  switch (zoneId) {
    case 'process':
      return (
        <ModuleSuspense>
          <ProcessLab />
        </ModuleSuspense>
      );
    case 'scheduler':
      return (
        <ModuleSuspense>
          <CpuScheduler />
        </ModuleSuspense>
      );
    case 'memory':
      return (
        <ModuleSuspense>
          <MemoryMatrix />
        </ModuleSuspense>
      );
    case 'deadlock':
      return (
        <ModuleSuspense>
          <DeadlockObservatory />
        </ModuleSuspense>
      );
    case 'filesystem':
      return (
        <ModuleSuspense>
          <FileSystemVault />
        </ModuleSuspense>
      );
    case 'syscall':
      return (
        <ModuleSuspense>
          <SystemCallGateway />
        </ModuleSuspense>
      );
    default:
      return null;
  }
}
