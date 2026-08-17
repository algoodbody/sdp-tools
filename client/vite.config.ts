import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        // Forwards the browser's real origin (localhost:5173) via X-Forwarded-* headers so the
        // server can build OAuth redirect/callback URLs that point back at the Vite dev server
        // instead of its own :4000 origin.
        xfwd: true
      }
    }
  }
});
