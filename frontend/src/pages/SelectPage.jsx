import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { GrNext } from "react-icons/gr";
import plank_mode from "../assets/images/plank_mode.png"
import squat_mode from "../assets/images/squat_mode.jpg"
import push_up_mode from "../assets/images/pushmode.png"
const EXERCISES = [
  {
    id:        "squat",
    label:     "SQUAT",
    thai:      "สควอท",
    icon:      squat_mode,
    desc:      "ฝึกกล้ามเนื้อขาและสะโพก",
    available: true,
    accent:    "#00ff88",
    mode:      "นับ rep",
  },
  {
    id:        "pushup",
    label:     "PUSH UP",
    thai:      "วิดพื้น",
    icon:      push_up_mode,
    desc:      "ฝึกกล้ามเนื้อหน้าอกและแขน",
    available: true,
    accent:    "#ff6b35",
    mode:      "นับ rep",
  },
  {
    id:        "plank",
    label:     "PLANK",
    thai:      "แพลงก์",
    icon:      plank_mode,
    desc:      "เสริมความแข็งแรงของแกนกลางลำตัว",
    available: true,
    accent:    "#a855f7",
    mode:      "จับเวลา",
  },
];

export default function SelectPage({ sessions }) {
  const navigate   = useNavigate();
  const canvasRef  = useRef(null);

  // animated dot grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    let animId;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cols = 24; const rows = 16;
      const cw = canvas.width / cols; const ch = canvas.height / rows;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const dist  = Math.sqrt(Math.pow(c - cols / 2, 2) + Math.pow(r - rows / 2, 2));
          const pulse = Math.sin(frame * 0.015 - dist * 0.35) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(c * cw, r * ch, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,255,255,${pulse * 0.06})`;
          ctx.fill();
        }
      }
      frame++;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  const totalReps = sessions.reduce((s, x) => s + (x.reps || 0), 0);
  const totalTime = sessions.reduce((s, x) => s + (x.total_time || 0), 0);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b-2 border-white ">
        <div className="flex items-center gap-3">
          <button className="w-8 h-8 rounded-sm bg-white flex items-center justify-center border-black
          hover:bg-black hover:border-white hover:text-white text-black font-semibold
          transition duration-300 ease-in cursor-pointer">
            AI
          </button>
          <span className="text-sm tracking-[0.3em] text-white/60 uppercase">Form Trainer</span>
        </div>
        <div className="flex items-center gap-6">
          {/* {sessions.length > 0 && (
            <div className="flex items-center gap-4 text-xs text-white/30">
              <span><span className="text-white">{totalReps}</span> REPS</span>
              <span><span className="text-white">{totalTime.toFixed(0)}s</span> PLANK</span>
            </div>
          )} */}
          <button onClick={() => navigate("/history")}
            className="text-xs tracking-widest text-white/60 cursor-pointer 
            hover:text-white 
            transition-colors 
            border border-white 
            hover:border-white/30 px-4 py-2 rounded
            shadow-[2px_2px_0px_white]
            ">
            HISTORY
          </button>
        </div>
      </header>

      {/* hero */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="mb-2 text-white/50 text-xs tracking-[0.5em] uppercase">AI-Powered</div>
        <h1 className="text-center mb-4">
          <span className="block text-6xl md:text-8xl font-black tracking-[0.15em] text-white "
           >WORKOUT</span>
          <span className="block text-6xl md:text-8xl font-black tracking-[0.2em] "
            style={{  WebkitTextStroke: "2px #ffffff60", color: "transparent" }}>
            TRAINER
          </span>
        </h1>
        <p className="text-white/50 text-sm tracking-widest mb-16 text-center">
          เลือกท่าออกกำลังกาย — AI วิเคราะห์ฟอร์มแบบ real-time
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
          {EXERCISES.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              sessionCount={sessions.filter((s) => s.exercise === ex.id).length}
              onSelect={() => navigate(`/train/${ex.id}`)}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-8 py-4 border-t-2 border-white text-[10px] text-white/15 tracking-widest">
        <span className="text-white font-semibold tracking-[0.2em]">MEDIAPIPE</span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-white font-semibold tracking-[0.2em]">SKLEARN</span>
        <span className="w-1 h-1 rounded-full bg-white/60" />
        <span className="text-white font-semibold tracking-[0.2em]">FASTAPI WEBSOCKET</span>
      </div>
    </div>
  );
}

function ExerciseCard({ ex, onSelect }) {
  return (
    <div onClick={onSelect}
      className="group relative border border-white/10 hover:border-white/30 cursor-pointer bg-white/2 hover:bg-white/1 rounded-xl p-6 transition-all duration-300 overflow-hidden">

      {/* glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${ex.accent}12 0%, transparent 70%)` }} />

      {/* corner */}
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10 group-hover:opacity-40 transition-opacity"
        style={{ background: `linear-gradient(225deg, ${ex.accent} 0%, transparent 60%)` }} />

      <div className="relative z-10">
       
<img src={ex.icon} alt={ex.label} className="w-20 h-20"/>
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-2xl font-black tracking-tight transition-colors"
              style={{ fontFamily: "'Arial Black', sans-serif", color: ex.accent }}>
              {ex.label}
            </div>
            <div className="text-white/40 text-xs">{ex.thai}</div>
          </div>
          <span className="text-[9px] tracking-widest px-2 py-1 rounded mt-1"
            style={{ color: ex.accent, border: `1px solid ${ex.accent}30`, backgroundColor: ex.accent + "10" }}>
            {ex.mode}
          </span>
        </div>

        <p className="text-white/30 text-xs mt-3 mb-4 leading-relaxed">{ex.desc}</p>

        <div className="flex items-center justify-between">

          <span className="flex items-center gap-2 text-[10px] tracking-widest px-3 py-1.5 rounded border transition-colors"
            style={{ borderColor: `${ex.accent}40`, color: ex.accent }}>
            START <GrNext />
          </span>
        </div>
      </div>
    </div>
  );
}