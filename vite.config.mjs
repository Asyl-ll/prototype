import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  build: {
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        database: resolve(import.meta.dirname, 'database.html')
      }
    }
  }
});
