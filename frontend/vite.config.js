import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages base: repo is `gomasak`. Env-driven so CI can override.
// Default '/gomasak/' works for Pages; Vite dev server serves it fine locally.
export default defineConfig({
  base: process.env.VITE_BASE || '/gomasak/',
  plugins: [vue()],
})
