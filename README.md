# 🏋️ AI Form Trainer

Real-time AI-powered exercise form correction web application. ใช้กล้อง Webcam ตรวจสอบท่าออกกำลังกาย ให้ Feedback แบบ real-time พร้อมนับจำนวน rep และจับเวลา

<p align="center">
  <img src="frontend/src/assets/images/squat_ref.gif" width="200" alt="Squat Demo">
  <img src="frontend/src/assets/images/pushup_ref.gif" width="200" alt="Push-up Demo">
  <img src="frontend/src/assets/images/plank_ref.gif" width="200" alt="Plank Demo">
</p>

## ✨ Features

- 🎯 **Real-time Form Detection** — ตรวจจับท่าผิดและแจ้งเตือนทันที
- 🗣️ **Thai Voice Feedback** — แจ้งเตือนด้วยเสียงภาษาไทย
- 🦴 **Skeleton Overlay** — แสดง skeleton สี (เขียว/เหลือง/แดง) ตามความถูกต้องของท่า
- 📊 **Dashboard & Analytics** — สถิติ, กราฟ, เปรียบเทียบกับค่ามาตรฐาน
- 📝 **Workout History** — บันทึกประวัติการออกกำลังกาย
- 🔐 **Authentication** — ระบบ Login, Register, OTP verification ผ่าน Email
- 🎭 **Mock Mode** — โหมด Portfolio Demo ไม่ต้องใช้ Backend

## 🏗️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI Framework |
| Vite | 8 | Build Tool |
| Tailwind CSS | 4 | Styling |
| MediaPipe Pose | 0.5 | Client-side pose detection |
| Recharts | 3.8 | Dashboard charts |
| React Router | 7 | Routing |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API + WebSocket server |
| scikit-learn | ML model inference |
| PostgreSQL | Database (Neon Serverless) |
| JWT + bcrypt | Authentication & security |
| SMTP (Gmail) | OTP email dispatch |

## 📁 Project Structure

```
├── backend/
│   ├── server.py              # FastAPI entry point (port 8000)
│   ├── auth.py                # JWT, bcrypt, OTP, SMTP utilities
│   ├── schemas.py             # Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth_route.py      # Auth endpoints (register, login, OTP)
│   │   └── exercise_route.py  # Workout REST API + WebSocket endpoints
│   ├── services/
│   │   ├── landmarks.py       # MediaPipe landmark parser
│   │   ├── squat_service.py   # Squat predictor + rep counter
│   │   ├── pushup_service.py  # Push-up predictor + rep counter
│   │   └── plank_service.py   # Plank predictor + hold timer
│   ├── models/                # Trained ML model bundles (.pkl) — git ignored
│   ├── data_csv/              # Training datasets (.csv) — git ignored
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main router
    │   ├── hooks/
    │   │   ├── useAuth.js     # Auth state & API calls
    │   │   ├── useExerciseWS.js  # MediaPipe + WebSocket + TTS
    │   │   └── useHistory.js  # Workout history fetch
    │   ├── pages/
    │   │   ├── SelectPage.jsx      # Exercise mode picker
    │   │   ├── TrainPage.jsx       # Real-time workout screen
    │   │   ├── DashoardPage.jsx    # Performance analytics
    │   │   ├── HistoryPage.jsx     # Workout history logs
    │   │   ├── LoginPage.jsx       # Sign-in page
    │   │   ├── RegisterPage.jsx    # Registration page
    │   │   ├── VerifyOtpPage.jsx   # OTP verification
    │   │   ├── ProfilePage.jsx     # Account settings
    │   │   └── ForgotPasswordPage.jsx
    │   └── mock/
    │       └── index.js       # Mock interceptor for demo mode
    └── package.json
```

## 🏃 Supported Exercises

| Exercise | Mode | Detected Errors |
|---|---|---|
| **Squat** | Rep Counter | ส้นเท้าลอย (Heel lift), หลังโค้ง (Back rounding) |
| **Push-up** | Rep Counter | สะโพกยก/ห้อย (Hip sag), ขางอ (Bent knees), ก้มหน้า (Neck drop) |
| **Plank** | Hold Timer | สะโพกโด่ง/ตก (Hip pike/sag), เข่างอ (Bent knees), ก้ม/เงยหัว (Neck alignment) |

## 🧠 How It Works

```
┌─────────────┐    Landmarks (JSON)    ┌─────────────────┐    Prediction    ┌──────────────┐
│   Webcam    │ ──── WebSocket ──────▶ │  FastAPI Server  │ ──────────────▶ │  Feedback    │
│ + MediaPipe │    every 100ms         │  Feature Extract │                 │  + TTS Voice │
│  (Browser)  │ ◀──── WebSocket ────── │  + ML Classify   │                 │  + Skeleton  │
└─────────────┘    Result + Skeleton   └─────────────────┘                 └──────────────┘
```

1. **Client-side** — MediaPipe Pose ตรวจจับ 33 landmarks จากกล้อง (ไม่ส่ง video ผ่าน network)
2. **Feature Engineering** — Backend คำนวณ biomechanical features (มุมข้อ, ระยะทาง, symmetry)
3. **ML Classification** — scikit-learn model ทำนายท่า (good/bad + ประเภทข้อผิดพลาด)
4. **Smoothing** — Majority voting (buffer 7 frames) เพื่อลด jitter
5. **Rep Counting** — "Basket Logic" สะสมข้อผิดพลาดระหว่าง rep แล้วตัดสินเมื่อครบ 1 rep

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **PostgreSQL** database (or [Neon](https://neon.tech) serverless)
- **Webcam**

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, JWT secret, and SMTP credentials

# Start server
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if backend is not on localhost:8000

# Start dev server
npm run dev
```

เข้าใช้งานที่ `http://localhost:5173`

### 3. Database Setup

สร้าง tables ที่จำเป็น:

```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expire_at TIMESTAMP,
    pending_email VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    exercise VARCHAR(50) NOT NULL,
    reps INT DEFAULT 0,
    good INT DEFAULT 0,
    bad INT DEFAULT 0,
    accuracy INT DEFAULT 0,
    bad_details TEXT,
    total_time FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS token_blacklist (
    token TEXT PRIMARY KEY,
    blacklisted_at TIMESTAMP DEFAULT NOW()
);
```

## 🎭 Mock Mode (Portfolio Demo)

ต้องการแสดง Demo โดยไม่ต้องใช้ Backend:

```env
# frontend/.env
VITE_IS_MOCK=true
```

จากนั้นรัน `npm run dev` แล้วกด **"PORTFOLIO DEMO LOGIN"** ที่หน้า Login

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT signing secret |
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_USER` | Email for OTP dispatch |
| `SMTP_PASSWORD` | Email app password |
| `BASE_URL` | API base URL |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend REST API URL | `http://localhost:8000` |
| `VITE_WS_URL` | Backend WebSocket URL | `ws://localhost:8000/exercise` |
| `VITE_IS_MOCK` | Enable mock mode | `false` |

## 🗂️ Model & Data Files

ไฟล์ model (`.pkl`) และ training data (`.csv`) ถูก **git ignored** — ไม่ได้เก็บใน repository

หากต้องการเทรน model ใหม่ ให้:
1. เตรียม CSV dataset ไว้ใน `backend/data_csv/`
2. ใช้ training scripts ใน `backend/data_csv/` (e.g. `train_local.py`, `train_plank.py`, `train_pushup.py`)
3. Model bundle ที่เทรนเสร็จจะถูกบันทึกใน `backend/models/`

### Model Bundle Format

```python
{
    "model": <scikit-learn classifier>,
    "label_encoder": <LabelEncoder>,
    "feature_columns": ["knee_angle_left", "hip_angle", ...]
}
```
