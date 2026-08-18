import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// Library mode: bundles to a single self-contained widget.js (IIFE) meant to be
// loaded via a plain <script> tag on a host page — no bundler on their end, so
// React/ReactDOM must be bundled in, not left as external peer deps.
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
