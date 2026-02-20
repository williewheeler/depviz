from typing import Optional

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from depviz_server.aggregator import global_aggregator

app = FastAPI(title="DepViz Server")

@app.get("/graph")
def get_graph(window_sec: Optional[int] = 60):
    snapshot = global_aggregator.get_snapshot(window_sec=window_sec or 60)
    return JSONResponse(content=snapshot)
