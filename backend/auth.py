from passlib.context import CryptContext
from jose import jwt, JWTError
import psycopg2
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

import random
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
def generate_otp() -> str:
    return str(random.randint(100000, 999999))

# 🟢 ฟังก์ชันส่งอีเมลยืนยันตัวตน
# 🟢 ฟังก์ชันส่งอีเมลแบบ 2 ระบบ (ยืนยันตัวตน / ลืมรหัสผ่าน)
def send_otp_email(email_to: str, otp: str, purpose: str = "register"):
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    msg = MIMEMultipart()
    msg["From"] = smtp_user
    msg["To"] = email_to

    if purpose == "register":
        msg["Subject"] = "[Decepticon] รหัส OTP สำหรับยืนยันอีเมลของคุณ"
        body = f"""
        สวัสดีครับ,
        
        รหัส OTP สำหรับยืนยันการสมัครสมาชิกของคุณคือ: {otp}
        รหัสนี้มีอายุการใช้งาน 5 นาที
        
        ขอบคุณครับ
        """
    elif purpose == "forgot_password":
        msg["Subject"] = "[Decepticon] รหัส OTP สำหรับกู้คืนรหัสผ่าน"
        body = f"""
        สวัสดีครับ,
        
        เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ
        รหัส OTP สำหรับตั้งรหัสผ่านใหม่ของคุณคือ: {otp}
        รหัสนี้มีอายุการใช้งาน 5 นาที
        
        หากคุณไม่ได้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
        """

    msg.attach(MIMEText(body, "plain", "utf-8"))

    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email_to, msg.as_string())
        server.quit()
        print(f"✓ ส่ง OTP ({purpose}) สำเร็จไปยัง {email_to}")
    except Exception as e:
        print(f"🚨 เกิดข้อผิดพลาดในการส่ง OTP: {e}")