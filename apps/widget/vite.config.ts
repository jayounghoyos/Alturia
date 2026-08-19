import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Library mode: bundles to a single self-contained widget.js (IIFE) meant to be
// loaded via a plain <script> tag on a host page — no bundler on their end, so
// React/ReactDOM must be bundled in, not left as external peer deps.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // React/ReactDOM reference process.env.NODE_ENV internally for dev-mode
  // warnings. Vite auto-replaces this in normal app builds, but not
  // reliably in `build.lib` IIFE output — left unreplaced, it throws
  // "process is not defined" at runtime since browsers have no `process`
  // global. Defining it as a literal here lets esbuild dead-code-eliminate
  // those branches instead of leaving a runtime reference.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  build: {
    cssCodeSplit: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/main.tsx'),
      name: 'AlturiaWidget',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
  },
  server: {
    port: 5174,
  },
}))
