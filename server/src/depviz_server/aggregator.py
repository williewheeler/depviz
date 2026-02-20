import bisect
import threading
import time
from collections import defaultdict
from typing import List, Dict

from depviz_server.model import SpanEvent, EdgeKey, EdgeStats


class GraphAggregator:
    def __init__(self, window_sec: int = 10, retention_buckets: int = 60):
        """
        Initializes a GraphAggregator with specified window and retention settings.

        Parameters:
        - window_sec: The time window in seconds for aggregating edge statistics.
        - retention_buckets: The number of buckets to retain for historical data.
        """

        self.window_ns = window_sec * 1_000_000_000
        self.retention_buckets = retention_buckets
        self.lock = threading.Lock()
        # bucket_id -> EdgeKey -> EdgeStats
        self.buckets: Dict[int, Dict[EdgeKey, EdgeStats]] = defaultdict(lambda: defaultdict(EdgeStats))
        self.active_buckets: List[int] = []

    def ingest(self, spans: List[SpanEvent]):
        """
        Processes a batch of spans to update edge statistics within the aggregation window.
        """

        if not spans:
            return

        # 1. Infer edges within this batch/trace
        # Map span_id -> service_name for fast lookup
        span_to_service = {s.span_id: s.service_name for s in spans}

        with self.lock:
            for s in spans:
                if s.parent_span_id and s.parent_span_id in span_to_service:
                    parent_svc = span_to_service[s.parent_span_id]
                    if parent_svc != s.service_name:
                        # We have a cross-service edge!
                        edge_key = EdgeKey(parent_svc, s.service_name)
                        print(f"EDGE: {edge_key.parent_service} -> {edge_key.child_service}")
                        bucket_id = s.end_time_ns // self.window_ns
                        
                        stats = self.buckets[bucket_id][edge_key]
                        stats.call_count += 1
                        stats.durations.append(s.duration_ms)
                        if s.is_error:
                            stats.error_count += 1
                        
                        if bucket_id not in self.active_buckets:
                            bisect.insort(self.active_buckets, bucket_id)
            
            self._evict_old_buckets()

    def _evict_old_buckets(self):
        # Assumes lock is held
        if len(self.active_buckets) > self.retention_buckets:
            num_to_evict = len(self.active_buckets) - self.retention_buckets
            to_evict = self.active_buckets[:num_to_evict]
            self.active_buckets = self.active_buckets[num_to_evict:]
            for b_id in to_evict:
                del self.buckets[b_id]

    def get_snapshot(self, window_sec: int = 60):
        """
        Retrieves a snapshot of aggregated edge statistics within a specified window.

        Parameters:
        - window_sec: The time window in seconds for which to retrieve the snapshot.

        Returns:
        - A dictionary mapping EdgeKey to EdgeStats representing the aggregated statistics.
        """

        now_ns = time.time_ns()
        start_ns = now_ns - (window_sec * 1_000_000_000)
        start_bucket = start_ns // self.window_ns

        nodes = set()
        edges_combined: Dict[EdgeKey, EdgeStats] = defaultdict(EdgeStats)

        with self.lock:
            for b_id in self.active_buckets:
                if b_id >= start_bucket:
                    for edge_key, stats in self.buckets[b_id].items():
                        nodes.add(edge_key.parent_service)
                        nodes.add(edge_key.child_service)
                        
                        combined = edges_combined[edge_key]
                        combined.call_count += stats.call_count
                        combined.durations.extend(stats.durations)
                        combined.error_count += stats.error_count

        # Format for REST API
        result_edges = []
        for edge_key, stats in edges_combined.items():
            p95 = 0.0
            if stats.durations:
                # Basic p95 calculation
                sorted_durations = sorted(stats.durations)
                idx = int(len(sorted_durations) * 0.95)
                p95 = sorted_durations[min(idx, len(sorted_durations) - 1)]

            result_edges.append({
                "src": edge_key.parent_service,
                "dst": edge_key.child_service,
                "call_count": stats.call_count,
                "p95_ms": round(p95, 2),
                "error_count": stats.error_count
            })

        return {
            "nodes": sorted(list(nodes)),
            "edges": result_edges
        }

# Global instance for easy access
global_aggregator = GraphAggregator(window_sec=60, retention_buckets=1800)

def ingest(spans: List[SpanEvent]):
    global_aggregator.ingest(spans)
