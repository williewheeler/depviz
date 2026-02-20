# Processing spans

## Pseudocode

```python
for trace in traces:
    spans = trace.spans
    span_map = {s.id: s for s in spans}

    for s in spans:
        if s.parent_id:
            p = span_map.get(s.parent_id)
            if p and p.service != s.service:
                edge_counts[(p.service, s.service)] += 1
```

## Latency/error edges

```
A → B :
  call_count
  p95_latency
  error_rate
```

## Modules

- otlp_receiver.py — gRPC servicer (thin)
- model.py — minimal span/edge dataclasses
- aggregator.py — windowed aggregation + snapshot
- api.py — REST endpoint (FastAPI) exposing snapshot
- main.py — starts gRPC + HTTP servers

## Core design

- TraceService.Export(request, context) does:
  1. parse spans into a small internal SpanEvent list
  2. aggregator.ingest(span_events)
  3. return OK

Everything else lives outside the gRPC method.

## Data model (minimal)

- SpanEvent
  - ts_end_ns (or start)
  - trace_id, span_id, parent_span_id
  - service
  - duration_ms
  - is_error
- EdgeKey
  - (parent_service, child_service)

## Aggregator responsibilities

1. Infer edges
   - build span_id -> service per trace/batch 
   - for each span with parent in same trace/batch: add edge if service differs
2. Windowed stats
   - bucket by end timestamp: bucket = end_time // window_ns
   - keep map: bucket -> edge -> stats 
   - stats: call_count, durations (for p95), error_count (optional)
3. In-memory rolling retention
   - keep last N buckets (e.g., 60 buckets for 10s windows = 10 minutes)
   - evict old buckets
4. Snapshot 
   - combine buckets within requested time range into a single graph snapshot
   - compute p95 per edge over the selected window

## REST endpoint

Expose:
- GET /graph?window_sec=60 returns:
  - nodes: list of services seen in window
  - edges: list with src, dst, call_count, p95_ms

That’s enough for UI later.

## Concurrency note (keep it simple)

We will have:
- gRPC thread(s) calling ingest 
- HTTP thread(s) calling snapshot

Use a single threading.Lock inside the aggregator to protect shared state. Good enough for MVP.

## What we change today

- Make TraceService.Export call aggregator.ingest(...)
- Add GraphAggregator class
- Add minimal FastAPI app to serve snapshot()
