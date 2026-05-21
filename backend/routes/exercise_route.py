from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
import psycopg2
import os
import json
from dotenv import load_dotenv

from schemas import WorkoutData
from auth import get_current_user_id

# 🟢 นำเข้า AI Models ทั้ง 3 ท่า
from services.pushup_service import PushupPredictor
from services.squat_service import SquatPredictor
from services.plank_service import PlankPredictor

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

router = APIRouter(prefix="/exercise", tags=["Exercise"])

# ── 1. API: บันทึกสถิติ ──────────────────────────────────────────────────────
@router.post("/workouts")
def save_workout(data: WorkoutData, user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute(
            """INSERT INTO workouts (user_id, exercise, reps, good, bad, accuracy, bad_details, total_time) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            (user_id, data.exercise, data.reps, data.good, data.bad, data.accuracy, json.dumps(data.bad_details), data.total_time)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    return {"message": "บันทึกสถิติสำเร็จ"}

# ── 2. API: ดึงประวัติ ──────────────────────────────────────────────────────
@router.get("/workouts")
def get_workouts(user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT exercise, reps, good, bad, accuracy, bad_details, total_time, created_at FROM workouts WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)  
        )
        columns = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        
        records = []
        for row in rows:
            record = dict(zip(columns, row))
            
            # 🟢 ดักแปลง Data Parsing เป็น Object ให้ฝั่ง Frontend 
            if "bad_details" in record and record["bad_details"]:
                if isinstance(record["bad_details"], str):
                    record["bad_details"] = json.loads(record["bad_details"])
            else:
                record["bad_details"] = {} 
                
            records.append(record)
    finally:
        cursor.close()
        conn.close()
    return records

# ── 3. API: Dashboard ─────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard(user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    try:
        # สถิติรวมของ User
        cursor.execute("""
            SELECT SUM(reps), AVG(accuracy) 
            FROM workouts WHERE user_id = %s
        """, (user_id,))
        user_stats = cursor.fetchone()
        user_reps = user_stats[0] or 0
        user_acc = round(user_stats[1] or 0, 2)

        # สถิติเฉลี่ยของ Global
        cursor.execute("SELECT AVG(reps), AVG(accuracy) FROM workouts")
        global_stats = cursor.fetchone()
        global_avg_reps = round(global_stats[0] or 0, 2)
        global_avg_acc = round(global_stats[1] or 0, 2)

        # หาจุดอ่อน (Weaknesses)
        cursor.execute("""
            SELECT bad_details FROM workouts WHERE user_id = %s AND bad > 0
        """, (user_id,))
        bad_records = cursor.fetchall()
        
        weakness_counts = {}
        for record in bad_records:
            details_raw = record[0] 
            
            # 🟢 เช็คความปลอดภัยก่อนแปลงข้อมูล
            if details_raw:
                # แปลงจาก string เป็น dict (ถ้ายังไม่เป็น)
                details = json.loads(details_raw) if isinstance(details_raw, str) else details_raw
                # ลูปนับคะแนนจุดอ่อน
                for key, val in details.items():
                    weakness_counts[key] = weakness_counts.get(key, 0) + val
                
        top_weakness = sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)

    finally:
        cursor.close()
        conn.close()

    return {
        "my_stats": {
            "total_reps": user_reps,
            "average_accuracy": user_acc,
            "weaknesses": top_weakness
        },
        "global_stats": {
            "average_reps": global_avg_reps,
            "average_accuracy": global_avg_acc
        },
        "comparison": {
            "is_above_average_reps": user_reps > global_avg_reps,
            "is_above_average_acc": user_acc > global_avg_acc
        }
    }

# ── 4. WebSockets: AI Trainers ────────────────────────────────────────────

@router.websocket("/pushup")
async def ws_pushup(websocket: WebSocket):
    await websocket.accept()
    predictor = PushupPredictor()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue
            b64_frame = msg.get("frame")
            if b64_frame:
                result = predictor.predict(b64_frame)
                await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    finally:
        predictor.close()

@router.websocket("/squat")
async def ws_squat(websocket: WebSocket):
    await websocket.accept()
    predictor = SquatPredictor()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue
            b64_frame = msg.get("frame")
            if b64_frame:
                result = predictor.predict(b64_frame)
                await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    finally:
        predictor.close()

@router.websocket("/plank")
async def ws_plank(websocket: WebSocket):
    await websocket.accept()
    predictor = PlankPredictor()
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue
            b64_frame = msg.get("frame")
            if b64_frame:
                result = predictor.predict(b64_frame)
                await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    finally:
        predictor.close()