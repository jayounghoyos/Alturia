import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite only reads .env from its own project root by default — the repo's
  // single source of truth lives two levels up (see apps/api/.env, which
  // symlinks there for the same reason).
  envDir: resolve(import.meta.dirname, '../..'),
  server: {
    port: 5173,
  },
})
