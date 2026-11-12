import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET = process.env.VITE_DEV_API_TARGET || 'http://localhost:4001'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    viteReact(),
  ],
  server: {
    port: 3000,
    host: true,
    // Mirror the production setup (vercel.json proxies the same paths) so the
    // app always talks to the API on its own origin - first-party cookies,
    // no CORS preflight.
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
      '/uploads': { target: API_TARGET, changeOrigin: true },
    },
  },
})
