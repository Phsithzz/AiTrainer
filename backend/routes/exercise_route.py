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
# ── 3. API: Dashboard ─────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard(user_id: int = Depends(get_current_user_id)):
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()
    
    try:
        # 🟢 1. สถิติรวมของ User (แยกตามท่า)
        cursor.execute("""
            SELECT exercise, SUM(reps), AVG(accuracy), SUM(total_time) 
            FROM workouts WHERE user_id = %s GROUP BY exercise
        """, (user_id,))
        user_records = cursor.fetchall()
        
        # เตรียมกล่องเปล่าไว้ใส่ค่า
        my_reps = {"squat": 0, "pushup": 0, "plank": 0}
        my_acc  = {"squat": 0, "pushup": 0, "plank": 0}
        my_time = {"squat": 0, "pushup": 0, "plank": 0}
        total_reps_all = 0
        total_time_all = 0
        acc_list = []
        
        for row in user_records:
            ex = row[0]
            r = row[1] or 0
            a = row[2] or 0
            t = row[3] or 0
            
            if ex in my_reps:
                my_reps[ex] = r
                my_acc[ex]  = round(a, 2)
                my_time[ex] = round(t, 1)
            
            total_reps_all += r
            total_time_all += t
            if a > 0: acc_list.append(a)
            
        overall_acc = round(sum(acc_list)/len(acc_list), 2) if acc_list else 0

        # 🟢 2. สถิติเฉลี่ย Global (แยกตามท่า)
        cursor.execute("""
            SELECT exercise, AVG(reps), AVG(accuracy), AVG(total_time) 
            FROM workouts GROUP BY exercise
        """)
        global_records = cursor.fetchall()
        
        global_reps = {"squat": 0, "pushup": 0, "plank": 0}
        global_acc  = {"squat": 0, "pushup": 0, "plank": 0}
        global_time = {"squat": 0, "pushup": 0, "plank": 0}
        
        for row in global_records:
            ex = row[0]
            if ex in global_reps:
                global_reps[ex] = round(row[1] or 0, 2)
                global_acc[ex]  = round(row[2] or 0, 2)
                global_time[ex] = round(row[3] or 0, 1)

        # 🟢 3. หาจุดอ่อน (Weaknesses) เหมือนเดิม
        cursor.execute("""
            SELECT bad_details FROM workouts WHERE user_id = %s AND bad > 0
        """, (user_id,))
        bad_records = cursor.fetchall()
        
        weakness_counts = {}
        for record in bad_records:
            details_raw = record[0] 
            if details_raw:
                details = json.loads(details_raw) if isinstance(details_raw, str) else details_raw
                for key, val in details.items():
                    weakness_counts[key] = weakness_counts.get(key, 0) + val
                
        top_weakness = sorted(weakness_counts.items(), key=lambda x: x[1], reverse=True)

    finally:
        cursor.close()
        conn.close()

# 🟢 คำนวณค่าเฉลี่ย Global รวมทั้งหมด เพื่อเอาไปเปรียบเทียบ (Comparison)
    g_total_reps = sum(global_reps.values())
    g_total_time = sum(global_time.values())
    active_accs = [v for v in global_acc.values() if v > 0]
    g_avg_acc = sum(active_accs) / len(active_accs) if active_accs else 0

    # 🟢 ส่งข้อมูลกลับไปให้ครบถ้วน ห้ามลืม comparison!
    return {
        "my_stats": {
            "total_reps": total_reps_all,
            "average_accuracy": overall_acc,
            "total_time": total_time_all,
            "reps_by_ex": my_reps,      
            "acc_by_ex": my_acc,        
            "time_by_ex": my_time,      
            "weaknesses": top_weakness
        },
        "global_stats": {
            "reps_by_ex": global_reps,
            "acc_by_ex": global_acc,
            "time_by_ex": global_time
        },
        "comparison": {
            "is_above_average_reps": total_reps_all > g_total_reps,
            "is_above_average_acc": overall_acc > g_avg_acc,
            "is_above_average_time": total_time_all > g_total_time
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