import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, isLoading, error } = useAuth();
  
  // รับอีเมลที่ส่งมาจากหน้า Register
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return alert("กรุณากรอก OTP ให้ครบ 6 หลัก");
    
    const successMsg = await verifyOtp(email, otp);
    if (successMsg) {
      alert(successMsg); // หรือทำ UI Success สวยๆ แบบที่คุณทำในหน้า Register
      navigate('/login');
    }
  };

  // ถ้าไม่มีอีเมลหลงมา (แอบเข้า URL ตรงๆ) ให้เด้งกลับไปหน้าสมัคร
  if (!email) {
    navigate('/register');
    return null;
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md border border-white/15 bg-white/3 p-10 text-center">
          <div className="text-[10px] tracking-[0.5em] text-[#00ff88] uppercase mb-2 font-normal">SECURITY CHECK</div>
          <h1 className="text-4xl font-black tracking-widest leading-none mb-4 text-white">ENTER OTP</h1>
          
          <p className="text-xs tracking-wide text-white/50 mb-8 font-normal leading-relaxed">
            เราได้ส่งรหัส 6 หลักไปที่ <br/>
            <span className="text-white font-bold tracking-wider">{email}</span>
          </p>

          {error && (
            <div className="flex items-center justify-center gap-2 border border-red-400/40 bg-red-400/8 px-3 py-2.5 mb-6 text-red-400 text-xs tracking-wide">
              <span>!</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input 
              type="text" 
              maxLength="6"
              value={otp} 
              onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} // บังคับกรอกแค่ตัวเลข
              placeholder="• • • • • •"
              className="w-full bg-transparent border border-white/30 text-white text-3xl text-center px-4 py-4 mb-6 outline-none focus:border-[#00ff88] placeholder:text-white/10 tracking-[0.5em] transition-colors"
            />
            
            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase hover:bg-[#00ff88] border border-white transition-all duration-200 disabled:opacity-40">
              {isLoading ? 'VERIFYING...' : 'CONFIRM ACCOUNT'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}