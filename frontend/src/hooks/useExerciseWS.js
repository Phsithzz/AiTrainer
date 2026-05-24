import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/exercise";
const SEND_INTERVAL_MS = 100;

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
];

// 🟢 อัปเดต Label ให้ตรงกับ Model ฝั่ง Backend ทั้ง 3 ท่า
export const EXERCISE_CONFIG = {
  squat: {
    wsPath:  "squat",
    accent:  "#00ff88",
    labelColors: {
      squat_good:     "#00ff88",
      squat_bad_heel: "#ff9500",
      squat_bad_back: "#ff3b30",
    },
    labelText: {
      squat_good:     "เยี่ยมมาก ทรงตัวได้ดี",
      squat_bad_heel: "ส้นเท้าลอย! ถ่ายน้ำหนักลงส้นเท้า",
      squat_bad_back: "หลังโค้ง! ยืดอกขึ้น เกร็งหน้าท้อง",
    },
    probaKeys: [
      { key: "squat_good",     label: "GOOD",      color: "#00ff88" },
      { key: "squat_bad_heel", label: "BAD HEEL",  color: "#ff9500" },
      { key: "squat_bad_back", label: "BAD BACK",  color: "#ff3b30" },
    ],
    mode: "reps", 
    instructionText: "ในท่า squat ให้คุณกางเท้าเท่าช่วงหัวไหล่ ย่อตัวลงโดยให้หลังตรงและส้นเท้าติดพื้น",
  },
  pushup: {
    wsPath:  "pushup",
    accent:  "#ff6b35",
    labelColors: {
      pushup_good:     "#ff6b35",
      pushup_bad_hips: "#ff9500", // 🟢 อัปเดตตามโมเดลใหม่
      pushup_bad_legs: "#ff3b30", // 🟢 อัปเดตตามโมเดลใหม่
      pushup_bad_neck: "#bf5af2", // 🟢 อัปเดตตามโมเดลใหม่
    },
    labelText: {
      pushup_good:     "ดีมาก รักษาจังหวะไว้",
      pushup_bad_hips: "สะโพกยกหรือห้อย! ล็อคแกนกลางลำตัวให้ตรง",
      pushup_bad_legs: "ขางอ! เหยียดขาให้ตึงตลอดเวลา",
      pushup_bad_neck: "อย่าก้มหน้า! เงยหน้าขึ้นมองที่พื้นด้านหน้า",
    },
    probaKeys: [
      { key: "pushup_good",     label: "GOOD",      color: "#ff6b35" },
      { key: "pushup_bad_hips", label: "BAD HIPS",  color: "#ff9500" },
      { key: "pushup_bad_legs", label: "BAD LEGS",  color: "#ff3b30" },
      { key: "pushup_bad_neck", label: "BAD NECK",  color: "#bf5af2" },
    ],
    mode: "reps",
    instructionText: "ในท่า pushup ให้คุณวางมือกว้างกว่าช่วงไหล่เล็กน้อย ลำตัวตรงตั้งแต่หัวถึงส้นเท้า",
  },
  plank: {
    wsPath:  "plank",
    accent:  "#a855f7",
    labelColors: {
      plank_good:     "#a855f7",
      plank_bad_hips: "#ff9500", // 🟢 อัปเดตตามโมเดลใหม่
      plank_bad_legs: "#ff3b30", // 🟢 อัปเดตตามโมเดลใหม่
      plank_bad_neck: "#bf5af2", // 🟢 อัปเดตตามโมเดลใหม่
    },
    labelText: {
      plank_good:     "ฟอร์มสวยมาก เกร็งค้างไว้",
      plank_bad_hips: "สะโพกโด่งหรือตก! เกร็งหน้าท้องให้ลำตัวขนานกับพื้น",
      plank_bad_legs: "เข่างอ! เหยียดขาและเกร็งต้นขาให้ตึง",
      plank_bad_neck: "ก้มหรือเงยหัวเกินไป! มองตรงไปที่มือตัวเอง",
    },
    probaKeys: [
      { key: "plank_good",     label: "GOOD",      color: "#a855f7" },
      { key: "plank_bad_hips", label: "BAD HIPS",  color: "#ff9500" },
      { key: "plank_bad_legs", label: "BAD LEGS",  color: "#ff3b30" },
      { key: "plank_bad_neck", label: "BAD NECK",  color: "#bf5af2" },
    ],
    mode: "timer",
    instructionText: "ในท่า plank ให้คุณวางศอกลงกับพื้น เกร็งหน้าท้องและรักษาแนวลำตัวให้ขนานกับพื้น",
  },
};

export function useExerciseWS(exercise, videoRef, overlayCanvasRef, active, isTracking = true) {

  const wsRef       = useRef(null);
  const intervalRef = useRef(null);
  const sendingRef  = useRef(false);
  const lastAudioTime = useRef(0);
  
  const [result, setResult]     = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");

  const cfg = EXERCISE_CONFIG[exercise] || EXERCISE_CONFIG.squat;
  const isTrackingRef = useRef(isTracking);
  // 🟢 ประกาศตัวแปรเก็บสถานะไว้เหนือฟังก์ชัน (เอาไว้เช็คว่าเพิ่งชมไปหรือยัง)
  const lastWasGood = useRef(false);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]); 
  
const speakWarning = useCallback((label) => {
    if (!label) return;

    const now = Date.now();
    
    // 🔴 เคสที่ 1: ถ้าเป็นท่าผิด (_bad_)
    if (label.includes("_bad_")) {
      lastWasGood.current = false; // รีเซ็ตสถานะว่าตอนนี้ทำผิดอยู่
      
      // หน่วงเวลา 4 วินาที ไม่ให้ด่ารัวเกินไป และ "ห้ามพูดแทรกถ้ากำลังพูดอยู่"
      if (now - lastAudioTime.current > 3000) {
        
        // 🟢 [หัวใจสำคัญ] ถ้าบอทกำลังบ่น/ชมอะไรอยู่ ให้รอจนกว่าจะพูดจบ ห้าม cancel() เด็ดขาด!
        if (!window.speechSynthesis.speaking) {
          const textToSpeak = cfg.labelText[label] || "Bad form";
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.lang = "th-TH"; 
          utterance.rate = 0.9;
          window.speechSynthesis.speak(utterance);
          lastAudioTime.current = now;
        }
      }
    } 
    // 🟢 เคสที่ 2: ถ้าเป็นท่าถูก (_good) 
    else if (label.includes("_good")) {
      
      // จะให้พูดชม เฉพาะตอนที่ "เพิ่งเปลี่ยนจากท่าผิด มาทำท่าถูก" เท่านั้น 
      if (!lastWasGood.current) {
        
        // 🟢 [หัวใจสำคัญ] เช็คก่อนว่าบอทปากว่างไหม ห้ามพูดแทรกเสียงด่า
        if (!window.speechSynthesis.speaking) {
          const utterance = new SpeechSynthesisUtterance("ท่าทางถูกต้อง ทำดีมากครับ");
          utterance.lang = "th-TH";
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
          
          lastWasGood.current = true; // ล็อคว่าพูดชมไปแล้ว ห้ามชมซ้ำ
        }
      }
    }
  }, [cfg]);

  // ── วาด skeleton ──────────────────────────────────────────────────────────
  const drawSkeleton = useCallback((landmarks, color) => {
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || !landmarks) return;

    canvas.width  = video.videoWidth  || canvas.offsetWidth;
    canvas.height = video.videoHeight || canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;
    const toXY = (lm) => ({ x: lm.x * W, y: lm.y * H });

    ctx.lineWidth   = 3;
    ctx.strokeStyle = color + "cc";
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;

    POSE_CONNECTIONS.forEach(([a, b]) => {
      if (!landmarks[a] || !landmarks[b]) return;
      const p1 = toXY(landmarks[a]);
      const p2 = toXY(landmarks[b]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });

    ctx.shadowBlur = 14;
    landmarks.forEach((lm) => {
      if (lm.visibility < 0.5) return;
      const { x, y } = toXY(lm);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle   = "#ffffff";
      ctx.shadowColor = color;
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, [overlayCanvasRef, videoRef]);

  const clearCanvas = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  }, [overlayCanvasRef]);

  // ── capture frame ─────────────────────────────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const tmp = document.createElement("canvas");
    tmp.width  = video.videoWidth;
    tmp.height = video.videoHeight;
    tmp.getContext("2d").drawImage(video, 0, 0);
    return tmp.toDataURL("image/jpeg", 0.7);
  }, [videoRef]);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");

    const ws = new WebSocket(`${WS_BASE}/${cfg.wsPath}`);

    ws.onopen = () => {
      console.log(`✓ WS connected — ${exercise}`);
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.action === "reset_ok") { setResult(null); sendingRef.current = false; return; }
      if (data.error) { sendingRef.current = false; return; }

      if (data.landmarks && data.pose_detected) {
        const color = cfg.labelColors[data.label] || cfg.accent;
        drawSkeleton(data.landmarks, color);
        speakWarning(data.label);
      } else if (!data.pose_detected) {
        clearCanvas();
      }

      setResult(data);
      sendingRef.current = false;
    };

    ws.onclose = () => { setWsStatus("disconnected"); sendingRef.current = false; };
    ws.onerror = () => setWsStatus("error");
    wsRef.current = ws;
  }, [exercise, cfg, drawSkeleton, clearCanvas, speakWarning]);

  const disconnectWS = useCallback(() => {
    clearInterval(intervalRef.current);
    wsRef.current?.close();
    wsRef.current      = null;
    sendingRef.current = false;
    setWsStatus("disconnected");
    window.speechSynthesis.cancel();
    clearCanvas();
  }, [clearCanvas]);

  const startSendLoop = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!isTrackingRef.current || sendingRef.current) return;
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      
      const b64 = captureFrame();
      if (!b64) return;
      sendingRef.current = true;
      wsRef.current.send(JSON.stringify({ frame: b64 }));
    }, SEND_INTERVAL_MS);
  }, [captureFrame]);

  const resetSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "reset" }));
    }
    clearCanvas();
  }, [clearCanvas]);

  // ── main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (active) {
      connectWS(); 
      
      const t = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(t);
          startSendLoop();
        }
      }, 200);

      return () => {
        clearInterval(intervalRef.current);
        disconnectWS();
      };
    } else {
      disconnectWS();
    }
  }, [active, connectWS, startSendLoop, disconnectWS]);

  return { result, wsStatus, resetSession, cfg };
}