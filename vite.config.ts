import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base so the same build works at the site root and at
  // https://dadapy04.github.io/squeek/ without rewriting save keys.
  base: './',
  server: { host: '0.0.0.0', port: 47331, strictPort: true },
  preview: { host: '0.0.0.0', port: 47332, strictPort: true },
  build: {
    sourcemap: false,
    target: 'es2023',
    rolldownOptions: {
      input: {
        main: resolve('index.html'),
        arena: resolve('arena.html'),
        rpg: resolve('rpg.html'),
        legacy: resolve('legacy.html'),
      },
    },
  },
})
