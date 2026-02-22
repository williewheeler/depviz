import grpc
import threading
import uvicorn
from concurrent import futures
from depviz_server.api import app
from depviz_server.otlp_receiver import TraceService
from opentelemetry.proto.collector.trace.v1 import trace_service_pb2_grpc

GRPC_PORT = 4317
HTTP_PORT = 8000


def serve_grpc_for_span_ingest(server: grpc.Server):
    print(f"Starting OTLP gRPC receiver on [::]:{GRPC_PORT}...", flush=True)

    # Register the gRPC servicer with the server.
    # The servicer implements the RPC methods (TraceService.Export) defined in the OTLP protobuf.
    trace_service_pb2_grpc.add_TraceServiceServicer_to_server(TraceService(), server)

    server.add_insecure_port(f"[::]:{GRPC_PORT}")  # OTLP gRPC default
    server.start()
    print(f"OTLP gRPC receiver listening on {GRPC_PORT}", flush=True)

    # Block until the server is stopped.
    server.wait_for_termination()


def serve_http_for_graph_api():
    print("Starting REST API server on 0.0.0.0:8000...", flush=True)
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug")
    except Exception as e:
        print(f"FAILED to start REST API server: {e}", flush=True)


def serve():
    # Create the gRPC server here so we can stop it cleanly from this thread.
    grpc_server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Run gRPC in a separate thread; it blocks on wait_for_termination().
    grpc_thread = threading.Thread(
        target=serve_grpc_for_span_ingest,
        args=(grpc_server,),
        daemon=False,
    )
    grpc_thread.start()

    try:
        serve_http_for_graph_api()  # blocks
    finally:
        # Cleanly stop the gRPC server and wait for it to terminate.
        grpc_server.stop(0).wait()
        grpc_thread.join()


if __name__ == "__main__":
    serve()