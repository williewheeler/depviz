import binascii
from google.protobuf.json_format import MessageToDict
# from google.protobuf.json_format import MessageToJson
from opentelemetry.proto.collector.trace.v1 import trace_service_pb2, trace_service_pb2_grpc
from opentelemetry.proto.trace.v1 import trace_pb2

from depviz_server import aggregator
from depviz_server.model import SpanEvent


# https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-proto/src/opentelemetry/proto/collector/trace/v1/trace_service_pb2_grpc.py
class TraceService(trace_service_pb2_grpc.TraceServiceServicer):
    """
    Receives OpenTelemetry traces and aggregates them.
    """

    # Protobuf definitions:
    # https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto
    # https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/resource/v1/resource.proto
    def Export(self, request: trace_service_pb2.ExportTraceServiceRequest, context):
        """
        The OTLP exporter on the OTel Collector calls this RPC (traces only).
        """
        # dump_otlp_request_summary(request)
        span_events = []
        for rs in request.resource_spans:
            # print(MessageToJson(rs, indent=2))
            svc = "unknown"
            for attr in rs.resource.attributes:
                if attr.key == "service.name":
                    which = attr.value.WhichOneof("value")
                    svc_val = getattr(attr.value, which) if which else "unknown"
                    svc = str(svc_val)
                    break

            for ss in rs.scope_spans:
                for span in ss.spans:
                    duration_ms = (span.end_time_unix_nano - span.start_time_unix_nano) / 1_000_000
                    is_error = span.status.code == trace_pb2.Status.StatusCode.STATUS_CODE_ERROR
                    event = SpanEvent(
                        trace_id=hex_bytes(span.trace_id),
                        span_id=hex_bytes(span.span_id),
                        parent_span_id=hex_bytes(span.parent_span_id) if span.parent_span_id else None,
                        service_name=svc,
                        duration_ms=duration_ms,
                        end_time_ns=span.end_time_unix_nano,
                        kind=span.kind,
                        is_error=is_error
                    )
                    span_events.append(event)

        if span_events:
            aggregator.ingest(span_events)

        return trace_service_pb2.ExportTraceServiceResponse()


def dump_otlp_request_summary(req):
    d = MessageToDict(req, preserving_proto_field_name=True)
    for rs in d.get("resource_spans", []):
        # resource attrs
        attrs = {}
        for kv in rs.get("resource", {}).get("attributes", []):
            v = kv.get("value", {})
            attrs[kv["key"]] = (
                v.get("string_value")
                or v.get("int_value")
                or v.get("bool_value")
                or v.get("double_value")
                or v.get("bytes_value")
            )

        print("RESOURCE: "
              f"service.name={attrs.get('service.name')} "
              f"service.instance.id={attrs.get('service.instance.id')} "
              f"k8s.pod.name={attrs.get('k8s.pod.name')}")

        # [scope] span_name span_kind span_id
        for ss in rs.get("scope_spans", []):
            scope = ss.get("scope", {})
            scope_name = scope.get("name")
            for sp in ss.get("spans", []):
                print(f"  [{scope_name}] {sp.get('name')} "
                      f"kind={sp.get('kind')} "
                      f"spanId={sp.get('span_id')} parent={sp.get('parent_span_id')}")


def hex_bytes(b: bytes) -> str:
    return binascii.hexlify(b).decode("ascii")
