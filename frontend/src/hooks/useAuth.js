import { useState } from 'react'
import { adminLogin } from '../services/api.js'

export const useAuth = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const login = async (username, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminLogin(username, password)
      localStorage.setItem('token', data.access_token)
      return true
    } catch (err) {
      setError(err.response?.data?.detail || 'Username atau password salah.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { login, loading, error }
}
