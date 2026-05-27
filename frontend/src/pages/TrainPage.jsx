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
  const [isExplaining, setIsExplaining] = useState(false);
  const [shouldPromptLogin, setShouldPromptLogin] = useState(false);

  // 🟢 1. State สำหรับระบบ Sets & Reps
  const { result, wsStatus, resetSession, cfg } = useExerciseWS(
    exercise,
    videoRef,
    overlayRef,
    active,
    isTracking
  );
  
  const isTimer = cfg.mode === "timer";
  const accent = cfg.accent;

  // ค่าตั้งต้น: ถ้าเป็น Plank ให้เป้าหมายคือ 30 วิ, ถ้าเป็น Squat/Pushup คือ 10 ครั้ง
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState(isTimer ? 30 : 10);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  
  // เก็บสถิติสะสมของเซ็ตที่ผ่านๆ มา
  const [accumulatedStats, setAccumulatedStats] = useState({ good: 0, bad: 0, time: 0 });
  const hasCongratulated = useRef(false);

  // ── ดึงค่าจาก result ──────────────────────────────────────────────────────
  const label = result?.label || null;
  const color = label ? cfg.labelColors[label] || accent : accent;
  const labelText = label ? cfg.labelText[label] || "DETECTING..." : "DETECTING...";
  const proba = result?.proba || {};
  const conf = result?.confidence || 0;
  const feedback = result?.feedback || "";
  const poseOk = result?.pose_detected ?? false;
  const state = result?.state || "UP";

  const reps = result?.reps || 0;
  const good = result?.good_count || 0;
  const bad = result?.bad_count || 0;
  const totalTime = result?.total_time || 0;
  const isHolding = result?.is_holding || false;
  const elbowAngle = result?.elbow_angle || null;

  // 🟢 2. เปิดกล้อง
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
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // 🟢 3. จัดการนับถอยหลัง
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

  // 🟢 4. ระบบเช็คเป้าหมาย (ทำครบเซ็ตหรือยัง?)
  useEffect(() => {
    if (!active || isExplaining || countdown !== null || isResting) return;

    // เช็คว่าทำครบตามเป้าหมายของเซ็ตปัจจุบันหรือยัง (จำนวนครั้ง หรือ จำนวนเวลา)
    const reachedTarget = isTimer ? (totalTime >= targetReps) : (good >= targetReps);

    if (reachedTarget && !hasCongratulated.current) {
      hasCongratulated.current = true; // ล็อคป้องกันการพูดรัวๆ
      setIsTracking(false); // หยุดจับภาพชั่วคราว
      window.speechSynthesis.cancel(); // ตัดเสียงด่าทิ้งก่อนเลย

      if (currentSet < targetSets) {
        // กรณียังไม่ครบทุกเซ็ต -> เข้าสู่โหมดพัก (Rest)
        const utterance = new SpeechSynthesisUtterance(`เซ็ตที่ ${currentSet} เสร็จสิ้น พักสักครู่ครับ`);
        utterance.lang = "th-TH";
        window.speechSynthesis.speak(utterance);
        setIsResting(true);
      } else {
        // กรณีครบทุกเซ็ตแล้ว -> จบโปรแกรม
        const utterance = new SpeechSynthesisUtterance("ทำครบทุกเซ็ตตามเป้าหมายแล้ว เยี่ยมมากครับ");
        utterance.lang = "th-TH";
        window.speechSynthesis.speak(utterance);
        handleFinish(); 
      }
    }
  }, [good, totalTime, active, isExplaining, countdown, isResting, isTimer, targetReps, currentSet, targetSets]);

  // 🟢 5. เริ่มออกกำลังกาย
  const handleStart = () => {
    setActive(true);
    setIsExplaining(true);
    hasCongratulated.current = false;

    const textToSpeak = cfg.instructionText || "Get ready";
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "th-TH";
    utterance.rate = 0.85;

    utterance.onend = () => {
      setIsExplaining(false);
      setCountdown(5);
    };
    window.speechSynthesis.speak(utterance);
  };

  // 🟢 6. ฟังก์ชันเริ่มเซ็ตต่อไป
  const handleNextSet = () => {
    // บันทึกสถิติของเซ็ตที่แล้วเก็บไว้ในกระเป๋าก่อน
    setAccumulatedStats(prev => ({
      good: prev.good + good,
      bad: prev.bad + bad,
      time: prev.time + totalTime
    }));
    
    resetSession(); // เคลียร์ค่า backend เป็น 0 สำหรับเซ็ตใหม่
    setCurrentSet(prev => prev + 1);
    setIsResting(false);
    hasCongratulated.current = false;
    setCountdown(3); // นับถอยหลังเข้าเซ็ตใหม่แบบสั้นๆ
  };

  const handleFinish = () => {
    setActive(false);
    if (!isLoggedIn) {
      setShouldPromptLogin(true);
    } else {
      // เอาสถิติสะสมทุกเซ็ต มารวมกับเซ็ตสุดท้าย
      const finalGood = accumulatedStats.good + good;
      const finalBad = accumulatedStats.bad + bad;
      const finalTime = accumulatedStats.time + totalTime;
      const totalAttempts = finalGood + finalBad;
      const calculatedAccuracy = totalAttempts > 0 ? Math.round((finalGood / totalAttempts) * 100) : 0;
      
      const sessionResult = {
        exercise: exercise,
        reps: isTimer ? 0 : totalAttempts,
        good: isTimer ? 0 : finalGood,
        bad: finalBad,
        accuracy: isTimer ? 0 : calculatedAccuracy,
        total_time: isTimer ? finalTime : 0.0,
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
              backgroundColor: wsStatus === "connected" ? accent : wsStatus === "connecting" ? "#ff9500" : "#ff3b30",
            }}
          />
          <span className="text-xs tracking-widest text-white/30 uppercase">{wsStatus}</span>
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
          <div className="relative w-full max-w-7xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-white flex items-center justify-center">
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

            {/* 🟢 START overlay + เป้าหมาย */}
            {!active && !finished && hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 backdrop-blur-md">
                <div className="text-white mb-8 text-center">
                  <p className="text-2xl tracking-[0.2em] font-black" style={{ color: accent }}>
                    SET YOUR TARGET
                  </p>
                  <p className="text-xs opacity-50 mt-2 tracking-widest uppercase">
                    กำหนดเป้าหมายก่อนเริ่ม
                  </p>
                </div>
                
                <div className="flex gap-8 mb-10">
                   <div className="flex flex-col items-center">
                     <label className="text-[10px] text-white/50 tracking-[0.2em] mb-3 uppercase">Total Sets</label>
                     <div className="flex items-center gap-4 border border-white/20 bg-white/5 px-4 py-2 rounded-xl">
                       <button onClick={() => setTargetSets(Math.max(1, targetSets - 1))} className="text-2xl text-white/50 hover:text-white pb-1 w-8 cursor-pointer">-</button>
                       <span className="text-3xl font-black text-white w-12 text-center">{targetSets}</span>
                       <button onClick={() => setTargetSets(targetSets + 1)} className="text-2xl text-white/50 hover:text-white pb-1 w-8 cursor-pointer">+</button>
                     </div>
                   </div>

                   <div className="flex flex-col items-center">
                     <label className="text-[10px] text-white/50 tracking-[0.2em] mb-3 uppercase">
                        {isTimer ? 'Seconds / Set' : 'Reps / Set'}
                     </label>
                     <div className="flex items-center gap-4 border border-white/20 bg-white/5 px-4 py-2 rounded-xl">
                       <button onClick={() => setTargetReps(Math.max(1, targetReps - (isTimer ? 5 : 1)))} className="text-2xl text-white/50 hover:text-white pb-1 w-8 cursor-pointer">-</button>
                       <span className="text-3xl font-black text-white w-16 text-center">{targetReps}</span>
                       <button onClick={() => setTargetReps(targetReps + (isTimer ? 5 : 1))} className="text-2xl text-white/50 hover:text-white pb-1 w-8 cursor-pointer">+</button>
                     </div>
                   </div>
                </div>

                <button
                  onClick={handleStart}
                  className="cursor-pointer px-12 py-4 text-sm tracking-[0.3em] font-black rounded-xl transition-all active:scale-95 hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                >
                  START WORKOUT
                </button>
              </div>
            )}

            {/* 🟢 REST overlay (พักระหว่างเซ็ต) */}
            {isResting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-md">
                 <div className="text-6xl mb-4">😮‍💨</div>
                 <div className="text-3xl font-black text-white mb-2 tracking-widest">
                    SET {currentSet} COMPLETED
                 </div>
                 <div className="text-[#00ff88] text-xs tracking-widest mb-10">
                    เยี่ยมมาก! พักหายใจก่อนเริ่มเซ็ตต่อไป
                 </div>
                 <button
                  onClick={handleNextSet}
                  className="cursor-pointer px-10 py-4 text-sm tracking-[0.3em] font-black rounded-xl transition-all active:scale-95 hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                >
                  START SET {currentSet + 1}
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {!active && !finished && !hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                <div className="text-white/50 text-xs tracking-widest uppercase">Waiting for camera...</div>
              </div>
            )}

            {/* FINISH overlay */}
            {finished && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
                <div className="text-7xl mb-4">🏁</div>
                <div className="text-2xl font-black text-white mb-2">SESSION DONE</div>
                <div className="text-white/60 text-xs tracking-widest mb-8">
                  {isLoggedIn ? "ผลลัพธ์ถูกบันทึกแล้ว" : "ออกโดยไม่บันทึก"}
                </div>
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
                <div className="text-xl font-black text-white mb-2">บันทึกผลลัพธ์?</div>
                <div className="text-white/50 text-xs tracking-widest text-center mb-8 px-8">
                  เข้าสู่ระบบเพื่อบันทึกข้อมูล<br />การออกกำลังกายของคุณ
                </div>
                <div className="flex flex-col gap-3 w-48">
                  <button
                    onClick={() => navigate("/login")}
                    className="cursor-pointer w-full py-3 text-sm tracking-widest font-black rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                  >
                    LOGIN
                  </button>
                  <button
                    onClick={() => {
                      setShouldPromptLogin(false);
                      setFinished(true);
                    }}
                    className="cursor-pointer w-full py-3 text-xs tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/30 hover:text-white transition-all"
                  >
                    ข้ามไปก่อน
                  </button>
                </div>
              </div>
            )}

            {/* status badge */}
            {active && !isResting && (
              <div className="absolute top-4 left-4 z-10">
                <div
                  className="px-4 py-2 rounded-lg backdrop-blur-sm text-sm font-black tracking-wider transition-all duration-300"
                  style={{ backgroundColor: color + "25", border: `1px solid ${color}60`, color }}
                >
                  {poseOk ? labelText : "NO POSE"}
                </div>
              </div>
            )}

            {/* confidence bar */}
            {active && poseOk && !isResting && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-10">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${conf * 100}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                />
              </div>
            )}

            {/* state / elbow angle indicator */}
            {active && poseOk && !isResting && (
              <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                {!isTimer && (
                  <div className="text-xs tracking-widest text-white/40 bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm">
                    {state === "DOWN" ? "⬇ DOWN" : "⬆ UP"}
                  </div>
                )}
                {isTimer && isHolding && (
                  <div className="text-xs tracking-widest bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm flex items-center gap-2" style={{ color: accent }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accent }} />
                    HOLDING
                  </div>
                )}
                {exercise === "pushup" && elbowAngle !== null && (
                  <div className="text-xs tracking-widest bg-black/50 px-3 py-1.5 rounded backdrop-blur-sm" style={{ color: elbowAngle <= 115 ? "#ff3b30" : elbowAngle >= 140 ? "#00ff88" : "#ff9500" }}>
                    ELBOW {Math.round(elbowAngle)}°
                  </div>
                )}
              </div>
            )}

            {/* flash feedback */}
            {feedback && !isResting && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className="px-8 py-4 rounded-2xl backdrop-blur-sm text-2xl font-black tracking-wide transition-all duration-150"
                  style={{ backgroundColor: color + "30", border: `2px solid ${color}`, color: "#fff", textShadow: `0 0 20px ${color}` }}
                >
                  {feedback}
                </div>
              </div>
            )}

            {/* no pose hint */}
            {active && !poseOk && wsStatus === "connected" && !isResting && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <div className="text-xs tracking-widest text-white/30 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                  ไม่พบท่าทาง — ยืนหน้ากล้อง
                </div>
              </div>
            )}

            {/* EXPLAINING / COUNTDOWN Overlay */}
            {active && (isExplaining || (countdown !== null && countdown > 0)) && !isResting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 backdrop-blur-md">
                <div className="flex flex-col items-center max-w-lg text-center px-6">
                  {isExplaining ? (
                    <>
                      <div className="w-96 md:w-[32rem] aspect-video bg-black rounded-2xl overflow-hidden border-2 border-white/20 mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                        <img src={`/src/assets/images/${exercise}_ref.gif`} alt={`${exercise} reference`} className="w-full h-full object-contain " />
                      </div>
                      <div className="text-white text-xl md:text-2xl tracking-[0.2em] font-black mb-4" style={{ color: accent }}>HOW TO DO IT</div>
                      <p className="text-base md:text-lg text-white/80 leading-relaxed font-medium mb-8">{cfg.instructionText}</p>
                      <div className="flex items-center gap-3 text-white/40 text-xs tracking-widest">
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        LISTENING TO INSTRUCTIONS...
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[12rem] font-black text-white leading-none animate-pulse" style={{ textShadow: `0 0 60px ${accent}` }}>
                        {countdown}
                      </div>
                      <div className="text-white/60 tracking-[0.5em] font-black mt-4 uppercase">Get Ready</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats sidebar ── */}
        <div className="w-full lg:w-80 bg-[#0d0d14] border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col">
          <div className="p-6 border-b border-white/5 text-center">
            {isTimer ? (
              <>
                <div className="text-[10px] tracking-[0.4em] text-white/30 mb-2 uppercase">
                  SET {currentSet}/{targetSets} — TARGET {targetReps}S
                </div>
                <div
                  className="text-6xl font-black leading-none transition-all duration-200 mb-2"
                  style={{ fontFamily: "'Arial Black', sans-serif", color: totalTime > 0 ? "#fff" : "#333", textShadow: isHolding ? `0 0 40px ${accent}60` : "none" }}
                >
                  {formatTime(totalTime)}
                </div>
                <div className="text-xs tracking-widest text-white/20 mb-4">SECONDS</div>
              </>
            ) : (
              <>
                <div className="text-[10px] tracking-[0.4em] text-white/30 mb-8 uppercase">
                  SET {currentSet}/{targetSets} — TARGET {targetReps} REPS
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-[#00ff88]/10 to-transparent border-2 border-white py-14 shadow-[0_0_20px_rgba(0,255,136,0.05)]">
                    <div className="font-black tracking-[0.2em] text-[#00ff88]/60 mb-2">GOOD</div>
                    <div className="text-5xl font-black text-[#00ff88]">{good}</div>
                  </div>
                  <div className="flex-1 rounded-2xl bg-gradient-to-b from-[#ff9500]/10 to-transparent border-2 border-white py-14 shadow-[0_0_20px_rgba(255,149,0,0.05)]">
                    <div className="font-black tracking-[0.2em] text-[#ff9500]/60 mb-2">BAD</div>
                    <div className="text-5xl font-black text-[#ff9500]">{bad}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-6 flex flex-col gap-3 mt-auto">
            {active && (
              <>
                <button
                  onClick={resetSession}
                  className="cursor-pointer w-full py-3 text-xs tracking-widest text-white/50 border border-white/10 rounded-lg hover:border-white/30 hover:text-white transition-all"
                >
                  RESET SET
                </button>
                <button
                  onClick={handleFinish}
                  className="cursor-pointer w-full py-3 text-xs tracking-widest font-black rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                >
                  FORCE FINISH
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}