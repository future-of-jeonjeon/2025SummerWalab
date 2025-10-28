import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const trimTrailingSlash = (value: string) => value.replace(/\/$/, '')

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\$&')

const resolvePath = (relative: string) => {
  const url = new URL(relative, import.meta.url)
  const decoded = decodeURIComponent(url.pathname)
  return trimTrailingSlash(decoded)
}

const createProxyConfig = (publicPath: string, rawBase: string, fallback: string) => {
  const base = rawBase || fallback
  let url: URL
  try {
    url = new URL(base)
  } catch (error) {
    url = new URL(fallback)
  }

  const backendPath = trimTrailingSlash(url.pathname || '')
  const pattern = new RegExp(`^${escapeRegex(publicPath)}`)

  return {
    target: url.origin,
    changeOrigin: true,
    secure: false,
    rewrite: (path: string) => path.replace(pattern, backendPath),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const projectRoot = resolvePath('.')
  const env = loadEnv(mode, projectRoot, '')
  const apiBase = env.VITE_API_URL || 'http://localhost:8000/api'
  const msBase = env.VITE_MS_API_BASE || 'http://localhost:9000/api'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolvePath('./src'),
      },
    },
    server: {
      proxy: {
        '/api': createProxyConfig('/api', apiBase, 'http://localhost:8000/api'),
        '/ms-api': createProxyConfig('/ms-api', msBase, 'http://localhost:9000/api'),
      },
    },
  }
})
