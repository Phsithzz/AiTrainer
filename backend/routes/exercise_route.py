import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
import psycopg2
import os
from dotenv import load_dotenv

from schemas import WorkoutData

from services.squat_service import SquatPredictor
from services.pushup_service import PushupPredictor
from services.plank_service import PlankPredictor
from auth import get_current_user_id

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")

router  = APIRouter()

@router.websocket("/exercise/squat")
async def squat_exercise(websocket:WebSocket):
    await websocket.accept()

    # 1 predictor ต่อ 1 connection → แยก state ต่อ user
    predictor = SquatPredictor()
    print("✓ Client connected — squat (Plan A)")

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)

            # reset command
            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue

            # ต้องมี frame
            b64_frame = msg.get("frame")
            if not b64_frame:
                await websocket.send_json({"error": "no frame"})
                continue

            result = predictor.predict(b64_frame)
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("✗ Client disconnected")
    finally:
        predictor.close()   # ปิด MediaPipe Pose อย่างถูกต้อง

@router.websocket("/exercise/pushup")
async def pushup_websocket(websocket: WebSocket):
    await websocket.accept()
    predictor = PushupPredictor()
    print("✓ Client connected — pushup")

    try:
        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)

            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue

            b64_frame = msg.get("frame")
            if not b64_frame:
                await websocket.send_json({"error": "no frame"})
                continue

            result = predictor.predict(b64_frame)
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("✗ Client disconnected — pushup")



@router.websocket("/exercise/plank")
async def plank_exercise(websocket: WebSocket):
    await websocket.accept()
    predictor = PlankPredictor()
    print("✓ Client connected — plank")

    try:
        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)

            if msg.get("action") == "reset":
                predictor.reset()
                await websocket.send_json({"action": "reset_ok"})
                continue


            b64_frame = msg.get("frame")
            if not b64_frame:
                await websocket.send_json({"error": "no frame"})
                continue

            result = predictor.predict(b64_frame)
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("✗ Client disconnected — plank")


@router.post("/workouts")
def save_workout(data: WorkoutData, user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        # 🟢 1. เพิ่ม total_time ในคำสั่ง INSERT และเพิ่ม %s
        cursor.execute(
            """INSERT INTO workouts (user_id, exercise, reps, good, bad, accuracy, total_time,bad_details) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
            # 🟢 2. ส่ง data.total_time เข้าไปด้วย
            (user_id, data.exercise, data.reps, data.good, data.bad, data.accuracy, data.total_time)
        )
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    return {"message": "บันทึกสถิติสำเร็จ"}

@router.get("/workouts")
def get_workouts(user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    try:
        # 🟢 3. เพิ่ม total_time ในคำสั่ง SELECT เพื่อดึงกลับไปให้ Frontend
        cursor.execute(
            "SELECT exercise, reps, good, bad, accuracy, total_time, created_at FROM workouts WHERE user_id = %s ORDER BY created_at DESC",
            (user_id,)
        )
        columns = [desc[0] for desc in cursor.description]
        records = [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        cursor.close()
        conn.close()
    return records

@router.get("/dashboard")
def get_dashboard(user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    try:
        # 🟢 1. สถิติรวมของ User คนนี้ (Total Reps, Average Accuracy)
        cursor.execute("""
            SELECT SUM(reps), AVG(accuracy) 
            FROM workouts WHERE user_id = %s
        """, (user_id,))
        user_stats = cursor.fetchone()
        user_reps = user_stats[0] or 0
        user_acc = round(user_stats[1] or 0, 2)

        # 🟢 2. สถิติเฉลี่ยของ "คนทั้งเซิร์ฟเวอร์" (Global Comparison)
        cursor.execute("SELECT AVG(reps), AVG(accuracy) FROM workouts")
        global_stats = cursor.fetchone()
        global_avg_reps = round(global_stats[0] or 0, 2)
        global_avg_acc = round(global_stats[1] or 0, 2)

        # 🟢 3. หาจุดอ่อนของผู้ใช้ (ท่าที่ผิดบ่อยสุด) โดยดึงจาก bad_details
        cursor.execute("""
            SELECT bad_details FROM workouts WHERE user_id = %s AND bad > 0
        """, (user_id,))
        bad_records = cursor.fetchall()
        
        weakness_counts = {}
        for record in bad_records:
            details = record[0] # มันคือ dictionary
            for key, val in details.items():
                weakness_counts[key] = weakness_counts.get(key, 0) + val
                
        # จัดเรียงหาท่าที่ผิดเยอะสุด
        top_weakness = sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)

    finally:
        cursor.close()
        conn.close()

    return {
        "my_stats": {
            "total_reps": user_reps,
            "average_accuracy": user_acc,
            "weaknesses": top_weakness # เช่น [("pushup_bad_back", 15), ("pushup_bad_neck", 5)]
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