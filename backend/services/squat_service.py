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

class RepCounter:
    def __init__(self):
        self.count      = 0
        self.state      = "UP"
        self.good_count = 0
        self.bad_count  = 0
        self.last_label = None

    def update(self, landmarks_list: list, label: str, confidence: float) -> bool:
        hip_y  = (landmarks_list[LEFT_HIP]["y"]  + landmarks_list[RIGHT_HIP]["y"])  / 2
        knee_y = (landmarks_list[LEFT_KNEE]["y"] + landmarks_list[RIGHT_KNEE]["y"]) / 2
        is_down = hip_y > knee_y * 0.88

        new_rep = False

        if self.state == "UP" and is_down:
            self.state      = "DOWN"
            self.last_label = label

        elif self.state == "DOWN" and not is_down:
            self.state = "UP"
            cfg = CLASS_CONFIG.get(self.last_label, DEFAULT_CONFIG)

            if not cfg["count_rep"]:
                pass
            elif confidence >= GOOD_THRESHOLD:
                self.count += 1
                new_rep = True
                if self.last_label == "squat_good":
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
        # กำจัด data URL prefix ถ้ามี: "data:image/jpeg;base64,..."
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

        # 3. predict
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

        # 4. update rep counter
        lm_list = self.landmarks_to_list(results.pose_landmarks)
        new_rep = self.counter.update(lm_list, label, confidence)

        cfg      = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        feedback = cfg["feedback"] if (new_rep or label == "squat_bad_foot") else ""
        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "pose_detected": True,
            "label":         label,
            "confidence":    confidence,
            "feedback":      feedback,
            "count_rep":     cfg["count_rep"],
            "proba":         proba_dict,
            "landmarks":     lm_list,   # ส่งกลับให้ frontend วาด skeleton
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()

    def close(self):
        self.pose.close()