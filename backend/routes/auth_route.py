from fastapi import APIRouter, HTTPException, Security, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
import os
from dotenv import load_dotenv
from pydantic import BaseModel, EmailStr
from auth import get_current_user_id
import re
from schemas import (
    UserRegister,
    UserLogin,
    ForgotUsername,
    ForgotPassword,
    ResetPassword,
    UpdateProfile,
    ResendOTP,
    RequestEmailChange,
    VerifyEmailChange
)
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    is_token_blacklisted,
    generate_otp,
    send_otp_email,
    get_current_user_id
)

security = HTTPBearer()
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
router = APIRouter(prefix="/auth", tags=["Authentication"])

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

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

# 🟢 1. ลืม Username (รับ Email -> ส่ง Username เข้าอีเมล)
@router.post("/forgot-username")
def forgot_username(data: ForgotUsername, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT username FROM users WHERE email = %s", (data.email,))
        user = cursor.fetchone()
        if user:
            # ใช้ฟังก์ชันส่งอีเมล (คุณอาจจะต้องไปเพิ่มเงื่อนไข purpose="forgot_username" ใน auth.py)
            background_tasks.add_task(send_otp_email, data.email, user[0], "forgot_username")
    finally:
        cursor.close()
        conn.close()
    return {"message": "หากอีเมลนี้อยู่ในระบบ เราได้ส่ง Username ไปให้คุณแล้ว"}
# ── 3. ขอ OTP ใหม่ (Resend OTP) ──
@router.post("/resend-otp")
def resend_otp(data: ResendOTP, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    otp = generate_otp()
    try:
        cursor.execute(
            "SELECT id FROM users WHERE email = %s AND is_verified = FALSE",
            (data.email,)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=400, detail="ไม่พบบัญชีนี้ หรือยืนยันแล้ว")
        cursor.execute(
            "UPDATE users SET otp_code = %s, otp_expire_at = NOW() + INTERVAL '5 minutes' WHERE id = %s",
            (otp, user[0])
        )
        conn.commit()
        background_tasks.add_task(send_otp_email, data.email, otp, "register")
    finally:
        cursor.close()
        conn.close()
    return {"message": "ส่ง OTP ใหม่แล้ว กรุณาตรวจสอบอีเมลของคุณ"}

# ── ลืม Password ──
# 🟢 2. ลืม Password (รับ Username -> ส่ง OTP เข้า Email)
@router.post("/forgot-password")
def forgot_password(data: ForgotPassword, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    otp = generate_otp()
    masked_email = ""
    try:
        cursor.execute("SELECT email FROM users WHERE username = %s", (data.username,))
        user = cursor.fetchone()
        
        if user:
            email = user[0]
            # ทำ Masking อีเมลให้ดูปลอดภัย เช่น j***@gmail.com
            parts = email.split("@")
            masked_email = f"{parts[0][0]}***@{parts[1]}"
            
            cursor.execute(
                "UPDATE users SET otp_code = %s, otp_expire_at = NOW() + INTERVAL '5 minutes' WHERE username = %s",
                (otp, data.username)
            )
            conn.commit()
            background_tasks.add_task(send_otp_email, email, otp, "forgot_password")
        else:
            raise HTTPException(status_code=404, detail="ไม่พบ Username นี้ในระบบ")
    finally:
        cursor.close()
        conn.close()
    return {"message": "ส่ง OTP สำเร็จ", "masked_email": masked_email}

# ── 4. ระบบรีเซ็ตรหัสผ่าน ──
# 🟢 3. ยืนยันการเปลี่ยนรหัสผ่าน
@router.post("/reset-password")
def reset_password(data: ResetPassword):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    hashed_pw = get_password_hash(data.new_password)
    try:
        cursor.execute(
            "SELECT id FROM users WHERE username = %s AND otp_code = %s AND otp_expire_at > NOW()",
            (data.username, data.otp)
        )
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=400, detail="รหัส OTP ไม่ถูกต้อง หรือหมดอายุแล้ว!")
            
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
        "SELECT id, password_hash, is_verified, username FROM users WHERE username = %s OR email = %s",
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
    return {"access_token": token, "token_type": "bearer", "username": db_user[3]}


@router.get("/me")
def get_profile(user_id: int = Security(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT username, email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="ไม่พบผู้ใช้งาน")
        return {"username": user[0], "email": user[1]}
    finally:
        cursor.close()
        conn.close()

# ── ขอเปลี่ยน Email (ส่ง OTP ไปยัง email ใหม่) ──
@router.post("/request-email-change")
def request_email_change(data: RequestEmailChange, background_tasks: BackgroundTasks, user_id: int = Security(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    otp = generate_otp()
    try:
        cursor.execute("SELECT password_hash, email FROM users WHERE id = %s", (user_id,))
        row = cursor.fetchone()
        current_hash, current_email = row

        if data.new_email == current_email:
            raise HTTPException(status_code=400, detail="Email ใหม่ตรงกับ Email ปัจจุบัน")

        if not verify_password(data.old_password, current_hash):
            raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")

        # เช็คว่า email ใหม่ไม่ซ้ำกับคนอื่น
        cursor.execute("SELECT id FROM users WHERE email = %s AND id != %s", (data.new_email, user_id))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email นี้มีผู้ใช้งานแล้ว")

        cursor.execute(
            "UPDATE users SET pending_email = %s, otp_code = %s, otp_expire_at = NOW() + INTERVAL '5 minutes' WHERE id = %s",
            (data.new_email, otp, user_id)
        )
        conn.commit()
        background_tasks.add_task(send_otp_email, data.new_email, otp, "email_change")
    finally:
        cursor.close()
        conn.close()
    return {"message": f"ส่ง OTP ไปยัง {data.new_email} แล้ว กรุณาตรวจสอบอีเมลของคุณ"}

# ── ยืนยัน OTP เพื่อ apply email ใหม่ ──
@router.post("/verify-email-change")
def verify_email_change(data: VerifyEmailChange, user_id: int = Security(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT pending_email FROM users WHERE id = %s AND otp_code = %s AND otp_expire_at > NOW()",
            (user_id, data.otp)
        )
        row = cursor.fetchone()
        if not row or not row[0]:
            raise HTTPException(status_code=400, detail="OTP ไม่ถูกต้อง หรือหมดอายุแล้ว")

        new_email = row[0]
        cursor.execute(
            "UPDATE users SET email = %s, pending_email = NULL, otp_code = NULL, otp_expire_at = NULL WHERE id = %s",
            (new_email, user_id)
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email นี้มีผู้ใช้งานแล้ว")
    finally:
        cursor.close()
        conn.close()
    return {"message": "เปลี่ยน Email สำเร็จ"}

# ── แก้ไขข้อมูลโปรไฟล์ (username + password เท่านั้น) ──
@router.put("/profile")
def update_profile(data: UpdateProfile, user_id: int = Security(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        current_hash = cursor.fetchone()[0]

        if data.new_password:
            if not data.old_password or not verify_password(data.old_password, current_hash):
                raise HTTPException(status_code=400, detail="รหัสผ่านปัจจุบันไม่ถูกต้อง")
            new_hash = get_password_hash(data.new_password)
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (new_hash, user_id))

        if data.username:
            cursor.execute("UPDATE users SET username = %s WHERE id = %s", (data.username, user_id))

        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username นี้มีผู้ใช้งานแล้ว")
    finally:
        cursor.close()
        conn.close()

    return {"message": "อัปเดตข้อมูลส่วนตัวสำเร็จ"}

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