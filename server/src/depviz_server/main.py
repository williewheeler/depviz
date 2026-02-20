from concurrent import futures

import grpc
import uvicorn
import threading
from opentelemetry.proto.collector.trace.v1 import trace_service_pb2_grpc

from depviz_server.otlp_receiver import TraceService
from depviz_server.api import app


def serve_grpc(stop_event):
    print("Starting OTLP gRPC receiver on [::]:4317...", flush=True)
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Register the gRPC servicer, which implements the RPC methods defined in the OTLP protobuf (TraceService/Export).
    trace_service_pb2_grpc.add_TraceServiceServicer_to_server(TraceService(), server)

    server.add_insecure_port("[::]:4317")  # OTLP gRPC default
    server.start()
    print("OTLP gRPC receiver listening on 4317", flush=True)
    stop_event.wait()
    server.stop(0)


def serve_http():
    print("Starting REST API server on 0.0.0.0:8000...", flush=True)
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
    except Exception as e:
        print(f"FAILED to start REST API server: {e}", flush=True)


def serve():
    stop_event = threading.Event()
    grpc_thread = threading.Thread(target=serve_grpc, args=(stop_event,), daemon=False)
    grpc_thread.start()

    try:
        serve_http()  # blocks
    finally:
        stop_event.set()
        grpc_thread.join()


if __name__ == "__main__":
    serve()
