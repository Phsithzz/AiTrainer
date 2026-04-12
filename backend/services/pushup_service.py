import numpy as np
import joblib
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
model = joblib.load(BASE_DIR / "models" / "pushup_model.pkl")
le    = joblib.load(BASE_DIR / "models" / "pushup_label_encoder.pkl")

print(f"✓ โหลด pushup model สำเร็จ | classes: {le.classes_}")

# ── Config ────────────────────────────────────────────────────────────────────

CLASS_CONFIG = {
    "pushup_good":     {"feedback": "",           "count_rep": True},
    "pushup_bad_neck": {"feedback": "คอก้มเกิน!", "count_rep": True},
    "pushup_bad_back": {"feedback": "หลังแอ่น!",  "count_rep": True},
}
DEFAULT_CONFIG = {"feedback": "", "count_rep": False}

SMOOTH_N        = 7
GOOD_THRESHOLD  = 0.60
ELBOW_DOWN_DEG  = 100
ELBOW_UP_DEG    = 155

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
        self.last_label = None

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
            self.state      = "DOWN"
            self.last_label = label

        elif self.state == "DOWN" and angle >= ELBOW_UP_DEG:
            self.state = "UP"
            if confidence >= GOOD_THRESHOLD:
                self.count += 1
                new_rep = True
                if self.last_label == "pushup_good":
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

# ── Predictor ─────────────────────────────────────────────────────────────────

class PushupPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.counter     = RepCounter()

    def landmarks_to_vector(self, landmarks: list) -> np.ndarray:
        row = []
        for lm in landmarks:
            row.extend([lm["x"], lm["y"], lm["z"], lm["visibility"]])
        return np.array(row).reshape(1, -1)

    def predict(self, landmarks: list) -> dict:
        vec   = self.landmarks_to_vector(landmarks)
        proba = model.predict_proba(vec)
        idx   = int(np.argmax(proba))

        self.pred_buffer.append(idx)
        if len(self.pred_buffer) > SMOOTH_N:
            self.pred_buffer.pop(0)
        smooth_idx = max(set(self.pred_buffer), key=self.pred_buffer.count)

        label      = le.inverse_transform([smooth_idx])[0]
        confidence = float(proba[0][smooth_idx])

        new_rep  = self.counter.update(landmarks, label, confidence)
        cfg      = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        feedback = cfg["feedback"] if new_rep and label != "pushup_good" else ""

        # คำนวณมุมข้อศอกส่งกลับด้วย
        elbow_angle = self.counter._elbow_angle(landmarks)

        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "label":       label,
            "confidence":  confidence,
            "feedback":    feedback,
            "count_rep":   cfg["count_rep"],
            "proba":       proba_dict,
            "elbow_angle": elbow_angle,   # ส่งไปให้ frontend แสดงด้วย
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()