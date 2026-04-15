import cv2
import mediapipe as mp
import numpy as np
import joblib
import base64
from pathlib import Path

# ── โหลด model ────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent
model = joblib.load(BASE_DIR / "models" / "squat_model.pkl")
le    = joblib.load(BASE_DIR / "models" / "label_encoder.pkl")

print(f"✓ โหลด squat model สำเร็จ")
print(f"  Classes: {le.classes_}")

# ── Config ─────────────────────────────────────────────────────────────────────

CLASS_CONFIG = {
    "squat_good":     {"feedback": "",                 "count_rep": True},
    "squat_bad_heel": {"feedback": "ส้นเท้าลอย!",     "count_rep": True},
    "squat_bad_back": {"feedback": "หลังงอ!",          "count_rep": True},
    "squat_bad_foot": {"feedback": "เท้าไม่ติดพื้น!",  "count_rep": False},
}
DEFAULT_CONFIG = {"feedback": "", "count_rep": False}

SMOOTH_N       = 7
GOOD_THRESHOLD = 0.65

# landmark index
LEFT_HIP   = 23
RIGHT_HIP  = 24
LEFT_KNEE  = 25
RIGHT_KNEE = 26

# ── Rep Counter ───────────────────────────────────────────────────────────────

# ── Rep Counter ───────────────────────────────────────────────────────────────

class RepCounter:
    def __init__(self):
        self.count      = 0
        self.state      = "UP"
        self.good_count = 0
        self.bad_count  = 0
        
        # 🟢 เพิ่ม 2 ตัวแปรนี้เพื่อจำว่าระหว่างที่ลงไป ท่าเสียหรือไม่
        self.is_bad_rep = False
        self.bad_label_memory = None

    def update(self, landmarks_list: list, label: str, confidence: float) -> bool:
        hip_y  = (landmarks_list[LEFT_HIP]["y"]  + landmarks_list[RIGHT_HIP]["y"])  / 2
        knee_y = (landmarks_list[LEFT_KNEE]["y"] + landmarks_list[RIGHT_KNEE]["y"]) / 2
        is_down = hip_y > knee_y * 0.88

        new_rep = False

        if self.state == "UP" and is_down:
            # 1. จังหวะเริ่มลง (เปลี่ยนจากยืนเป็นนั่ง)
            self.state = "DOWN"
            # รีเซ็ตความจำใหม่ทุกครั้งที่เริ่ม Rep
            self.is_bad_rep = False
            self.bad_label_memory = None
            
        elif self.state == "DOWN":
            if is_down:
                # 2. จังหวะกำลังนั่งอยู่ (Hold)
                # ถ้าเจอท่าที่ผิดระหว่างนี้ ให้ "จำ" ไว้เลยว่า Rep นี้เสียแล้ว
                if label != "squat_good" and confidence >= GOOD_THRESHOLD:
                    self.is_bad_rep = True
                    self.bad_label_memory = label
            else:
                # 3. จังหวะยืนขึ้น (เปลี่ยนจากนั่งเป็นยืน = จบ Rep)
                self.state = "UP"
                
                # ตัดสินผลลัพธ์ของ Rep นี้จากความจำ
                final_label = self.bad_label_memory if self.is_bad_rep else "squat_good"
                cfg = CLASS_CONFIG.get(final_label, DEFAULT_CONFIG)

                if cfg["count_rep"]:
                    new_rep = True
                    if final_label == "squat_good":
                        self.count += 1
                        self.good_count += 1
                    else:
                        self.bad_count += 1

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

# ── Squat Predictor (1 instance ต่อ 1 WebSocket) ──────────────────────────────

class SquatPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.counter     = RepCounter()
        # สร้าง MediaPipe Pose instance ต่อ user
        self.pose = mp.solutions.pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    def decode_frame(self, b64_string: str) -> np.ndarray:
        """base64 JPEG → numpy BGR array"""
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        img_bytes = base64.b64decode(b64_string)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return frame

    def landmarks_to_vector(self, landmarks) -> np.ndarray:
        row = []
        for lm in landmarks.landmark:
            row.extend([lm.x, lm.y, lm.z, lm.visibility])
        return np.array(row).reshape(1, -1)

    def landmarks_to_list(self, landmarks) -> list:
        """แปลง MediaPipe landmarks → list of dict เพื่อส่งกลับ frontend"""
        return [
            {
                "x": lm.x,
                "y": lm.y,
                "z": lm.z,
                "visibility": lm.visibility,
            }
            for lm in landmarks.landmark
        ]

    def _calculate_angle(self, a, b, c) -> float:
        """คำนวณองศาระหว่างจุด a, b, c (b คือจุดศูนย์กลาง)"""
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
        angle = np.abs(radians*180.0/np.pi)
        if angle > 180.0:
            angle = 360.0 - angle
        return angle

    def predict(self, b64_frame: str) -> dict:
        # 1. decode frame
        frame = self.decode_frame(b64_frame)
        if frame is None:
            return {"error": "decode failed", "pose_detected": False}

        # 2. รัน MediaPipe
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
                "landmarks":     None,
                **self.counter.to_dict(),
            }

        # 3. predict ด้วย Model
        vec   = self.landmarks_to_vector(results.pose_landmarks)
        proba = model.predict_proba(vec)
        idx   = int(np.argmax(proba))

        # smoothing
        self.pred_buffer.append(idx)
        if len(self.pred_buffer) > SMOOTH_N:
            self.pred_buffer.pop(0)
        smooth_idx = max(set(self.pred_buffer), key=self.pred_buffer.count)

        label      = le.inverse_transform([smooth_idx])[0]
        confidence = float(proba[0][smooth_idx])

        # ---------------------------------------------------------
        # 🎯 HYBRID RULES: เอา Rule-based มาดักจับทับ AI อีกรอบ
        # ---------------------------------------------------------
# 🟢 แก้ไขที่ 1: ปิดตา AI ไม่ให้จับผิดตอนกำลังยืนพัก (UP)
        lms = results.pose_landmarks.landmark
        if self.counter.state == "UP":
            label = "squat_good"
        else:
            # 🟢 แก้ไขที่ 2: ให้จับผิดเฉพาะตอนกำลังย่อตัว (DOWN) เท่านั้น
            # กฎที่ 1: ดักจับส้นเท้าลอย
            LEFT_HEEL, RIGHT_HEEL = 29, 30
            LEFT_FOOT_INDEX, RIGHT_FOOT_INDEX = 31, 32
            
            heel_y = (lms[LEFT_HEEL].y + lms[RIGHT_HEEL].y) / 2
            foot_y = (lms[LEFT_FOOT_INDEX].y + lms[RIGHT_FOOT_INDEX].y) / 2
            
            # ปรับตัวเลขความเซนซิทีฟจาก 0.015 เป็น 0.04 (เพิ่มระยะเผื่อให้มุมกล้อง)
            if heel_y < foot_y - 0.04: 
                label = "squat_bad_heel"
                confidence = 0.99  # บังคับให้มั่นใจไปเลยเพื่อ Override AI

            # กฎที่ 2: ดักจับหลังงอ
            shoulder = [ (lms[11].x + lms[12].x)/2, (lms[11].y + lms[12].y)/2 ]
            hip      = [ (lms[23].x + lms[24].x)/2, (lms[23].y + lms[24].y)/2 ]
            knee     = [ (lms[25].x + lms[26].x)/2, (lms[25].y + lms[26].y)/2 ]
            
            back_angle = self._calculate_angle(shoulder, hip, knee)
            
            if back_angle < 60.0: 
                label = "squat_bad_back"
                confidence = 0.99  # บังคับให้มั่นใจไปเลย
        # ---------------------------------------------------------

        # 4. update rep counter
        lm_list = self.landmarks_to_list(results.pose_landmarks)
        new_rep = self.counter.update(lm_list, label, confidence)

        cfg      = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        feedback = cfg["feedback"] if (new_rep or label == "squat_bad_foot" or label != "squat_good") else ""
        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "pose_detected": True,
            "label":         label,
            "confidence":    confidence,
            "feedback":      feedback,
            "count_rep":     cfg["count_rep"],
            "proba":         proba_dict,
            "landmarks":     lm_list,
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()

    def close(self):
        self.pose.close()