import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import Swal from 'sweetalert2'; // 🟢 Import SweetAlert2

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const username = localStorage.getItem("username") || "GUEST";

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      
      // 🟢 ใช้ SweetAlert ดักจับกรณีไม่มี Token
      if (!token) {
        setLoading(false);
        Swal.fire({
          icon: 'warning',
          title: 'ACCESS DENIED',
          text: 'กรุณาเข้าสู่ระบบเพื่อดูสถิติ',
          background: '#18181b',
          color: '#a1a1aa',
          confirmButtonText: 'GO TO LOGIN',
          confirmButtonColor: '#eab308',
          customClass: {
            popup: 'border border-yellow-500/30 rounded-3xl',
            title: 'text-yellow-500 font-black tracking-widest text-xl',
            confirmButton: 'text-black font-bold tracking-widest rounded-full px-8 py-3 mt-2'
          }
        }).then(() => {
          navigate('/login');
        });
        return;
      }

      try {
        const res = await fetch(`${API_URL}/exercise/dashboard`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch dashboard data.");
        
        const result = await res.json();
        setData(result);
      } catch (err) {
        // 🟢 ใช้ SweetAlert ดักจับกรณี API พัง หรือดึงข้อมูลไม่ได้
        Swal.fire({
          icon: 'error',
          title: 'SYSTEM ERROR',
          text: err.message || 'ไม่สามารถโหลดข้อมูลแดชบอร์ดได้',
          background: '#18181b',
          color: '#a1a1aa',
          confirmButtonText: 'BACK TO HOME',
          confirmButtonColor: '#ef4444',
          customClass: {
            popup: 'border border-red-500/30 rounded-3xl',
            title: 'text-red-500 font-black tracking-widest text-xl',
            confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2'
          }
        }).then(() => {
          navigate('/');
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const formatLabel = (rawLabel) => {
    return rawLabel.replace(/_/g, ' ').toUpperCase();
  };

  // 🟢 Loading State ปรับให้ดูล้ำยุคเข้ากับธีม
  if (loading || !data) {
    return (
      <div className="relative min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-zinc-800 border-t-[#00ff88] rounded-full animate-spin shadow-[0_0_15px_rgba(0,255,136,0.3)]" />
          <div className="text-[10px] tracking-[0.4em] text-[#00ff88] uppercase font-bold animate-pulse">
            ANALYZING DATA...
          </div>
        </div>
      </div>
    );
  }

  const { my_stats, global_stats, comparison } = data;
  
  // 🟢 1. ข้อมูลกราฟเปรียบเทียบกับ "เกณฑ์มาตรฐานคนทั่วไป"
  const standardChartData = [
    { name: 'SQUAT (Reps)', You: my_stats.reps_by_ex.squat, Standard: 15 },
    { name: 'PUSH UP (Reps)', You: my_stats.reps_by_ex.pushup, Standard: 10 },
   
    { name: 'PLANK (Sec)', You: my_stats.time_by_ex.plank, Standard: 45 }
  ];

  // 🟢 2. ข้อมูลกราฟเปรียบเทียบกับ "คนทั้งเซิร์ฟเวอร์"
  const globalChartData = [
    { name: 'SQUAT (Reps)', You: my_stats.reps_by_ex.squat, GlobalAvg: global_stats.reps_by_ex.squat },
    { name: 'PUSH UP (Reps)', You: my_stats.reps_by_ex.pushup, GlobalAvg: global_stats.reps_by_ex.pushup },
 
    { name: 'PLANK (Sec)', You: my_stats.time_by_ex.plank, GlobalAvg: global_stats.time_by_ex.plank }
  ];

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden selection:bg-white/30 pb-16">
      
      {/* 🟢 Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm mb-8">
        <button 
          onClick={() => navigate('/')}
          className="cursor-pointer flex items-center gap-3 text-[11px] font-bold tracking-widest text-zinc-400 hover:text-white transition-colors duration-300 bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 hover:border-white/50"
        >
          <IoMdArrowRoundBack size={16} /> BACK TO HOME
        </button>
        
        <h1 className="text-xl md:text-2xl tracking-[0.3em] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b8ff] hidden md:block drop-shadow-md">
          PERFORMANCE DASHBOARD
        </h1>

        <div className="flex items-center gap-4">
          <span className="hidden md:block text-[11px] tracking-widest text-zinc-400 uppercase font-medium">
            {username.split('@')[0]}
          </span>
          <div onClick={() => navigate('/profile')} className="cursor-pointer w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-black text-sm uppercase shadow-inner hover:border-[#00ff88] hover:text-[#00ff88] transition-colors duration-300">
            {username.substring(0, 1)}
          </div>
        </div>
      </header>

      {/* ── Main Dashboard Content ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Section 1: Summary Cards ── */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* กล่องที่ 1: TOTAL REPS */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/10 blur-[50px] rounded-full pointer-events-none" />
            <p className="text-[10px] tracking-[0.3em] text-zinc-400 font-bold mb-2">MY TOTAL REPS</p>
            
            <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(0,255,136,0.2)]">
              {my_stats.total_reps} <span className="text-lg text-zinc-500 font-normal">reps</span>
            </div>
            
            <div className="flex gap-4 mt-6 border-t border-white/5 pt-5">
              <div className="text-[11px] tracking-widest text-zinc-400 font-medium">
                <span className="text-[#00ff88] font-black mr-2">SQUAT</span> 
                {my_stats.reps_by_ex.squat}
              </div>
              <div className="w-px h-4 bg-zinc-700"></div>
              <div className="text-[11px] tracking-widest text-zinc-400 font-medium">
                <span className="text-[#ff6b35] font-black mr-2">PUSH UP</span> 
                {my_stats.reps_by_ex.pushup}
              </div>
            </div>
          </div>

          {/* กล่องที่ 2: PLANK TIME */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden flex flex-col justify-between backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#a855f7]/10 blur-[50px] rounded-full pointer-events-none" />
            <p className="text-[10px] tracking-[0.3em] text-zinc-400 font-bold mb-2">TOTAL PLANK TIME</p>
            <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              {Math.floor(my_stats.total_time / 60)}<span className="text-lg text-zinc-500 font-normal ml-1 mr-2">m</span> 
              {(my_stats.total_time % 60).toFixed(0)}<span className="text-lg text-zinc-500 font-normal ml-1">s</span>
            </div>
            <p className="text-xs font-medium tracking-wide text-zinc-400 mt-6 bg-black/30 px-4 py-2.5 rounded-lg border border-white/5">
              {comparison.is_above_average_time ? "⏱️ แกนกลางลำตัวแข็งแกร่งกว่าค่าเฉลี่ย!" : "🛡️ เพิ่มเวลา Hold อีกนิดนะ!"}
            </p>
          </div>
          
          {/* กล่องที่ 3: MY AVG ACCURACY */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden backdrop-blur-md shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 cursor-default">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00b8ff]/10 blur-[50px] rounded-full pointer-events-none" />
            <p className="text-[10px] tracking-[0.3em] text-zinc-400 font-bold mb-2">MY AVG ACCURACY</p>
            
            <div className="text-6xl font-black text-white drop-shadow-[0_0_15px_rgba(0,184,255,0.2)]">
              {my_stats.average_accuracy}% 
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-white/5 pt-5">
              <div>
                <p className="text-[9px] tracking-[0.2em] text-zinc-500 font-bold mb-1">SQUAT</p>
                <p className="text-sm font-black text-[#00ff88]">{my_stats.acc_by_ex.squat}%</p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] text-zinc-500 font-bold mb-1">PUSH UP</p>
                <p className="text-sm font-black text-[#ff6b35]">{my_stats.acc_by_ex.pushup}%</p>
              </div>
            </div>
            
            <p className="text-xs font-medium tracking-wide text-zinc-400 mt-5">
              {comparison.is_above_average_acc ? "🎯 ฟอร์มเป๊ะมาก! สูงกว่าคนทั่วไป" : "⚠️ เน้นจัดท่าให้ถูกต้องมากกว่าจำนวนครั้งนะ"}
            </p>
          </div>
        </div>

        {/* ── Section 2: Charts Area (2 กราฟซ้อนกัน) ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* กราฟที่ 1: เปรียบเทียบมาตรฐานคนทั่วไป */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col backdrop-blur-md shadow-xl cursor-default">
            <h2 className="text-[11px] tracking-[0.2em] text-[#00b8ff] font-black mb-8 drop-shadow-[0_0_8px_rgba(0,184,255,0.4)]">
              STANDARD BENCHMARK
            </h2>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={standardChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold', color: '#a1a1aa' }} />
                  <Bar dataKey="You" name="Your Stats" fill="#00ff88" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Standard" name="Standard Goal" fill="#00b8ff40" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* กราฟที่ 2: เปรียบเทียบผู้ใช้ทั้งระบบ */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col backdrop-blur-md shadow-xl cursor-default">
            <h2 className="text-[11px] tracking-[0.2em] text-zinc-400 font-black mb-8">
              GLOBAL SERVER AVERAGE
            </h2>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={globalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 'bold' }} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '20px', fontWeight: 'bold', color: '#a1a1aa' }} />
                  <Bar dataKey="You" name="Your Stats" fill="#00ff88" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="GlobalAvg" name="Global Average" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ── Section 3: Weakness Analysis (Drill-down) ── */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col h-[650px] lg:h-auto backdrop-blur-md shadow-xl cursor-default">
          <h2 className="text-[11px] tracking-[0.2em] text-[#ef4444] font-black mb-2 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            WEAKNESS ANALYSIS
          </h2>
          <p className="text-[11px] tracking-wide text-zinc-500 font-medium mb-8">
            จุดอ่อนที่คุณทำผิดพลาดบ่อยที่สุด (แยกตามท่า)
          </p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
            {my_stats.weaknesses && my_stats.weaknesses.length > 0 ? (
              
              ['squat', 'pushup', 'plank'].map((exerciseName) => {
                
                const filteredWeaknesses = my_stats.weaknesses.filter(([label]) => label.startsWith(exerciseName));

                if (filteredWeaknesses.length === 0) return null;

                const exColors = { squat: "#00ff88", pushup: "#ff6b35", plank: "#a855f7" };
                const exColor = exColors[exerciseName];
                const displayName = exerciseName === 'pushup' ? 'PUSH UP' : exerciseName.toUpperCase();

                return (
                  <div key={exerciseName} className="mb-4 bg-black/40 p-5 rounded-2xl border border-white/5">
                    
                    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/5">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: exColor, color: exColor }} />
                      <div className="text-[11px] tracking-[0.3em] font-black" style={{ color: exColor }}>
                        {displayName}
                      </div>
                    </div>

                    {filteredWeaknesses.map(([postureLabel, count]) => {
                      const maxCount = filteredWeaknesses[0][1];
                      const widthPercent = (count / maxCount) * 100;
                      
                      const cleanLabel = formatLabel(postureLabel).replace(exerciseName.toUpperCase(), '').trim();

                      return (
                        <div key={postureLabel} className="mb-4 last:mb-0">
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-[11px] font-bold tracking-wider text-zinc-300">{cleanLabel}</span>
                            <span className="text-[10px] text-[#ef4444] font-black bg-[#ef4444]/10 px-2 py-1 rounded-md border border-[#ef4444]/20">{count} ครั้ง</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-1000 ease-out"
                              style={{ 
                                width: `${widthPercent}%`,
                                background: `linear-gradient(90deg, ${exColor}40, ${exColor})` 
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <div className="text-5xl mb-4 opacity-50 grayscale">🏆</div>
                <p className="text-[11px] tracking-[0.2em] font-bold text-center uppercase">
                  EXCELLENT FORM<br/>
                  <span className="text-zinc-600 font-medium tracking-wide text-[10px] mt-2 block">No weaknesses detected</span>
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}