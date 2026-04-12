import { useRef, useState, useEffect } from "react";
import { useSquatWS, LABEL_COLOR } from "../hooks/useSquatWS";
import { useParams, useNavigate } from "react-router-dom";
const CLASS_TEXT = {
  squat_good:     { label: "GOOD FORM",    th: "ฟอร์มถูกต้อง" },
  squat_bad_heel: { label: "HEEL UP",      th: "ส้นเท้าลอย!" },
  squat_bad_back: { label: "BACK BENT",    th: "หลังงอ!" },
  squat_bad_foot: { label: "FEET UP",      th: "เท้าไม่ติดพื้น!" },
};

const TrainPage = ({onFinish })=> {
     const { exercise } = useParams(); // รับ "squat" จาก URL /train/squat
  const navigate     = useNavigate();
  const videoRef  = useRef(null);
  const overlayRef = useRef(null);
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);

  const { result, wsStatus, resetCounter } = useSquatWS(videoRef, overlayRef, active);

  const label   = result?.label  || null;
  const color   = label ? (LABEL_COLOR[label] || "#00ff88") : "#00ff88";
  const cfg     = label ? (CLASS_TEXT[label] || {}) : {};
  const proba   = result?.proba  || {};
  const reps    = result?.reps   || 0;
  const good    = result?.good_count || 0;
  const bad     = result?.bad_count  || 0;
  const conf    = result?.confidence || 0;
  const state   = result?.state  || "UP";
  const feedback = result?.feedback || "";

  // flash feedback
  const [flash, setFlash] = useState("");
  useEffect(() => {
    if (feedback) {
      setFlash(feedback);
      const t = setTimeout(() => setFlash(""), 1800);
      return () => clearTimeout(t);
    }
  }, [feedback, result?.reps]);

  const handleStart = () => setActive(true);

  const handleFinish = () => {
    setActive(false);
    setFinished(true);
  };

  const handleBack = () => {
    onFinish(result ? { reps, good_count: good, bad_count: bad } : null, exercise);
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={handleBack}
          className="text-xs tracking-widest text-white/40 hover:text-white transition-colors flex items-center gap-2"
        >
          ← BACK
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor:
                wsStatus === "connected" ? "#00ff88" :
                wsStatus === "connecting" ? "#ff9500" : "#ff3b30",
            }}
          />
          <span className="text-xs tracking-widest text-white/30 uppercase">
            {wsStatus === "connected" ? "connected" :
             wsStatus === "connecting" ? "connecting..." : wsStatus}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-xs tracking-[0.3em] font-black px-3 py-1 rounded"
            style={{ color: "#00ff88", border: "1px solid #00ff8840" }}
          >
            SQUAT
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* ── Camera section ── */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] lg:min-h-0">
          {/* video + overlay */}
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }} // mirror
            />
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* start overlay */}
            {!active && !finished && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
                <div className="text-5xl mb-6">📷</div>
                <div className="text-white/60 text-sm tracking-widest mb-8 text-center px-8">
                  กด START เพื่อเปิดกล้องและเริ่มตรวจจับท่า
                </div>
                <button
                  onClick={handleStart}
                  className="px-10 py-4 text-sm tracking-[0.3em] font-black rounded-xl transition-all duration-200 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #00ff88, #00cc6a)",
                    color: "#000",
                  }}
                >
                  START SESSION
                </button>
              </div>
            )}

            {/* finish overlay */}
            {finished && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="text-5xl mb-4">🏁</div>
                <div className="text-2xl font-black tracking-tight text-white mb-2">
                  SESSION DONE
                </div>
                <div className="text-white/40 text-xs tracking-widest mb-8">
                  ผลลัพธ์ถูกบันทึกแล้ว
                </div>
                <div className="flex gap-6 mb-8">
                  <Stat label="REPS" value={reps} color="#00ff88" />
                  <Stat label="GOOD" value={good} color="#00ff88" />
                  <Stat label="BAD"  value={bad}  color="#ff9500" />
                </div>
                <button
                  onClick={handleBack}
                  className="px-8 py-3 text-sm tracking-widest text-black font-black rounded-lg"
                  style={{ background: "#00ff88" }}
                >
                  BACK TO HOME
                </button>
              </div>
            )}

            {/* status badge top-left */}
            {active && (
              <div className="absolute top-4 left-4 z-10">
                <div
                  className="px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-black tracking-wider transition-all duration-300"
                  style={{
                    backgroundColor: color + "25",
                    border: `1px solid ${color}60`,
                    color,
                  }}
                >
                  {cfg.label || "DETECTING..."}
                  {label === "squat_bad_foot" && (
                    <span className="ml-2 text-xs font-normal text-white/50">
                      (ไม่นับ)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* confidence bar top */}
            {active && label && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${conf * 100}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}`,
                  }}
                />
              </div>
            )}

            {/* state indicator */}
            {active && label && (
              <div className="absolute top-4 right-4 z-10">
                <div className="text-xs tracking-widest text-white/40 bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm">
                  {state === "DOWN" ? "⬇ DOWN" : "⬆ UP"}
                </div>
              </div>
            )}

            {/* flash feedback */}
            {flash && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className="px-8 py-4 rounded-2xl backdrop-blur-sm text-2xl font-black tracking-wide animate-bounce"
                  style={{
                    backgroundColor: color + "30",
                    border: `2px solid ${color}`,
                    color: "#fff",
                    textShadow: `0 0 20px ${color}`,
                  }}
                >
                  {flash}
                </div>
              </div>
            )}

            {/* no pose */}
            {active && !label && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <div className="text-xs tracking-widest text-white/30 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  ไม่พบท่าทาง — ยืนหน้ากล้อง
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats sidebar ── */}
        <div className="w-full lg:w-80 bg-[#0d0d14] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col">
          {/* rep counter */}
          <div className="p-6 border-b border-white/5 text-center">
            <div className="text-xs tracking-[0.4em] text-white/30 mb-2">REPS</div>
            <div
              className="text-8xl font-black leading-none transition-all duration-200"
              style={{
                fontFamily: "'Arial Black', sans-serif",
                color: reps > 0 ? "#fff" : "#333",
                textShadow: reps > 0 ? `0 0 40px ${color}60` : "none",
              }}
            >
              {reps}
            </div>

            <div className="flex gap-3 mt-4">
              <div className="flex-1 rounded-lg bg-white/5 py-3">
                <div className="text-[10px] tracking-widest text-[#00ff88]/60 mb-1">GOOD</div>
                <div className="text-2xl font-black text-[#00ff88]">{good}</div>
              </div>
              <div className="flex-1 rounded-lg bg-white/5 py-3">
                <div className="text-[10px] tracking-widest text-[#ff9500]/60 mb-1">BAD</div>
                <div className="text-2xl font-black text-[#ff9500]">{bad}</div>
              </div>
            </div>
          </div>

          {/* probability bars */}
          <div className="p-6 border-b border-white/5 flex-1">
            <div className="text-[10px] tracking-[0.4em] text-white/20 mb-4">CONFIDENCE</div>
            {Object.entries({
              squat_good:     { label: "GOOD",      color: "#00ff88" },
              squat_bad_heel: { label: "HEEL UP",   color: "#ff9500" },
              squat_bad_back: { label: "BACK BENT", color: "#ff3b30" },
              squat_bad_foot: { label: "FEET UP",   color: "#bf5af2" },
            }).map(([key, cfg]) => (
              <div key={key} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className="text-[10px] tracking-widest font-medium"
                    style={{ color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {proba[key] ? `${(proba[key] * 100).toFixed(0)}%` : "–"}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(proba[key] || 0) * 100}%`,
                      backgroundColor: cfg.color,
                      boxShadow: label === key ? `0 0 8px ${cfg.color}` : "none",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* actions */}
          <div className="p-6 flex flex-col gap-3">
            {active && (
              <>
                <button
                  onClick={resetCounter}
                  className="w-full py-3 text-xs tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/30 hover:text-white transition-all"
                >
                  RESET COUNT
                </button>
                <button
                  onClick={handleFinish}
                  className="w-full py-3 text-xs tracking-widest font-black rounded-lg transition-all"
                  style={{
                    background: "linear-gradient(135deg, #00ff88, #00cc6a)",
                    color: "#000",
                  }}
                >
                  FINISH SESSION
                </button>
              </>
            )}
            {!active && !finished && (
              <button
                onClick={handleStart}
                className="w-full py-3 text-xs tracking-widest font-black rounded-lg"
                style={{ background: "#00ff88", color: "#000" }}
              >
                START
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-black" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] tracking-widest text-white/30 mt-1">{label}</div>
    </div>
  );
}

export default TrainPage