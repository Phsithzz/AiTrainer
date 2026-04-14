import { useEffect, useRef, useState, useCallback } from "react";

const WS_BASE = "ws://localhost:8000/exercise";
const SEND_INTERVAL_MS = 100;

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
];

export const EXERCISE_CONFIG = {
  squat: {
    wsPath:  "squat",
    accent:  "#00ff88",
    labelColors: {
      squat_good:     "#00ff88",
      squat_bad_heel: "#ff9500",
      squat_bad_back: "#ff3b30",
      squat_bad_foot: "#bf5af2",
    },
    labelText: {
      squat_good:     "GOOD FORM",
      squat_bad_heel: "HEEL UP",
      squat_bad_back: "BACK BENT",
      squat_bad_foot: "FEET UP",
    },
    probaKeys: [
      { key: "squat_good",     label: "GOOD",      color: "#00ff88" },
      { key: "squat_bad_heel", label: "HEEL UP",   color: "#ff9500" },
      { key: "squat_bad_back", label: "BACK BENT", color: "#ff3b30" },
      { key: "squat_bad_foot", label: "FEET UP",   color: "#bf5af2" },
    ],
    mode: "reps",   // "reps" | "timer"
  },
  pushup: {
    wsPath:  "pushup",
    accent:  "#ff6b35",
    labelColors: {
      pushup_good:     "#ff6b35",
      pushup_bad_neck: "#ff9500",
      pushup_bad_back: "#ff3b30",
    },
    labelText: {
      pushup_good:     "GOOD FORM",
      pushup_bad_neck: "NECK DOWN",
      pushup_bad_back: "BACK BENT",
    },
    probaKeys: [
      { key: "pushup_good",     label: "GOOD",      color: "#ff6b35" },
      { key: "pushup_bad_neck", label: "NECK DOWN", color: "#ff9500" },
      { key: "pushup_bad_back", label: "BACK BENT", color: "#ff3b30" },
    ],
    mode: "reps",
  },
  plank: {
    wsPath:  "plank",
    accent:  "#a855f7",
    labelColors: {
      plank_good:     "#a855f7",
      plank_bad_back: "#ff3b30",
      plank_bad_hip:  "#ff9500",
    },
    labelText: {
      plank_good:     "GOOD FORM",
      plank_bad_back: "BACK BENT",
      plank_bad_hip:  "HIP HIGH",
    },
    probaKeys: [
      { key: "plank_good",     label: "GOOD",      color: "#a855f7" },
      { key: "plank_bad_back", label: "BACK BENT", color: "#ff3b30" },
      { key: "plank_bad_hip",  label: "HIP HIGH",  color: "#ff9500" },
    ],
    mode: "timer",  // plank ใช้จับเวลา ไม่นับ rep
  },
};

export function useExerciseWS(exercise, videoRef, overlayCanvasRef, active, isTracking = true) {


  const wsRef       = useRef(null);
  const intervalRef = useRef(null);
  const sendingRef  = useRef(false);

  const [result, setResult]     = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");

  const cfg = EXERCISE_CONFIG[exercise] || EXERCISE_CONFIG.squat;
const isTrackingRef = useRef(isTracking);
  useEffect(() => { isTrackingRef.current = isTracking; }, [isTracking]); 
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
    // โค้ดที่แก้ไขแล้ว
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
      } else if (!data.pose_detected) {
        clearCanvas();
      }

      setResult(data);
      sendingRef.current = false;
    };

    ws.onclose = () => { setWsStatus("disconnected"); sendingRef.current = false; };
    ws.onerror = () => setWsStatus("error");
    wsRef.current = ws;
  }, [exercise, cfg, drawSkeleton, clearCanvas]);

  const disconnectWS = useCallback(() => {
    clearInterval(intervalRef.current);
    wsRef.current?.close();
    wsRef.current      = null;
    sendingRef.current = false;
    setWsStatus("disconnected");
    setResult(null);
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
// ── main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (active) {
      connectWS(); // เชื่อม WebSocket อย่างเดียว ไม่ต้องเปิดกล้องใหม่แล้ว
      
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

  