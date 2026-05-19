import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  plugins: [react()],
  // Only use /sine-app/ base when building for GitHub Pages
  base: mode === 'github' ? '/sine-app/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true }
    }
  },
}))
