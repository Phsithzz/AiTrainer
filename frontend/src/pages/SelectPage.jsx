import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
const EXERCISES = [
  {
    id: "squat",
    label: "SQUAT",
    thai: "สควอท",
    icon: "🏋️",
    desc: "ฝึกกล้ามเนื้อขาและสะโพก",
    available: true,
    accent: "#00ff88",
  },
  {
    id: "plank",
    label: "PLANK",
    thai: "แพลงก์",
    icon: "💪",
    desc: "เสริมความแข็งแรงของแกนกลางลำตัว",
    available: false,
    accent: "#ff6b35",
  },
  {
    id: "pushup",
    label: "PUSH UP",
    thai: "วิดพื้น",
    icon: "🔥",
    desc: "ฝึกกล้ามเนื้อหน้าอกและแขน",
    available: false,
    accent: "#a855f7",
  },
];

const SelectPage = ({  sessions }) =>{
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // แทนที่ onSelect(ex.id) ด้วย:
  const goTrain = (id) => navigate(`/train/${id}`);

  // แทนที่ onHistory() ด้วย:
  const goHistory = () => navigate("/history");
  // animated grid background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let animId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = 24;
      const rows = 16;
      const cw = canvas.width / cols;
      const ch = canvas.height / rows;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const dist = Math.sqrt(
            Math.pow(c - cols / 2, 2) + Math.pow(r - rows / 2, 2)
          );
          const pulse = Math.sin(frame * 0.015 - dist * 0.35) * 0.5 + 0.5;
          const alpha = pulse * 0.12;
          ctx.beginPath();
          ctx.arc(c * cw, r * ch, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,136,${alpha})`;
          ctx.fill();
        }
      }

      // scan line
      const scanY = ((frame * 1.5) % canvas.height);
      const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 4);
      grad.addColorStop(0, "rgba(0,255,136,0)");
      grad.addColorStop(1, "rgba(0,255,136,0.04)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, scanY - 60, canvas.width, 64);

      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const totalReps = sessions.reduce((s, x) => s + (x.reps || 0), 0);
  const totalGood = sessions.reduce((s, x) => s + (x.good_count || 0), 0);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-[#00ff88] flex items-center justify-center">
            <span className="text-black text-xs font-black">AI</span>
          </div>
          <span className="text-sm tracking-[0.3em] text-white/60 uppercase">
            Form Trainer
          </span>
        </div>

        <div className="flex items-center gap-6">
          {sessions.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>
                <span className="text-[#00ff88]">{totalReps}</span> TOTAL REPS
              </span>
              <span>
                <span className="text-[#00ff88]">{totalGood}</span> GOOD FORM
              </span>
            </div>
          )}
          <button
            onClick={goHistory}
            className="text-xs tracking-widest text-white/40 hover:text-[#00ff88] transition-colors border border-white/10 hover:border-[#00ff88]/40 px-4 py-2 rounded"
          >
            HISTORY
          </button>
        </div>
      </header>

      {/* hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-2 text-[#00ff88] text-xs tracking-[0.5em] uppercase">
          AI-Powered
        </div>
        <h1 className="text-center mb-4">
          <span
            className="block text-6xl md:text-8xl font-black tracking-tight text-white leading-none"
            style={{ fontFamily: "'Arial Black', sans-serif" }}
          >
            WORKOUT
          </span>
          <span
            className="block text-6xl md:text-8xl font-black tracking-tight leading-none"
            style={{
              fontFamily: "'Arial Black', sans-serif",
              WebkitTextStroke: "2px #00ff88",
              color: "transparent",
            }}
          >
            TRAINER
          </span>
        </h1>
        <p className="text-white/30 text-sm tracking-widest mb-16 text-center">
          เลือกท่าออกกำลังกาย — AI จะวิเคราะห์ฟอร์มของคุณ real-time
        </p>

        {/* exercise cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {EXERCISES.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              index={i}
              onSelect={() => ex.available && goTrain(ex.id)}
              sessionCount={sessions.filter((s) => s.exercise === ex.id).length}
            />
          ))}
        </div>
      </div>

      {/* bottom bar */}
      <div className="relative z-10 flex items-center justify-center gap-8 py-4 border-t border-white/5 text-[10px] text-white/20 tracking-widest">
        <span>MEDIAPIPE POSE DETECTION</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>SKLEARN CLASSIFIER</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>WEBSOCKET REAL-TIME</span>
      </div>
    </div>
  );
}

function ExerciseCard({ ex, onSelect, sessionCount }) {
  const pastReps = 0;

  return (
    <div
      onClick={onSelect}
      className={`
        group relative border rounded-xl p-6 transition-all duration-300 overflow-hidden
        ${
          ex.available
            ? "border-white/10 hover:border-[#00ff88]/50 cursor-pointer bg-white/[0.02] hover:bg-white/[0.05]"
            : "border-white/5 cursor-not-allowed bg-white/[0.01] opacity-50"
        }
      `}
      style={
        ex.available
          ? {
              boxShadow: "0 0 0 0 transparent",
            }
          : {}
      }
    >
      {/* glow on hover */}
      {ex.available && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${ex.accent}15 0%, transparent 70%)`,
          }}
        />
      )}

      {/* corner accent */}
      <div
        className="absolute top-0 right-0 w-16 h-16 opacity-20 group-hover:opacity-60 transition-opacity"
        style={{
          background: `linear-gradient(225deg, ${ex.accent} 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10">
        <div className="text-3xl mb-4">{ex.icon}</div>

        <div className="flex items-start justify-between mb-1">
          <div>
            <div
              className="text-2xl font-black tracking-tight"
              style={{
                fontFamily: "'Arial Black', sans-serif",
                color: ex.available ? ex.accent : "#666",
              }}
            >
              {ex.label}
            </div>
            <div className="text-white/40 text-xs">{ex.thai}</div>
          </div>
          {!ex.available && (
            <span className="text-[10px] tracking-widest text-white/20 border border-white/10 px-2 py-1 rounded mt-1">
              SOON
            </span>
          )}
        </div>

        <p className="text-white/40 text-xs mt-3 mb-4 leading-relaxed">
          {ex.desc}
        </p>

        {ex.available && (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/20">
              {sessionCount > 0
                ? `${sessionCount} sessions ผ่านมา`
                : "ยังไม่เคยฝึก"}
            </span>
            <div
              className="text-[10px] tracking-widest px-3 py-1.5 rounded border transition-colors"
              style={{
                borderColor: `${ex.accent}40`,
                color: ex.accent,
              }}
            >
              START →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SelectPage