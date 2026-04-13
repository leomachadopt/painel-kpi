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
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
              console.log('Headers:', req.headers);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
    experimental: {
      enableNativePlugin: true
    },
    build: {
      minify: mode !== 'development',
      sourcemap: mode === 'development',
      rollupOptions: {
        output: {
          manualChunks: {
            // React core
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],

            // UI libraries - Radix UI components
            'vendor-radix': [
              '@radix-ui/react-accordion',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-avatar',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-label',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-switch',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
            ],

            // Charts
            'vendor-charts': ['recharts'],

            // Forms
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

            // Data fetching
            'vendor-query': ['@tanstack/react-query'],

            // PDF generation (only loaded when needed)
            'vendor-pdf': ['jspdf', 'jspdf-autotable'],

            // Excel generation (only loaded when needed)
            'vendor-excel': ['xlsx', 'xlsx-js-style', 'exceljs'],

            // OCR and PDF parsing (heavy - only loaded when needed)
            'vendor-ocr': ['tesseract.js', 'pdf-parse', 'pdf2pic', 'pdf-to-png-converter', 'pdfjs-dist'],

            // OpenAI (only loaded when needed)
            'vendor-ai': ['openai'],

            // Utilities
            'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          },
        },
      },
      rolldownOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
            return
          }
          warn(warning)
        },
      },
      // Aumentar o limite de warning para chunks grandes esperados
      chunkSizeWarningLimit: 1000,
    },
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode ?? process.env.NODE_ENV ?? 'production'),
      'global': 'globalThis',
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
        },
        // Polyfill para stream - necessário para xlsx-js-style no navegador
        {
          find: /^stream$/,
          replacement: path.resolve(__dirname, 'src', 'lib', 'stream-polyfill.ts'),
        },
      ],
    },
    optimizeDeps: {
      include: ['xlsx-js-style'],
    },
    ssr: {
      noExternal: ['xlsx-js-style'], // Para SSR, se necessário
    },
  }
})
