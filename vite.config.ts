import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'

// Раздаёт статические файлы pdf.js, которые его воркер подгружает сам по URL, - декодеры
// сканов (JBIG2 / JPEG 2000 в wasm) и ICC-профиль, см. usePdfPreview.ts. Сборщик их не
// видит (запрашивает не наш код, а воркер), поэтому копируем явно: в dev - отдаём из
// node_modules, в build - кладём в dist/assets/pdfjs-<версия>/. Версия в пути позволяет
// кешировать их "навсегда", как и остальное содержимое /assets/ (см. nginx.conf): при
// обновлении pdfjs-dist поменяется и путь.
// quickjs-* (песочница для JavaScript внутри PDF) не нужен - скрипты PDF мы не исполняем.
// Стандартные шрифты и CMap тоже не раздаём - см. комментарий в usePdfPreview.ts.
function pdfjsAssetsPlugin(): Plugin {
  const require = createRequire(import.meta.url)
  const pkgDir = path.dirname(require.resolve('pdfjs-dist/package.json'))
  const version: string = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).version
  const urlPrefix = `assets/pdfjs-${version}/`

  const files: string[] = []
  for (const dir of ['wasm', 'iccs']) {
    for (const name of fs.readdirSync(path.join(pkgDir, dir))) {
      if (!name.startsWith('quickjs')) files.push(`${dir}/${name}`)
    }
  }

  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''
        const idx = url.indexOf(`/${urlPrefix}`)
        if (idx === -1) return next()
        const rel = url.slice(idx + urlPrefix.length + 1)
        if (!files.includes(rel)) return next()
        res.setHeader('Content-Type', rel.endsWith('.wasm') ? 'application/wasm'
          : rel.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
        fs.createReadStream(path.join(pkgDir, rel)).pipe(res)
      })
    },
    generateBundle() {
      for (const rel of files) {
        this.emitFile({ type: 'asset', fileName: urlPrefix + rel, source: fs.readFileSync(path.join(pkgDir, rel)) })
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    pdfjsAssetsPlugin(),
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

/*
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
*/
