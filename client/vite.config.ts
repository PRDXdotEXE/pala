/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    // Set VITE_API_PROXY inside containers (docker-compose points it at the
    // server service); the default matches the local `npm run dev` setup.
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3001',
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
