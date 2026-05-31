import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Swal from 'sweetalert2';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

export default function ProfilePage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [showOldPw, setShowOldPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const { getProfile, updateProfile, requestEmailChange, verifyEmailChange, isLoading, error } = useAuth();
  const navigate = useNavigate();

  // ── ดึงข้อมูลผู้ใช้ตอนโหลดหน้า ──
  useEffect(() => {
    const fetchUserData = async () => {
      const data = await getProfile();
      if (data) {
        setUsername(data.username);
        setEmail(data.email);
        setOriginalEmail(data.email);
      } else {
        navigate('/login'); // ถ้าดึงข้อมูลไม่ได้ (Token หมดอายุ) ให้เตะไปล็อกอิน
      }
      setIsFetching(false);
    };
    fetchUserData();
  }, []);

  // ── กดปุ่มบันทึก ──
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    const showError = (msg) => Swal.fire({
      icon: 'warning', title: 'UPDATE FAILED', text: msg,
      background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#eab308',
      customClass: { popup: 'border border-yellow-500/30 rounded-3xl', title: 'text-yellow-500 font-black tracking-widest', confirmButton: 'text-black font-bold tracking-widest rounded-full px-8 py-3 mt-2' }
    });

    if (!username.trim() || !email.trim()) return showError("Username และ Email ห้ามเป็นค่าว่าง");

    const emailChanged = email !== originalEmail;

    // ถ้า Email เปลี่ยน → ต้องกรอก password ปัจจุบันก่อน แล้วทำ OTP flow
    if (emailChanged) {
      if (!oldPassword) return showError("ต้องกรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยน Email");

      // Step 1: ขอ OTP ส่งไปยัง email ใหม่
      const reqMsg = await requestEmailChange(oldPassword, email);
      if (!reqMsg) return;

      // Step 2: แสดง OTP input
      const { value: otpInput, isDismissed } = await Swal.fire({
        title: 'VERIFY NEW EMAIL',
        html: `<p style="color:#a1a1aa;font-size:12px;letter-spacing:0.1em;margin-bottom:16px">กรอก OTP 6 หลักที่ส่งไปยัง<br><b style="color:#fff">${email}</b><br><span style="color:#71717a;font-size:10px">(หมดอายุใน 5 นาที)</span></p>`,
        input: 'text',
        inputAttributes: { maxlength: '6', style: 'text-align:center;letter-spacing:0.5em;font-size:1.5rem;font-weight:900;color:#00ff88;background:#000;border:1px solid rgba(0,255,136,0.3);border-radius:12px;padding:12px' },
        inputPlaceholder: '• • • • • •',
        background: '#18181b',
        color: '#a1a1aa',
        confirmButtonText: 'CONFIRM EMAIL',
        confirmButtonColor: '#00ff88',
        showCancelButton: true,
        cancelButtonText: 'CANCEL',
        customClass: { popup: 'border border-[#00ff88]/30 rounded-3xl', title: 'text-[#00ff88] font-black tracking-widest text-xl', confirmButton: 'text-black font-black tracking-widest rounded-full px-8 py-3', cancelButton: 'text-zinc-400 font-bold tracking-widest rounded-full px-8 py-3' },
        preConfirm: (val) => {
          if (!val || val.length !== 6) {
            Swal.showValidationMessage('กรุณากรอก OTP ให้ครบ 6 หลัก');
          }
          return val;
        }
      });

      if (isDismissed || !otpInput) {
        setEmail(originalEmail);
        return;
      }

      // Step 3: ยืนยัน OTP
      const verifyMsg = await verifyEmailChange(otpInput);
      if (!verifyMsg) return;

      setOriginalEmail(email);
    }

    // ตรวจสอบกรณีที่มีการเปลี่ยนรหัสผ่าน
    if (newPassword) {
      if (!oldPassword) return showError("กรุณากรอกรหัสผ่านปัจจุบัน เพื่อยืนยันการเปลี่ยนรหัสผ่านใหม่");
      if (newPassword.length < 8) return showError("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      if (newPassword !== confirmPw) return showError("รหัสผ่านใหม่ทั้ง 2 ช่องไม่ตรงกัน");
    }

    // อัปเดต username / password (ไม่รวม email แล้ว)
    const profileData = { username: username.toLowerCase() };
    if (oldPassword) profileData.old_password = oldPassword;
    if (newPassword) profileData.new_password = newPassword;

    const msg = await updateProfile(profileData);
    if (msg || emailChanged) {
      Swal.fire({
        icon: 'success', title: 'PROFILE UPDATED', text: 'อัปเดตข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว',
        background: '#18181b', color: '#a1a1aa', confirmButtonColor: '#00ff88',
        customClass: { popup: 'border border-[#00ff88]/30 rounded-3xl', title: 'text-[#00ff88] font-black tracking-widest text-xl', confirmButton: 'text-black font-black tracking-widest rounded-full px-8 py-3 mt-2' }
      });
      setOldPassword('');
      setNewPassword('');
      setConfirmPw('');
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-[#0a0a0a] text-white selection:bg-white/30">
      
      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs tracking-widest text-zinc-400 hover:text-[#00ff88] transition-colors cursor-pointer">
          <IoMdArrowRoundBack size={18} /> BACK
        </button>
        <Link to="/" className="flex items-center gap-4 group cursor-pointer">
          <span className="hidden md:block text-xs font-medium tracking-[0.25em] text-zinc-400 uppercase group-hover:text-white transition-colors duration-300">
            Form Trainer
          </span>
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-black text-sm group-hover:bg-zinc-200 transition-colors duration-300">AI</div>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl border border-zinc-800 bg-zinc-900/40 p-8 md:p-12 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-[10px] tracking-[0.4em] text-[#00b8ff] uppercase mb-2 font-bold drop-shadow-[0_0_8px_rgba(0,184,255,0.4)]">
            USER CONFIGURATION
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-widest leading-none mb-8 text-white"
            style={{ WebkitTextStroke: '1px rgba(255,255,255,0.4)', color: 'transparent' }}>
            ACCOUNT
          </h1>

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 mb-6 rounded-lg text-red-400 text-xs tracking-wide">
              <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center font-bold">!</div>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile}>
            
            {/* ── Section 1: Identity ── */}
            <div className="mb-8">
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-zinc-400 border-b border-zinc-800 pb-2 mb-4 uppercase">Identity Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">Username</label>
                  <input 
                    type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase())}
                    className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">Email</label>
                  <input 
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-600 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Security ── */}
            <div className="mb-10">
              <h3 className="text-[11px] font-bold tracking-[0.2em] text-[#ff9500]/60 border-b border-zinc-800 pb-2 mb-4 uppercase">Security (Optional)</h3>
              
              <p className="text-[10px] text-zinc-600 tracking-wide mb-4">* ต้องกรอกรหัสผ่านปัจจุบันเมื่อต้องการเปลี่ยน Email หรือ Password</p>

              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showOldPw ? 'text' : 'password'} value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="รหัสผ่านปัจจุบัน"
                    className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3 pr-12 rounded-xl outline-none focus:border-zinc-400 focus:bg-zinc-900 placeholder:text-zinc-700 transition-all duration-300"
                  />
                  <button type="button" onClick={() => setShowOldPw(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                    {showOldPw ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="รหัสผ่านใหม่"
                      className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3 pr-12 rounded-xl outline-none focus:border-[#ff9500]/50 focus:bg-zinc-900 placeholder:text-zinc-700 transition-all duration-300"
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                      {showNewPw ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2 pl-1">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="ยืนยันรหัสผ่านใหม่"
                      className="w-full bg-black/40 border border-zinc-800 text-white text-sm px-5 py-3 pr-12 rounded-xl outline-none focus:border-[#ff9500]/50 focus:bg-zinc-900 placeholder:text-zinc-700 transition-all duration-300"
                    />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors cursor-pointer">
                      {showConfirmPw ? <AiOutlineEyeInvisible size={18} /> : <AiOutlineEye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" disabled={isLoading}
              className="cursor-pointer w-full py-4 bg-white text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-[#00ff88] hover:shadow-[0_0_20px_rgba(0,255,136,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'UPDATING PROFILE...' : 'SAVE CHANGES'}
            </button>
          </form>

        </div>
      </main>
    </div>
  );
}