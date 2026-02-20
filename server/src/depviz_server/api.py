from typing import Optional

from fastapi import FastAPI
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
def get_graph(window_sec: Optional[int] = 60):
    snapshot = global_aggregator.get_snapshot(window_sec=window_sec or 60)
    return JSONResponse(content=snapshot)
