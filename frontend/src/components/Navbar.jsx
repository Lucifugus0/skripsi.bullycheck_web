import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-400">BullyCheck</Link>
        <div className="flex gap-6">
          <Link to="/about" className="text-slate-300 hover:text-white transition-colors">Tentang</Link>
          <Link to="/panduan" className="text-slate-300 hover:text-white transition-colors">Panduan</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
