from fastapi import APIRouter, HTTPException, Security, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg2
import os
from dotenv import load_dotenv

from schemas import UserRegister, UserLogin
from auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    is_token_blacklisted,
    generate_verification_token,
    send_verification_email
)

security = HTTPBearer()

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    
@router.post("/register")
def register(user: UserRegister, background_tasks: BackgroundTasks):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    hashed_pw = get_password_hash(user.password)
    
    # 🟢 เจน Token ยืนยันตัวตนขึ้นมา
    token = generate_verification_token()
    
    try:
        # 🟢 บันทึกข้อมูลลงฐานข้อมูลโดยให้ is_verified เป็น FALSE และบันทึก Token ลงไปด้วย
        cursor.execute(
            "INSERT INTO users (username, email, password_hash, is_verified, verification_token) VALUES (%s, %s, %s, FALSE, %s)",
            (user.username, user.email, hashed_pw, token)
        )
        conn.commit()
        
        # 🟢 ใช้ BackgroundTasks สั่งให้ส่งเมลลับหลัง เพื่อให้ผู้ใช้ไม่ต้องรอกล้องหมุนโหลดหน้าสมัคร
        background_tasks.add_task(send_verification_email, user.email, token)

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username หรือ Email นี้มีคนใช้แล้ว!")
    finally:
        cursor.close()
        conn.close()
    return {"message": "สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบกล่องข้อความในอีเมลของคุณเพื่อยืนยันตัวตน"}

# 🟢 เพิ่ม Endpoint นี้สำหรับรองรับการคลิกลิงก์จากอีเมลผู้ใช้
@router.get("/verify")
def verify_email(token: str):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        # ตรวจสอบว่ามี Token นี้ในระบบไหม
        cursor.execute("SELECT id FROM users WHERE verification_token = %s", (token,))
        db_user = cursor.fetchone()
        
        if not db_user:
            raise HTTPException(status_code=400, detail="ลิงก์ยืนยันตัวตนไม่ถูกต้องหรือหมดอายุแล้ว")
            
        # อัปเดตสถานะให้เป็นผู้ใช้ที่ยืนยันแล้ว และทำลาย Token ทิ้งเพื่อความปลอดภัย
        cursor.execute(
            "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = %s",
            (db_user[0],)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail="เกิดข้อผิดพลาดภายในระบบ")
    finally:
        cursor.close()
        conn.close()
        
    return {"message": "ยืนยันอีเมลสำเร็จเรียบร้อย! คุณสามารถเปิดแอปเพื่อเข้าสู่ระบบได้แล้วครับ"}

@router.post("/login")
def login(user: UserLogin):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    # 🟢 ดึงค่า id, password_hash และเพิ่มการตรวจสอบสถานะการยืนยันตัวตน (is_verified) มาเช็คด้วย
    cursor.execute(
        "SELECT id, password_hash, is_verified FROM users WHERE username = %s OR email = %s",
        (user.identifier, user.identifier)
    )
    db_user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not db_user or not verify_password(user.password, db_user[1]):
        raise HTTPException(status_code=401, detail="ข้อมูลไม่ถูกต้อง")
        
    # 🟢 ดักคอ: ถ้าข้อมูลผู้ใช้ถูกต้องแต่ยังไม่ได้กดลิงก์ยืนยันตัวตนในอีเมล ให้ตีกลับทันที
    if not db_user[2]:
        raise HTTPException(status_code=403, detail="กรุณายืนยันอีเมลของคุณก่อนเข้าสู่ระบบ!")
        
    token = create_access_token({"user_id": db_user[0]})
    return {"access_token": token, "token_type": "bearer"}