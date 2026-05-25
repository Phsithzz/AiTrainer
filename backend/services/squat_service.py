import cv2

import mediapipe as mp

import numpy as np

import joblib

import base64

from pathlib import Path



# ── โหลด model (แบบเก่า) ───────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent.parent

model = joblib.load(BASE_DIR / "models" / "squat_model.pkl")

le    = joblib.load(BASE_DIR / "models" / "label_encoder.pkl")



print(f"✓ โหลด squat model (Old Version) สำเร็จ")

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



# 🟢 ฟังก์ชันเช็คว่าคนยืนเต็มกล้องไหม (ป้องกันระบบนับมั่วตอนเดินเข้าเฟรม)

def is_body_fully_visible(landmarks):

    lm = landmarks.landmark

    threshold = 0.5

    left_ready = lm[11].visibility > threshold and lm[23].visibility > threshold and lm[25].visibility > threshold and lm[27].visibility > threshold

    right_ready = lm[12].visibility > threshold and lm[24].visibility > threshold and lm[26].visibility > threshold and lm[28].visibility > threshold

    return left_ready or right_ready



# ── Rep Counter (อัปเกรดเป็น Basket Logic เชื่อม Dashboard ใหม่) ───────────────

# ── Rep Counter (ใช้ลอจิกจำท่าผิดท่าเดียวแบบเก่า + เชื่อม Dashboard ใหม่) ─────────

# ── Rep Counter (Squat: ลอจิกเก่า + เพิ่มความอดทน 4 เฟรม) ─────────
class RepCounter:
    def __init__(self):
        self.reset()

    def reset(self):
        self.reps       = 0
        self.state      = "UP"
        self.good_count = 0
        self.bad_count  = 0
        
        self.is_bad_rep = False
        self.bad_label_memory = None
        self.bad_details = {} 
        
        # 🟢 เพิ่มตัวนับเฟรมความผิดปกติ
        self.bad_frames_count = 0 

    def update(self, landmarks_list: list, label: str, confidence: float) -> tuple[bool, str]:
        LEFT_HIP, RIGHT_HIP = 23, 24
        LEFT_KNEE, RIGHT_KNEE = 25, 26
        
        hip_y  = (landmarks_list[LEFT_HIP]["y"]  + landmarks_list[RIGHT_HIP]["y"])  / 2
        knee_y = (landmarks_list[LEFT_KNEE]["y"] + landmarks_list[RIGHT_KNEE]["y"]) / 2
        
        is_down = hip_y > knee_y * 0.88
        new_rep = False
        rep_label = "squat_good"

        if self.state == "UP" and is_down:
            self.state = "DOWN"
            self.is_bad_rep = False
            self.bad_label_memory = None
            self.bad_frames_count = 0 # 🟢 รีเซ็ตตอนเริ่มย่อ

        if self.state == "DOWN":
            # 🟢 ลอจิกความอดทน: ต้องเห็นว่าผิดติดต่อกัน 4 เฟรม
            if label != "squat_good" and confidence >= 0.65: # ใช้ค่า GOOD_THRESHOLD
                self.bad_frames_count += 1
                if self.bad_frames_count >= 2: 
                    self.is_bad_rep = True
                    if self.bad_label_memory is None:
                        self.bad_label_memory = label 
            else:
                # ถ้ากล้องแกว่ง แล้วกลับมาทำท่าถูก ให้ล้างตัวนับทิ้ง
                self.bad_frames_count = 0

            if not is_down:
                self.state = "UP"
                self.reps += 1
                new_rep = True

                if self.is_bad_rep:
                    self.bad_count += 1
                    rep_label = self.bad_label_memory
                    
                    if rep_label not in self.bad_details:
                        self.bad_details[rep_label] = 0
                    self.bad_details[rep_label] += 1
                else:
                    self.good_count += 1
                    rep_label = "squat_good"

        return new_rep, rep_label

    def to_dict(self) -> dict:
        return {
            "reps":       self.reps,
            "good_count": self.good_count,
            "bad_count":  self.bad_count,
            "bad_details": self.bad_details, 
            "state":      self.state,
        }



# ── Squat Predictor ────────────────────────────────────────────────────────

class SquatPredictor:

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



    def landmarks_to_vector(self, landmarks) -> np.ndarray:

        # ฟังก์ชันเก่าสำหรับโมเดลเดิม: กระจายพิกัดเป็นแถวเดี่ยว

        row = []

        for lm in landmarks.landmark:

            row.extend([lm.x, lm.y, lm.z, lm.visibility])

        return np.array(row).reshape(1, -1)



    def landmarks_to_list(self, landmarks) -> list:

        return [{"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility} for lm in landmarks.landmark]



    def _calculate_angle(self, a, b, c) -> float:

        a = np.array(a)

        b = np.array(b)

        c = np.array(c)

        radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])

        angle = np.abs(radians*180.0/np.pi)

        if angle > 180.0:

            angle = 360.0 - angle

        return angle



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

                "proba":         {},

                "landmarks":     None,

                **self.counter.to_dict(),

            }



        # 🟢 เพิ่ม: ถ้าเห็นก้างปลาไม่ครบ ไม่ต้องวิเคราะห์ต่อ

        if not is_body_fully_visible(results.pose_landmarks):

            return {

                "pose_detected": False,  

                "label": "no_pose",

                "confidence": 0.0,

                "feedback": "",

                "proba": {},

                "landmarks": self.landmarks_to_list(results.pose_landmarks),

                **self.counter.to_dict(),

            }



        vec   = self.landmarks_to_vector(results.pose_landmarks)

        proba = model.predict_proba(vec)

        idx   = int(np.argmax(proba))



        self.pred_buffer.append(idx)

        if len(self.pred_buffer) > SMOOTH_N:

            self.pred_buffer.pop(0)

        smooth_idx = max(set(self.pred_buffer), key=self.pred_buffer.count)



        label      = le.inverse_transform([smooth_idx])[0]
        confidence = float(proba[0][smooth_idx])

        # ---------------------------------------------------------
        # 🎯 HYBRID RULES (เวอร์ชั่นแก้บั๊ก ยืนตรงแล้วโดนด่า)
        # ---------------------------------------------------------
        lms = results.pose_landmarks.landmark
        
        # 🟢 1. ใส่หน้ากากปิดตา AI: บังคับให้เป็น Good ไว้ก่อนตอนยืน
        # (กัน AI หลอนทายว่าหลังงอตอนเรายืนตรง)
        if self.counter.state == "UP":
            label = "squat_good"
            confidence = 1.0
        
        # 🟢 2. กฎส้นเท้าลอย: เปลี่ยนมาใช้องศาข้อเท้า (กันกล้องมุมกดหลอกตา)
        # คำนวณองศา เข่า(25,26) -> ข้อเท้า(27,28) -> ปลายเท้า(31,32)
        # ถ้ายืนราบ องศาจะประมาณ 90-110° / ถ้าเขย่งส้น องศาจะกางออกไป 130-150°
        left_ankle_angle = self._calculate_angle(
            [lms[25].x, lms[25].y], [lms[27].x, lms[27].y], [lms[31].x, lms[31].y]
        )
        right_ankle_angle = self._calculate_angle(
            [lms[26].x, lms[26].y], [lms[28].x, lms[28].y], [lms[32].x, lms[32].y]
        )
        avg_ankle_angle = (left_ankle_angle + right_ankle_angle) / 2
        
        # ถ้าข้อเท้ากางเกิน 130 องศา = เขย่งชัวร์ๆ (คำสั่งนี้ทะลุหน้ากาก UP ได้เลย!)
        if avg_ankle_angle > 120.0:
            label = "squat_bad_heel"
            confidence = 0.99

        # 🟢 3. กฎหลังงอ: ให้จับผิดเฉพาะตอนย่อลงไปแล้วเท่านั้น (ป้องกันหลังงอทิพย์ตอนยืน)
        if self.counter.state == "DOWN":
            shoulder = [ (lms[11].x + lms[12].x)/2, (lms[11].y + lms[12].y)/2 ]
            hip      = [ (lms[23].x + lms[24].x)/2, (lms[23].y + lms[24].y)/2 ]
            knee     = [ (lms[25].x + lms[26].x)/2, (lms[25].y + lms[26].y)/2 ]
            
            back_angle = self._calculate_angle(shoulder, hip, knee)
            if back_angle < 60.0:
                label = "squat_bad_back"
                confidence = 0.99

        # ── อัปเดตการนับ ──
        lm_list = self.landmarks_to_list(results.pose_landmarks)
        new_rep, rep_label = self.counter.update(lm_list, label, confidence)

        # 🟢 [ใหม่!] ล็อคเป้าประจานความผิด! (แก้ปัญหาเสียงชมขัดจังหวะ)
        if new_rep:
            # จังหวะที่ 1: ตอนจบรอบ (ยืนขึ้นสุด)
            # บังคับส่ง Label เป็น "ผลลัพธ์สรุปของรอบนั้น" ไปให้ React เพื่อให้ React เล่นเสียง ถูก/ผิด ได้เป๊ะ 100%
            label = rep_label
        elif self.counter.state == "DOWN" and self.counter.is_bad_rep:
            # จังหวะที่ 2: ระหว่างกำลังดันตัวขึ้น (แต่รอบนั้นทำผิดไปแล้ว)
            # บังคับให้ Label เป็นชื่อท่าที่ทำผิด เพื่อประจานให้ก้างปลาเป็นสีแดงค้างไว้จนกว่าจะลุกสุด!
            label = self.counter.bad_label_memory
            confidence = 0.99

        # ดึงข้อความแจ้งเตือน (Feedback) ไปโชว์หน้าจอ
        cfg      = CLASS_CONFIG.get(rep_label, DEFAULT_CONFIG)
        feedback = cfg["feedback"] if new_rep and rep_label != "squat_good" else ""
        
        proba_dict = {cls: float(proba[0][i]) for i, cls in enumerate(le.classes_)}

        return {
            "pose_detected": True,
            "label":         label,
            "confidence":    confidence,
            "feedback":      feedback,
            "proba":         proba_dict,
            "landmarks":     lm_list,
            **self.counter.to_dict(),
        }



    def reset(self):

        self.pred_buffer.clear()

        self.counter.reset()

   

    def close(self):

        self.pose.close()