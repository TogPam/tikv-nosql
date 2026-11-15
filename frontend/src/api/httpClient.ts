import axios from 'axios'

export const httpClient = axios.create({ baseURL: 'http://localhost:8080/api', timeout: 12000 })

httpClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('shoe-store-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('shoe-store-token')
      localStorage.removeItem('shoe-store-user')
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(error)
  },
)
