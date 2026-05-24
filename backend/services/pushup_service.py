import cv2
import mediapipe as mp
import numpy as np
import joblib
import base64
from pathlib import Path

# ── โหลด Model Bundle จากไฟล์ที่เพื่อนเทรนมา ──────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent.parent
BUNDLE_PATH = BASE_DIR / "backend" / "models" / "model_pushup_best.pkl"

try:
    bundle = joblib.load(BUNDLE_PATH)
    model = bundle["model"]
    le = bundle["label_encoder"]
    feature_columns = bundle["feature_columns"]
    print(f"✓ โหลด pushup bundle สำเร็จ | Classes: {list(le.classes_)}")
except Exception as e:
    print(f"[ERROR] โหลด Model Bundle ไม่สำเร็จ: {e}")

# ── MediaPipe Constants ───────────────────────────────────────────────────────
MP_POSE = mp.solutions.pose
REQUIRED_LANDMARK_INDICES = [0, 7, 8, 11, 12, 13, 14, 15, 16,
                             23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
LANDMARK_NAMES = [
    "nose", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist",
    "left_hip", "right_hip", "left_knee", "right_knee",
    "left_ankle", "right_ankle", "left_heel", "right_heel",
    "left_foot_index", "right_foot_index",
]
NAME_TO_MP_IDX = {name: idx for name, idx in zip(LANDMARK_NAMES, REQUIRED_LANDMARK_INDICES)}

# ── Config สำหรับ Web ────────────────────────────────────────────────────────
SMOOTH_N = 7
CLASS_CONFIG = {
    "pushup_good":     {"feedback": "", "count_rep": True},
    "pushup_bad_hips": {"feedback": "สะโพกอย่ายก/ห้อย!", "count_rep": True},
    "pushup_bad_legs": {"feedback": "เหยียดขาให้ตรง!", "count_rep": True},
    "pushup_bad_neck": {"feedback": "ก้ม/เงยคอเกิน!", "count_rep": True},
}
DEFAULT_CONFIG = {"feedback": "", "count_rep": False}

# ── Feature Extraction Functions (คงไว้ตามเพื่อน 100% เพื่อความแม่นยำ) ────────
def _calc_angle(ax, ay, bx, by, cx, cy) -> float:
    BAx, BAy = ax - bx, ay - by
    BCx, BCy = cx - bx, cy - by
    dot   = BAx * BCx + BAy * BCy
    normA = (BAx**2 + BAy**2) ** 0.5 + 1e-8
    normC = (BCx**2 + BCy**2) ** 0.5 + 1e-8
    cos_a = max(-1.0, min(1.0, dot / (normA * normC)))
    return float(np.degrees(np.arccos(cos_a)))

def _get_main_side(lm):
    left  = lm[23].visibility + lm[25].visibility + lm[27].visibility
    right = lm[24].visibility + lm[26].visibility + lm[28].visibility
    if left >= right:
        return "left",  23, 25, 27, 11
    else:
        return "right", 24, 26, 28, 12

def landmarks_to_feature_dict(landmarks) -> dict | None:
    lm = landmarks.landmark
    side, hip_i, knee_i, ankle_i, shoulder_i = _get_main_side(lm)
    hip = lm[hip_i]
    ankle = lm[ankle_i]
    center_x = hip.x
    center_y = hip.y

    scale = ((hip.x - ankle.x) ** 2 + (hip.y - ankle.y) ** 2) ** 0.5
    if scale < 1e-3: return None

    feat = {}
    for name, mp_idx in NAME_TO_MP_IDX.items():
        p = lm[mp_idx]
        feat[f"{name}_x"] = (p.x - center_x) / scale
        feat[f"{name}_y"] = (p.y - center_y) / scale
        feat[f"{name}_z"] = p.z / scale

    def xy(joint): return feat[f"{joint}_x"], feat[f"{joint}_y"]

    hx, hy = xy(f"{side}_hip")
    kx, ky = xy(f"{side}_knee")
    ax, ay = xy(f"{side}_ankle")
    sx, sy = xy(f"{side}_shoulder")

    feat["knee_angle"] = _calc_angle(hx, hy, kx, ky, ax, ay)
    feat["hip_angle"]  = _calc_angle(sx, sy, hx, hy, kx, ky)
    feat["back_angle"] = _calc_angle(sx, sy, hx, hy, ax, ay)

    ear_name = "left_ear" if side == "left" else "right_ear"
    ear_lm   = lm[NAME_TO_MP_IDX[ear_name]]
    if ear_lm.visibility > 0.5 and lm[shoulder_i].visibility > 0.5:
        ex, ey = xy(ear_name)
        feat["neck_angle"] = _calc_angle(ex, ey, sx, sy, hx, hy)
    else:
        feat["neck_angle"] = float("nan")

    for s in ("left", "right"):
        ssx, ssy = xy(f"{s}_shoulder"); eex, eey = xy(f"{s}_elbow"); wwx, wwy = xy(f"{s}_wrist")
        feat[f"angle_elbow_{s}"] = _calc_angle(ssx, ssy, eex, eey, wwx, wwy)
        hhx, hhy = xy(f"{s}_hip")
        feat[f"angle_shoulder_{s}"] = _calc_angle(eex, eey, ssx, ssy, hhx, hhy)
        kkx, kky = xy(f"{s}_knee")
        feat[f"angle_hip_{s}"] = _calc_angle(ssx, ssy, hhx, hhy, kkx, kky)

    ls_x, ls_y = xy("left_shoulder"); rs_x, rs_y = xy("right_shoulder")
    lh_x, lh_y = xy("left_hip");      rh_x, rh_y = xy("right_hip")
    lk_x, lk_y = xy("left_knee");     rk_x, rk_y = xy("right_knee")
    la_x, la_y = xy("left_ankle");    ra_x, ra_y = xy("right_ankle")

    sm_x = (ls_x + rs_x) / 2; sm_y = (ls_y + rs_y) / 2
    hm_x = (lh_x + rh_x) / 2; hm_y = (lh_y + rh_y) / 2
    am_x = (la_x + ra_x) / 2; am_y = (la_y + ra_y) / 2

    feat["angle_body_line_bilateral"] = _calc_angle(sm_x, sm_y, hm_x, hm_y, am_x, am_y)
    feat["elbow_angle_symmetry"]    = abs(feat["angle_elbow_left"]    - feat["angle_elbow_right"])
    feat["shoulder_angle_symmetry"] = abs(feat["angle_shoulder_left"] - feat["angle_shoulder_right"])
    feat["hip_angle_symmetry"]      = abs(feat["angle_hip_left"]      - feat["angle_hip_right"])

    origin_x, origin_y = hm_x, hm_y
    torso_scale = ((sm_x - hm_x) ** 2 + (sm_y - hm_y) ** 2) ** 0.5 + 1e-6

    rel_joints = ["nose", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
                  "left_wrist", "right_wrist", "left_hip", "right_hip", "left_knee", "right_knee",
                  "left_ankle", "right_ankle", "left_heel", "right_heel", "left_foot_index", "right_foot_index"]
    
    for joint in rel_joints:
        if f"{joint}_x" not in feat: continue
        jx, jy = xy(joint)
        feat[f"rel_{joint}_x"] = (jx - origin_x) / torso_scale
        feat[f"rel_{joint}_y"] = (jy - origin_y) / torso_scale

    for s in ("left", "right"):
        ssx, ssy = xy(f"{s}_shoulder"); eex, eey = xy(f"{s}_elbow"); wwx, wwy = xy(f"{s}_wrist")
        feat[f"elbow_angle_{s}_calc"] = _calc_angle(ssx, ssy, eex, eey, wwx, wwy)
    feat["elbow_angle_avg"] = (feat["elbow_angle_left_calc"] + feat["elbow_angle_right_calc"]) / 2

    t = (hm_x - sm_x) / (am_x - sm_x) if abs(am_x - sm_x) > 1e-6 else 0.5
    t = max(0.0, min(1.0, t))
    ideal_hip_y = sm_y + t * (am_y - sm_y)
    feat["hip_sag_score"] = (hm_y - ideal_hip_y) / torso_scale
    feat["hip_sag_abs"]   = abs(feat["hip_sag_score"])

    for s in ("left", "right"):
        hhx, hhy = xy(f"{s}_hip"); kkx, kky = xy(f"{s}_knee"); aax, aay = xy(f"{s}_ankle")
        feat[f"knee_angle_{s}"] = _calc_angle(hhx, hhy, kkx, kky, aax, aay)
    
    feat["knee_angle_avg"]       = (feat["knee_angle_left"] + feat["knee_angle_right"]) / 2
    feat["legs_straight_score"]  = feat["knee_angle_avg"]

    if isinstance(feat["neck_angle"], float) and not np.isnan(feat["neck_angle"]):
        feat["neck_alignment_score"] = feat["neck_angle"]
    else:
        feat["neck_alignment_score"] = float("nan")

    nx, ny = xy("nose")
    feat["head_drop_score"] = (ny - sm_y) / torso_scale

    for s in ("left", "right"):
        wx, wy = xy(f"{s}_wrist"); ssx, ssy = xy(f"{s}_shoulder")
        feat[f"wrist_under_shoulder_{s}"] = (wx - ssx) / torso_scale

    return feat

def build_feature_vector(feat_dict: dict, feature_cols: list) -> np.ndarray:
    vec = []
    for col in feature_cols:
        val = feat_dict.get(col, 0.0)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = 0.0
        vec.append(float(val))
    return np.array(vec, dtype=np.float32).reshape(1, -1)

# ── Rep Counter (ปรับปรุงให้เก็บ Dashboard Data) ─────────────────────────────
# ── Rep Counter (ปรับปรุงให้เก็บ Dashboard Data และกันนับเบิ้ล) ───────────────
# ── Rep Counter (Pushup: Basket Logic + ความอดทน 4 เฟรม) ───────────────
class RepCounter:
    UP_THRESHOLD   = 145 
    DOWN_THRESHOLD = 120 

    def __init__(self):
        self.reset()

    def reset(self):
        self.reps       = 0
        self.state      = "UP" 
        self.good_count = 0
        self.bad_count  = 0
        self.bad_details = {} 
        self.current_rep_mistakes = set() 
        
        # 🟢 เพิ่มตัวนับและตัวจำชื่อความผิดล่าสุด
        self.bad_frames_count = 0
        self.last_bad_label = None

    def update(self, label: str, feat_dict: dict | None) -> bool:
        new_rep = False

        # 🟢 ลอจิกความอดทน: ผิดชื่อเดิมซ้ำๆ 4 เฟรม ถึงจะจับโยนลงตะกร้า
        if "_bad_" in label:
            if label == self.last_bad_label:
                self.bad_frames_count += 1
            else:
                self.last_bad_label = label
                self.bad_frames_count = 1
                
            if self.bad_frames_count >= 4:
                self.current_rep_mistakes.add(label)
        else:
            self.bad_frames_count = 0
            self.last_bad_label = None

        if feat_dict is not None:
            elbow_avg = feat_dict.get("elbow_angle_avg", 180.0)
            
            if self.state == "UP" and elbow_avg < self.DOWN_THRESHOLD:
                self.state = "DOWN"
                # เคลียร์สถิติเผื่อเริ่มย่อใหม่
                self.current_rep_mistakes.clear()
                self.bad_frames_count = 0
                
            elif self.state == "DOWN" and elbow_avg > self.UP_THRESHOLD:
                self.state = "UP"
                self.reps += 1
                new_rep = True
                
                if len(self.current_rep_mistakes) > 0:
                    self.bad_count += 1 
                    
                    for mistake in self.current_rep_mistakes:
                        if mistake not in self.bad_details:
                            self.bad_details[mistake] = 0
                        self.bad_details[mistake] += 1
                else:
                    self.good_count += 1

                self.current_rep_mistakes.clear()
                self.bad_frames_count = 0

        return new_rep

    def to_dict(self) -> dict:
        return {
            "reps": self.reps,
            "good_count": self.good_count,
            "bad_count": self.bad_count,
            "bad_details": self.bad_details,
            "state": self.state,
        }

# 🟢 ด่านตรวจว่ายืนเต็มกล้องแล้วหรือยัง
def is_body_fully_visible(landmarks, exercise):
    lm = landmarks.landmark
    threshold = 0.5 # ความมั่นใจของกล้องต้องเกิน 50%
    
    if exercise == "squat":
        # Squat: ต้องเห็น ไหล่(11,12), สะโพก(23,24), เข่า(25,26), ข้อเท้า(27,28) ชัดเจน
        left_ready = lm[11].visibility > threshold and lm[23].visibility > threshold and lm[25].visibility > threshold and lm[27].visibility > threshold
        right_ready = lm[12].visibility > threshold and lm[24].visibility > threshold and lm[26].visibility > threshold and lm[28].visibility > threshold
        return left_ready or right_ready
        
    elif exercise in ["pushup", "plank"]:
        # Pushup/Plank: ต้องเห็น ไหล่, ศอก(13,14), ข้อมือ(15,16), สะโพก, ข้อเท้า
        left_ready = lm[11].visibility > threshold and lm[13].visibility > threshold and lm[15].visibility > threshold and lm[23].visibility > threshold and lm[27].visibility > threshold
        right_ready = lm[12].visibility > threshold and lm[14].visibility > threshold and lm[16].visibility > threshold and lm[24].visibility > threshold and lm[28].visibility > threshold
        return left_ready or right_ready
        
    return False

# ── API Predictor (เชื่อม WebSockets) ──────────────────────────────────────────
class PushupPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.counter = RepCounter()
        self.pose = MP_POSE.Pose(
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
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)

    def landmarks_to_list(self, landmarks) -> list:
        return [{"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility} for lm in landmarks.landmark]

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
                "label": "no_pose",
                "feedback": "",
                "elbow_angle": None,
                "landmarks": None,
                **self.counter.to_dict(),
            }
        # 🟢 2. ด่านตรวจใหม่: ถ้าเห็นคนแต่ "เห็นไม่เต็มตัว" ให้หยุดแค่นี้ ห้ามนับ!
        # (อย่าลืมเปลี่ยนคำว่า "squat" เป็น "pushup" หรือ "plank" ตามไฟล์ที่คุณแก้อยู่ด้วยนะครับ)
        if not is_body_fully_visible(results.pose_landmarks, "pushup"):
            return {
                "pose_detected": False,  # บังคับหน้าเว็บให้โชว์ว่า "ไม่พบท่าทาง — ยืนหน้ากล้อง"
                "label": "no_pose",
                "feedback": "",
                "landmarks": self.landmarks_to_list(results.pose_landmarks), # ส่งก้างปลาไปให้ดูระยะ
                **self.counter.to_dict(),
            }

        feat_dict = landmarks_to_feature_dict(results.pose_landmarks)
        elbow_avg_deg = feat_dict.get("elbow_angle_avg", 999.0) if feat_dict else None

        if feat_dict is not None:
            vec = build_feature_vector(feat_dict, feature_columns)
            proba = model.predict_proba(vec)
            idx = int(np.argmax(proba))

            self.pred_buffer.append(idx)
            if len(self.pred_buffer) > SMOOTH_N:
                self.pred_buffer.pop(0)

            smooth_idx = max(set(self.pred_buffer), key=self.pred_buffer.count)
            label = le.inverse_transform([smooth_idx])[0]
            confidence = float(proba[0][smooth_idx])

            self.counter.update(label, feat_dict)
        else:
            label = "no_pose"
            confidence = 0.0

        cfg = CLASS_CONFIG.get(label, DEFAULT_CONFIG)
        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)} if feat_dict else {}

        return {
            "pose_detected": True,
            "label": label,
            "confidence": confidence,
            "feedback": cfg["feedback"],
            "proba": proba_dict,
            "elbow_angle": elbow_avg_deg,
            "landmarks": self.landmarks_to_list(results.pose_landmarks),
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()
        
    def close(self):
        self.pose.close()