import { useNavigate } from 'react-router-dom'

const Admin = () => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-400">BullyCheck</span>
            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded">Admin Panel</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-white mb-8">Dashboard Admin</h1>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300">Halaman Admin — konten akan diisi.</p>
        </div>
      </main>
    </div>
  )
}

export default Admin
