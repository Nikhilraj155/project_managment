import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Ensure Authorization header is passed through
            if (req.headers.authorization) {
              proxyReq.setHeader('Authorization', req.headers.authorization);
            }
          });
          // Handle redirects and preserve headers
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // If we get a redirect, preserve the Authorization header
            if (proxyRes.statusCode === 307 || proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
              const location = proxyRes.headers.location;
              if (location && req.headers.authorization) {
                // The redirect will be handled by the browser, but we ensure headers are preserved
                res.setHeader('Authorization', req.headers.authorization);
              }
            }
          });
        },
        followRedirects: false,  // Don't follow redirects automatically - let browser handle it
      },
      // Fallback proxies for callers that forget the /api prefix in dev
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/users/': { target: 'http://localhost:8000', changeOrigin: true },
      '/teams/': { target: 'http://localhost:8000', changeOrigin: true },
      '/projects': { target: 'http://localhost:8000', changeOrigin: true },
      '/tasks/': { target: 'http://localhost:8000', changeOrigin: true },
      '/csv': { target: 'http://localhost:8000', changeOrigin: true },
      '/files': { target: 'http://localhost:8000', changeOrigin: true },
      '/presentations/': { target: 'http://localhost:8000', changeOrigin: true },
      '/notifications': { target: 'http://localhost:8000', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:8000', changeOrigin: true },
      '/announcements/': { target: 'http://localhost:8000', changeOrigin: true },
      '/reports': { target: 'http://localhost:8000', changeOrigin: true },
      '/project_ideas': { target: 'http://localhost:8000', changeOrigin: true },
      '/round_schedules': { target: 'http://localhost:8000', changeOrigin: true },
      '/student_feedback': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
