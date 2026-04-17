from fastapi import APIRouter, HTTPException
import psycopg2
import os
from dotenv import load_dotenv

from schemas import UserRegister, UserLogin
from auth import get_password_hash, verify_password, create_access_token

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

# สร้าง Router สำหรับ Auth
router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
def register(user: UserRegister):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    hashed_pw = get_password_hash(user.password)
    try:
        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (user.username, user.email, hashed_pw)
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Username หรือ Email นี้มีคนใช้แล้ว!")
    finally:
        cursor.close()
        conn.close()
    return {"message": "สมัครสมาชิกสำเร็จ!"}

@router.post("/login")
def login(user: UserLogin):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    # 🟢 แก้บั๊กที่ 1: ถ้าอยากให้ Login ได้ทั้ง Username และ Email ต้องเขียน SQL แบบนี้ครับ
    cursor.execute(
        "SELECT id, password_hash FROM users WHERE username = %s OR email = %s",
        (user.identifier, user.identifier)
    )
    db_user = cursor.fetchone()
    cursor.close()
    conn.close()
    
    # 🟢 แก้บั๊กที่ 2: เปลี่ยน db_db_user เป็น db_user
    if not db_user or not verify_password(user.password, db_user[1]):
        raise HTTPException(status_code=401, detail="ข้อมูลไม่ถูกต้อง")
        
    token = create_access_token({"user_id": db_user[0]})
    return {"access_token": token, "token_type": "bearer"}