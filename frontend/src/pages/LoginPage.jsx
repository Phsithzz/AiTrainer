import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const ok = await login(identifier, password)
    if (ok) {
      onLogin?.();
      navigate('/')}
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      {/* Grid bg */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b-2 border-white">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black text-xs cursor-pointer">
            AI
          </div>
          <span className="text-xs tracking-[0.3em] text-white/50 uppercase font-normal cursor-pointer">
            Form Trainer
          </span>
        </Link>
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-white/15 bg-white/3 p-10">
          
          <div className="text-[10px] tracking-[0.5em] text-white/40 uppercase mb-2 font-normal">
            AI-Powered Workout
          </div>
          <h1 className="text-5xl font-black tracking-widest leading-none mb-1">
            LOGIN
          </h1>
          <h2 className="text-5xl font-black tracking-[0.15em] leading-none mb-2"
            style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.45)', color: 'transparent' }}>
            ACCESS
          </h2>
          <p className="text-xs tracking-[0.2em] text-white/40 uppercase mb-8 font-normal">
            เข้าสู่ระบบ — Form Trainer
          </p>

          {/* Tabs */}
          <div className="flex border border-white/20 mb-6">
            <button className="flex-1 py-2.5 text-[10px] font-black tracking-[0.25em] uppercase bg-white text-black">
              LOGIN
            </button>
            <button
              onClick={() => navigate('/register')}
              className="
              cursor-pointer 
              flex-1 py-2.5 text-[10px] font-black tracking-[0.25em] uppercase text-white/35 border-l border-white/20 hover:text-white transition-colors">
              REGISTER
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 border border-red-400/40 bg-red-400/8 px-3 py-2.5 mb-4 text-red-400 text-xs tracking-wide">
              <span>!</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">
                 Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="ชื่อผู้ใช้หรืออีเมล"
                className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
              />
            </div>

            <div className="mb-2">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="รหัสผ่าน"
                className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
              />
            </div>

            {/* <div className="text-right mb-5">
              <a href="#" className="text-[11px] text-white/35 tracking-widest hover:text-white transition-colors">
                ลืมรหัสผ่าน?
              </a>
            </div> */}

            <button
              type="submit"
              disabled={isLoading}
              className="
              cursor-pointer
              w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase
               hover:bg-black hover:text-white border 
               border-white transition-all duration-200 disabled:opacity-40">
              {isLoading ? 'LOADING...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-5 text-xs text-white/30 tracking-widest font-normal">
            ยังไม่มีบัญชี?{' '}
            <button onClick={() => navigate('/register')} className="cursor-pointer text-white/70 hover:text-white transition-colors">
              REGISTER
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-center gap-4 py-4 border-t-2 border-white">
        <span className="text-[9px] font-black tracking-[0.2em] text-white">MEDIAPIPE</span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-[9px] font-black tracking-[0.2em] text-white">SKLEARN</span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-[9px] font-black tracking-[0.2em] text-white">FASTAPI WEBSOCKET</span>
      </footer>
    </div>
  )
}