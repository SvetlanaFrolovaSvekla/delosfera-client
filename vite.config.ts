/*
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Адреса, под которыми открывают систему: preview отвергает запрос с чужим
  // именем узла, и вместо приложения человек видит отказ. Список задаётся
  // переменной ALLOWED_HOSTS, чтобы новый адрес не требовал правки кода.
  preview: {
    allowedHosts: [
      'edo-test.keremetbank.kg',
      '10.222.10.42',
      'localhost',
      ...(process.env.ALLOWED_HOSTS?.split(',').map(h => h.trim()).filter(Boolean) ?? []),
    ],
  },

  build: {
    rollupOptions: {
      output: {
        // Крупные вендоры — в отдельные, стабильно кешируемые чанки,
        // чтобы entry-бандл не тянул всё сразу и не рос при каждом изменении кода.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
              return 'react-vendor';
            if (/[\\/]node_modules[\\/](i18next|react-i18next|i18next-browser-languagedetector)[\\/]/.test(id))
              return 'i18n-vendor';
          }
        },
      },
    },
  },
})
*/



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const apiPrefixes = ['/api','/auth','/users','/vnd','/files','/tasks','/notifications','/analytics','/dictionaries','/roles','/health']
const proxy = Object.fromEntries(
    apiPrefixes.map(p => [p, {
        target: 'http://localhost:5293',
        changeOrigin: true,
        bypass: (req: {method?: string; headers: Record<string, string | string[] | undefined>}) => {
            const accept = String(req.headers.accept ?? '')
            if ((req.method === 'GET' || req.method === 'HEAD') && accept.includes('text/html')) return '/index.html'
        },
    }])
)

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { port: 5174, strictPort: true, host: 'localhost', proxy },
})
