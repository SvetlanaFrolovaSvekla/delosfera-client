import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Демо-конфиг: клиент и API на одном origin (localhost:5173) через proxy →
// httpOnly refresh-cookie работает без кросс-origin проблем (как за reverse-proxy в проде).
const apiPrefixes = ['/auth','/users','/vnd','/files','/tasks','/notifications','/analytics','/dictionaries','/roles','/health']
const proxy = Object.fromEntries(
  apiPrefixes.map(p => [p, {
    target: 'http://localhost:5300',
    changeOrigin: true,
    // SPA-маршруты пересекаются с префиксами API (например /auth, /users, /tasks).
    // Навигацию браузера (Accept: text/html) отдаём фронту, XHR — на бэкенд.
    bypass: (req: {method?: string; headers: Record<string, string | string[] | undefined>}) => {
      const accept = String(req.headers.accept ?? '')
      if ((req.method === 'GET' || req.method === 'HEAD') && accept.includes('text/html')) return '/index.html'
    },
  }])
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173, strictPort: true, host: 'localhost', proxy },
})
