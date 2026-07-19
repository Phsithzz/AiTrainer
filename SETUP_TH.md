# คู่มือติดตั้งและรันโปรเจกต์บนเครื่องใหม่ (Windows)

โปรเจกต์นี้ประกอบด้วย 2 ส่วน:

- `frontend` — React + Vite
- `backend` — FastAPI + MediaPipe + PostgreSQL

## 1. โปรแกรมที่ต้องติดตั้ง

ติดตั้งโปรแกรมต่อไปนี้ก่อน:

1. **Git for Windows** — ใช้ clone โปรเจกต์ (ไม่จำเป็นถ้าส่งเป็นไฟล์ ZIP)
2. **Node.js 22.12 ขึ้นไป** — แนะนำ Node.js 24 LTS
   - Vite 8 ของโปรเจกต์ต้องการ Node.js `^20.19.0` หรือ `>=22.12.0`
   - npm จะติดตั้งมาพร้อม Node.js
3. **Python 3.12 (64-bit)**
   - ตอนติดตั้งให้เลือก `Add Python to PATH`
   - แนะนำ Python 3.12 เพราะเข้ากับ MediaPipe และแพ็กเกจ ML ในโปรเจกต์นี้
4. **Google Chrome หรือ Microsoft Edge รุ่นใหม่**
   - ต้องอนุญาตสิทธิ์ใช้กล้อง เพราะหน้าออกกำลังกายใช้ Webcam

ไม่จำเป็นต้องติดตั้ง PostgreSQL ในเครื่อง ถ้าใช้ฐานข้อมูล Neon เดิมผ่านค่า `DATABASE_URL` ใน `backend/.env`

## 2. นำโปรเจกต์มาไว้ในเครื่อง

เลือกวิธีใดวิธีหนึ่ง:

### วิธี A: ใช้ Git

```powershell
git clone <URL-ของ-repository>
cd Machine
```

### วิธี B: ใช้ ZIP

แตกไฟล์ ZIP แล้วเปิด PowerShell ในโฟลเดอร์ `Machine`

โครงสร้างที่ต้องเห็น:

```text
Machine/
├── backend/
├── frontend/
└── SETUP_TH.md
```

## 3. เตรียมไฟล์ `.env`

ไฟล์ `.env` ไม่ได้ถูกเก็บใน Git จึงต้องส่งให้เพื่อนแยกต่างหากอย่างปลอดภัย แล้ววางไว้ตามนี้:

```text
Machine/backend/.env
Machine/frontend/.env
```

### `frontend/.env`

ถ้ารันทุกอย่างในเครื่องเดียวกัน ให้ใช้:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/exercise
```

### `backend/.env`

ต้องมีตัวแปรเหล่านี้:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
SECRET_KEY=<ค่าสุ่มที่เป็นความลับ>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<อีเมลที่ใช้ส่ง OTP>
SMTP_PASSWORD=<รหัสผ่านแอปของอีเมล>
BASE_URL=http://localhost:5173
```

ห้ามส่งไฟล์ `.env` ลง Git, GitHub หรือโพสต์ค่าเหล่านี้ในที่สาธารณะ

## 4. ติดตั้งและเปิด Backend

เปิด PowerShell หนึ่งหน้าต่างจากโฟลเดอร์ `Machine` แล้วรัน:

```powershell
cd backend
py -3.12 -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install psycopg2-binary python-dotenv "python-jose[cryptography]" "passlib[bcrypt]" email-validator
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

เหตุผลที่มีคำสั่งติดตั้งเพิ่ม: `backend/requirements.txt` ปัจจุบันยังไม่มี dependency บางตัวที่โค้ดใช้งานจริง ได้แก่ PostgreSQL driver, dotenv, JWT, password hashing และ email validation

เมื่อติดตั้งสำเร็จ ให้ทดสอบใน Browser:

- API: <http://localhost:8000/health>
- API docs: <http://localhost:8000/docs>

ถ้าถูกต้อง `/health` จะแสดง:

```json
{"status":"healthy"}
```

อย่าปิดหน้าต่าง PowerShell ของ Backend ขณะใช้งานโปรเจกต์

## 5. ติดตั้งและเปิด Frontend

เปิด PowerShell อีกหนึ่งหน้าต่างจากโฟลเดอร์ `Machine` แล้วรัน:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

จากนั้นเปิด:

<http://localhost:5173>

ใช้ `npm.cmd` เพื่อเลี่ยงปัญหา PowerShell บล็อกไฟล์ `npm.ps1` บน Windows บางเครื่อง

อย่าปิดหน้าต่าง PowerShell ของ Frontend ขณะใช้งานโปรเจกต์

## 6. การใช้กล้อง

เมื่อเข้าโหมดออกกำลังกาย Browser จะขอสิทธิ์ใช้กล้อง ให้เลือก **Allow / อนุญาต**

ถ้ากล้องไม่ขึ้น:

1. ตรวจว่ามี Webcam และไม่มีโปรแกรมอื่นกำลังใช้กล้องอยู่
2. เปิดสิทธิ์ Camera ให้ Chrome/Edge ใน Windows Settings
3. กดไอคอนแม่กุญแจข้าง URL แล้วตั้ง Camera เป็น Allow
4. Refresh หน้าเว็บ

## 7. ฐานข้อมูล

Backend ใช้ PostgreSQL และต้องมีตารางอย่างน้อย:

- `users`
- `workouts`
- `token_blacklist`

ใน repository ปัจจุบันยังไม่มีไฟล์ SQL migration/schema สำหรับสร้างตารางเหล่านี้ ดังนั้นทางที่ง่ายที่สุดคือใช้ `DATABASE_URL` ของฐานข้อมูล Neon เดิม ซึ่งมีตารางพร้อมแล้ว

ถ้าต้องการสร้างฐานข้อมูลใหม่ ต้อง export เฉพาะ schema จากฐานข้อมูลเดิมมาด้วย มิฉะนั้น API สมัครสมาชิก, เข้าสู่ระบบ, ประวัติ และ Dashboard จะใช้งานไม่ได้

## 8. วิธีเปิดใช้งานครั้งถัดไป

ไม่ต้องติดตั้ง dependency ซ้ำ ให้เปิด 2 หน้าต่าง PowerShell

### หน้าต่าง Backend

```powershell
cd <ตำแหน่งโปรเจกต์>\Machine\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

### หน้าต่าง Frontend

```powershell
cd <ตำแหน่งโปรเจกต์>\Machine\frontend
npm.cmd run dev
```

แล้วเปิด <http://localhost:5173>

## 9. เช็กลิสต์ก่อนส่งให้เพื่อน

- [ ] ส่ง source code ครบทั้ง `backend` และ `frontend`
- [ ] ส่งโมเดล `.pkl` ใน `backend/models` ครบ
- [ ] ส่ง `backend/.env` แยกอย่างปลอดภัย
- [ ] ส่ง `frontend/.env` แยกอย่างปลอดภัย
- [ ] ยืนยันว่าฐานข้อมูล Neon เดิมยังเปิดใช้งานและอนุญาตการเชื่อมต่อ
- [ ] ยืนยันว่าบัญชี SMTP/รหัสผ่านแอปยังส่ง OTP ได้
- [ ] ให้เพื่อนอนุญาตสิทธิ์ Webcam ใน Browser

## 10. ปัญหาที่พบบ่อย

### `py` หรือ `python` ไม่พบ

ติดตั้ง Python 3.12 ใหม่และเลือก `Add Python to PATH` จากนั้นปิดแล้วเปิด PowerShell ใหม่

### `npm` หรือ `node` ไม่พบ

ติดตั้ง Node.js แล้วปิดและเปิด PowerShell ใหม่ ตรวจด้วย:

```powershell
node --version
npm.cmd --version
```

### Vite แจ้งว่า Node.js version ต่ำเกินไป

อัปเกรด Node.js เป็น 22.12 ขึ้นไป หรือใช้ Node.js 24 LTS

### Backend แจ้ง `ModuleNotFoundError`

ตรวจว่าเปิด virtual environment แล้ว จากนั้นรันคำสั่งติดตั้งในหัวข้อ 4 ใหม่

### Backend เชื่อมฐานข้อมูลไม่ได้

ตรวจ `DATABASE_URL`, อินเทอร์เน็ต, สถานะ Neon database และอย่าใส่เครื่องหมาย quote รอบ URL โดยไม่จำเป็น

### สมัครสมาชิกได้แต่ไม่ได้รับ OTP

ตรวจ `SMTP_USER`, `SMTP_PASSWORD`, SMTP port และดู error ในหน้าต่าง Backend หากใช้ Gmail ควรใช้ App Password ไม่ใช่รหัสผ่านบัญชีปกติ

