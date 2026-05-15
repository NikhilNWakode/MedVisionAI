import json
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.auth.jwt import decode_token
from app.chat.service import stream_chat_response
from app.db.session import async_session

router = APIRouter()


@router.websocket("/ws/chat/{session_id}")
async def chat_websocket(
    websocket: WebSocket,
    session_id: uuid.UUID,
    token: str = Query(...),
):
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = uuid.UUID(payload["sub"])
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            content = message.get("content", "").strip()

            if not content:
                continue

            await websocket.send_text(json.dumps({"type": "stream_start"}))

            async with async_session() as db:
                async for chunk in stream_chat_response(content, session_id, user_id, db):
                    await websocket.send_text(chunk)

    except WebSocketDisconnect:
        pass
    except PermissionError:
        try:
            await websocket.close(code=4003, reason="Session access denied")
        except Exception:
            pass
    except Exception as e:
        import traceback
        traceback.print_exc()
        try:
            await websocket.close(code=4000, reason="Internal error")
        except Exception:
            pass
