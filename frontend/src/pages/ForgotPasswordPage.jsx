import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: กรอกอีเมล, 2: กรอก OTP + รหัสใหม่
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  
  const { forgotPassword, resetPassword, isLoading, error } = useAuth();
  const navigate = useNavigate();

  // ── Step 1: ส่งคำขอ OTP ──
  const handleRequestOtp = async (e) => {
    e.preventDefault();

    const showError = (msg) => Swal.fire({
      icon: 'warning', title: 'INPUT REQUIRED', text: msg,
      background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#eab308',
      customClass: { popup: 'border border-yellow-500/30 rounded-3xl', title: 'text-yellow-500 font-black tracking-widest', confirmButton: 'text-black font-bold tracking-widest rounded-full px-8 py-3 mt-2' }
    });
    if (!username) return showError("กรุณากรอก Username");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return showError("รูปแบบอีเมลไม่ถูกต้อง");
    }

   const msg = await forgotPassword(username, email);
    if (msg) {
      setStep(2); // เปลี่ยนไปหน้ากรอก OTP
    }
  };

  // ── Step 2: ยืนยันรหัสผ่านใหม่ ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    const showError = (msg) => Swal.fire({
      icon: 'error', title: 'INVALID DATA', text: msg,
      background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#ef4444',
      customClass: { popup: 'border border-red-500/30 rounded-3xl', title: 'text-red-500 font-black tracking-widest', confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2' }
    });
    if (otp.length !== 6) return showError("กรุณากรอก OTP ให้ครบ 6 หลัก");
    if (newPassword.length < 8 || newPassword !== confirmPw) {
      return showError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และตรงกันทั้ง 2 ช่อง");
    }

    const msg = await resetPassword(email, otp, newPassword);
    if (msg) {
Swal.fire({
        icon: 'success',
        title: 'ACCESS RESTORED',
        text: 'รีเซ็ตรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่',
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'GO TO LOGIN',
        confirmButtonColor: '#00ff88', // สีเขียว
        customClass: {
          popup: 'border border-[#00ff88]/30 rounded-3xl',
          title: 'text-[#00ff88] font-black tracking-widest text-xl',
          confirmButton: 'text-black font-black tracking-widest rounded-full px-8 py-3 mt-2'
        }
      }).then(() => {
        navigate('/login');
      });
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* 🟢 Background Grid Pattern บางๆ */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* 🟢 Header ปรับให้ตรงกับ Design System */}
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

      {/* 🟢 Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-10 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-[10px] tracking-[0.4em] text-[#00ff88] uppercase mb-2 font-bold drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]">
            RECOVERY MODE
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest leading-none mb-1 text-white">
            RESET
          </h1>
          <h2 className="text-4xl md:text-5xl font-black tracking-[0.15em] leading-none mb-6"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)', color: 'transparent' }}>
            PASSWORD
          </h2>

          {/* 🟢 Error Alert */}
          {error && (
            <div className="flex items-center gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 rounded-lg text-red-400 text-xs tracking-wide">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center font-bold">!</div>
              <span>{error}</span>
            </div>
          )}

          {/* ──────────────── STEP 1: ขอ OTP ──────────────── */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp}>
              <p className="text-[11px] tracking-[0.1em] text-zinc-400 mb-8 leading-relaxed font-medium">
                Enter your registered username and email. <br/>We will send a 6-digit OTP to verify.
              </p>
              
              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                  Username
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="Enter your username"
                  className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                />
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                  Email
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="cursor-pointer w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'SENDING...' : 'SEND OTP'}
              </button>
            </form>
          )}

          {/* ──────────────── STEP 2: กรอก OTP + รหัสใหม่ ──────────────── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              <p className="text-[11px] tracking-[0.1em] text-zinc-400 mb-6 leading-relaxed font-medium">
                OTP sent to <span className="text-white font-bold">{email}</span> <br/>(Valid for 5 minutes)
              </p>

              <div className="mb-6">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-[#00ff88] uppercase mb-2 pl-1">
                  OTP (6 Digits)
                </label>
                <input 
                  type="text" 
                  maxLength="6" 
                  value={otp} 
                  onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-black/40 border border-[#00ff88]/30 text-[#00ff88] text-2xl font-black text-center px-4 py-3.5 rounded-xl outline-none focus:border-[#00ff88] focus:bg-zinc-900 focus:shadow-[0_0_15px_rgba(0,255,136,0.15)] placeholder:text-zinc-700 tracking-[0.5em] transition-all duration-300"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                  New Password
                </label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                />
              </div>

              <div className="mb-8">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">
                  Confirm Password
                </label>
                <input 
                  type="password" 
                  value={confirmPw} 
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3.5 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 tracking-wide transition-all duration-300"
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="cursor-pointer w-full py-4 bg-[#00ff88] text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'UPDATING...' : 'RESET PASSWORD'}
              </button>
            </form>
          )}

          {/* 🟢 Back to Login */}
          <div className="mt-8 text-center">
            <button 
              onClick={() => navigate('/login')} 
              className="cursor-pointer text-[10px] font-bold text-zinc-500 tracking-widest uppercase hover:text-white transition-colors duration-300"
            >
              Back to Login
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}