import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 60000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
  },
})

api.interceptors.request.use(cfg => {
  try {
    const s = localStorage.getItem('sine-auth')
    if (s) {
      const { state } = JSON.parse(s)
      if (state?.token) cfg.headers.Authorization = `Bearer ${state.token}`
    }
  } catch {}
  return cfg
})

api.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    localStorage.removeItem('sine-auth')
    window.location.href = '/login'
  }
  return Promise.reject(err)
})

export default api
