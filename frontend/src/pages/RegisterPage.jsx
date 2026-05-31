import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Swal from 'sweetalert2';
export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  // eslint-disable-next-line no-unused-vars
  const [agreed, setAgreed] = useState(false)
  // eslint-disable-next-line no-unused-vars
  const [success, setSuccess] = useState(false)
  const { register, isLoading, error } = useAuth()
  const navigate = useNavigate()

  const getStrength = (pw) => {
    let sc = 0
    if (pw.length >= 8) sc++
    if (/[A-Z]/.test(pw)) sc++
    if (/[0-9]/.test(pw)) sc++
    if (/[^A-Za-z0-9]/.test(pw)) sc++
    return sc
  }
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'] // ปรับสีให้ดูเข้ากับ Tailwind มากขึ้น
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const sc = getStrength(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
const showError = (message) => {
      Swal.fire({
        icon: 'error',
        title: 'VALIDATION FAILED',
        text: message,
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'RETRY',
        confirmButtonColor: '#ef4444', // สีแดง
        customClass: {
          popup: 'border border-red-500/30 rounded-3xl',
          title: 'text-red-500 font-black tracking-widest text-xl',
          confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2'
        }
      });
    };
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return showError("ชื่อผู้ใช้ต้องมี 3-20 ตัวอักษร และห้ามใช้เว้นวรรค/อักขระพิเศษ");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError("รูปแบบอีเมลไม่ถูกต้อง");
    }

    if (password.length < 8 || password !== confirmPw) {
      return showError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และตรงกันทั้ง 2 ช่อง");
    }

    const ok = await register(username, email, password)
    if (ok) {
      navigate('/verify-otp', { state: { email } });
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* 🟢 Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* 🟢 Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-black text-sm group-hover:bg-zinc-200 transition-colors duration-300">
            AI
          </div>
          <span className="hidden md:block text-xs font-medium tracking-[0.25em] text-zinc-400 uppercase group-hover:text-white transition-colors duration-300">
            Form Trainer
          </span>
        </Link>
      </header>

      {/* 🟢 Main Register Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-10 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase mb-2 font-bold">
            AI-Powered Workout
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest leading-none mb-1 text-white">
            CREATE
          </h1>
          <h2 className="text-4xl md:text-5xl font-black tracking-[0.15em] leading-none mb-2"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)', color: 'transparent' }}>
            ACCOUNT
          </h2>
          <p className="text-[11px] tracking-[0.1em] text-zinc-400 uppercase mb-8 font-medium">
            Join the Next-Gen Form Trainer
          </p>

          {/* 🟢 Tabs (Segmented Control) */}
          <div className="flex bg-black/50 p-1.5 rounded-full mb-8 border border-zinc-800">
            <button
              onClick={() => navigate('/login')}
              className="cursor-pointer flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 hover:text-white rounded-full transition-all duration-300"
            >
              LOGIN
            </button>
            <button className="cursor-pointer flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase bg-zinc-800 text-white rounded-full shadow-md transition-all">
              REGISTER
            </button>
          </div>

          {/* 🟢 Error Alert */}
          {error && (
            <div className="flex items-center gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 rounded-lg text-red-400 text-xs tracking-wide">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center font-bold">!</div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Username
              </label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="yourname"
                className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                style={{ 
                  borderColor: username 
                    ? (/^[a-z0-9_]{3,20}$/.test(username) ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') 
                    : undefined 
                }}
              />
              {username && (
                <p className="text-[10px] mt-2 ml-1 tracking-widest font-medium"
                  style={{ color: /^[a-z0-9_]{3,20}$/.test(username) ? '#22c55e' : '#ef4444' }}>
                  {/^[a-z0-9_]{3,20}$/.test(username) ? '✓ Username is valid' : 'Only a-z, 0-9, and _ (3-20 chars)'}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Email
              </label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                style={{ 
                  borderColor: email 
                    ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') 
                    : undefined 
                }}
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Password
              </label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
              />
              {password && (
                <div className="mt-2 ml-1">
                  <div className="flex gap-1.5 mb-1.5">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
                        style={{ background: i <= sc ? strengthColor[sc] : 'rgba(255,255,255,0.05)' }} />
                    ))}
                  </div>
                  <p className="text-[10px] tracking-widest font-bold uppercase" style={{ color: strengthColor[sc] }}>
                    {strengthLabel[sc]}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-8">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Confirm Password
              </label>
              <input 
                type="password" 
                value={confirmPw} 
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Confirm your password"
                className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                style={{ 
                  borderColor: confirmPw 
                    ? (password === confirmPw ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)') 
                    : undefined 
                }}
              />
              {confirmPw && (
                <p className="text-[10px] mt-2 ml-1 tracking-widest font-medium"
                  style={{ color: password === confirmPw ? '#22c55e' : '#ef4444' }}>
                  {password === confirmPw ? '✓ Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="cursor-pointer w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p className="text-center mt-6 text-[11px] text-zinc-500 tracking-wider font-medium">
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')} 
              className="cursor-pointer text-white font-bold hover:underline underline-offset-4 transition-all"
            >
              SIGN IN
            </button>
          </p>
        </div>
      </main>

      {/* 🟢 Footer */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 md:gap-8 py-6 border-t border-white/5 bg-black/40 backdrop-blur-md text-[10px] text-zinc-500 tracking-widest uppercase font-medium">
        <span>MEDIAPIPE</span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>SKLEARN</span>
        <span className="w-1 h-1 rounded-full bg-zinc-700" />
        <span>FASTAPI WEBSOCKET</span>
      </div>
    </div>
  )
}