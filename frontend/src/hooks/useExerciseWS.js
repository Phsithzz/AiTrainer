import { useEffect, useRef, useState, useCallback } from "react";
import "@mediapipe/camera_utils";
import "@mediapipe/pose";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000/exercise";
const SEND_INTERVAL_MS = 100;
const MEDIAPIPE_POSE_ASSET_BASE =
  "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404";

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
];

// 🟢 อัปเดต Label ให้ตรงกับ Model ฝั่ง Backend ทั้ง 3 ท่า
// 🟢 อัปเดต Label ให้ตรงกับ Model ฝั่ง Backend ทั้ง 3 ท่า และปรับสีให้คอนทราสต์ชัดเจน
export const EXERCISE_CONFIG = {
  squat: {
    wsPath:  "squat",
    accent:  "#00ff88", // เขียวนีออน
    labelColors: {
      squat_good:     "#00ff88", // เขียว (Accent)
      squat_bad_heel: "#eab308", // เหลืองนีออน (Warning)
      squat_bad_back: "#ef4444", // แดงนีออน (Critical)
    },
    labelText: {
      squat_good:     "เยี่ยมมาก ทรงตัวได้ดี",
      squat_bad_heel: "ส้นเท้าลอย! ถ่ายน้ำหนักลงส้นเท้า",
      squat_bad_back: "หลังโค้ง! ยืดอกขึ้น เกร็งหน้าท้อง",
    },
    probaKeys: [
      { key: "squat_good",     label: "GOOD",      color: "#00ff88" },
      { key: "squat_bad_heel", label: "BAD HEEL",  color: "#eab308" },
      { key: "squat_bad_back", label: "BAD BACK",  color: "#ef4444" },
    ],
    mode: "reps", 
    instructionText: "ในท่า squat ให้คุณกางเท้าเท่าช่วงหัวไหล่ ย่อตัวลงโดยให้หลังตรงและส้นเท้าติดพื้น",
  },
  pushup: {
    wsPath:  "pushup",
    accent:  "#ff6b35", // ส้มนีออน
    labelColors: {
      pushup_good:     "#ff6b35", // ส้ม (Accent)
      pushup_bad_hips: "#eab308", // เหลืองนีออน (Warning)
      pushup_bad_legs: "#ef4444", // แดงนีออน (Critical)
      pushup_bad_neck: "#06b6d4", // ฟ้าไซไฟ (ตัดกับสีส้มชัดเจน)
    },
    labelText: {
      pushup_good:     "ดีมาก รักษาจังหวะไว้",
      pushup_bad_hips: "สะโพกยกหรือห้อย! ล็อคแกนกลางลำตัวให้ตรง",
      pushup_bad_legs: "ขางอ! เหยียดขาให้ตึงตลอดเวลา",
      pushup_bad_neck: "อย่าก้มหน้า! เงยหน้าขึ้นมองที่พื้นด้านหน้า",
    },
    probaKeys: [
      { key: "pushup_good",     label: "GOOD",      color: "#ff6b35" },
      { key: "pushup_bad_hips", label: "BAD HIPS",  color: "#eab308" },
      { key: "pushup_bad_legs", label: "BAD LEGS",  color: "#ef4444" },
      { key: "pushup_bad_neck", label: "BAD NECK",  color: "#06b6d4" },
    ],
    mode: "reps",
    instructionText: "ในท่า pushup ให้คุณวางมือกว้างกว่าช่วงไหล่เล็กน้อย ลำตัวตรงตั้งแต่หัวถึงส้นเท้า",
  },
  plank: {
    wsPath:  "plank",
    accent:  "#a855f7", // ม่วงนีออน
    labelColors: {
      plank_good:     "#a855f7", // ม่วง (Accent)
      plank_bad_hips: "#eab308", // เหลืองนีออน (Warning)
      plank_bad_legs: "#ef4444", // แดงนีออน (Critical)
      plank_bad_neck: "#06b6d4", // ฟ้าไซไฟ (ตัดกับสีม่วงชัดเจน)
    },
    labelText: {
      plank_good:     "ฟอร์มสวยมาก เกร็งค้างไว้",
      plank_bad_hips: "สะโพกโด่งหรือตก! เกร็งหน้าท้องให้ลำตัวขนานกับพื้น",
      plank_bad_legs: "เข่างอ! เหยียดขาและเกร็งต้นขาให้ตึง",
      plank_bad_neck: "ก้มหรือเงยหัวเกินไป! มองตรงไปที่มือตัวเอง",
    },
    probaKeys: [
      { key: "plank_good",     label: "GOOD",      color: "#a855f7" },
      { key: "plank_bad_hips", label: "BAD HIPS",  color: "#eab308" },
      { key: "plank_bad_legs", label: "BAD LEGS",  color: "#ef4444" },
      { key: "plank_bad_neck", label: "BAD NECK",  color: "#06b6d4" },
    ],
    mode: "timer",
    instructionText: "ในท่า plank ให้คุณวางศอกลงกับพื้น เกร็งหน้าท้องและรักษาแนวลำตัวให้ขนานกับพื้น",
  },
};

export function useExerciseWS(
  exercise,
  videoRef,
  overlayCanvasRef,
  active,
  isTracking = true,
) {

  const wsRef       = useRef(null);
  const cameraRef   = useRef(null);
  const poseRef     = useRef(null);
  const sendingRef  = useRef(false);
  const lastSentAtRef = useRef(0);
  const lastAudioTime = useRef(0);
  
  const [result, setResult]     = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const cfg = EXERCISE_CONFIG[exercise] || EXERCISE_CONFIG.squat;
  const activeRef = useRef(active);
  const isTrackingRef = useRef(isTracking);
  // 🟢 ประกาศตัวแปรเก็บสถานะไว้เหนือฟังก์ชัน (เอาไว้เช็คว่าเพิ่งชมไปหรือยัง)
  const lastWasGood = useRef(false);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]); 
  
const speakWarning = useCallback((label) => {
    if (!label) return; // 🟢 ลบการดัก _bad_ ทิ้งไป ให้มันรับฟังทุกท่า

    const now = Date.now();
    
    // 🔴 เคสที่ 1: ถ้าเป็นท่าผิด (_bad_)
    if (label.includes("_bad_")) {
      lastWasGood.current = false; // รีเซ็ตสถานะว่าตอนนี้ทำผิดอยู่
      
      // หน่วงเวลา 4 วินาที ไม่ให้ด่ารัวเกินไป
      if (now - lastAudioTime.current > 4000 && !window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        const textToSpeak = cfg.labelText[label] || "Bad form";
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = "th-TH"; 
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        lastAudioTime.current = now;
      }
    } 
    // 🟢 เคสที่ 2: ถ้าเป็นท่าถูก (_good) 
    else if (label.includes("_good")) {
      
      // จะให้พูดชม เฉพาะตอนที่ "เพิ่งเปลี่ยนจากท่าผิด มาทำท่าถูก" เท่านั้น 
      // จะได้ไม่พูดชมซ้ำๆ รัวๆ ตอนทำท่าค้างไว้
      if (!lastWasGood.current) {
        window.speechSynthesis.cancel(); // สั่งหยุดเสียงด่าก่อนหน้าทันที
        
        const utterance = new SpeechSynthesisUtterance("ท่าทางถูกต้อง ทำดีมากครับ");
        utterance.lang = "th-TH";
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
        
        lastWasGood.current = true; // ล็อคว่าพูดชมไปแล้ว ห้ามชมซ้ำ
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

  // ── Client-side MediaPipe: video -> 33 landmarks ─────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    let disposed = false;
    const pose = new globalThis.Pose({
      locateFile: (file) => `${MEDIAPIPE_POSE_ASSET_BASE}/${file}`,
    });
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((poseResults) => {
      if (disposed || !activeRef.current) return;

      const detectedLandmarks = poseResults.poseLandmarks;
      if (!detectedLandmarks || detectedLandmarks.length !== 33) {
        clearCanvas();
        setResult((previous) => ({
          ...(previous || {}),
          pose_detected: false,
          label: "no_pose",
          confidence: 0,
          feedback: "",
          proba: {},
          landmarks: null,
        }));
        return;
      }

      if (!isTrackingRef.current || sendingRef.current) return;
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const now = performance.now();
      if (now - lastSentAtRef.current < SEND_INTERVAL_MS) return;

      const landmarks = detectedLandmarks.map((landmark) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility: landmark.visibility ?? 0,
      }));

      lastSentAtRef.current = now;
      sendingRef.current = true;
      try {
        wsRef.current.send(JSON.stringify({ action: "predict", landmarks }));
      } catch (error) {
        console.error("WebSocket landmark send failed:", error);
        sendingRef.current = false;
      }
    });

    const camera = new globalThis.Camera(video, {
      width: 640,
      height: 480,
      facingMode: "user",
      onFrame: async () => {
        if (!activeRef.current || disposed) return;
        try {
          await pose.send({ image: video });
        } catch (error) {
          if (!disposed) console.error("MediaPipe Pose failed:", error);
        }
      },
    });

    poseRef.current = pose;
    cameraRef.current = camera;
    camera.start().then(() => {
      if (!disposed) {
        setCameraError(null);
        setCameraReady(true);
      }
    }).catch((error) => {
      if (!disposed) {
        setCameraReady(false);
        setCameraError(error);
      }
    });

    return () => {
      disposed = true;
      cameraRef.current = null;
      poseRef.current = null;
      void camera.stop();
      void pose.close();
    };
  }, [videoRef, clearCanvas]);

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
    wsRef.current?.close();
    wsRef.current      = null;
    sendingRef.current = false;
    setWsStatus("disconnected");
    window.speechSynthesis.cancel();
    clearCanvas();
  }, [clearCanvas]);

  const resetSession = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "reset" }));
    }
    clearCanvas();
  }, [clearCanvas]);

  // ── main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    const connectionTimer = window.setTimeout(() => {
      if (active) connectWS();
      else disconnectWS();
    }, 0);

    if (active) {
      return () => {
        window.clearTimeout(connectionTimer);
        disconnectWS();
      };
    }

    return () => window.clearTimeout(connectionTimer);
  }, [active, connectWS, disconnectWS]);

  return { result, wsStatus, resetSession, cfg, cameraReady, cameraError };
}
