import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    port: 5173,
    // dev proxy to the node app; the Host header must match DASHBOARD_DOMAIN for host dispatch
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
        headers: { Host: process.env.DASHBOARD_DOMAIN ?? 'localhost' },
      },
    },
  },
})
