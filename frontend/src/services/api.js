import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const predict = async (text) => {
  const { data } = await api.post('/predict', { text })
  return data
}

export const adminLogin = async (username, password) => {
  const { data } = await api.post('/admin/login', { username, password })
  return data
}

export const uploadDataset = async (file) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post('/admin/upload-dataset', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const uploadKamus = async (type, file) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/admin/upload-kamus?type=${type}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const retrain = async () => {
  const { data } = await api.post('/admin/retrain')
  return data
}

export const getTrainingStatus = async () => {
  const { data } = await api.get('/admin/training-status')
  return data
}

export const getModelHistory = async () => {
  const { data } = await api.get('/admin/model-history')
  return data
}

export const rollback = async (version) => {
  const { data } = await api.post(`/admin/rollback/${version}`)
  return data
}

export const getAvailableModels = async () => {
  const { data } = await api.get('/admin/available-models')
  return data
}

export const setModel = async (filename) => {
  const { data } = await api.post(`/admin/set-model/${filename}`)
  return data
}

export const getModelStats = async (filename) => {
  const { data } = await api.get(`/admin/model-stats/${encodeURIComponent(filename)}`)
  return data
}

export const saveModelStats = async (filename, accuracy, macro_f1) => {
  const { data } = await api.post(`/admin/model-stats/${encodeURIComponent(filename)}`, { accuracy, macro_f1 })
  return data
}

export const uploadModelCM = async (filename, file) => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post(`/admin/model-cm/${encodeURIComponent(filename)}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
