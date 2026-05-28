import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
    if (!username) return alert("กรุณากรอก Username");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return alert("รูปแบบอีเมลไม่ถูกต้อง");
    }

   const msg = await forgotPassword(username, email);
    if (msg) {
      setStep(2); // เปลี่ยนไปหน้ากรอก OTP
    }
  };

  // ── Step 2: ยืนยันรหัสผ่านใหม่ ──
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return alert("กรุณากรอก OTP ให้ครบ 6 หลัก");
    if (newPassword.length < 8 || newPassword !== confirmPw) {
      return alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร และตรงกันทั้ง 2 ช่อง");
    }

    const msg = await resetPassword(email, otp, newPassword);
    if (msg) {
      alert("รีเซ็ตรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่");
      navigate('/login');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      <header className="relative z-10 flex items-center px-8 py-6 border-b-2 border-white">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white text-black flex items-center justify-center font-black text-xs cursor-pointer">AI</div>
          <span className="text-xs tracking-[0.3em] text-white/50 uppercase font-normal cursor-pointer">Form Trainer</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-white/15 bg-white/3 p-10">
          
          <div className="text-[10px] tracking-[0.5em] text-[#00ff88] uppercase mb-2 font-normal">RECOVERY MODE</div>
          <h1 className="text-4xl font-black tracking-widest leading-none mb-1 text-white">RESET</h1>
          <h2 className="text-4xl font-black tracking-[0.15em] leading-none mb-6"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.45)', color: 'transparent' }}>
            PASSWORD
          </h2>

          {error && (
            <div className="flex items-center gap-2 border border-red-400/40 bg-red-400/8 px-3 py-2.5 mb-6 text-red-400 text-xs tracking-wide">
              <span>!</span><span>{error}</span>
            </div>
          )}

          {/* ──────────────── STEP 1: ขอ OTP ──────────────── */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp}>
              <p className="text-xs tracking-widest text-white/40 mb-6 leading-relaxed">
                กรุณากรอกอีเมลที่ใช้สมัครสมาชิก <br/>ระบบจะส่งรหัส OTP 6 หลักไปให้คุณ
              </p>
              <div className="mb-4">
                <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="ชื่อผู้ใช้ของคุณ"
                  className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
                />
              </div>
              <div className="mb-6">
                <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
                />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase hover:bg-[#00ff88] border border-white transition-all duration-200 disabled:opacity-40">
                {isLoading ? 'SENDING...' : 'SEND OTP'}
              </button>
            </form>
          )}

          {/* ──────────────── STEP 2: กรอก OTP + รหัสใหม่ ──────────────── */}
          {step === 2 && (
            <form onSubmit={handleResetPassword}>
              <p className="text-xs tracking-widest text-white/40 mb-6 leading-relaxed">
                ส่งรหัส OTP ไปที่ <span className="text-white font-bold">{email}</span> แล้ว <br/>(รหัสมีอายุ 5 นาที)
              </p>

              <div className="mb-4">
                <label className="block text-[10px] tracking-[0.25em] text-[#00ff88] uppercase mb-1.5 font-normal">OTP (6 Digits)</label>
                <input type="text" maxLength="6" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-transparent border border-[#00ff88]/50 text-white text-xl text-center px-4 py-3 outline-none focus:border-[#00ff88] placeholder:text-white/10 tracking-[0.5em] transition-colors"
                />
              </div>

              <div className="mb-4">
                <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร"
                  className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
                />
              </div>

              <div className="mb-8">
                <label className="block text-[10px] tracking-[0.25em] text-white/40 uppercase mb-1.5 font-normal">Confirm Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  className="w-full bg-transparent border border-white/15 text-white text-sm px-4 py-3 outline-none focus:border-white/60 placeholder:text-white/20 tracking-wide transition-colors"
                />
              </div>

              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase hover:bg-black hover:text-white border border-white transition-all duration-200 disabled:opacity-40">
                {isLoading ? 'UPDATING...' : 'RESET PASSWORD'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <button onClick={() => navigate('/login')} className="text-[10px] text-white/30 tracking-widest uppercase hover:text-white transition-colors">
              &larr; กลับไปหน้า Login
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}