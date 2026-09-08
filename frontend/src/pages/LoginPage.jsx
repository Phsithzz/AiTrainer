import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Swal from 'sweetalert2'
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai'

export default function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const { login, isLoading, error } = useAuth()
  const navigate = useNavigate()

  // 🟢 ใช้ useEffect ดักจับ Error จาก useAuth เพื่อโชว์ SweetAlert
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'ACCESS DENIED',
        text: error,
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'RETRY',
        confirmButtonColor: '#ef4444',
        customClass: {
          popup: 'border border-red-500/30 rounded-3xl',
          title: 'text-red-500 font-black tracking-widest text-xl',
          confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2'
        }
      });
    }
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault()

    // 🟢 เช็คว่ากรอกข้อมูลครบไหม
    if (!identifier || !password) {
      return Swal.fire({
        icon: 'warning',
        title: 'MISSING CREDENTIALS',
        text: 'กรุณากรอก Username และ Password ให้ครบถ้วน',
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'ACKNOWLEDGE',
        confirmButtonColor: '#eab308',
        customClass: {
          popup: 'border border-yellow-500/30 rounded-3xl',
          title: 'text-yellow-500 font-black tracking-widest text-xl',
          confirmButton: 'text-black font-bold tracking-widest rounded-full px-8 py-3 mt-2'
        }
      });
    }

    const ok = await login(identifier, password)
    
    // 🟢 ถ้า Login ผ่าน โชว์ Success Alert เท่ๆ ก่อนย้ายหน้า
    if (ok) {
      Swal.fire({
        icon: 'success',
        title: 'ACCESS GRANTED',
        text: 'ระบบยืนยันตัวตนสำเร็จ กำลังเข้าสู่ระบบ...',
        background: '#18181b',
        color: '#a1a1aa',
        showConfirmButton: false,
        timer: 1500,
        customClass: {
          popup: 'border border-[#00ff88]/30 rounded-3xl',
          title: 'text-[#00ff88] font-black tracking-widest text-xl',
        }
      }).then(() => {
        onLogin?.();
        navigate('/');
      });
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* 🟢 Background Grid Pattern บางๆ */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* 🟢 Header ปรับสไตล์ให้ตรงกับหน้า SelectPage */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-4 group cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-black text-sm group-hover:bg-zinc-200 transition-colors duration-300 cursor-pointer">
            AI
          </div>
          <span className="hidden md:block text-xs font-medium tracking-[0.25em] text-zinc-400 uppercase group-hover:text-white transition-colors duration-300 cursor-pointer">
            Form Trainer
          </span>
        </Link>
      </header>

      {/* 🟢 Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-10 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-[10px] tracking-[0.4em] text-zinc-500 uppercase mb-2 font-bold">
            System Access
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest leading-none mb-1 text-white">
            LOGIN
          </h1>
          <h2 className="text-4xl md:text-5xl font-black tracking-[0.15em] leading-none mb-2"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)', color: 'transparent' }}>
            PORTAL
          </h2>
          <p className="text-[11px] tracking-[0.1em] text-zinc-400 uppercase mb-8 font-medium">
            Enter your credentials to continue
          </p>

          {/* 🟢 Tabs เปลี่ยนเป็น Segmented Control สวยๆ */}
          <div className="flex bg-black/50 p-1.5 rounded-full mb-8 border border-zinc-800">
            <button className="cursor-default flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase bg-zinc-800 text-white rounded-full shadow-md transition-all">
              LOGIN
            </button>
            <button
              onClick={() => navigate('/register')}
              className="cursor-pointer flex-1 py-3 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500 hover:text-white rounded-full transition-all duration-300"
            >
              REGISTER
            </button>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Username
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Username or Email"
                className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
              />
            </div>

            <div className="mb-3">
              <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 pr-12 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                  {showPw ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                </button>
              </div>
            </div>

            <div className="text-right mb-8">
              <button 
                type="button" 
                onClick={() => navigate('/forgot-password')} 
                className="cursor-pointer text-[11px] font-medium text-zinc-500 tracking-wider hover:text-white transition-colors duration-300"
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'AUTHENTICATING...' : 'SIGN IN'}
            </button>
            
            {import.meta.env.VITE_IS_MOCK === "true" && (
              <button 
                type="button" 
                disabled={isLoading}
                className="cursor-pointer w-full mt-3 py-4 bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-[#00ff88]/30 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
                onClick={async (e) => { 
                  e.preventDefault(); 
                  setIdentifier('guest@portfolio.com');
                  setPassword('demo');
                  const ok = await login("guest@portfolio.com", "demo");
                  if (ok) {
                    Swal.fire({
                      icon: 'success',
                      title: 'DEMO MODE ACTIVATED',
                      text: 'เข้าสู่โหมด Portfolio สำหรับรับชมผลงาน',
                      background: '#18181b',
                      color: '#a1a1aa',
                      showConfirmButton: false,
                      timer: 1500,
                      customClass: {
                        popup: 'border border-[#00ff88]/30 rounded-3xl',
                        title: 'text-[#00ff88] font-black tracking-widest text-xl',
                      }
                    }).then(() => {
                      onLogin?.();
                      navigate('/');
                    });
                  }
                }}
              >
                🚀 PORTFOLIO DEMO LOGIN
              </button>
            )}
          </form>

          <p className="text-center mt-6 text-[11px] text-zinc-500 tracking-wider font-medium">
            New here?{' '}
            <button 
              onClick={() => navigate('/register')} 
              className="cursor-pointer text-white font-bold hover:underline underline-offset-4 transition-all"
            >
              CREATE ACCOUNT
            </button>
          </p>
        </div>
      </main>

      {/* 🟢 Footer ปรับให้ตรงกับ SelectPage */}
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