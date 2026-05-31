import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, resendOtp, isLoading, error } = useAuth();
  
  // รับอีเมลที่ส่งมาจากหน้า Register
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
if (otp.length !== 6) {
      return Swal.fire({
        icon: 'warning',
        title: 'VERIFICATION FAILED',
        text: 'กรุณากรอก OTP ให้ครบ 6 หลัก',
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'RETRY',
        confirmButtonColor: '#eab308',
        customClass: {
          popup: 'border border-yellow-500/30 rounded-3xl',
          title: 'text-yellow-500 font-black tracking-widest text-xl',
          confirmButton: 'text-black font-bold tracking-widest rounded-full px-8 py-3 mt-2'
        }
      });
    }
    
    const successMsg = await verifyOtp(email, otp);
    if (successMsg) {
Swal.fire({
        icon: 'success',
        title: 'SYSTEM UNLOCKED',
        text: successMsg || 'ยืนยันบัญชีสำเร็จ!',
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'PROCEED TO LOGIN',
        confirmButtonColor: '#00ff88',
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

  const handleResend = async () => {
    const msg = await resendOtp(email);
    if (msg) {
      Swal.fire({
        icon: 'success', title: 'OTP SENT', text: msg,
        background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#00ff88',
        customClass: { popup: 'border border-[#00ff88]/30 rounded-3xl', title: 'text-[#00ff88] font-black tracking-widest', confirmButton: 'text-black font-black tracking-widest rounded-full px-8 py-3 mt-2' }
      });
      // cooldown 60 วิ กันกด spam
      setResendCooldown(60);
      const t = setInterval(() => {
        setResendCooldown(c => {
          if (c <= 1) { clearInterval(t); return 0; }
          return c - 1;
        });
      }, 1000);
    }
  };

  // ถ้าไม่มีอีเมลหลงมา (แอบเข้า URL ตรงๆ) ให้เด้งกลับไปหน้าสมัคร
  if (!email) {
    navigate('/register');
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* 🟢 Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* 🟢 Header ปรับให้มีเหมือนหน้าอื่นๆ เพื่อความต่อเนื่อง */}
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

      {/* 🟢 Main Verify Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-10 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)] text-center">
          
          <div className="text-[10px] tracking-[0.4em] text-[#00ff88] uppercase mb-2 font-bold drop-shadow-[0_0_8px_rgba(0,255,136,0.4)]">
            SECURITY CHECK
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest leading-none mb-4 text-white">
            ENTER OTP
          </h1>
          
          <p className="text-[11px] tracking-[0.1em] text-zinc-400 mb-8 leading-relaxed font-medium">
            เราได้ส่งรหัส 6 หลักไปที่ <br/>
            <span className="text-white font-bold tracking-wider">{email}</span>
          </p>

          {/* 🟢 Error Alert */}
          {error && (
            <div className="flex items-center justify-center gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 rounded-lg text-red-400 text-xs tracking-wide text-left">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center font-bold shrink-0">!</div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-8">
              <input 
                type="text" 
                maxLength="6"
                value={otp} 
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // บังคับกรอกแค่ตัวเลข
                placeholder="• • • • • •"
                className="w-full bg-black/40 border border-[#00ff88]/30 text-[#00ff88] text-3xl font-black text-center px-4 py-4 rounded-xl outline-none focus:border-[#00ff88] focus:bg-zinc-900 focus:shadow-[0_0_15px_rgba(0,255,136,0.15)] placeholder:text-zinc-700 tracking-[0.5em] transition-all duration-300"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer w-full py-4 bg-[#00ff88] text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-[#00e67a] hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'VERIFYING...' : 'CONFIRM ACCOUNT'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleResend}
              disabled={isLoading || resendCooldown > 0}
              className="cursor-pointer text-[11px] font-medium text-zinc-500 tracking-wider hover:text-white transition-colors duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend OTP (${resendCooldown}s)` : "ไม่ได้รับรหัส? ส่งใหม่"}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}