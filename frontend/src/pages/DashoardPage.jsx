import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdArrowRoundBack } from 'react-icons/io';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("กรุณาเข้าสู่ระบบเพื่อดูสถิติ");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/exercise/dashboard`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // ── ฟังก์ชันช่วยจัดรูปแบบข้อความ (เช่น pushup_bad_back -> Pushup Bad Back) ──
  const formatLabel = (rawLabel) => {
    return rawLabel.replace(/_/g, ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00ff88]/20 border-t-[#00ff88] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-black mb-4">{error}</h2>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-white/10 rounded hover:bg-white/20">กลับหน้าหลัก</button>
      </div>
    );
  }

  // ── เตรียมข้อมูลสำหรับ Recharts ──
  const { my_stats, global_stats, comparison } = data;
  
  const chartData = [
    {
      name: 'TOTAL REPS',
      You: my_stats.total_reps,
      GlobalAvg: global_stats.average_reps,
    },
    {
      name: 'ACCURACY %',
      You: my_stats.average_accuracy,
      GlobalAvg: global_stats.average_accuracy,
    },
    {
      name: 'PLANK (Sec)',
      You: my_stats.total_time,
      GlobalAvg: global_stats.average_time,
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-4 md:p-8">
      {/* ── Header ── */}
      <header className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs tracking-widest text-white/50 hover:text-[#00ff88] transition-colors"
        >
          <IoMdArrowRoundBack size={18} /> BACK TO HOME
        </button>
        <h1 className="text-2xl tracking-[0.3em] font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00ff88] to-[#00b8ff]">
          PERFORMANCE DASHBOARD
        </h1>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── Section 1: Summary Cards ── */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/10 blur-[50px] rounded-full" />
            <p className="text-xs tracking-[0.3em] text-white/40 mb-2">MY TOTAL REPS</p>
            <div className="text-6xl font-black text-[#00ff88]">
              {my_stats.total_reps} <span className="text-lg text-white/30 font-normal">reps</span>
            </div>
            <p className="text-xs text-white/50 mt-4">
              {comparison.is_above_average_reps ? "🔥 สูงกว่าค่าเฉลี่ยเซิร์ฟเวอร์!" : "💪 สู้ต่อไป! ยังต่ำกว่าค่าเฉลี่ย"}
            </p>
          </div>

          {/* 🟢 กล่องที่ 2 (ใหม่!): PLANK TIME */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#a855f7]/10 blur-[50px] rounded-full" />
            <p className="text-xs tracking-[0.3em] text-white/40 mb-2">TOTAL PLANK TIME</p>
            <div className="text-6xl font-black text-[#a855f7]">
              {Math.floor(my_stats.total_time / 60)}<span className="text-lg text-white/30 font-normal">m</span> {(my_stats.total_time % 60).toFixed(0)}<span className="text-lg text-white/30 font-normal">s</span>
            </div>
            <p className="text-xs text-white/50 mt-4">
              {comparison.is_above_average_time ? "⏱️ แกนกลางลำตัวแข็งแกร่งกว่าค่าเฉลี่ย!" : "🛡️ เพิ่มเวลา Hold อีกนิดนะ!"}
            </p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00b8ff]/10 blur-[50px] rounded-full" />
            <p className="text-xs tracking-[0.3em] text-white/40 mb-2">MY AVG ACCURACY</p>
            <div className="text-6xl font-black text-[#00b8ff]">
              {my_stats.average_accuracy}% 
            </div>
            <p className="text-xs text-white/50 mt-4">
              {comparison.is_above_average_acc ? "🎯 ฟอร์มเป๊ะมาก! สูงกว่าคนทั่วไป" : "⚠️ เน้นจัดท่าให้ถูกต้องมากกว่าจำนวนครั้งนะ"}
            </p>
          </div>
        </div>

        {/* ── Section 2: Global Comparison Chart ── */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h2 className="text-sm tracking-[0.2em] text-white/60 font-bold mb-6">GLOBAL COMPARISON</h2>
          <div className="flex-1 w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} />
                <YAxis stroke="#ffffff50" tick={{ fill: '#ffffff50', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#ffffff10' }}
                  contentStyle={{ backgroundColor: '#0a0a0f', borderColor: '#ffffff20', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="You" name="สถิติของคุณ" fill="#00ff88" radius={[4, 4, 0, 0]} />
                <Bar dataKey="GlobalAvg" name="ค่าเฉลี่ยรวม" fill="#ffffff20" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Section 3: Weakness Analysis (Drill-down) ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
          <h2 className="text-sm tracking-[0.2em] text-[#ff3b30] font-bold mb-2">WEAKNESS ANALYSIS</h2>
          <p className="text-xs text-white/40 mb-6">จุดอ่อนที่คุณทำผิดพลาดบ่อยที่สุด</p>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {my_stats.weaknesses && my_stats.weaknesses.length > 0 ? (
              my_stats.weaknesses.map(([postureLabel, count], index) => {
                // คำนวณความยาวของหลอด (เทียบกับท่าที่ผิดเยอะสุดซึ่งอยู่ index 0)
                const maxCount = my_stats.weaknesses[0][1];
                const widthPercent = (count / maxCount) * 100;

                return (
                  <div key={postureLabel} className="mb-4">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-bold tracking-wider">{formatLabel(postureLabel)}</span>
                      <span className="text-xs text-[#ff3b30] font-black">{count} ครั้ง</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ff9500] to-[#ff3b30] rounded-full"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-white/20">
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-xs tracking-widest text-center">เยี่ยมมาก!<br/>ไม่พบประวัติการทำผิดฟอร์ม</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}