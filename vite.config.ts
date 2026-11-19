import { defineConfig } from 'vite'

export default defineConfig({
  envPrefix: 'VOICE_TAKE_PUBLIC_',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
