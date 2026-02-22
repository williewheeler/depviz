from dataclasses import dataclass, field
from typing import Optional, List

@dataclass(frozen=True)
class SpanEvent:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str]
    service_name: str
    duration_ms: float
    end_time_ns: int
    kind: int = 0  # Default to SPAN_KIND_UNSPECIFIED
    is_error: bool = False

@dataclass(frozen=True)
class EdgeKey:
    parent_service: str
    child_service: str

@dataclass
class EdgeStats:
    call_count: int = 0
    durations: List[float] = field(default_factory=list)
    error_count: int = 0

@dataclass
class NodeStats:
    call_count: int = 0
    error_count: int = 0
    server_call_count: int = 0
    server_error_count: int = 0
