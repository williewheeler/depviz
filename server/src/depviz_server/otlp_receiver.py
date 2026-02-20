from opentelemetry.proto.collector.trace.v1 import trace_service_pb2, trace_service_pb2_grpc
from opentelemetry.proto.trace.v1 import trace_pb2
from depviz_server import aggregator
from depviz_server.model import SpanEvent


class TraceService(trace_service_pb2_grpc.TraceServiceServicer):
    """
    Receives OpenTelemetry traces and aggregates them.
    """

    def Export(self, request, context):
        """
        The OTLP exporter on the OTel Collector calls this RPC (traces only).
        """
        span_events = []
        for rs in request.resource_spans:
            svc = "unknown"
            if rs.resource:
                for attr in rs.resource.attributes:
                    if attr.key == "service.name":
                        svc = attr.value.string_value

            for ss in rs.scope_spans:
                for span in ss.spans:
                    duration_ms = (span.end_time_unix_nano - span.start_time_unix_nano) / 1_000_000
                    is_error = span.status.code == trace_pb2.Status.StatusCode.STATUS_CODE_ERROR
                    
                    event = SpanEvent(
                        trace_id=span.trace_id,
                        span_id=span.span_id,
                        parent_span_id=span.parent_span_id if span.parent_span_id else None,
                        service_name=svc,
                        duration_ms=duration_ms,
                        end_time_ns=span.end_time_unix_nano,
                        is_error=is_error
                    )
                    span_events.append(event)
        
        if span_events:
            aggregator.ingest(span_events)

        return trace_service_pb2.ExportTraceServiceResponse()
