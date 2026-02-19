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
