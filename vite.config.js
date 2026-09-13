import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo-name>/, so assets need that
// prefix at build time. Override per-deploy with:  VITE_BASE=/my-repo/ npm run build
// For a user/org site (username.github.io) set VITE_BASE=/
const base = process.env.VITE_BASE ?? '/kaylas-dwts-ledger/'

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
