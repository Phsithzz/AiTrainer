import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [agreed, setAgreed] = useState(false)
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
  const strengthColor = ['', '#f87171', '#fb923c', '#facc15', '#00ff88']
  const strengthLabel = ['', 'อ่อนมาก', 'พอใช้', 'ดี', 'แข็งแกร่ง']
  const sc = getStrength(password)

const handleSubmit = async (e) => {
    e.preventDefault()
    
    // 🟢 แนะนำให้ใส่ setError เพื่อให้มันแจ้งเตือนผู้ใช้บนจอ แทนที่จะ return เงียบๆ
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return alert("ชื่อผู้ใช้ต้องมี 3-20 ตัวอักษร และห้ามใช้เว้นวรรค/อักขระพิเศษ");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return alert("รูปแบบอีเมลไม่ถูกต้อง");
    }
    
    // 🟢 ลบ || !agreed ออกไปเลยครับ
    if (password.length < 8 || password !== confirmPw) {
      return alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และตรงกันทั้ง 2 ช่อง");
    }

    const ok = await register(username, email, password)
    if (ok) setSuccess(true)
  }

  if (success) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-2 border-[#00ff88]/50 flex items-center justify-center text-[#00ff88] text-2xl mx-auto mb-4">✓</div>
        <h2 className="text-2xl font-black tracking-[0.15em] mb-2">สำเร็จ!</h2>
        <p className="text-white/40 text-xs tracking-widest mb-6 font-normal">สมัครสมาชิกเรียบร้อยแล้ว</p>
        <button onClick={() => navigate('/login')}
          className="px-8 py-3 border border-white bg-white text-black font-black text-[11px] tracking-[0.25em] hover:bg-black hover:text-white transition-all">
          LOGIN 
        </button>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      <header className="relative z-10 flex items-center px-8 py-6 border-b-2 border-white">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black text-xs">AI</div>
          <span className="text-xs tracking-[0.3em] text-white/50 uppercase font-normal">Form Trainer</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-white/15 bg-white/3 p-10">

          <div className="text-[10px] tracking-[0.5em] text-white/40 uppercase mb-2 font-normal">AI-Powered Workout</div>
          <h1 className="text-5xl font-black tracking-widest leading-none mb-1">CREATE</h1>
          <h2 className="text-5xl font-black tracking-[0.15em] leading-none mb-2"
            style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.45)', color: 'transparent' }}>
            ACCOUNT
          </h2>
          <p className="text-xs tracking-[0.2em] text-white/40 uppercase mb-8 font-normal">สมัครสมาชิก — Form Trainer</p>

          <div className="flex border border-white/20 mb-6">
            <button onClick={() => navigate('/login')}
              className="cursor-pointer flex-1 py-2.5 text-[10px] font-black tracking-[0.25em] uppercase text-white/35 hover:text-white transition-colors border-r border-white/20">
              LOGIN
            </button>
            <button className="flex-1 py-2.5 text-[10px] font-black tracking-[0.25em] uppercase bg-white text-black">
              REGISTER
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 border border-red-400/40 bg-red-400/8 px-3 py-2.5 mb-4 text-red-400 text-xs tracking-wide">
              <span>!</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="your name"
                className="
                focus:border-white/60
                w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none placeholder:text-white/20 tracking-wide transition-colors"
                style={{ borderColor: username ? (/^[a-z0-9_]{3,20}$/.test(username) ? 'rgba(0,255,136,0.5)' : 'rgba(248,113,113,0.5)') : undefined }}
              />
              {username && (
                <p className="text-[10px] mt-1 tracking-widest font-normal"
                  style={{ color: /^[a-z0-9_]{3,20}$/.test(username) ? '#00ff88' : '#f87171' }}>
                  {/^[a-z0-9_]{3,20}$/.test(username) ? '✓ ชื่อผู้ใช้ใช้ได้' : 'ใช้ได้เฉพาะ a-z, 0-9, _'}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="
                focus:border-white/60
                w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none placeholder:text-white/20 tracking-wide transition-colors"
                style={{ borderColor: email ? (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'rgba(0,255,136,0.5)' : 'rgba(248,113,113,0.5)') : undefined }}
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="
                focus:border-white/60
                w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none placeholder:text-white/20 tracking-wide transition-colors"
              />
              {password && (
                <>
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-0.5 flex-1 transition-all duration-300"
                        style={{ background: i <= sc ? strengthColor[sc] : 'rgba(255,255,255,0.1)' }} />
                    ))}
                  </div>
                  <p className="text-[10px] mt-1 tracking-widest font-normal" style={{ color: strengthColor[sc] }}>
                    {strengthLabel[sc]}
                  </p>
                </>
              )}
            </div>

            {/* Confirm */}
            <div className="mb-4">
              <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Confirm Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                placeholder="ยืนยันรหัสผ่าน"
                className="
                focus:border-white/60
                w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none placeholder:text-white/20 tracking-wide transition-colors"
                style={{ borderColor: confirmPw ? (password === confirmPw ? 'rgba(0,255,136,0.5)' : 'rgba(248,113,113,0.5)') : undefined }}
              />
              {confirmPw && (
                <p className="text-[10px] mt-1 tracking-widest font-normal"
                  style={{ color: password === confirmPw ? '#00ff88' : '#f87171' }}>
                  {password === confirmPw ? '✓ รหัสผ่านตรงกัน' : 'รหัสผ่านไม่ตรงกัน'}
                </p>
              )}
            </div>

   

            <button type="submit" disabled={isLoading}
              className="
              cursor-pointer
              w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase hover:bg-black hover:text-white border border-white transition-all duration-200 disabled:opacity-40">
              {isLoading ? 'LOADING...' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p className="text-center mt-5 text-xs text-white/30 tracking-widest font-normal">
            มีบัญชีแล้ว?{' '}
            <button onClick={() => navigate('/login')} className="cursor-pointer text-white/70 hover:text-white transition-colors">
              LOGIN
            </button>
          </p>
        </div>
      </main>

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