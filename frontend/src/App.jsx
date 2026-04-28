import { Routes, Route, Navigate } from 'react-router-dom'
import Deteksi from './pages/Deteksi.jsx'
import About from './pages/About.jsx'
import Panduan from './pages/Panduan.jsx'
import Login from './pages/Login.jsx'
import Admin from './pages/Admin.jsx'

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return children
}

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Deteksi />} />
      <Route path="/about" element={<About />} />
      <Route path="/panduan" element={<Panduan />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={
        <ProtectedRoute>
          <Admin />
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
