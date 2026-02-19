import grpc
from concurrent import futures

from opentelemetry.proto.collector.trace.v1 import trace_service_pb2_grpc
from opentelemetry.proto.collector.trace.v1 import trace_service_pb2


class TraceService(trace_service_pb2_grpc.TraceServiceServicer):
    """
    Receives OpenTelemetry traces and prints them to stdout.
    """

    def Export(self, request, context):
        """
        The OTLP exporter on the OTel Collector calls this method (traces only).

        :param request:
        :param context:
        :return:
        """
        # request contains ResourceSpans
        for rs in request.resource_spans:
            svc = None
            if rs.resource:
                for attr in rs.resource.attributes:
                    if attr.key == "service.name":
                        svc = attr.value.string_value

            for ss in rs.scope_spans:
                for span in ss.spans:
                    print(f"service={svc} span={span.name} duration={span.end_time_unix_nano - span.start_time_unix_nano}")

        return trace_service_pb2.ExportTraceServiceResponse()


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Register the gRPC servicer, which implements the RPC methods defined in the OTLP protobuf (TraceService/Export).
    trace_service_pb2_grpc.add_TraceServiceServicer_to_server(TraceService(), server)

    server.add_insecure_port("[::]:4317")  # OTLP gRPC default
    server.start()
    print("OTLP gRPC receiver listening on 4317")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
