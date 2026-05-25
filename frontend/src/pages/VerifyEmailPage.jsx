import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { verifyEmail, isLoading, error } = useAuth();
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const hasVerified = useRef(false);

  useEffect(() => {
    // ป้องกัน React StrictMode ยิง API เบิ้ล 2 รอบ
    if (hasVerified.current) return;
    hasVerified.current = true;

    if (!token) {
      setStatus('error');
      setMessage('ไม่พบ Token สำหรับยืนยันตัวตน');
      return;
    }

    const verify = async () => {
      const msg = await verifyEmail(token);
      if (msg) {
        setStatus('success');
        setMessage(msg);
      } else {
        setStatus('error');
      }
    };

    verify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md border border-white/15 bg-white/3 p-10 text-center">
        <h1 className="text-3xl font-black tracking-widest text-white mb-6">VERIFICATION</h1>
        
        {isLoading || status === 'verifying' ? (
          <div>
            <div className="w-8 h-8 border-4 border-white/20 border-t-[#00ff88] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/50 text-xs tracking-widest uppercase">กำลังตรวจสอบข้อมูล...</p>
          </div>
        ) : status === 'success' ? (
          <div>
            <div className="text-5xl mb-4">✅</div>
            <p className="text-[#00ff88] text-sm tracking-wide mb-8">{message}</p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-white text-black font-black text-[11px] tracking-[0.25em] uppercase hover:bg-[#00ff88] border border-white transition-all duration-200">
              เข้าสู่ระบบ
            </button>
          </div>
        ) : (
          <div>
            <div className="text-5xl mb-4">❌</div>
            <p className="text-red-400 text-sm tracking-wide mb-8">{error || message}</p>
            <button 
              onClick={() => navigate('/register')}
              className="w-full py-3.5 bg-transparent text-white font-black text-[11px] tracking-[0.25em] uppercase hover:bg-white/10 border border-white/30 transition-all duration-200">
              กลับไปหน้าสมัครสมาชิก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}