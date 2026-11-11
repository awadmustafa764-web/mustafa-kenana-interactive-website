import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset URLs: the build works at any sub-path, e.g. GitHub Pages
  // project sites served from https://<user>.github.io/<repository>/
  base: './',
  server: { port: 5173, host: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
