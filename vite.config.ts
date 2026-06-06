import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// On GitHub Pages the app is served from /clicker-coin-configurator/, but local
// dev stays at the root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/clicker-coin-configurator/' : '/',
  plugins: [svelte()],
  server: { host: true },
}))
