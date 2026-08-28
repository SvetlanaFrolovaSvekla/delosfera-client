import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// Демо-конфиг v2: клиент и API на одном origin (localhost:5174) через proxy →
// httpOnly refresh-cookie работает без кросс-origin проблем (как за reverse-proxy в проде).
// Контур СЗ пришёл с единой схемой адресов api/ — отсюда отдельный префикс '/api'
// (документы, движок согласования, ЭП, записки, справочники архива).
const apiPrefixes = ['/api','/auth','/users','/vnd','/files','/tasks','/notifications','/analytics','/dictionaries','/roles','/health']
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
  server: { port: 5174, strictPort: true, host: 'localhost', proxy },
})
