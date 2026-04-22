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
  }, []);

  // ── ไม่ได้ login ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="relative min-h-screen flex flex-col bg-black overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

        <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b-2 border-white">
          <button onClick={() => navigate("/")}
            className="cursor-pointer flex items-center gap-2 text-xs tracking-widest text-white/40 hover:text-white transition-colors">
            <IoMdArrowRoundBack /> BACK
          </button>
          <span className="text-xs tracking-[0.4em] text-white/30">SESSION HISTORY</span>
          <div className="w-16" />
        </header>

        <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-[10px] tracking-[0.5em] text-white/30 uppercase mb-4">Access Required</div>
          <h1 className="text-6xl font-black tracking-[0.15em] text-white mb-2">HISTORY</h1>
          <h2 className="text-6xl font-black tracking-[0.2em] mb-8"
            style={{ WebkitTextStroke: "2px rgba(255,255,255,0.4)", color: "transparent" }}>
            LOCKED
          </h2>
          <p className="text-white/40 text-sm tracking-widest mb-10">
            เข้าสู่ระบบเพื่อดูประวัติการออกกำลังกายของคุณ
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate("/login")}
              className="px-8 py-3 bg-white text-black font-black text-xs tracking-[0.25em] uppercase hover:bg-black hover:text-white border border-white transition-all">
              LOGIN →
            </button>
            <button onClick={() => navigate("/register")}
              className="px-8 py-3 text-white font-black text-xs tracking-[0.25em] uppercase border border-white/30 hover:border-white transition-all">
              REGISTER
            </button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // ── login แล้ว ──────────────────────────────────────────────────────────────
  const sessions = history;

  const totalReps = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "reps")
    .reduce((sum, s) => sum + (s.reps || 0), 0);
  const totalGood = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "reps")
    .reduce((sum, s) => sum + (s.good || 0), 0);
  const totalTime = sessions.filter(s => EXERCISE_META[s.exercise]?.mode === "timer")
    .reduce((sum, s) => sum + (s.total_time || 0), 0);
  const goodRate  = totalReps > 0 ? Math.round((totalGood / totalReps) * 100) : 0;

  return (
    <div className="relative min-h-screen flex flex-col bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b-2 border-white">
        <button onClick={() => navigate("/")}
          className="cursor-pointer flex items-center gap-2 text-xs tracking-widest text-white/40 hover:text-white transition-colors">
          <IoMdArrowRoundBack /> BACK
        </button>
        <span className="text-xs tracking-[0.4em] text-white/30">SESSION HISTORY</span>
        <div className="w-16" />
      </header>

      <div className="relative z-10 flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {isLoading ? (
          // ── SKELETON LOADING ──────────────────────────────────────────────
          <div className="w-full">
            {/* Skeleton Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center h-[88px] animate-pulse">
                  <div className="w-10 h-6 bg-white/10 rounded mb-2" />
                  <div className="w-16 h-2 bg-white/5 rounded" />
                </div>
              ))}
            </div>

            <div className="text-[10px] tracking-[0.4em] text-white/20 mb-4 animate-pulse">
              <div className="w-20 h-3 bg-white/10 rounded" />
            </div>

            {/* Skeleton Session List */}
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-xl px-5 py-4 animate-pulse">
                  {/* ภาพ Icon */}
                  <div className="w-20 h-20 bg-white/5 rounded-lg shrink-0" />
                  
                  {/* ชื่อท่าและวันที่ */}
                  <div className="flex-1 py-2">
                    <div className="w-24 h-4 bg-white/10 rounded mb-3" />
                    <div className="w-32 h-2.5 bg-white/5 rounded" />
                  </div>

                  {/* สถิติด้านขวา (Reps, Good, Bad, Rate) */}
                  <div className="flex items-center gap-5 pr-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex flex-col items-center">
                        <div className="w-8 h-6 bg-white/10 rounded mb-1.5" />
                        <div className="w-10 h-2 bg-white/5 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <RiTodoLine className="size-20 text-white/10 mb-4" />
            <div className="text-white/50 text-sm tracking-widest">ยังไม่มีประวัติการฝึก</div>
            <div className="text-white/30 text-xs mt-2">เริ่มฝึกและกด FINISH SESSION เพื่อบันทึก</div>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-10">
              {[
                { label: "SESSIONS",   value: sessions.length,       color: "#fff"    },
                { label: "TOTAL REPS", value: totalReps,              color: "#00ff88" },
                { label: "PLANK TIME", value: formatTime(totalTime),  color: "#a855f7" },
                { label: "ACCURACY",   value: `${goodRate}%`,         color: goodRate >= 70 ? "#00ff88" : "#ff9500" },
              ].map((s) => (
                <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] tracking-widest text-white/25 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="text-[10px] tracking-[0.4em] text-white/20 mb-4">SESSIONS</div>
            <div className="flex flex-col gap-3">
              {sessions.map((s, i) => {
                const meta    = EXERCISE_META[s.exercise] || {};
                const isTimer = meta.mode === "timer";
                const rate    = !isTimer && s.reps > 0
                  ? Math.round((s.good / s.reps) * 100)
                  : null;

                return (
                  <div key={i}
                    className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 hover:border-white/10 transition-colors">
                    <img src={meta.icon} className="w-20 h-20 object-contain" alt={meta.label} />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black tracking-widest" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-white/20">#{sessions.length - i}</span>
                      </div>
                      <div className="text-[10px] text-white/25">
                        {s.date
                          ? new Date(s.date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })
                          : "—"}
                      </div>
                    </div>

                    {isTimer ? (
                      <div className="text-center">
                        <div className="text-xl font-black" style={{ color: meta.color }}>
                          {formatTime(s.total_time || 0)}
                        </div>
                        <div className="text-[9px] tracking-widest text-white/25">HOLD TIME</div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-5 text-center">
                        {[
                          ["REPS", s.reps,       "#fff"    ],
                          ["GOOD", s.good, "#00ff88" ],
                          ["BAD",  s.bad,  "#ff9500" ],
                          ["RATE", rate != null ? `${rate}%` : "–",
                           rate != null ? (rate >= 70 ? "#00ff88" : "#ff9500") : "#666"],
                        ].map(([l, v, c]) => (
                          <div key={l}>
                            <div className="text-xl font-black" style={{ color: c }}>{v}</div>
                            <div className="text-[9px] tracking-widest text-white/25">{l}</div>
                          </div>
                        ))}
                      </div>
                    )}
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
    <footer className="relative z-10 flex items-center justify-center gap-4 py-4 border-t-2 border-white">
      <span className="text-[9px] font-black tracking-[0.2em] text-white">MEDIAPIPE</span>
      <span className="w-1 h-1 rounded-full bg-white/60" />
      <span className="text-[9px] font-black tracking-[0.2em] text-white">SKLEARN</span>
      <span className="w-1 h-1 rounded-full bg-white/60" />
      <span className="text-[9px] font-black tracking-[0.2em] text-white">FASTAPI WEBSOCKET</span>
    </footer>
  );
}