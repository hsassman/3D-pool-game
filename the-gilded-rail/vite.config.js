import { defineConfig } from 'vite';

// The engine currently runs as ordered global-scope scripts (see index.html),
// so no bundling of the engine is required for dev — Vite just serves the files.
// When you migrate the engine to ES modules, switch the <script> tags in
// index.html to type="module" and Vite will bundle them automatically.
export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: { port: 5173, open: true },
  build: { outDir: 'dist-vite' }
});
