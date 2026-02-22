# depviz

Real-time dynamic service dependency graph visualization from OpenTelemetry traces.

## MVP Feature Set

### 1. Automatic topology discovery from OTLP traces
Infers service-to-service dependencies directly from distributed traces, eliminating the need for manually maintained service maps.

### 2. Real-time dependency service dependency graph
Continuously updates a directed service graph as trace data streams in, providing an always-current view of runtime architecture.

### 3. Health overlay on nodes and edges
Visualizes system health directly on the graph using latency and error metrics, allowing bottlenecks and failure propagation paths to surface immediately.

### 4. Interactive node and edge inspection
Enables click-through exploration of services and dependencies, exposing call volume, latency percentiles, and error rates.

### 5. Time-windowed graph view
Allows users to view dependency topology over selectable time ranges to observe topology drift and incident evolution.

### 6. Native OpenTelemetry integration
Consumes OTLP trace data via gRPC directly from the OpenTelemetry Collector, demonstrating standards-based observability integration.

### 7. Exportable visualization
Supports exporting the dependency graph as an image for sharing, documentation, or incident reports.

## Roadmap

### [DONE] Wed night (tonight)

Goal: ingestion proof

- Python OTLP gRPC receiver
- deploy to cluster
- collector fork
- see spans printed

If this works, the hardest integration piece is done.

### [DONE] Thu

Goal: graph aggregation

- infer edges from spans
- windowed aggregation
- compute call_count + p95 latency
- in-memory graph
- basic REST endpoint to fetch graph snapshot

No UI yet.

### [DONE] Fri

Goal: UI skeleton

- simple Cytoscape graph
- render snapshot
- color edges/nodes by health
- no real-time updates yet

### Sat

Goal: streaming UX

- websocket updates
- incremental graph refresh
- click node/edge metrics panel
- basic time window selector

Now it’s already a useful tool.

### Sun

Goal: polish + portfolio readiness

- export graph image
- README
- architecture diagram
- demo video / GIF
- cleanup rough edges
- deployment instructions

# See also

- [Grafana Tempo service graphs](https://github.com/grafana/tempo/tree/main/modules/generator/processor/servicegraphs)
- [OpenTelemetry service graph connector](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/servicegraphconnector)
