import axios from 'axios'

// Determine API base URL based on environment
const isProduction = import.meta.env.PROD

// Use deployed backend URL in production, proxy in development
const API_BASE_URL = isProduction
  ? 'https://project-managment-mj1a.onrender.com'
  : '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add token to requests automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  
  // Ensure headers object exists
  if (!config.headers) {
    config.headers = {} as any
  }
  
  // Handle Content-Type: For FormData, delete it so Axios sets multipart/form-data with boundary
  // For other requests, set application/json
  if (config.data instanceof FormData) {
    // Delete Content-Type header to let Axios automatically set multipart/form-data with boundary
    delete config.headers['Content-Type']
  } else if (!config.headers['Content-Type']) {
    // Set application/json for non-FormData requests
    config.headers['Content-Type'] = 'application/json'
  }
  
  if (token) {
    // Set Authorization header - axios will normalize this correctly
    config.headers['Authorization'] = `Bearer ${token}`
    // Dev-only signal to verify in Network tab that we attached auth
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      config.headers['X-Auth-Present'] = '1'
    }
  } else {
    console.warn('No token found in localStorage. Request may fail with 401/403.')
  }
  
  // Safety: if a full URL sneaks in pointing to backend, rewrite to proxy path
  if (typeof config.url === 'string' && config.url.startsWith('http://localhost:8000')) {
    try {
      const u = new URL(config.url)
      config.url = u.pathname + u.search
      config.baseURL = API_BASE_URL
    } catch {}
  }
  
  // Safety: if baseURL was overridden to point to backend, restore proxy
  if (typeof config.baseURL === 'string' && config.baseURL.startsWith('http://localhost:8000')) {
    config.baseURL = API_BASE_URL
  }
  
  // Debug: log the request config in development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('API Request:', {
      url: config.url,
      baseURL: config.baseURL,
      hasToken: !!token,
      headers: config.headers
    })
  }
  
  return config
}, (error) => {
  return Promise.reject(error)
})

// Handle 401 errors (unauthorized) - redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 307/301/302 redirects by retrying with Authorization header
    if (error.response?.status === 307 || error.response?.status === 301 || error.response?.status === 302) {
      const redirectUrl = error.response.headers.location
      if (redirectUrl && error.config) {
        // Retry the request to the redirect URL with the same headers
        const token = localStorage.getItem('token')
        if (token) {
          try {
            // Convert absolute URL to relative path for proxy
            let urlPath = redirectUrl
            if (redirectUrl.startsWith('http://localhost:8000') || redirectUrl.startsWith('http://127.0.0.1:8000')) {
              try {
                const url = new URL(redirectUrl)
                urlPath = url.pathname + url.search
              } catch {
                // If URL parsing fails, try to extract path manually
                urlPath = redirectUrl.replace(/^https?:\/\/[^\/]+/, '')
              }
            }
            
            const retryConfig = {
              ...error.config,
              url: urlPath,
              baseURL: API_BASE_URL,  // Ensure we use the proxy
              headers: {
                ...error.config.headers,
                'Authorization': `Bearer ${token}`
              }
            }
            return await api.request(retryConfig)
          } catch (retryError) {
            return Promise.reject(retryError)
          }
        }
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

