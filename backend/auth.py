from passlib.context import CryptContext
from jose import jwt, JWTError
import psycopg2
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def is_token_blacklisted(token: str) -> bool:
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    cursor.execute("SELECT 1 FROM token_blacklist WHERE token = %s", (token,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    return result is not None

# ฟังก์ชันนี้ใช้ล็อคประตู API ต้องมี Token ถึงจะผ่านได้
def get_current_user_id(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
                # เช็คก่อนว่า token ถูก blacklist ไหม
        if is_token_blacklisted(token):
            raise HTTPException(status_code=401, detail="Token ถูก logout แล้ว")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token ไม่ถูกต้อง")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Token หมดอายุหรือไม่ถูกต้อง")
    


# 🟢 ฟังก์ชันสำหรับสร้าง Token สุ่ม 64 ตัวอักษร
def generate_verification_token() -> str:
    return secrets.token_hex(32)

# 🟢 ฟังก์ชันส่งอีเมลยืนยันตัวตน
def send_verification_email(email_to: str, token: str):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    base_url = os.getenv("BASE_URL", "http://localhost:8000")

    # ลิงก์ที่จะให้ผู้ใช้คลิกในอีเมลเพื่อเปิดมายัง Backend ของเรา
    verify_url = f"{base_url}/auth/verify?token={token}"

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = email_to
    msg["Subject"] = "[Decepticon] กรุณายืนยันอีเมลเพื่อเปิดใช้งานบัญชีของคุณ"

    body = f"""
    สวัสดีครับ,
    
    ขอบคุณที่สมัครสมาชิกแอปพลิเคชัน Decepticon AI Fitness Coach
    กรุณาคลิกที่ลิงก์ด้านล่างนี้เพื่อยืนยันตัวตนของคุณและเข้าใช้งานระบบ:
    
    {verify_url}
    
    หากคุณไม่ได้เป็นผู้สมัครใช้งานระบบนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
    ขอบคุณครับ
    """
    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email_to, msg.as_string())
        server.quit()
        print(f"✓ ส่งอีเมลยืนยันตัวตนสำเร็จไปยัง {email_to}")
    except Exception as e:
        print(f"🚨 เกิดข้อผิดพลาดในการส่งอีเมล: {e}")