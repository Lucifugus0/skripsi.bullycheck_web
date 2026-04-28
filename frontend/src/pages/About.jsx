import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Tentang Model</h1>
        <p className="text-slate-400 mb-8">Informasi teknis model AI yang digunakan BullyCheck.</p>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-slate-300">Halaman About — konten akan diisi.</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}

export default About
