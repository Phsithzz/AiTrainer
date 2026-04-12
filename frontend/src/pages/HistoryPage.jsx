import { useNavigate } from "react-router-dom";

const EXERCISE_LABEL = {
  squat:  { label: "SQUAT",   icon: "🏋️", color: "#00ff88" },
  plank:  { label: "PLANK",   icon: "💪", color: "#ff6b35" },
  pushup: { label: "PUSH UP", icon: "🔥", color: "#a855f7" },
};

const  HistoryPage = ({ sessions })=> {
  const totalReps = sessions.reduce((s, x) => s + (x.reps || 0), 0);
  const totalGood = sessions.reduce((s, x) => s + (x.good_count || 0), 0);
  const totalBad  = sessions.reduce((s, x) => s + (x.bad_count || 0), 0);
  const goodRate  = totalReps > 0 ? Math.round((totalGood / totalReps) * 100) : 0;
  const navigate = useNavigate();

  // แทนที่ onBack() ด้วย:
  const goBack = () => navigate("/");
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={goBack}
          className="text-xs tracking-widest text-white/40 hover:text-white transition-colors"
        >
          ← BACK
        </button>
        <span className="text-xs tracking-[0.4em] text-white/30">SESSION HISTORY</span>
        <div className="w-16" />
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-4xl mb-4 opacity-30">📋</div>
            <div className="text-white/20 text-sm tracking-widest">
              ยังไม่มีประวัติการฝึก
            </div>
            <div className="text-white/10 text-xs mt-2">
              เริ่มฝึกและกด FINISH SESSION เพื่อบันทึก
            </div>
          </div>
        ) : (
          <>
            {/* summary */}
            <div className="grid grid-cols-4 gap-3 mb-10">
              {[
                { label: "SESSIONS",  value: sessions.length, color: "#fff" },
                { label: "TOTAL REPS", value: totalReps, color: "#00ff88" },
                { label: "GOOD FORM", value: totalGood, color: "#00ff88" },
                { label: "ACCURACY",  value: `${goodRate}%`, color: goodRate >= 70 ? "#00ff88" : "#ff9500" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/[0.03] border border-white/5 rounded-xl p-4 text-center"
                >
                  <div
                    className="text-2xl font-black"
                    style={{
                      fontFamily: "'Arial Black', sans-serif",
                      color: s.color,
                    }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[9px] tracking-widest text-white/25 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            {/* session list */}
            <div className="text-[10px] tracking-[0.4em] text-white/20 mb-4">
              SESSIONS
            </div>
            <div className="flex flex-col gap-3">
              {sessions.map((s, i) => {
                const ex  = EXERCISE_LABEL[s.exercise] || {};
                const rate = s.reps > 0 ? Math.round((s.good_count / s.reps) * 100) : 0;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 hover:border-white/10 transition-colors"
                  >
                    <div className="text-2xl">{ex.icon}</div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-black tracking-widest"
                          style={{ color: ex.color }}
                        >
                          {ex.label}
                        </span>
                        <span className="text-[10px] text-white/20">
                          #{sessions.length - i}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/25">
                        {s.date?.toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-center">
                      <div>
                        <div className="text-xl font-black text-white">{s.reps}</div>
                        <div className="text-[9px] tracking-widest text-white/25">REPS</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-[#00ff88]">{s.good_count}</div>
                        <div className="text-[9px] tracking-widest text-white/25">GOOD</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-[#ff9500]">{s.bad_count}</div>
                        <div className="text-[9px] tracking-widest text-white/25">BAD</div>
                      </div>
                      <div>
                        <div
                          className="text-xl font-black"
                          style={{ color: rate >= 70 ? "#00ff88" : "#ff9500" }}
                        >
                          {rate}%
                        </div>
                        <div className="text-[9px] tracking-widest text-white/25">RATE</div>
                      </div>
                    </div>
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

export default HistoryPage