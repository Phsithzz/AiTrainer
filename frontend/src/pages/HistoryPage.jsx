import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { RiTodoLine } from "react-icons/ri";
import plank_mode from "../assets/images/plank_mode.png";
import squat_mode from "../assets/images/squat_mode.jpg";
import push_up_mode from "../assets/images/pushmode.png";

const EXERCISE_META = {
  squat:  { label: "SQUAT",   icon: squat_mode,   color: "#00ff88", mode: "reps"  },
  pushup: { label: "PUSH UP", icon: push_up_mode, color: "#ff6b35", mode: "reps"  },
  plank:  { label: "PLANK",   icon: plank_mode,   color: "#a855f7", mode: "timer" },
};

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export default function HistoryPage({ history, fetchHistory, isLoading }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (token) fetchHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 1. กรณีไม่ได้ login (แสดงหน้า LOCKED) ──────────────────────────────────
  if (!token) {
    return (
      <div className="relative min-h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden selection:bg-white/30">
        
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
          <button onClick={() => navigate("/")}
            className="cursor-pointer flex items-center gap-3 text-[11px] font-bold tracking-widest text-zinc-400 hover:text-white transition-colors duration-300 bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 hover:border-white/50">
            <IoMdArrowRoundBack size={16} /> BACK TO HOME
          </button>
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-900/40 p-10 rounded-3xl backdrop-blur-md shadow-[0_10px_50px_rgba(0,0,0,0.5)]">
            <div className="text-[10px] tracking-[0.4em] text-red-500 uppercase mb-4 font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]">
              Access Required
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-widest text-white mb-2">HISTORY</h1>
            <h2 className="text-4xl md:text-5xl font-black tracking-[0.15em] mb-8"
              style={{ WebkitTextStroke: "1px rgba(255,255,255,0.4)", color: "transparent" }}>
              LOCKED
            </h2>
            <p className="text-zinc-400 text-[11px] tracking-widest mb-10 font-medium">
              กรุณาเข้าสู่ระบบเพื่อดูประวัติการฝึกซ้อมของคุณ
            </p>
            <div className="flex gap-4">
              <button onClick={() => navigate("/login")}
                className="cursor-pointer flex-1 py-3.5 bg-white text-black font-black text-[11px] tracking-[0.2em] uppercase rounded-full hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300">
                LOGIN →
              </button>
              <button onClick={() => navigate("/register")}
                className="cursor-pointer flex-1 py-3.5 text-zinc-400 font-bold text-[11px] tracking-[0.2em] uppercase rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white transition-all duration-300">
                REGISTER
              </button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ── 2. กรณี login แล้ว (แสดงประวัติ) ──────────────────────────────────────
  const sessions = history || [];

  const totalReps = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "reps").reduce((sum, s) => sum + (s.reps || 0), 0);
  // eslint-disable-next-line no-unused-vars
  const totalGood = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "reps").reduce((sum, s) => sum + (s.good || 0), 0);
  const totalTime = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "timer").reduce((sum, s) => sum + (s.total_time || 0), 0);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden selection:bg-white/30">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm mb-6">
        <button onClick={() => navigate("/")}
          className="cursor-pointer flex items-center gap-3 text-[11px] font-bold tracking-widest text-zinc-400 hover:text-white transition-colors duration-300 bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 hover:border-white/50">
          <IoMdArrowRoundBack size={16} /> BACK TO HOME
        </button>
        <span className="text-xl md:text-2xl tracking-[0.3em] font-black text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-500 hidden md:block drop-shadow-md">
          SESSION HISTORY
        </span>
        <div className="w-24 hidden md:block" /> {/* Spacer */}
      </header>

      <div className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-6 py-6 mb-12">
        {isLoading ? (
          // ── SKELETON LOADING (Futuristic UI) ────────────────────────────────
          <div className="w-full">
            {/* Skeleton Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center h-[120px] animate-pulse backdrop-blur-sm">
                  <div className="w-16 h-8 bg-zinc-700/50 rounded-md mb-3" />
                  <div className="w-24 h-3 bg-zinc-800 rounded-full" />
                </div>
              ))}
            </div>

            <div className="text-[11px] tracking-[0.4em] text-zinc-600 font-bold mb-4 animate-pulse">
              <div className="w-24 h-4 bg-zinc-800 rounded-md" />
            </div>

            {/* Skeleton Session List */}
            <div className="flex flex-col gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl px-6 py-5 animate-pulse backdrop-blur-sm">
                  <div className="w-20 h-20 bg-zinc-800 rounded-2xl shrink-0" />
                  <div className="flex-1 py-2">
                    <div className="w-32 h-5 bg-zinc-700/50 rounded-md mb-3" />
                    <div className="w-40 h-3 bg-zinc-800 rounded-full" />
                  </div>
                  <div className="hidden md:flex items-center gap-6 pr-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex flex-col items-center">
                        <div className="w-10 h-6 bg-zinc-700/50 rounded-md mb-2" />
                        <div className="w-12 h-2 bg-zinc-800 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sessions.length === 0 ? (
          // ── EMPTY STATE ──────────────────────────────────────────────────
          <div className="flex flex-col items-center justify-center h-[60vh] text-center bg-zinc-900/20 border border-zinc-800/50 rounded-3xl backdrop-blur-sm">
            <RiTodoLine className="size-24 text-zinc-700 mb-6 drop-shadow-lg" />
            <div className="text-zinc-400 text-[11px] font-bold tracking-[0.2em] uppercase mb-2">ยังไม่มีประวัติการฝึกซ้อม</div>
            <div className="text-zinc-600 text-xs font-medium tracking-wide">เริ่มฝึกและกด FINISH SESSION เพื่อบันทึกข้อมูล</div>
          </div>
        ) : (
          // ── POPULATED STATE ──────────────────────────────────────────────
          <>
            {/* Summary stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { label: "TOTAL SESSIONS", value: sessions.length,  color: "#ffffff" },
                { label: "TOTAL REPS",     value: totalReps,        color: "#00ff88" },
                { label: "TOTAL PLANK TIME",value: formatTime(totalTime), color: "#a855f7" },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 text-center backdrop-blur-md shadow-lg transition-transform duration-300 hover:-translate-y-1 cursor-default">
                  <div className="text-4xl font-black drop-shadow-md mb-2" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="text-[11px] font-black tracking-[0.3em] text-zinc-500 mb-4 uppercase drop-shadow-sm">ALL SESSIONS</div>
            
            <div className="flex flex-col gap-4">
              {sessions.map((s, i) => {
                const meta    = EXERCISE_META[s.exercise] || {};
                const isTimer = meta.mode === "timer";
                const rate    = !isTimer && s.reps > 0
                  ? Math.round((s.good / s.reps) * 100)
                  : null;

                return (
                  <div key={i}
                    className="group flex flex-col md:flex-row items-start md:items-center gap-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-5 md:px-6 md:py-5 backdrop-blur-sm transition-all duration-300 hover:bg-zinc-800/40 hover:border-zinc-600 shadow-md cursor-default relative overflow-hidden">
                    
                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 10% 50%, ${meta.color}10 0%, transparent 40%)` }} />

                    <img src={meta.icon} className="w-20 h-20 object-contain drop-shadow-lg shrink-0 rounded-2xl bg-black/40 p-2 border border-white/5" alt={meta.label} />

                    <div className="flex-1 w-full relative z-10">
                      <div className="flex items-center justify-between md:justify-start gap-4 mb-2">
                        <span className="text-sm font-black tracking-[0.15em] drop-shadow-sm" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-600 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                          #{sessions.length - i}
                        </span>
                      </div>
                      <div className="text-[11px] font-medium tracking-wide text-zinc-400">
                        {s.date
                          ? new Date(s.date).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
                          : "—"}
                      </div>
                    </div>

                    <div className="w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-zinc-800 md:border-none relative z-10">
                      {isTimer ? (
                        <div className="text-center md:text-right pr-2">
                          <div className="text-2xl font-black drop-shadow-md mb-1" style={{ color: meta.color }}>
                            {formatTime(s.total_time || 0)}
                          </div>
                          <div className="text-[10px] font-bold tracking-[0.2em] text-zinc-500">HOLD TIME</div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between md:justify-end gap-6 text-center px-2 md:px-0">
                          {[
                            ["REPS", s.reps,       "#ffffff" ],
                            ["GOOD", s.good,       "#00ff88" ],
                            ["BAD",  s.bad,        "#ef4444" ], // เปลี่ยนสีส้มเป็นแดงให้ดูชัดเจน
                            ["RATE", rate != null ? `${rate}%` : "–",
                              rate != null ? (rate >= 70 ? "#00ff88" : "#ef4444") : "#52525b"],
                          ].map(([l, v, c]) => (
                            <div key={l} className="flex flex-col items-center">
                              <div className="text-xl md:text-2xl font-black drop-shadow-md mb-1" style={{ color: c }}>{v}</div>
                              <div className="text-[9px] font-bold tracking-[0.2em] text-zinc-500">{l}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 flex flex-wrap items-center justify-center gap-4 md:gap-8 py-6 border-t border-white/5 bg-black/40 backdrop-blur-md text-[10px] text-zinc-500 tracking-widest uppercase font-medium mt-auto">
      <span>MEDIAPIPE</span>
      <span className="hidden md:block w-1 h-1 rounded-full bg-zinc-700" />
      <span>SKLEARN</span>
      <span className="hidden md:block w-1 h-1 rounded-full bg-zinc-700" />
      <span>FASTAPI WEBSOCKET</span>
    </footer>
  );
}