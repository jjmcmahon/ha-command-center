import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3030,
    proxy: {
      '/api/websocket': {
        target: 'ws://192.168.1.190:8123',
        ws: true,
      },
    },
  },
});
