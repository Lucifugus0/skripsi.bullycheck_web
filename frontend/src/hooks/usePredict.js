import { useState } from 'react'
import { predict as predictApi } from '../services/api.js'
import { addHistory } from '../utils/history.js'

export const usePredict = () => {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const predict = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await predictApi(text)
      setResult(data)
      addHistory({
        id: Date.now().toString(),
        text: text.trim(),
        timestamp: new Date().toISOString(),
        ...data,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Terjadi kesalahan saat memproses teks.')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setText('')
    setResult(null)
    setError(null)
  }

  return { text, setText, result, loading, error, predict, reset }
}
