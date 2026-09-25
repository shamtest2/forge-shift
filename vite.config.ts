import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 4173, strictPort: true, allowedHosts: ['.e2b.app'] },
  preview: { host: '0.0.0.0', port: 4174, strictPort: true, allowedHosts: ['.e2b.app'] },
});
