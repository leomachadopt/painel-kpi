/* Vite config for building the frontend react app: https://vite.dev/config/ */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Dev: proxy /api -> backend (server/index.ts defaults to :3001)
  // If you set VITE_API_URL="http://localhost:3001/api", we still proxy to the same target.
  const apiTarget = (env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '')

  return {
    server: {
      host: '::',
      port: 8080,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  experimental: {
    enableNativePlugin: true
  },
  build: {
    minify: mode !== 'development',
    sourcemap: mode === 'development',
    rolldownOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
          return
        }
        warn(warning)
      },
    },
  },
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode ?? process.env.NODE_ENV ?? 'production'),
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
      {
        find: /zod\/v4\/core/,
        replacement: path.resolve(__dirname, 'node_modules', 'zod', 'v4', 'core'),
      }
    ],
  },
  }
})
