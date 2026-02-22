export interface NodeData {
  name: string;
  call_count: number;
  error_count: number;
}

export interface EdgeData {
  src: string;
  dst: string;
  call_count: number;
  p95_ms: number;
  error_count: number;
}

export interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
}
