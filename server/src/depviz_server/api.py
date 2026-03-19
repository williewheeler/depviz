import asyncio
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from depviz_server.aggregator import global_aggregator

app = FastAPI(title="DepViz Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/graph")
def get_graph(window_sec: Optional[int] = 60, dynamic: bool = False):
    snapshot = global_aggregator.get_snapshot(window_sec=window_sec or 60, dynamic=dynamic)
    return JSONResponse(content=snapshot)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    window_sec = 60
    dynamic = False

    async def receive_loop():
        nonlocal window_sec, dynamic
        try:
            while True:
                data = await websocket.receive_text()
                if data.startswith("window:"):
                    try:
                        window_sec = int(data.split(":")[1])
                        print(f"WebSocket window updated to {window_sec}s")
                    except ValueError:
                        pass
                elif data.startswith("dynamic:"):
                    dynamic = data.split(":")[1].lower() == "true"
                    print(f"WebSocket dynamic mode changed to: {dynamic}")
        except Exception as e:
            print(f"WebSocket receive error: {e}")

    receive_task = asyncio.create_task(receive_loop())

    try:
        while True:
            snapshot = global_aggregator.get_snapshot(window_sec=window_sec, dynamic=dynamic)
            await websocket.send_json(snapshot)
            await asyncio.sleep(2)  # Update every 2 seconds
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        receive_task.cancel()
