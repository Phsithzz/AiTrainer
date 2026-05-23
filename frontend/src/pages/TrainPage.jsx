import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExerciseWS } from "../hooks/useExerciseWS";
import { IoMdArrowRoundBack } from "react-icons/io";
export default function TrainPage({ onFinish, isLoggedIn }) {
  const { exercise } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const { result, wsStatus, resetSession, cfg } = useExerciseWS(
    exercise,
    videoRef,
    overlayRef,
    active,
    isTracking,
  );
  const [shouldPromptLogin, setShouldPromptLogin] = useState(false);
  // เพิ่ม State นี้ไว้ด้านบนของ Component
const [isExplaining, setIsExplaining] = useState(false);
  const isTimer = cfg.mode === "timer";
  const accent = cfg.accent;
  
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setHasPermission(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("กรุณาอนุญาตให้เข้าถึงกล้องเพื่อใช้งาน");
      }
    };
    startCamera();

    return () => {
      // ปิดกล้องเมื่อออกจากหน้า
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 🟢 2. จัดการนับถอยหลัง
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    } else {
      setIsTracking(true); // เริ่ม Tracking เมื่อนับเสร็จ
      setCountdown(null);
    }
  }, [countdown]);

  // 🟢 3. ฟังก์ชันเมื่อกดเริ่ม
const handleStart = () => {
  setActive(true); // เริ่มเปิด WebSocket/กล้องเตรียมไว้
  setIsExplaining(true); // แสดงสถานะว่ากำลังอธิบาย

  const textToSpeak = cfg.instructionText || "Get ready";
  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = "th-TH";
  utterance.rate = 0.85;

  // 🏁 จุดสำคัญ: เมื่อพูดจบแล้วค่อยเริ่มนับถอยหลัง 5 วินาที
  utterance.onend = () => {
    setIsExplaining(false);
    setCountdown(5); // เริ่มนับ 5 4 3 2 1
  };

  // สั่งให้พูด
  window.speechSynthesis.speak(utterance);
};
  // ── ดึงค่าจาก result ──────────────────────────────────────────────────────
  const label = result?.label || null;
  const color = label ? cfg.labelColors[label] || accent : accent;
  const labelText = label
    ? cfg.labelText[label] || "DETECTING..."
    : "DETECTING...";
  const proba = result?.proba || {};
  const conf = result?.confidence || 0;
  const feedback = result?.feedback || "";
  const poseOk = result?.pose_detected ?? false;
  const state = result?.state || "UP";

  // reps mode
  const reps = result?.reps || 0;
  const good = result?.good_count || 0;
  const bad = result?.bad_count || 0;

  // timer mode (plank)
  const totalTime = result?.total_time || 0;
  const isHolding = result?.is_holding || false;

  // pushup elbow angle
  const elbowAngle = result?.elbow_angle || null;

  const handleFinish = () => {
    setActive(false);
    if (!isLoggedIn) {
      setShouldPromptLogin(true);
    } else {
      const totalAttempts = good + bad;
      const calculatedAccuracy = totalAttempts > 0 ? Math.round((good / totalAttempts) * 100) : 0;
      // ส่งโครงสร้างที่ตรงกับ WorkoutData เสมอ
      const sessionResult = {
        exercise: exercise,
        reps: isTimer ? 0 : (totalAttempts > 0 ? totalAttempts : reps),
        good: isTimer ? 0 : good,
        bad: bad,
        accuracy: isTimer ? 0:calculatedAccuracy, // หรือใส่สูตรคำนวณ accuracy (good / totalAttempts * 100)
        total_time: isTimer ? totalTime : 0.0,
        bad_details: result?.bad_details || {}
      };

      console.log("sessionResult:", sessionResult);
      onFinish(sessionResult, exercise); 
      setFinished(true);
    }
  };

  const handleBack = () => {

    navigate("/");
  };

  // ── format เวลา mm:ss.d ───────────────────────────────────────────────────
  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4, "0");
    return m > 0 ? `${m}:${s}` : `${parseFloat(s).toFixed(1)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0f]">
      {/* header */}
      <header className="flex items-center justify-between px-6 py-4 border-b-2 border-white">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 cursor-pointer text-xs tracking-widest text-white/40 hover:text-white transition-colors"
        >
          <IoMdArrowRoundBack /> BACK
        </button>

        <div className="flex items-center gap-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{
              backgroundColor:
                wsStatus === "connected"
                  ? accent
                  : wsStatus === "connecting"
                    ? "#ff9500"
                    : "#ff3b30",
            }}
          />
          <span className="text-xs tracking-widest text-white/30 uppercase">
            {wsStatus}
          </span>
        </div>

        <span
          className="text-xs tracking-[0.3em] font-black px-3 py-1 rounded"
          style={{ color: accent, border: `1px solid ${accent}40` }}
        >
          {exercise?.toUpperCase()}
        </span>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ── Camera ── */}
        <div className="relative flex-1 p-4 lg:p-8 bg-black flex items-center justify-center min-h-90">
          <div className="relative w-full max-w-7xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-white  flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* START overlay */}
            {/* START overlay */}
            {!active && !finished && hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 z-20 backdrop-blur-[2px]">
                <div className="text-white mb-6 text-center">
                  <p className="text-sm tracking-widest opacity-80 font-black">
                    CAMERA READY
                  </p>
                  <p className="text-xs opacity-60 mt-2">
                    ยืนให้เต็มกล้องและจัดตำแหน่งให้พร้อม
                  </p>
                </div>
                <button
                  onClick={handleStart}
                  className="
                  cursor-pointer
                  px-10 py-4 text-sm tracking-[0.3em] font-black rounded-xl transition-all active:scale-95 hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                    color: "#000",
                  }}
                >
                  START WORKOUT
                </button>
              </div>
              
            )}

            {/* Loading overlay (ตอนรอผู้ใช้กด Allow อนุญาตกล้อง) */}
            {!active && !finished && !hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <div className="text-white/50 text-xs tracking-widest uppercase">
                  Waiting for camera...
                </div>
              </div>
            )}

            {/* FINISH overlay */}
            {finished && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="text-7xl mb-4">🏁</div>
                <div className="text-2xl font-black text-white mb-2">
                  SESSION DONE
                </div>
                <div className="text-white/60 text-xs tracking-widest mb-8">
                  {isLoggedIn ? "ผลลัพธ์ถูกบันทึกแล้ว" : "ออกโดยไม่บันทึก"}
                </div>

                {isTimer ? (
                  <div className="text-center mb-8">
                    <div
                      className="text-5xl font-black"
                      style={{ color: accent }}
                    >
                      {formatTime(totalTime)}
                    </div>
                    <div className="text-xs tracking-widest text-white/30 mt-2">
                      SECONDS (GOOD FORM)
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-8 mb-8">
                    {[
                      ["REPS", reps, "#fff"],
                      ["GOOD", good, "#00ff88"],
                      ["BAD", bad, "#ff9500"],
                    ].map(([l, v, c]) => (
                      <div key={l} className="text-center">
                        <div
                          className="text-3xl font-black"
                          style={{ color: c }}
                        >
                          {v}
                        </div>
                        <div className="text-[10px] tracking-widest text-white/60 mt-1">
                          {l}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleBack}
                  className="cursor-pointer px-8 py-3 text-sm tracking-widest text-black font-black rounded-lg"
                  style={{ background: accent }}
                >
                  BACK TO HOME
                </button>
              </div>
            )}
            {/* LOGIN PROMPT overlay */}
            {shouldPromptLogin && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 backdrop-blur-sm">
                <div className="text-5xl mb-4">💾</div>
                <div className="text-xl font-black text-white mb-2">
                  บันทึกผลลัพธ์?
                </div>
                <div className="text-white/50 text-xs tracking-widest text-center mb-8 px-8">
                  เข้าสู่ระบบเพื่อบันทึกข้อมูล
                  <br />
                  การออกกำลังกายของคุณ
                </div>

                <div className="flex flex-col gap-3 w-48">
                  <button
                    onClick={() => navigate("/login")}
                    className="cursor-pointer w-full py-3 text-sm tracking-widest font-black rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                      color: "#000",
                    }}
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => {
                      setShouldPromptLogin(false);
                      setFinished(true); // แสดง SESSION DONE แบบไม่บันทึก
                    }}
                    className="cursor-pointer w-full py-3 text-xs tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/30 hover:text-white transition-all"
                  >
                    ข้ามไปก่อน
                  </button>
                </div>
              </div>
            )}
            {/* status badge */}
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
                  {poseOk ? labelText : "NO POSE"}
                </div>
              </div>
            )}

            {/* confidence bar */}
            {active && poseOk && (
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

            {/* state / elbow angle indicator */}
            {active && poseOk && (
              <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                {/* reps mode: UP/DOWN state */}
                {!isTimer && (
                  <div className="text-xs tracking-widest text-white/40 bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm">
                    {state === "DOWN" ? "⬇ DOWN" : "⬆ UP"}
                  </div>
                )}
                {/* plank: จับเวลาอยู่ */}
                {isTimer && isHolding && (
                  <div
                    className="text-xs tracking-widest bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm flex items-center gap-2"
                    style={{ color: accent }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: accent }}
                    />
                    HOLDING
                  </div>
                )}
                {/* pushup: แสดงมุมข้อศอก */}
                {exercise === "pushup" && elbowAngle !== null && (
                  <div
                    className="text-xs tracking-widest bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm"
                    style={{
                      color:
                        elbowAngle <= 115
                          ? "#ff3b30"
                          : elbowAngle >= 140
                            ? "#00ff88"
                            : "#ff9500",
                    }}
                  >
                    ELBOW {Math.round(elbowAngle)}°
                  </div>
                )}
              </div>
            )}

            {/* flash feedback */}
            {/* โค้ดใหม่: ใช้คำว่า feedback ตรงๆ เลยไม่ต้องผ่านตัวแปร flash */}
            {feedback && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className="px-8 py-4 rounded-2xl backdrop-blur-sm text-2xl font-black tracking-wide transition-all duration-150"
                  style={{
                    backgroundColor: color + "30",
                    border: `2px solid ${color}`,
                    color: "#fff",
                    textShadow: `0 0 20px ${color}`,
                  }}
                >
                  {feedback}
                </div>
              </div>
            )}

            {/* no pose hint */}
            {active && !poseOk && wsStatus === "connected" && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <div className="text-xs tracking-widest text-white/30 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  ไม่พบท่าทาง — ยืนหน้ากล้อง
                </div>
              </div>
            )}

     {/* 🟢 START / EXPLAINING / COUNTDOWN Overlay 🟢 */}
            {active && (isExplaining || (countdown !== null && countdown > 0)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 backdrop-blur-md">
                <div className="flex flex-col items-center max-w-lg text-center px-6">
                  
                  {isExplaining ? (
                    // จังหวะที่ 1: กำลังพูดอธิบาย + โชว์วิดีโอตัวอย่าง
                    <>
                      {/* กรอบแสดงภาพ/วิดีโอตัวอย่าง */}
                      <div className="w-96 md:w-[32rem] aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/20 mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <img 
                          src={`/src/assets/images/${exercise}_ref.gif`} 
                          alt={`${exercise} reference`}
                          className="w-full h-full object-contain "
                        />
                      </div>

                      <div className="text-white text-xl md:text-2xl tracking-[0.2em] font-black mb-4" style={{ color: accent }}>
                        HOW TO DO IT
                      </div>

                      {/* แสดงข้อความอธิบายให้อ่านไปพร้อมกับฟังเสียง */}
                      <p className="text-base md:text-lg text-white/80 leading-relaxed font-medium mb-8">
                        {cfg.instructionText || "เตรียมพร้อมสำหรับท่าต่อไป ยืนให้เต็มกล้อง"}
                      </p>

                      <div className="flex items-center gap-3 text-white/40 text-xs tracking-widest">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        LISTENING TO INSTRUCTIONS...
                      </div>
                    </>
                  ) : (
                    // จังหวะที่ 2: เริ่มนับ 5 4 3 2 1
                    <>
                      <div
                        className="text-[12rem] font-black text-white leading-none animate-pulse"
                        style={{ textShadow: `0 0 60px ${accent}` }}
                      >
                        {countdown}
                      </div>
                      <div className="text-white/60 tracking-[0.5em] font-black mt-4 uppercase">
                        Get Ready
                      </div>
                    </>
                  )}
                  
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats sidebar ── */}
        <div className="w-full lg:w-80 bg-[#0d0d14] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col">
          {/* main stat */}
          <div className="p-6 border-b border-white/5 text-center">
{isTimer ? (
              /* plank — timer */
              <>
                <div className="text-xs tracking-[0.4em] text-white/30 mb-2">
                  HOLD TIME
                </div>
                <div
                  className="text-6xl font-black leading-none transition-all duration-200 mb-2"
                  style={{
                    fontFamily: "'Arial Black', sans-serif",
                    color: totalTime > 0 ? "#fff" : "#333",
                    textShadow: isHolding ? `0 0 40px ${accent}60` : "none",
                  }}
                >
                  {formatTime(totalTime)}
                </div>
                <div className="text-xs tracking-widest text-white/20 mb-4">
                  SECONDS
                </div>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs tracking-widest transition-all ${isHolding ? "opacity-100" : "opacity-30"}`}
                  style={{
                    backgroundColor: accent + "20",
                    color: accent,
                    border: `1px solid ${accent}40`,
                  }}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${isHolding ? "animate-pulse" : ""}`}
                    style={{ backgroundColor: accent }}
                  />
                  {isHolding ? "HOLDING" : "REST"}
                </div>
              </>
) : (
              /* 🟢 squat/pushup — reps (แก้ใหม่: เอาตัวเลขรวมออก โชว์แค่ Good/Bad แบบเน้นๆ) */
              <>
                <div className="text-xs tracking-[0.4em] text-white/30 mb-8">
                  SESSION PROGRESS
                </div>
                
                <div className="flex gap-4">
                  {/* กล่อง GOOD (เน้นสีเขียว) */}
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-[#00ff88]/10 to-transparent border border-[#00ff88]/20 py-6 shadow-[0_0_20px_rgba(0,255,136,0.05)]">
                    <div className="text-[10px] font-black tracking-[0.2em] text-[#00ff88]/60 mb-2">
                      GOOD
                    </div>
                    <div className="text-5xl font-black text-[#00ff88]">
                      {good}
                    </div>
                  </div>
                  
                  {/* กล่อง BAD (เน้นสีส้ม) */}
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-[#ff9500]/10 to-transparent border border-[#ff9500]/20 py-6 shadow-[0_0_20px_rgba(255,149,0,0.05)]">
                    <div className="text-[10px] font-black tracking-[0.2em] text-[#ff9500]/60 mb-2">
                      BAD
                    </div>
                    <div className="text-5xl font-black text-[#ff9500]">
                      {bad}
                    </div>
                  </div>
                </div>
                
                {/* เพิ่มข้อความบอกสถานะเล็กๆ ด้านล่างให้ดูโปร */}
                <div className="mt-6 text-[10px] tracking-widest text-white/20 uppercase">
                  {good + bad === 0 ? "START YOUR WORKOUT" : "KEEP GOING"}
                </div>
              </>
            )}
          </div>

          {/* probability bars */}
          <div className="p-6 border-b border-white/5 flex-1">
            <div className="text-[10px] tracking-[0.4em] text-white/20 mb-4">
              CONFIDENCE
            </div>
            {cfg.probaKeys.map(({ key, label: lbl, color: c }) => (
              <div key={key} className="mb-4">
                <div className="flex justify-between items-center mb-1.5">
                  <span
                    className="text-[10px] tracking-widest font-medium"
                    style={{ color: c }}
                  >
                    {lbl}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {proba[key] != null
                      ? `${(proba[key] * 100).toFixed(0)}%`
                      : "–"}
                  </span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(proba[key] || 0) * 100}%`,
                      backgroundColor: c,
                      boxShadow: label === key ? `0 0 8px ${c}` : "none",
                    }}
                  />
                </div>
              </div>
            ))}

            {/* pushup extra: elbow angle gauge */}
            {exercise === "pushup" && elbowAngle !== null && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="text-[10px] tracking-[0.4em] text-white/20 mb-3">
                  ELBOW ANGLE
                </div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/30">0°</span>
                  <span
                    className="text-sm font-black"
                    style={{
                      color:
                        elbowAngle <= 100
                          ? "#ff3b30"
                          : elbowAngle >= 155
                            ? "#00ff88"
                            : "#ff9500",
                    }}
                  >
                    {Math.round(elbowAngle)}°
                  </span>
                  <span className="text-[10px] text-white/30">180°</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${(elbowAngle / 180) * 100}%`,
                      backgroundColor:
                        elbowAngle <= 100
                          ? "#ff3b30"
                          : elbowAngle >= 155
                            ? "#00ff88"
                            : "#ff9500",
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-[#ff3b30]/60">
                    DOWN ≤100°
                  </span>
                  <span className="text-[9px] text-[#00ff88]/60">UP ≥155°</span>
                </div>
              </div>
            )}
          </div>

          {/* actions */}
          <div className="p-6 flex flex-col gap-3">
            {active && (
              <>
                <button
                  onClick={resetSession}
                  className="
                  cursor-pointer
                  w-full py-3 text-xs tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/30 hover:text-white transition-all"
                >
                  RESET
                </button>
                <button
                  onClick={handleFinish}
                  className="cursor-pointer w-full py-3 text-xs tracking-widest font-black rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}aa)`,
                    color: "#000",
                  }}
                >
                  FINISH SESSION
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
