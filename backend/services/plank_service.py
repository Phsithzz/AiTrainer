import cv2
import mediapipe as mp
import numpy as np
import joblib
import base64
import time
from pathlib import Path

# ── โหลด Model Bundle ─────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.parent.parent
BUNDLE_PATH = BASE_DIR / "backend" / "models" / "model_plank_best.pkl"

try:
    bundle = joblib.load(BUNDLE_PATH)
    model = bundle["model"]
    le = bundle["label_encoder"]
    feature_columns = bundle["feature_columns"]
    print(f"✓ โหลด plank bundle สำเร็จ | Classes: {list(le.classes_)}")
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
    "plank_good":     {"feedback": ""},
    "plank_bad_hips": {"feedback": "สะโพกงอ / ยกสูงเกิน!"},
    "plank_bad_legs": {"feedback": "เข่างอ / ขาพับ!"},
    "plank_bad_neck": {"feedback": "ก้ม / เงยหัวเกิน!"},
}
DEFAULT_CONFIG = {"feedback": ""}

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
    shoulder = lm[shoulder_i]
    center_x = hip.x
    center_y = hip.y

    # Plank ใช้ shoulder-hip scale
    scale = ((hip.x - shoulder.x) ** 2 + (hip.y - shoulder.y) ** 2) ** 0.5
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

    elbow_name = f"{side}_elbow"; wrist_name = f"{side}_wrist"
    elbow_lm = lm[NAME_TO_MP_IDX[elbow_name]]; wrist_lm = lm[NAME_TO_MP_IDX[wrist_name]]
    if lm[shoulder_i].visibility > 0.5 and elbow_lm.visibility > 0.5 and wrist_lm.visibility > 0.5:
        ex2, ey2 = xy(elbow_name); wx, wy = xy(wrist_name)
        feat["elbow_angle"] = _calc_angle(sx, sy, ex2, ey2, wx, wy)
    else:
        feat["elbow_angle"] = float("nan")

    opp_shoulder_name = "right_shoulder" if side == "left" else "left_shoulder"
    opp_hip_name      = "right_hip"      if side == "left" else "left_hip"
    opp_ankle_name    = "right_ankle"    if side == "left" else "left_ankle"
    
    if all(lm[NAME_TO_MP_IDX[j]].visibility > 0.4 for j in [f"{side}_shoulder", opp_shoulder_name, f"{side}_hip", opp_hip_name, f"{side}_ankle", opp_ankle_name]):
        smx2 = (feat[f"{side}_shoulder_x"] + feat[f"{opp_shoulder_name}_x"]) / 2
        smy2 = (feat[f"{side}_shoulder_y"] + feat[f"{opp_shoulder_name}_y"]) / 2
        hmx2 = (feat[f"{side}_hip_x"]      + feat[f"{opp_hip_name}_x"])      / 2
        hmy2 = (feat[f"{side}_hip_y"]      + feat[f"{opp_hip_name}_y"])      / 2
        amx2 = (feat[f"{side}_ankle_x"]    + feat[f"{opp_ankle_name}_x"])    / 2
        amy2 = (feat[f"{side}_ankle_y"]    + feat[f"{opp_ankle_name}_y"])    / 2
        feat["body_alignment_angle"] = _calc_angle(smx2, smy2, hmx2, hmy2, amx2, amy2)
    else:
        feat["body_alignment_angle"] = float("nan")

    for s in ("left", "right"):
        ssx, ssy = xy(f"{s}_shoulder"); hhx, hhy = xy(f"{s}_hip"); aax, aay = xy(f"{s}_ankle")
        kkx, kky = xy(f"{s}_knee"); eex, eey = xy(f"{s}_elbow"); wwx, wwy = xy(f"{s}_wrist")
        feat[f"angle_hip_{s}"] = _calc_angle(ssx, ssy, hhx, hhy, aax, aay)
        feat[f"angle_knee_{s}"] = _calc_angle(hhx, hhy, kkx, kky, aax, aay)
        feat[f"angle_elbow_{s}"] = _calc_angle(ssx, ssy, eex, eey, wwx, wwy)

    ls_x, ls_y = xy("left_shoulder"); rs_x, rs_y = xy("right_shoulder")
    lh_x, lh_y = xy("left_hip");      rh_x, rh_y = xy("right_hip")
    la_x, la_y = xy("left_ankle");    ra_x, ra_y = xy("right_ankle")
    lk_x, lk_y = xy("left_knee");     rk_x, rk_y = xy("right_knee")
    le_x, le_y = xy("left_ear");      re_x, re_y = xy("right_ear")

    sm_x = (ls_x + rs_x) / 2; sm_y = (ls_y + rs_y) / 2
    hm_x = (lh_x + rh_x) / 2; hm_y = (lh_y + rh_y) / 2
    am_x = (la_x + ra_x) / 2; am_y = (la_y + ra_y) / 2
    km_x = (lk_x + rk_x) / 2; km_y = (lk_y + rk_y) / 2
    em_x = (le_x + re_x) / 2; em_y = (le_y + re_y) / 2

    feat["angle_neck_bilateral"] = _calc_angle(em_x, em_y, sm_x, sm_y, hm_x, hm_y)
    feat["angle_body_line"]      = _calc_angle(sm_x, sm_y, hm_x, hm_y, am_x, am_y)
    feat["angle_body_to_knee"]   = _calc_angle(sm_x, sm_y, hm_x, hm_y, km_x, km_y)
    feat["hip_angle_symmetry"]   = abs(feat["angle_hip_left"]   - feat["angle_hip_right"])
    feat["knee_angle_symmetry"]  = abs(feat["angle_knee_left"]  - feat["angle_knee_right"])
    feat["elbow_angle_symmetry"] = abs(feat["angle_elbow_left"] - feat["angle_elbow_right"])

    origin_x, origin_y = sm_x, sm_y
    torso_scale = ((sm_x - hm_x) ** 2 + (sm_y - hm_y) ** 2) ** 0.5 + 1e-6

    rel_joints = ["nose", "left_ear", "right_ear", "left_shoulder", "right_shoulder",
                  "left_elbow", "right_elbow", "left_wrist", "right_wrist",
                  "left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle",
                  "left_heel", "right_heel", "left_foot_index", "right_foot_index"]
    for joint in rel_joints:
        if f"{joint}_x" not in feat: continue
        jx, jy = xy(joint)
        feat[f"rel_{joint}_x"] = (jx - origin_x) / torso_scale
        feat[f"rel_{joint}_y"] = (jy - origin_y) / torso_scale

    nx, ny = xy("nose")
    body_length = ((sm_x - am_x) ** 2 + (sm_y - am_y) ** 2) ** 0.5 + 1e-6

    t = (hm_x - sm_x) / (am_x - sm_x) if abs(am_x - sm_x) > 1e-6 else 0.5
    t = max(0.0, min(1.0, t))
    body_line_y_at_hip = sm_y + t * (am_y - sm_y)
    
    feat["hip_deviation_score"] = (hm_y - body_line_y_at_hip) / body_length
    feat["knee_bend_score"] = (180.0 - max(0, min(180, feat["angle_body_to_knee"]))) / 180.0

    if not (isinstance(feat["neck_angle"], float) and np.isnan(feat["neck_angle"])):
        feat["neck_deviation_score"] = abs(feat["neck_angle"] - 180.0) / 180.0
    else:
        feat["neck_deviation_score"] = float("nan")

    feat["neck_deviation_bilateral"] = abs(feat["angle_neck_bilateral"] - 180.0) / 180.0
    feat["head_forward_score"] = (nx - sm_x) / body_length

    if not (isinstance(feat["body_alignment_angle"], float) and np.isnan(feat["body_alignment_angle"])):
        feat["alignment_deviation"] = abs(feat["body_alignment_angle"] - 180.0) / 180.0
    else:
        feat["alignment_deviation"] = float("nan")

    feat["body_straightness"] = abs(feat["hip_deviation_score"])
    mid_y = (sm_y + am_y) / 2
    feat["hip_relative_height"] = (hm_y - mid_y) / body_length

    return feat

def build_feature_vector(feat_dict: dict, feature_cols: list) -> np.ndarray:
    vec = []
    for col in feature_cols:
        val = feat_dict.get(col, 0.0)
        if val is None or (isinstance(val, float) and np.isnan(val)):
            val = 0.0
        vec.append(float(val))
    return np.array(vec, dtype=np.float32).reshape(1, -1)

# ── Timer System (แก้ไขให้เก็บบันทึกจุดอ่อน Dynamic อย่างฉลาด) ─────────────────────────
class HoldTimer:
    def __init__(self):
        self.reset()

    def reset(self):
        self.total_accumulated = 0.0
        self.last_update_time = None
        self.is_holding = False
        self.bad_count = 0
        self.bad_details = {} # 🟢 เปลี่ยนเป็นวงเล็บปีกกาเปล่าๆ เพื่อเก็บชื่อออโต้
        self._last_label = None

    def update(self, label: str, confidence: float) -> tuple[bool, str]:
        now = time.time()
        is_new_bad = False
        
        # ถ้ารูปแบบถูกต้อง ให้เวลาเดินต่อไป
        if label == "plank_good":
            self.is_holding = True
            if self.last_update_time is not None:
                self.total_accumulated += (now - self.last_update_time)
            self.last_update_time = now
        else:
            # ถ้าผิดฟอร์ม ให้หยุดเวลา
            self.is_holding = False
            self.last_update_time = None
            
            # 🟢 ลอจิกใหม่: เก็บข้อมูลออโต้ ขอแค่มีคำว่า _bad_ ไม่ต้อง Hardcode
            if "_bad_" in label and label != self._last_label:
                if label not in self.bad_details:
                    self.bad_details[label] = 0
                
                self.bad_details[label] += 1
                self.bad_count += 1
                is_new_bad = True
                
        self._last_label = label
        return is_new_bad, label

    def to_dict(self) -> dict:
        return {
            "total_time": round(self.total_accumulated, 1), 
            "is_holding": self.is_holding,
            "bad_count": self.bad_count,
            "bad_details": self.bad_details # 🟢 โยนออกไปเลย ไม่ต้องลูปกรองแล้ว
        }

# 🟢 ด่านตรวจว่ายืนเต็มกล้องแล้วหรือยัง
def is_body_fully_visible(landmarks, exercise):
    lm = landmarks.landmark
    threshold = 0.5 # ความมั่นใจของกล้องต้องเกิน 50%
    
    if exercise == "squat":
        left_ready = lm[11].visibility > threshold and lm[23].visibility > threshold and lm[25].visibility > threshold and lm[27].visibility > threshold
        right_ready = lm[12].visibility > threshold and lm[24].visibility > threshold and lm[26].visibility > threshold and lm[28].visibility > threshold
        return left_ready or right_ready
        
    elif exercise in ["pushup", "plank"]:
        left_ready = lm[11].visibility > threshold and lm[13].visibility > threshold and lm[15].visibility > threshold and lm[23].visibility > threshold and lm[27].visibility > threshold
        right_ready = lm[12].visibility > threshold and lm[14].visibility > threshold and lm[16].visibility > threshold and lm[24].visibility > threshold and lm[28].visibility > threshold
        return left_ready or right_ready
        
    return False

# ── API Predictor (เชื่อม WebSockets) ──────────────────────────────────────────
class PlankPredictor:
    def __init__(self):
        self.pred_buffer = []
        self.timer = HoldTimer()
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
                **self.timer.to_dict(),
            }

        # ด่านตรวจที่ 2: เห็นไม่เต็มตัว ให้หยุด
        if not is_body_fully_visible(results.pose_landmarks, "plank"):
            return {
                "pose_detected": False,  
                "label": "no_pose",
                "feedback": "",
                "landmarks": self.landmarks_to_list(results.pose_landmarks), 
                **self.timer.to_dict(),
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

            # 🚨 ด่านตรวจจับคนโกง: เช็คคนแอบนอนราบพื้น (Lying Flat Detector)
            lm = results.pose_landmarks.landmark
            side, hip_i, knee_i, ankle_i, shoulder_i = _get_main_side(lm)
            
            shoulder_y = lm[shoulder_i].y
            elbow_y = lm[NAME_TO_MP_IDX[f"{side}_elbow"]].y
            
            # ถ้าข้อศอกกับหัวไหล่อยู่ในระดับแกน Y ใกล้เคียงกันมาก (ห่างกันไม่ถึง 5%) แสดงว่าตัวติดพื้นแน่นอน
            if (elbow_y - shoulder_y) < 0.05:
                label = "plank_bad_hips"  # บังคับตีเป็นท่าสะโพกตก
                confidence = 0.99

            # อัปเดตเวลา และเช็คว่าทำผิดฟอร์มรึเปล่า
            is_new_bad, rep_label = self.timer.update(label, confidence)
            
            feedback = ""
            if is_new_bad and rep_label != "plank_good":
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
            **self.timer.to_dict(),
        }

    def reset(self):
        self.pred_buffer.clear()
        self.timer.reset()
        
    def close(self):
        self.pose.close()