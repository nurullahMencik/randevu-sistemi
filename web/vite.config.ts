/// <reference types="vitest/config" />
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type Rolldown } from 'vite'

type OutputChunk = Rolldown.OutputChunk

/**
 * GitHub Pages has no SPA rewrites. Serving the same index.html as 404.html lets deep links
 * such as /randevu-sistemi/admin/calendar boot the app, which then routes client-side.
 */
function spaFallback(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    async closeBundle() {
      await copyFile(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

/**
 * Route chunks are lazy, so on a deep link (e.g. /login) the browser would only discover them
 * after the main bundle has run. This injects a tiny inline script that adds <link rel=modulepreload>
 * for the current route's chunks, letting them download in parallel with the main bundle.
 */
function routePreload(routes: Record<string, string[]>): Plugin {
  let base = '/'
  return {
    name: 'route-modulepreload',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle
        if (!bundle) return html
        const chunks = Object.values(bundle).filter((c): c is OutputChunk => c.type === 'chunk')
        const entry = chunks.find((c) => c.isEntry)
        const collect = (chunk: OutputChunk, files: Set<string>) => {
          if (chunk === entry || files.has(chunk.fileName)) return
          files.add(chunk.fileName)
          for (const name of chunk.imports) {
            const next = chunks.find((c) => c.fileName === name)
            if (next) collect(next, files)
          }
        }
        const map: Record<string, string[]> = {}
        for (const [segment, modules] of Object.entries(routes)) {
          const files = new Set<string>()
          for (const module of modules) {
            const chunk = chunks.find((c) => c.facadeModuleId?.endsWith(module))
            if (chunk) collect(chunk, files)
          }
          map[segment] = [...files]
        }
        const script = `(function(){var m=${JSON.stringify(map)},b=${JSON.stringify(base)},p=location.pathname.slice(b.length).split('/')[0];(m[p]||[]).forEach(function(f){var l=document.createElement('link');l.rel='modulepreload';l.href=b+f;document.head.appendChild(l)})})()`
        return html.replace('</head>', `  <script>${script}</script>\n  </head>`)
      },
    },
  }
}

export default defineConfig({
  base: '/randevu-sistemi/',
  plugins: [
    react(),
    tailwindcss(),
    routePreload({
      login: ['src/features/auth/LoginPage.tsx'],
      register: ['src/features/auth/RegisterPage.tsx'],
      appointments: ['src/features/appointments/MyAppointmentsPage.tsx'],
      staff: ['src/features/staff/StaffSchedulePage.tsx'],
      admin: ['src/features/admin/AdminLayout.tsx', 'src/features/admin/DashboardPage.tsx'],
    }),
    spaFallback(),
  ],
  server: { port: 5304, strictPort: true },
  preview: { port: 5304, strictPort: true },
  build: { target: 'es2023', sourcemap: false },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
