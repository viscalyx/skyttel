import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist/client' },
  server: {
    proxy: {
      '/api': process.env.SKYTTEL_PROTOTYPE_API_ORIGIN ?? 'http://127.0.0.1:3300',
      '/healthz': process.env.SKYTTEL_PROTOTYPE_API_ORIGIN ?? 'http://127.0.0.1:3300',
    },
  },
});
