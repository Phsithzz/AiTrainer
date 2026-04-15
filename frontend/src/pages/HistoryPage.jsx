import { useNavigate } from "react-router-dom";
import { IoMdArrowRoundBack } from "react-icons/io";
import { RiTodoLine } from "react-icons/ri";
import plank_mode from "../assets/images/plank_mode.png"
import squat_mode from "../assets/images/squat_mode.jpg"
import push_up_mode from "../assets/images/pushmode.png"
const EXERCISE_META = {
  squat:  { label: "SQUAT",   icon: squat_mode, color: "#00ff88", mode: "reps"  },
  pushup: { label: "PUSH UP", icon: push_up_mode, color: "#ff6b35", mode: "reps"  },
  plank:  { label: "PLANK",   icon: plank_mode, color: "#a855f7", mode: "timer" },
};

const formatTime = (sec) => {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export default function HistoryPage({ sessions }) {
  const navigate = useNavigate();

  const totalReps = sessions.filter((s) => EXERCISE_META[s.exercise]?.mode === "reps")
    .reduce((sum, s) => sum + (s.reps || 0), 0);
  const totalGood = sessions.filter((s) => EXERCISE_META[s.exercise]?.mode === "reps")
    .reduce((sum, s) => sum + (s.good_count || 0), 0);
  const totalTime = sessions.filter((s) => EXERCISE_META[s.exercise]?.mode === "timer")
    .reduce((sum, s) => sum + (s.total_time || 0), 0);
  const goodRate  = totalReps > 0 ? Math.round((totalGood / totalReps) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-white">
        <button onClick={() => navigate("/")}
          className="cursor-pointer flex items-center gap-2 text-xs tracking-widest text-white/40 hover:text-white transition-colors">
          <IoMdArrowRoundBack /> BACK  
        </button>
        <span className="text-xs tracking-[0.4em] text-white/30">SESSION HISTORY</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <RiTodoLine className="size-50" />
            <div className="text-white/ text-sm tracking-widest">ยังไม่มีประวัติการฝึก</div>
            <div className="text-white/ text-xs mt-2">เริ่มฝึกและกด FINISH SESSION เพื่อบันทึก</div>
          </div>
        ) : (
          <>
            {/* summary */}
            <div className="grid grid-cols-4 gap-3 mb-10">
              {[
                { label: "SESSIONS",   value: sessions.length,           color: "#fff"    },
                { label: "TOTAL REPS", value: totalReps,                  color: "#00ff88" },
                { label: "PLANK TIME", value: formatTime(totalTime),      color: "#a855f7" },
                { label: "ACCURACY",   value: `${goodRate}%`,             color: goodRate >= 70 ? "#00ff88" : "#ff9500" },
              ].map((s) => (
                <div key={s.label} className="bg-white/3 border border-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black" style={{ fontFamily: "'Arial Black', sans-serif", color: s.color }}>
                    {s.value}
                  </div>
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
                  ? Math.round((s.good_count / s.reps) * 100)
                  : null;

                return (
                  <div key={i}
                    className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-xl px-5 py-4 hover:border-white/10 transition-colors">
                    <img src={meta.icon} className="w-20 h-20"/>                    <div className="flex-1">

                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black tracking-widest" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[10px] text-white/20">#{sessions.length - i}</span>
                      </div>
                      <div className="text-[10px] text-white/25">
                        {s.date?.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}
                      </div>
                    </div>

                    {isTimer ? (
                      /* plank — แสดงเวลา */
                      <div className="text-center">
                        <div className="text-xl font-black" style={{ color: meta.color }}>
                          {formatTime(s.total_time || 0)}
                        </div>
                        <div className="text-[9px] tracking-widest text-white/25">HOLD TIME</div>
                      </div>
                    ) : (
                      /* squat/pushup — แสดง reps */
                      <div className="flex items-center gap-5 text-center">
                        {[
                          ["REPS", s.reps,       "#fff"    ],
                          ["GOOD", s.good_count, "#00ff88" ],
                          ["BAD",  s.bad_count,  "#ff9500" ],
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
    </div>
  );
}