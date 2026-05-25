from fastapi import APIRouter, HTTPException, Security, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
import os
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr

from schemas import UserRegister, UserLogin
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    is_token_blacklisted,
    generate_otp,
    send_otp_email
)

security = HTTPBearer()
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
router = APIRouter(prefix="/auth", tags=["Authentication"])

# ── Schemas ใหม่ที่จำเป็นสำหรับระบบ OTP ──
class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# ── 1. ระบบสมัครสมาชิก ──
@router.post("/register")
def register(user: UserRegister, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    hashed_pw = get_password_hash(user.password)
    otp = generate_otp()
    
    try:
        # บันทึกสถานะ is_verified = FALSE และตั้งเวลาหมดอายุ OTP 5 นาที (ใช้เวลาของ Database เลยชัวร์สุด)
        cursor.execute(
            """INSERT INTO users (username, email, password_hash, is_verified, otp_code, otp_expire_at) 
               VALUES (%s, %s, %s, FALSE, %s, NOW() + INTERVAL '5 minutes')""",
            (user.username, user.email, hashed_pw, otp)
        )
        conn.commit()
        background_tasks.add_task(send_otp_email, user.email, otp, "register")
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username หรือ Email นี้มีคนใช้แล้ว!")
    finally:
        cursor.close()
        conn.close()
    return {"message": "สมัครสำเร็จ! กรุณานำรหัส OTP จากอีเมลมายืนยัน", "email": user.email}

# ── 2. ระบบยืนยัน OTP (ใช้ตอนสมัครเสร็จ) ──
@router.post("/verify-otp")
def verify_otp(data: VerifyOTP):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        # เช็คว่าอีเมล รหัสตรง และยังไม่หมดอายุ
        cursor.execute(
            "SELECT id FROM users WHERE email = %s AND otp_code = %s AND otp_expire_at > NOW()",
            (data.email, data.otp)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว!")
            
        # ถ้าถูกต้อง ให้เปลี่ยนสถานะและล้าง OTP ทิ้ง
        cursor.execute(
            "UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expire_at = NULL WHERE id = %s",
            (user[0],)
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"message": "ยืนยันตัวตนสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที"}

# ── 3. ระบบลืมรหัสผ่าน (ขอ OTP) ──
@router.post("/forgot-password")
def forgot_password(data: ForgotPassword, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    otp = generate_otp()
    try:
        # อัปเดต OTP ให้ผู้ใช้ที่ลืมรหัส (ถ้าอีเมลมีอยู่จริง)
        cursor.execute(
            "UPDATE users SET otp_code = %s, otp_expire_at = NOW() + INTERVAL '5 minutes' WHERE email = %s RETURNING id",
            (otp, data.email)
        )
        user = cursor.fetchone()
        if user:
            conn.commit()
            background_tasks.add_task(send_otp_email, data.email, otp, "forgot_password")
        else:
            # ถ้าไม่มีอีเมลนี้ เราจะไม่ฟ้อง Error ตรงๆ เพื่อป้องกันคนมาไล่สุ่มเดาอีเมล (Security Practice)
            pass 
    finally:
        cursor.close()
        conn.close()
    return {"message": "หากอีเมลนี้อยู่ในระบบ เราได้ส่งรหัส OTP 6 หลักไปให้แล้ว"}

# ── 4. ระบบรีเซ็ตรหัสผ่าน ──
@router.post("/reset-password")
def reset_password(data: ResetPassword):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    hashed_pw = get_password_hash(data.new_password)
    try:
        cursor.execute(
            "SELECT id FROM users WHERE email = %s AND otp_code = %s AND otp_expire_at > NOW()",
            (data.email, data.otp)
        )
        user = cursor.fetchone()
        
        if not user:
            raise HTTPException(status_code=400, detail="รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว!")
            
        # เปลี่ยนรหัสผ่าน และล้าง OTP ทิ้ง
        cursor.execute(
            "UPDATE users SET password_hash = %s, otp_code = NULL, otp_expire_at = NULL WHERE id = %s",
            (hashed_pw, user[0])
        )
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"message": "รีเซ็ตรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่"}

# ── 5. ระบบล็อกอิน ──
@router.post("/login")
def login(user: UserLogin):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, password_hash, is_verified FROM users WHERE username = %s OR email = %s",
        (user.identifier, user.identifier)
    )
    db_user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not db_user or not verify_password(user.password, db_user[1]):
        raise HTTPException(status_code=401, detail="ข้อมูลไม่ถูกต้อง")
        
    # ดักคอ: ถ้ายังไม่ยืนยัน OTP ห้ามล็อกอินเด็ดขาด!
    if not db_user[2]:
        raise HTTPException(status_code=403, detail="บัญชีของคุณยังไม่ได้ยืนยันตัวตน กรุณายืนยันรหัส OTP ก่อน")
        
    token = create_access_token({"user_id": db_user[0]})
    return {"access_token": token, "token_type": "bearer"}

@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    if is_token_blacklisted(token):
        return {"message": "Logout แล้ว"}
    
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO token_blacklist (token) VALUES (%s)", (token,))
        conn.commit()
    finally:
        cursor.close()
        conn.close()
    return {"message": "Logout สำเร็จ"}