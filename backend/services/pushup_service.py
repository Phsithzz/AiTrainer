import cv2
import mediapipe as mp
import numpy as np
import joblib
import base64
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
model = joblib.load(BASE_DIR / "models" / "pushup_model.pkl")
le    = joblib.load(BASE_DIR / "models" / "pushup_label_encoder.pkl")

print(f"✓ โหลด pushup model สำเร็จ | classes: {le.classes_}")

# ── Config ────────────────────────────────────────────────────────────────────

# ── Config ────────────────────────────────────────────────────────────────────

CLASS_CONFIG = {
    "pushup_good":     {"feedback": "",           "count_rep": True},
    "pushup_bad_neck": {"feedback": "คอไม่ตรง!", "count_rep": True},
    "pushup_bad_back": {"feedback": "หลังแอ่น!",  "count_rep": True},
}
DEFAULT_CONFIG = {"feedback": "", "count_rep": False}

SMOOTH_N        = 7
GOOD_THRESHOLD  = 0.60

# 🟢 1. ปรับองศาให้กว้างขึ้น (ลดความเข้มงวดลง)
ELBOW_DOWN_DEG  = 115  # เดิม 100 (ถ้าลงแล้วตัวเลขหน้าจอน้อยกว่า 115 จะถือว่าลงสุด)
ELBOW_UP_DEG    = 140  # เดิม 155 (ถ้าดันขึ้นแล้วตัวเลขมากกว่า 140 จะถือว่าขึ้นสุด)

# landmark index
LEFT_WRIST    = 15
LEFT_ELBOW    = 13
LEFT_SHOULDER = 11

# ── Rep Counter ───────────────────────────────────────────────────────────────

class RepCounter:
    def __init__(self):
        self.count      = 0
        self.state      = "UP"
        self.good_count = 0
        self.bad_count  = 0
        
        # 🟢 2. เพิ่มระบบ "จำท่าผิด" เหมือน Squat
        self.is_bad_rep = False
        self.bad_label_memory = None

    def _elbow_angle(self, landmarks: list) -> float | None:
        try:
            w = np.array([landmarks[LEFT_WRIST]["x"],    landmarks[LEFT_WRIST]["y"]])
            e = np.array([landmarks[LEFT_ELBOW]["x"],    landmarks[LEFT_ELBOW]["y"]])
            s = np.array([landmarks[LEFT_SHOULDER]["x"], landmarks[LEFT_SHOULDER]["y"]])
            ew = w - e
            es = s - e
            cos_a = np.dot(ew, es) / (np.linalg.norm(ew) * np.linalg.norm(es) + 1e-8)
            return float(np.degrees(np.arccos(np.clip(cos_a, -1, 1))))
        except Exception:
            return None

    def update(self, landmarks: list, label: str, confidence: float) -> bool:
            angle = self._elbow_angle(landmarks)
            if angle is None:
                return False

            new_rep = False

            if self.state == "UP" and angle <= ELBOW_DOWN_DEG:
                # จังหวะลงสุด (เริ่ม Rep)
                self.state = "DOWN"
                self.is_bad_rep = False
                self.bad_label_memory = None

            elif self.state == "DOWN":
                if angle < ELBOW_UP_DEG:
                    # ระหว่างที่ยังขึ้นไม่สุด ถ้ามีจังหวะไหนท่าเสีย ให้จำไว้
                    if label != "pushup_good" and confidence >= GOOD_THRESHOLD:
                        self.is_bad_rep = True
                        self.bad_label_memory = label
                else:
                    # จังหวะดันขึ้นสุด (จบ Rep)
                    self.state = "UP"
                    
                    # ตัดสินผลจากความจำระหว่างทำ Rep
                    final_label = self.bad_label_memory if self.is_bad_rep else "pushup_good"
                    cfg = CLASS_CONFIG.get(final_label, DEFAULT_CONFIG)

                    if cfg["count_rep"]:
                        new_rep = True
                        if final_label == "pushup_good":
                            self.count += 1       # ✅ นับเข้าตัวเลข REPS หลัก เฉพาะ Good
                            self.good_count += 1
                        else:
                            self.bad_count += 1    # ❌ ท่าผิด ไม่นับเข้า REPS หลัก แต่นับสถิติ BAD
                            
            return new_rep

    def reset(self):
        self.__init__()

    def to_dict(self) -> dict:
        return {
            "reps":       self.count,
            "good_count": self.good_count,
            "bad_count":  self.bad_count,
            "state":      self.state,
        }

# ── Predictor ─────────────────────────────────────────────────────────────────

class PushupPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.counter     = RepCounter()
        self.pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        
    def decode_frame(self, b64_string: str) -> np.ndarray:
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame

    def landmarks_to_vector(self, landmarks: list) -> np.ndarray:
        row = []
        for lm in landmarks:
            row.extend([lm["x"], lm["y"], lm["z"], lm["visibility"]])
        return np.array(row).reshape(1, -1)
        
    def landmarks_to_list(self, landmarks) -> list:
        return [
            {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
            for lm in landmarks.landmark
        ]

    def predict(self, b64_frame: str) -> dict:
        frame = self.decode_frame(b64_frame)
        if frame is None:
            return {"error": "decode failed", "pose_detected": False}

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        results = self.pose.process(rgb)

        if not results.pose_landmarks:
            return {
                "pose_detected": False,
                "label":         "no_pose",
                "confidence":    0.0,
                "feedback":      "",
                "count_rep":     False,
                "proba":         {},
                "elbow_angle":   None,
                "landmarks":     None,
                **self.counter.to_dict(),
            }

        lm_list = self.landmarks_to_list(results.pose_landmarks)
        vec   = self.landmarks_to_vector(lm_list)
        proba = model.predict_proba(vec)
        idx   = int(np.argmax(proba))

        self.pred_buffer.append(idx)
        if len(self.pred_buffer) > SMOOTH_N:
            self.pred_buffer.pop(0)
        smooth_idx = max(set(self.pred_buffer), key=self.pred_buffer.count)

        label      = le.inverse_transform([smooth_idx])[0]
        confidence = float(proba[0][smooth_idx])
# ---------------------------------------------------------
        # 🟢 เพิ่ม RULE ตรงนี้: ปิดตา AI ไม่ให้จับผิดตอนเราพัก/แขนตึง
        # ---------------------------------------------------------
        if self.counter.state == "UP":
            label = "pushup_good"  # บังคับส่งผลให้หน้าเว็บว่าทำถูกอยู่
        # --------------------------------------------------------
        elif self.counter.state == "DOWN":
            lms = results.pose_landmarks.landmark
            
            # 1. แกล้งก้มคอ (Neck Down Hack)
            NOSE = 0
            SHOULDER = 11  # ไหล่ซ้าย
            # ถ้าจมูกอยู่ต่ำกว่าไหล่มากเกินไป (แกน Y ในคอม ยิ่งลงล่างค่ายิ่งมาก)
            if lms[NOSE].y > lms[SHOULDER].y + 0.15:
                label = "pushup_bad_neck"
                confidence = 0.99  # บังคับให้ผ่าน Threshold

            # 2. แกล้งหลังแอ่น (Bad Back Hack)
# 2. แกล้งหลังแอ่น (Bad Back Hack - ฉลาดขึ้น!)
            SHOULDER = 11  # ไหล่ซ้าย
            HIP = 23       # สะโพก
            KNEE = 25      # เข่า
            
            # คำนวณ "จุดกึ่งกลาง" ระหว่างไหล่กับเข่า (หลังที่ตรง สะโพกควรอยู่แถวๆ นี้)
            expected_hip_y = (lms[SHOULDER].y + lms[KNEE].y) / 2
            
            # ถ้าระดับสะโพกจริง ห้อยต่ำกว่าจุดกึ่งกลางมากเกินไป (ค่า Y ในจอคอมยิ่งมากลงล่าง)
            # 🟢 ตัวเลข 0.08 คือ "ระยะหยวนๆ" ปรับให้มาก/น้อยได้ตามมุมกล้องครับ
            if lms[HIP].y > expected_hip_y + 0.055:
                label = "pushup_bad_back"
                confidence = 0.99  # บังคับให้ผ่าน Threshold
        new_rep  = self.counter.update(lm_list, label, confidence)
        cfg      = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        feedback = cfg["feedback"] if label != "pushup_good" else ""

        elbow_angle = self.counter._elbow_angle(lm_list)
        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "pose_detected": True,
            "label":       label,
            "confidence":  confidence,
            "feedback":    feedback,
            "count_rep":   cfg["count_rep"],
            "proba":       proba_dict,
            "elbow_angle": elbow_angle,
            "landmarks":   lm_list,
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()
        
    def close(self):
        self.pose.close()