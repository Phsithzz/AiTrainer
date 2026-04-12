import numpy as np
import joblib
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
model = joblib.load(BASE_DIR / "models" / "plank_model.pkl")
le    = joblib.load(BASE_DIR / "models" / "plank_label_encoder.pkl")

print(f"✓ โหลด plank model สำเร็จ | classes: {le.classes_}")

# ── Config ────────────────────────────────────────────────────────────────────

CLASS_CONFIG = {
    "plank_good":     {"feedback": ""},
    "plank_bad_back": {"feedback": "หลังแอ่น / ก้นตก!"},
    "plank_bad_hip":  {"feedback": "ก้นโด่งเกินไป!"},
}
DEFAULT_CONFIG = {"feedback": ""}

SMOOTH_N       = 7
GOOD_THRESHOLD = 0.65

# ── Hold Timer ────────────────────────────────────────────────────────────────

class HoldTimer:
    """จับเวลาสะสมเฉพาะตอนที่ label == plank_good"""
    def __init__(self):
        self.total_time = 0.0
        self.start_time = None
        self.is_holding = False

    def update(self, label: str, confidence: float):
        current_time = time.time()

        if label == "plank_good" and confidence >= GOOD_THRESHOLD:
            if not self.is_holding:
                self.is_holding = True
                self.start_time = current_time
        else:
            if self.is_holding:
                self.total_time += (current_time - self.start_time)
                self.is_holding  = False
                self.start_time  = None

    def get_current_time(self) -> float:
        if self.is_holding and self.start_time:
            return self.total_time + (time.time() - self.start_time)
        return self.total_time

    def reset(self):
        self.__init__()

    def to_dict(self) -> dict:
        return {
            "total_time":  round(self.get_current_time(), 2),
            "is_holding":  self.is_holding,
        }

# ── Predictor ─────────────────────────────────────────────────────────────────

class PlankPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.timer       = HoldTimer()

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

        self.timer.update(label, confidence)

        cfg      = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        # แสดง feedback ตลอดเวลาที่ทำท่าผิด ไม่ใช่แค่ตอน new_rep
        feedback = cfg["feedback"] if (label != "plank_good" and confidence >= GOOD_THRESHOLD) else ""

        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "label":      label,
            "confidence": confidence,
            "feedback":   feedback,
            "proba":      proba_dict,
            **self.timer.to_dict(),   # total_time, is_holding
        }

    def reset(self):
        self.pred_buffer.clear()
        self.timer.reset()