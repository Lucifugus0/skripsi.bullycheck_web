const KEY = 'bullycheck_history'
const MAX = 10

export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export const addHistory = (entry) => {
  const prev = getHistory()
  const updated = [entry, ...prev].slice(0, MAX)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export const deleteEntry = (id) => {
  const updated = getHistory().filter((e) => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(updated))
}

export const clearHistory = () => {
  localStorage.removeItem(KEY)
}
