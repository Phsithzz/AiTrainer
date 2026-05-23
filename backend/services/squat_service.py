import cv2
import mediapipe as mp
import numpy as np
import joblib
import base64
from pathlib import Path

# ── โหลด Model Bundle ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent.parent
BUNDLE_PATH = BASE_DIR / "backend" / "models" / "model_squat_best.pkl"

try:
    bundle = joblib.load(BUNDLE_PATH)
    model = bundle["model"]
    le = bundle["label_encoder"]
    feature_columns = bundle["feature_columns"]
    print(f"✓ โหลด squat bundle สำเร็จ | Classes: {list(le.classes_)}")
except Exception as e:
    raise RuntimeError(f"🚨 โหลดโมเดล SQUAT ไม่สำเร็จ! กรุณาเช็คว่ามีไฟล์ {BUNDLE_PATH} อยู่จริงหรือไม่ (Error: {e})")
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
    "squat_good":     {"feedback": "", "count_rep": True},
    "squat_bad_heel": {"feedback": "ส้นเท้าลอย!", "count_rep": True},
    "squat_bad_back": {"feedback": "หลังงอ!", "count_rep": True},
}
DEFAULT_CONFIG = {"feedback": "", "count_rep": False}

# ── Feature Extraction Functions ────────────────────────────────────────────
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
        feat[f"{name}_visibility"] = p.visibility

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
        hhx, hhy = xy(f"{s}_hip"); kkx, kky = xy(f"{s}_knee"); aax, aay = xy(f"{s}_ankle")
        heelx, heely = xy(f"{s}_heel"); ssx, ssy = xy(f"{s}_shoulder")
        feat[f"angle_knee_{s}"]  = _calc_angle(hhx, hhy, kkx, kky, aax, aay)
        feat[f"angle_hip_{s}"]   = _calc_angle(ssx, ssy, hhx, hhy, kkx, kky)
        feat[f"angle_ankle_{s}"] = _calc_angle(kkx, kky, aax, aay, heelx, heely)

    ls_x, ls_y = xy("left_shoulder"); rs_x, rs_y = xy("right_shoulder")
    lh_x, lh_y = xy("left_hip");      rh_x, rh_y = xy("right_hip")
    lk_x, lk_y = xy("left_knee");     rk_x, rk_y = xy("right_knee")
    la_x, la_y = xy("left_ankle");    ra_x, ra_y = xy("right_ankle")

    sm_x = (ls_x + rs_x) / 2; sm_y = (ls_y + rs_y) / 2
    hm_x = (lh_x + rh_x) / 2; hm_y = (lh_y + rh_y) / 2
    km_x = (lk_x + rk_x) / 2; km_y = (lk_y + rk_y) / 2
    am_x = (la_x + ra_x) / 2; am_y = (la_y + ra_y) / 2

    feat["angle_trunk"]        = _calc_angle(sm_x, sm_y, hm_x, hm_y, km_x, km_y)
    feat["angle_forward_lean"] = _calc_angle(sm_x, sm_y, hm_x, hm_y, am_x, am_y)
    feat["knee_angle_symmetry"]  = abs(feat["angle_knee_left"]  - feat["angle_knee_right"])
    feat["hip_angle_symmetry"]   = abs(feat["angle_hip_left"]   - feat["angle_hip_right"])
    feat["ankle_angle_symmetry"] = abs(feat["angle_ankle_left"] - feat["angle_ankle_right"])

    torso_scale = ((sm_x - hm_x) ** 2 + (sm_y - hm_y) ** 2) ** 0.5 + 1e-6
    rel_joints = ["nose", "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
                  "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
                  "left_heel", "right_heel", "left_foot_index", "right_foot_index"]
    for joint in rel_joints:
        jx, jy = xy(joint)
        feat[f"rel_{joint}_x"] = (jx - hm_x) / torso_scale
        feat[f"rel_{joint}_y"] = (jy - hm_y) / torso_scale

    torso_s2 = abs(hm_y - sm_y) + 1e-6
    for s in ("left", "right"):
        _, aay = xy(f"{s}_ankle")
        _, heely = xy(f"{s}_heel")
        feat[f"heel_lift_{s}"] = (heely - aay) / torso_s2

    feat["heel_lift_avg"] = (feat["heel_lift_left"] + feat["heel_lift_right"]) / 2
    nx, ny = xy("nose")
    feat["back_lean_score"] = (nx - hm_x) / torso_s2

    for s in ("left", "right"):
        kkx, _ = xy(f"{s}_knee")
        tx, _  = xy(f"{s}_foot_index")
        feat[f"knee_over_toe_{s}"] = kkx - tx

    feat["squat_depth_score"] = (hm_y - km_y) / torso_s2

    return feat

def build_feature_vector(feat_dict: dict, feature_cols: list) -> np.ndarray:
    vec = []
    for col in feature_cols:
        val = feat_dict.get(col, 0.0)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = 0.0
        vec.append(float(val))
    return np.array(vec, dtype=np.float32).reshape(1, -1)

# ── Rep Counter (โหวตแบบเพื่อน) ─────────────────────────────────────────────
# ── Rep Counter (เปลี่ยนจาก Majority Vote เป็น Basket Logic) ──────────────────
class RepCounter:
    DOWN_RATIO = 0.85 
    UP_RATIO   = 0.80 

    def __init__(self):
        self.reset()

    def reset(self):
        self.reps = 0
        self.good_count = 0
        self.bad_count = 0
        self.state = "UP"
        self.bad_details = {} # 🟢 ปล่อยว่างไว้ให้ Dynamic
        self.current_rep_mistakes = set() # 🟢 ตะกร้าจดความผิดประจำรอบ

    def _hip_knee_ratio(self, landmarks) -> float:
        lm = landmarks.landmark
        lh_y = lm[MP_POSE.PoseLandmark.LEFT_HIP].y
        rh_y = lm[MP_POSE.PoseLandmark.RIGHT_HIP].y
        lk_y = lm[MP_POSE.PoseLandmark.LEFT_KNEE].y
        rk_y = lm[MP_POSE.PoseLandmark.RIGHT_KNEE].y
        hip_y  = (lh_y + rh_y) / 2
        knee_y = (lk_y + rk_y) / 2
        return hip_y / (knee_y + 1e-6)

    def update(self, landmarks, label: str) -> tuple[bool, str | None]:
        ratio = self._hip_knee_ratio(landmarks)
        new_rep = False
        rep_label = None

        # 🟢 1. จดชื่อความผิดลงตะกร้า
        if "_bad_" in label:
            self.current_rep_mistakes.add(label)

        if self.state == "UP":
            if ratio >= self.DOWN_RATIO:
                self.state = "DOWN"
                
        elif self.state == "DOWN":
            if ratio < self.UP_RATIO:
                self.state = "UP"
                self.reps += 1
                new_rep = True
                
                # 🟢 2. เช็คบิลตอนยืนขึ้นสุด
                if len(self.current_rep_mistakes) > 0:
                    self.bad_count += 1
                    
                    # สุ่มดึงชื่อ error ออกมา 1 ตัวเพื่อส่งไปเตือนหน้าจอ (Flash Message)
                    rep_label = list(self.current_rep_mistakes)[0] 
                    
                    for mistake in self.current_rep_mistakes:
                        if mistake not in self.bad_details:
                            self.bad_details[mistake] = 0
                        self.bad_details[mistake] += 1
                else:
                    self.good_count += 1
                    rep_label = "squat_good"

                # 🟢 3. เทตะกร้าทิ้ง
                self.current_rep_mistakes.clear()

        return new_rep, rep_label

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
class SquatPredictor:
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
                "landmarks": None,
                **self.counter.to_dict(),
            }
        # 🟢 2. ด่านตรวจใหม่: ถ้าเห็นคนแต่ "เห็นไม่เต็มตัว" ให้หยุดแค่นี้ ห้ามนับ!
        # (อย่าลืมเปลี่ยนคำว่า "squat" เป็น "pushup" หรือ "plank" ตามไฟล์ที่คุณแก้อยู่ด้วยนะครับ)
        if not is_body_fully_visible(results.pose_landmarks, "squat"):
            return {
                "pose_detected": False,  # บังคับหน้าเว็บให้โชว์ว่า "ไม่พบท่าทาง — ยืนหน้ากล้อง"
                "label": "no_pose",
                "feedback": "",
                "landmarks": self.landmarks_to_list(results.pose_landmarks), # ส่งก้างปลาไปให้ดูระยะ
                **self.counter.to_dict(),
            }

        feat_dict = landmarks_to_feature_dict(results.pose_landmarks)
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

            # 🟢 อัปเดต Reps และหาจังหวะที่จบ Rep (ได้ feedback กลับมา)
            new_rep, rep_label = self.counter.update(results.pose_landmarks, label)
            
            # ถ้าจบรอบและเป็นท่าผิด ให้โชว์คำเตือนค้างไว้สักพัก (เดี๋ยวฝั่งหน้าเว็บ React จะเอาไปหน่วงเวลาเอง)
            feedback = ""
            if new_rep and rep_label and rep_label != "squat_good":
                feedback = CLASS_CONFIG.get(rep_label, DEFAULT_CONFIG)["feedback"]
        else:
            label = "no_pose"
            confidence = 0.0
            feedback = ""

        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)} if feat_dict else {}

        return {
            "pose_detected": True,
            "label": label,
            "confidence": confidence,
            "feedback": feedback,
            "proba": proba_dict,
            "landmarks": self.landmarks_to_list(results.pose_landmarks),
            **self.counter.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.counter.reset()
        
    def close(self):
        self.pose.close()