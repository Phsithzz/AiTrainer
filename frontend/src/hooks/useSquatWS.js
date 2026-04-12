import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = "ws://localhost:8000/exercise/squat";
const SEND_INTERVAL_MS = 100; // ส่ง frame ทุก 100ms = ~10fps

// MediaPipe Pose connections สำหรับวาด skeleton
const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
  [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
];

export const LABEL_COLOR = {
  squat_good:     "#00ff88",
  squat_bad_heel: "#ff9500",
  squat_bad_back: "#ff3b30",
  squat_bad_foot: "#bf5af2",
};

export function useSquatWS(videoRef, overlayCanvasRef, active) {
  const wsRef        = useRef(null);
  const intervalRef  = useRef(null);
  const sendingRef   = useRef(false); // throttle: รอ response ก่อนส่งใหม่

  const [result, setResult]     = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");

  // ── วาด skeleton จาก landmarks ที่ backend ส่งกลับมา ──────────────────────
  const drawSkeleton = useCallback((landmarks, color) => {
    const canvas = overlayCanvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video || !landmarks) return;

    // sync canvas size กับ video
    canvas.width  = video.videoWidth  || canvas.offsetWidth;
    canvas.height = video.videoHeight || canvas.offsetHeight;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const W = canvas.width;
    const H = canvas.height;

    // mirror เพราะ video ถูก flip CSS แล้ว
    const toXY = (lm) => ({ x: (1 - lm.x) * W, y: lm.y * H });

    // วาด connections
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

    // วาด joints
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

  // ── capture frame จาก video → base64 JPEG ────────────────────────────────
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width  = video.videoWidth;
    tmpCanvas.height = video.videoHeight;
    const ctx = tmpCanvas.getContext("2d");

    // วาด video ลง canvas (ไม่ต้อง flip เพราะ backend ต้องการ frame ปกติ)
    ctx.drawImage(video, 0, 0);
    return tmpCanvas.toDataURL("image/jpeg", 0.7); // quality 70% ลด bandwidth
  }, [videoRef]);

  // ── เชื่อม WebSocket ──────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    setWsStatus("connecting");

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log("✓ WS connected (Plan A)");
      setWsStatus("connected");
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.action === "reset_ok") {
        setResult(null);
        sendingRef.current = false;
        return;
      }
      if (data.error) {
        console.warn("WS error:", data.error);
        sendingRef.current = false;
        return;
      }

      // วาด skeleton ถ้ามี landmarks กลับมา
      if (data.landmarks && data.pose_detected) {
        const color = LABEL_COLOR[data.label] || "#00ff88";
        drawSkeleton(data.landmarks, color);
      } else if (!data.pose_detected) {
        clearCanvas();
      }

      setResult(data);
      sendingRef.current = false; // พร้อมส่ง frame ถัดไป
    };

    ws.onclose = () => {
      console.log("✗ WS disconnected");
      setWsStatus("disconnected");
      sendingRef.current = false;
    };

    ws.onerror = () => {
      console.error("WS error");
      setWsStatus("error");
    };

    wsRef.current = ws;
  }, [drawSkeleton, clearCanvas]);

  const disconnectWS = useCallback(() => {
    clearInterval(intervalRef.current);
    wsRef.current?.close();
    wsRef.current   = null;
    sendingRef.current = false;
    setWsStatus("disconnected");
    setResult(null);
    clearCanvas();
  }, [clearCanvas]);

  // ── ส่ง frame loop ────────────────────────────────────────────────────────
  const startSendLoop = useCallback(() => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      // throttle: ถ้ายังรอ response อยู่ ข้ามไปก่อน
      if (sendingRef.current) return;
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;

      const b64 = captureFrame();
      if (!b64) return;

      sendingRef.current = true;
      wsRef.current.send(JSON.stringify({ frame: b64 }));
    }, SEND_INTERVAL_MS);
  }, [captureFrame]);

  // ── reset ─────────────────────────────────────────────────────────────────
  const resetCounter = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "reset" }));
    }
    clearCanvas();
  }, [clearCanvas]);

  // ── main effect ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      disconnectWS();
      return;
    }

    // รอให้ video พร้อมก่อน
    const video = videoRef.current;
    if (!video) return;

    const startAll = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        video.srcObject = stream;
        await new Promise((res) => { video.onloadedmetadata = res; });
        await video.play();

        connectWS();

        // รอให้ WS เปิดก่อนส่ง
        const waitWS = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            clearInterval(waitWS);
            startSendLoop();
          }
        }, 200);

      } catch (err) {
        console.error("Camera error:", err);
        setWsStatus("error");
      }
    };

    startAll();

    return () => {
      clearInterval(intervalRef.current);
      // หยุด camera stream
      if (video.srcObject) {
        video.srcObject.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
      disconnectWS();
    };
  }, [active]);

  return { result, wsStatus, resetCounter };
}