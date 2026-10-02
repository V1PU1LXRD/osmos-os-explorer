import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { projectConfig } from './src/config/projectConfig.js';

/**
 * GitHub Pages serves a project site from https://<user>.github.io/<repo>/,
 * so every generated asset URL needs the repository name as a prefix.
 * Change `basePath` in src/config/projectConfig.js (one place) if you rename
 * the repository, or pass `--base=/` on the command line to override it.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? projectConfig.basePath : '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Nothing is minified-away-empty, and the whole app now fits in one small
    // bundle, so a tight limit keeps an accidental regression visible.
    chunkSizeWarningLimit: 320,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Framer Motion is the only vendor chunk worth isolating: it is used by
        // the panel and overlay transitions only, so the boot screen and the
        // zone map can render without waiting on it.
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion')) {
            return 'motion-vendor';
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    open: false
  }
}));
