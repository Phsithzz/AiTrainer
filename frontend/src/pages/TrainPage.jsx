import { useRef, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useExerciseWS } from "../hooks/useExerciseWS";
import { IoMdArrowRoundBack } from "react-icons/io";
import Swal from 'sweetalert2'; // 🟢 Import SweetAlert2

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
        // 🟢 เปลี่ยนจาก alert() ธรรมดา เป็น SweetAlert2
        Swal.fire({
          icon: 'error',
          title: 'CAMERA ACCESS DENIED',
          text: 'กรุณาอนุญาตให้เข้าถึงกล้องเพื่อใช้งานระบบ Form Trainer',
          background: '#18181b',
          color: '#a1a1aa',
          confirmButtonText: 'ACKNOWLEDGE',
          confirmButtonColor: '#ef4444',
          customClass: {
            popup: 'border border-red-500/30 rounded-3xl',
            title: 'text-red-500 font-black tracking-widest text-xl',
            confirmButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3 mt-2'
          }
        }).then(() => {
          navigate('/'); // กลับหน้าแรกถ้าไม่ให้สิทธิ์
        });
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [navigate]);

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

  const handleForceFinish = () => {
    Swal.fire({
      title: 'FORCE FINISH?',
      text: 'จบ session ก่อนครบเป้าหมาย — ข้อมูลจนถึงตอนนี้จะถูกบันทึก',
      background: '#18181b',
      color: '#a1a1aa',
      showCancelButton: true,
      confirmButtonText: 'FINISH SESSION',
      cancelButtonText: 'CONTINUE',
      confirmButtonColor: accent,
      customClass: {
        popup: 'border border-zinc-700 rounded-3xl',
        title: 'text-white font-black tracking-widest text-xl',
        confirmButton: 'text-black font-black tracking-widest rounded-full px-8 py-3',
        cancelButton: 'text-white font-bold tracking-widest rounded-full px-8 py-3',
      }
    }).then((res) => {
      if (res.isConfirmed) handleFinish();
    });
  };

  const handleBack = () => {
    if (active) {
      Swal.fire({
        title: 'EXIT SESSION?',
        text: 'ออกกลางคัน — ข้อมูล session นี้จะไม่ถูกบันทึก',
        background: '#18181b',
        color: '#a1a1aa',
        showCancelButton: true,
        confirmButtonText: 'EXIT',
        cancelButtonText: 'STAY',
        confirmButtonColor: '#ef4444',
        customClass: {
          popup: 'border border-red-500/30 rounded-3xl',
          title: 'text-white font-black tracking-widest text-xl',
          confirmButton: 'text-white font-black tracking-widest rounded-full px-8 py-3',
          cancelButton: 'text-zinc-400 font-bold tracking-widest rounded-full px-8 py-3',
        }
      }).then((res) => {
        if (res.isConfirmed) navigate('/');
      });
    } else {
      navigate('/');
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1).padStart(4, "0");
    return m > 0 ? `${m}:${s}` : `${parseFloat(s).toFixed(1)}`;
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#0a0a0a] text-white overflow-hidden selection:bg-white/30">
      
      {/* 🟢 Background Grid Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/50 to-[#0a0a0a] pointer-events-none" />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6 border-b border-white/10 bg-black/20 backdrop-blur-sm">
        <button
          onClick={handleBack}
          className="cursor-pointer flex items-center gap-3 text-[11px] font-bold tracking-widest text-zinc-400 hover:text-white transition-colors duration-300 bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 hover:border-white/50"
        >
          <IoMdArrowRoundBack size={16} /> BACK
        </button>

        <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor]"
            style={{
              backgroundColor: wsStatus === "connected" ? accent : wsStatus === "connecting" ? "#eab308" : "#ef4444",
              color: wsStatus === "connected" ? accent : wsStatus === "connecting" ? "#eab308" : "#ef4444"
            }}
          />
          <span className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">{wsStatus}</span>
        </div>

        <span
          className="text-[11px] tracking-[0.3em] font-black px-4 py-2 rounded-full bg-zinc-900/50"
          style={{ color: accent, border: `1px solid ${accent}40` }}
        >
          {exercise?.toUpperCase()}
        </span>
      </header>

      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        {/* ── Camera Area ── */}
        <div className="relative flex-1 p-4 lg:p-8 flex items-center justify-center min-h-[50vh] lg:min-h-0">
          <div className="relative w-full max-w-5xl aspect-video bg-zinc-950 rounded-3xl overflow-hidden shadow-[0_10px_50px_rgba(0,0,0,0.5)] border border-zinc-800 flex items-center justify-center">
            
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
                  <p className="text-2xl md:text-4xl tracking-[0.2em] font-black drop-shadow-md" style={{ color: accent }}>
                    SET YOUR TARGET
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-3 tracking-widest uppercase font-medium">
                    กำหนดเป้าหมายก่อนเริ่ม
                  </p>
                </div>
                
                <div className="flex flex-col md:flex-row gap-6 md:gap-12 mb-10">
                   <div className="flex flex-col items-center">
                     <label className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] mb-3 uppercase">Total Sets</label>
                     <div className="flex items-center gap-4 border border-zinc-700 bg-zinc-900/80 px-4 py-2 rounded-2xl shadow-inner">
                       <button onClick={() => setTargetSets(Math.max(1, targetSets - 1))} className="cursor-pointer text-3xl text-zinc-500 hover:text-white pb-1 w-10 transition-colors">-</button>
                       <span className="text-4xl font-black text-white w-16 text-center">{targetSets}</span>
                       <button onClick={() => setTargetSets(targetSets + 1)} className="cursor-pointer text-3xl text-zinc-500 hover:text-white pb-1 w-10 transition-colors">+</button>
                     </div>
                   </div>

                   <div className="flex flex-col items-center">
                     <label className="text-[10px] text-zinc-500 font-bold tracking-[0.2em] mb-3 uppercase">
                        {isTimer ? 'Seconds / Set' : 'Reps / Set'}
                     </label>
                     <div className="flex items-center gap-4 border border-zinc-700 bg-zinc-900/80 px-4 py-2 rounded-2xl shadow-inner">
                       <button onClick={() => setTargetReps(Math.max(1, targetReps - (isTimer ? 5 : 1)))} className="cursor-pointer text-3xl text-zinc-500 hover:text-white pb-1 w-10 transition-colors">-</button>
                       <span className="text-4xl font-black text-white w-20 text-center">{targetReps}</span>
                       <button onClick={() => setTargetReps(targetReps + (isTimer ? 5 : 1))} className="cursor-pointer text-3xl text-zinc-500 hover:text-white pb-1 w-10 transition-colors">+</button>
                     </div>
                   </div>
                </div>

                <button
                  onClick={handleStart}
                  className="cursor-pointer px-12 py-4 text-xs tracking-[0.3em] font-black rounded-full transition-all active:scale-95 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                >
                  START WORKOUT
                </button>
              </div>
            )}

            {/* 🟢 REST overlay (พักระหว่างเซ็ต) */}
            {isResting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-md">
                 <div className="text-7xl mb-6 animate-pulse">😮‍💨</div>
                 <div className="text-3xl md:text-5xl font-black text-white mb-4 tracking-widest drop-shadow-lg">
                   SET {currentSet} COMPLETED
                 </div>
                 <div className="text-zinc-400 text-[11px] font-medium tracking-widest mb-12 uppercase">
                   Great job! Catch your breath before the next set.
                 </div>
                 <button
                  onClick={handleNextSet}
                  className="cursor-pointer px-10 py-4 text-xs tracking-[0.3em] font-black rounded-full transition-all active:scale-95 hover:scale-105 shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                >
                  START SET {currentSet + 1}
                </button>
              </div>
            )}

            {/* Loading overlay */}
            {!active && !finished && !hasPermission && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 backdrop-blur-sm">
                <div className="w-10 h-10 border-4 border-zinc-800 border-t-[#00ff88] rounded-full animate-spin mb-6 shadow-[0_0_15px_rgba(0,255,136,0.3)]"></div>
                <div className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase animate-pulse">Waiting for camera...</div>
              </div>
            )}

            {/* FINISH overlay */}
            {finished && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 backdrop-blur-md">
                <div className="text-7xl mb-6">🏁</div>
                <div className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-lg">SESSION DONE</div>
                <div className="text-zinc-400 text-[11px] font-medium tracking-widest mb-10 uppercase">
                  {isLoggedIn ? "Session results saved to your profile" : "Exited without saving"}
                </div>
                <button
                  onClick={handleBack}
                  className="cursor-pointer px-10 py-4 text-xs tracking-widest text-black font-black rounded-full transition-all hover:scale-105"
                  style={{ background: accent }}
                >
                  BACK TO HOME
                </button>
              </div>
            )}

            {/* LOGIN PROMPT overlay */}
            {shouldPromptLogin && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 backdrop-blur-md">
                <div className="text-7xl mb-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">💾</div>
                <div className="text-3xl md:text-4xl font-black text-white mb-4">SAVE YOUR PROGRESS?</div>
                <div className="text-zinc-400 text-[11px] font-medium tracking-widest text-center mb-10 px-8 uppercase leading-relaxed">
                  Log in to save this session's data <br /> and track your performance over time.
                </div>
                <div className="flex flex-col gap-4 w-64">
                  <button
                    onClick={() => {
                      const finalGood = accumulatedStats.good + good;
                      const finalBad = accumulatedStats.bad + bad;
                      const finalTime = accumulatedStats.time + totalTime;
                      const totalAttempts = finalGood + finalBad;
                      const sessionResult = {
                        exercise,
                        reps: isTimer ? 0 : totalAttempts,
                        good: isTimer ? 0 : finalGood,
                        bad: finalBad,
                        accuracy: isTimer ? 0 : (totalAttempts > 0 ? Math.round((finalGood / totalAttempts) * 100) : 0),
                        total_time: isTimer ? finalTime : 0.0,
                        bad_details: result?.bad_details || {}
                      };
                      sessionStorage.setItem('pendingWorkout', JSON.stringify(sessionResult));
                      navigate('/login');
                    }}
                    className="cursor-pointer w-full py-4 text-xs tracking-widest font-black rounded-full shadow-[0_0_20px_rgba(0,0,0,0.4)] transition-all hover:scale-105"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}aa)`, color: "#000" }}
                  >
                    LOGIN TO SAVE
                  </button>
                  <button
                    onClick={() => {
                      setShouldPromptLogin(false);
                      setFinished(true);
                    }}
                    className="cursor-pointer w-full py-4 text-[10px] font-bold tracking-widest text-zinc-500 border border-zinc-800 rounded-full hover:border-zinc-500 hover:text-white transition-all"
                  >
                    SKIP FOR NOW
                  </button>
                </div>
              </div>
            )}

            {/* status badge */}
            {active && !isResting && (
              <div className="absolute top-6 left-6 z-10">
                <div
                  className="px-5 py-2.5 rounded-full backdrop-blur-md text-[11px] font-black tracking-widest transition-all duration-300 shadow-lg"
                  style={{ backgroundColor: color + "20", border: `1px solid ${color}50`, color }}
                >
                  {poseOk ? labelText : "NO POSE"}
                </div>
              </div>
            )}

            {/* confidence bar */}
            {active && poseOk && !isResting && (
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/50 z-10">
                <div
                  className="h-full transition-all duration-300 rounded-r-full"
                  style={{ width: `${conf * 100}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                />
              </div>
            )}

            {/* state / elbow angle indicator */}
            {active && poseOk && !isResting && (
              <div className="absolute top-6 right-6 z-10 flex flex-col items-end gap-3">
                {!isTimer && (
                  <div className="text-[11px] font-black tracking-widest text-zinc-300 bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg">
                    {state === "DOWN" ? "⬇ DOWN" : "⬆ UP"}
                  </div>
                )}
                {isTimer && isHolding && (
                  <div className="text-[11px] font-black tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 flex items-center gap-3 shadow-lg" style={{ color: accent }}>
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: accent, boxShadow: `0 0 8px ${accent}` }} />
                    HOLDING
                  </div>
                )}
                {exercise === "pushup" && elbowAngle !== null && (
                  <div className="text-[10px] font-bold tracking-widest bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg" style={{ color: elbowAngle <= 115 ? "#ef4444" : elbowAngle >= 140 ? "#00ff88" : "#eab308" }}>
                    ELBOW {Math.round(elbowAngle)}°
                  </div>
                )}
              </div>
            )}

            {/* flash feedback */}
            {feedback && !isResting && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div
                  className="px-10 py-5 rounded-3xl backdrop-blur-md text-3xl font-black tracking-widest transition-all duration-150 shadow-2xl"
                  style={{ backgroundColor: color + "30", border: `2px solid ${color}`, color: "#fff", textShadow: `0 0 20px ${color}` }}
                >
                  {feedback}
                </div>
              </div>
            )}

            {/* no pose hint */}
            {active && !poseOk && wsStatus === "connected" && !isResting && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                <div className="text-[11px] font-bold tracking-widest text-zinc-400 bg-black/80 px-6 py-3 rounded-full backdrop-blur-md border border-zinc-700 shadow-lg">
                  ไม่พบท่าทาง — ยืนหน้ากล้อง
                </div>
              </div>
            )}

            {/* EXPLAINING / COUNTDOWN Overlay */}
            {active && (isExplaining || (countdown !== null && countdown > 0)) && !isResting && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 backdrop-blur-md">
                <div className="flex flex-col items-center max-w-2xl text-center px-6">
                  {isExplaining ? (
                    <>
                      <div className="w-full md:w-[32rem] aspect-video bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-700 mb-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
                        <img src={`/src/assets/images/${exercise}_ref.gif`} alt={`${exercise} reference`} className="w-full h-full object-contain" />
                      </div>
                      <div className="text-white text-2xl md:text-3xl tracking-[0.2em] font-black mb-4 drop-shadow-md" style={{ color: accent }}>HOW TO DO IT</div>
                      <p className="text-sm md:text-base text-zinc-300 leading-relaxed font-medium mb-10 max-w-lg">{cfg.instructionText}</p>
                      <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-bold tracking-widest bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                        LISTENING TO INSTRUCTIONS...
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[14rem] font-black text-white leading-none animate-pulse drop-shadow-2xl" style={{ textShadow: `0 0 60px ${accent}80` }}>
                        {countdown}
                      </div>
                      <div className="text-zinc-400 text-[11px] tracking-[0.5em] font-black mt-6 uppercase">Get Ready</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Stats sidebar ── */}
        <div className="w-full lg:w-96 bg-zinc-900/40 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col backdrop-blur-md z-10">
          <div className="p-8 border-b border-white/5 flex flex-col items-center text-center">
            {isTimer ? (
              <>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 mb-4 uppercase bg-black/40 px-4 py-2 rounded-full border border-white/5">
                  SET {currentSet}/{targetSets} <span className="mx-2">|</span> TARGET {targetReps}S
                </div>
                <div
                  className="text-7xl font-black leading-none transition-all duration-200 mb-3"
                  style={{ color: totalTime > 0 ? "#fff" : "#3f3f46", textShadow: isHolding ? `0 0 40px ${accent}60` : "none" }}
                >
                  {formatTime(totalTime)}
                </div>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 uppercase">TIME ELAPSED</div>
              </>
            ) : (
              <>
                <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-500 mb-6 uppercase bg-black/40 px-4 py-2 rounded-full border border-white/5">
                  SET {currentSet}/{targetSets} <span className="mx-2">|</span> TARGET {targetReps} REPS
                </div>
                <div className="flex gap-4 w-full">
                  <div className="flex-1 rounded-3xl bg-black/40 border border-[#00ff88]/20 py-10 shadow-[0_10px_30px_rgba(0,255,136,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 font-black tracking-[0.2em] text-[#00ff88]/60 text-[10px] mb-2">GOOD</div>
                    <div className="relative z-10 text-5xl font-black text-[#00ff88]">{good}</div>
                  </div>
                  <div className="flex-1 rounded-3xl bg-black/40 border border-[#ef4444]/20 py-10 shadow-[0_10px_30px_rgba(239,68,68,0.05)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#ef4444]/10 to-transparent pointer-events-none" />
                    <div className="relative z-10 font-black tracking-[0.2em] text-[#ef4444]/60 text-[10px] mb-2">BAD</div>
                    <div className="relative z-10 text-5xl font-black text-[#ef4444]">{bad}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="p-8 flex flex-col gap-4 mt-auto">
            {active && (
              <>
                <button
                  onClick={resetSession}
                  className="cursor-pointer w-full py-4 text-[10px] font-bold tracking-widest text-zinc-500 border border-zinc-800 rounded-full hover:border-zinc-500 hover:text-white transition-all bg-black/20"
                >
                  RESET SET
                </button>
                <button
                  onClick={handleForceFinish}
                  className="cursor-pointer w-full py-4 text-xs tracking-widest font-black rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] transition-all hover:scale-105"
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