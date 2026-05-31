from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, List

# Frontend ส่ง frame มาเป็น base64
class FrameRequest(BaseModel):
    frame: str          # base64 encoded JPEG string
    action: Optional[str] = None   # "reset" หรือ None

# Backend ส่งกลับ
class PredictResponse(BaseModel):
    label: str
    confidence: float
    feedback: str
    count_rep: bool
    reps: int
    good_count: int
    bad_count: int
    state: str                      # "UP" | "DOWN"
    proba: Dict[str, float]
    landmarks: Optional[List[dict]] = None  # ส่ง landmarks กลับให้ frontend วาด skeleton
    pose_detected: bool


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    identifier: str  # รับusername 
    password: str

class WorkoutData(BaseModel):
    exercise: str
    reps: Optional[int] = 0        # ท่าจับเวลาจะไม่มี reps
    good: Optional[int] = 0
    bad: Optional[int] = 0
    accuracy: Optional[int] = 0    # ท่าจับเวลาอาจจะไม่มี accuracy หรือให้เป็น 0 ไว้ก่อน
    total_time: Optional[float] = 0.0  # ฟิลด์ใหม่สำหรับ Plank
    bad_details: Dict[str, int] = {}

# ── สำหรับระบบลืมข้อมูล ──
class ForgotUsername(BaseModel):
    email: EmailStr

class ForgotPassword(BaseModel):
    username: str  # รับแค่ username ตามที่เพื่อนแนะนำ

class ResetPassword(BaseModel):
    username: str  # ใช้ username เป็นตัวอ้างอิงตอนรีเซ็ต
    otp: str
    new_password: str

# ── สำหรับระบบ Profile ──
class UpdateProfile(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class ResendOTP(BaseModel):
    email: EmailStr

class RequestEmailChange(BaseModel):
    old_password: str
    new_email: EmailStr

class VerifyEmailChange(BaseModel):
    otp: str