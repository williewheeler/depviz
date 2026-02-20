from dataclasses import dataclass
from typing import Optional

@dataclass(frozen=True)
class SpanEvent:
    trace_id: bytes
    span_id: bytes
    parent_span_id: Optional[bytes]
    service_name: str
    duration_ms: float
    end_time_ns: int
    is_error: bool = False

@dataclass(frozen=True)
class EdgeKey:
    parent_service: str
    child_service: str

@dataclass
class EdgeStats:
    call_count: int = 0
    durations: list[float] = None
    error_count: int = 0

    def __post_init__(self):
        if self.durations is None:
            self.durations = []
