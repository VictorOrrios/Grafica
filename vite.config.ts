import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  esbuild: {
    target: 'esnext'
  },
  server: {
    hmr: true,
    watch: {
      usePolling: true
    }
  }
})