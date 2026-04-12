import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.squat_service import SquatPredictor

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