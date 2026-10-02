import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.API_URL
  const candidateId = env.CANDIDATE_ID

  const apiProxy: Record<string, ProxyOptions> = {
    '/api': {
      target: apiUrl,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => {
        const [base, query] = path.split('?')
        const userParam = `user=${candidateId}`
        return query ? `${base}?${query}&${userParam}` : `${base}?${userParam}`
      },
    },
  }

  return {
    plugins: [react()],
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  }
})
