// Request tracing — trace ID generation and hop tracking
// ponytail: simple trace ID + hop array, no open telemetry dependency
// Upgrade path: OTLP export, span tree, distributed context propagation

import { v4 as uuidv4 } from "uuid";

export interface TraceHop {
  provider: string;
  model: string;
  status: "attempt" | "success" | "failure" | "circuit-breaker" | "rate-limited" | "cooldown" | "fallback";
  latencyMs: number;
  error?: string;
}

export interface TraceContext {
  traceId: string;
  startTime: number;
  hops: TraceHop[];
}

// ─── Per-request storage (using AsyncLocalStorage) ──────────────────────────

import { AsyncLocalStorage } from "async_hooks";

const traceStorage = new AsyncLocalStorage<TraceContext>();

/** Create a new trace context for the current async scope. */
export function createTrace(): TraceContext {
  const ctx: TraceContext = {
    traceId: uuidv4(),
    startTime: Date.now(),
    hops: [],
  };
  return ctx;
}

/** Run a function within a trace context. */
export function runWithTrace<T>(fn: () => Promise<T>): Promise<T> {
  const ctx = createTrace();
  return traceStorage.run(ctx, fn);
}

/** Get the current trace context (from AsyncLocalStorage). */
export function getTrace(): TraceContext | null {
  return traceStorage.getStore() || null;
}

/** Add a hop to the current trace. Returns the trace. */
export function addHop(hop: Omit<TraceHop, "latencyMs"> & { latencyMs?: number }): TraceContext | null {
  const trace = getTrace();
  if (!trace) return null;
  trace.hops.push({
    ...hop,
    latencyMs: hop.latencyMs ?? (Date.now() - trace.startTime),
  });
  return trace;
}

/** Create a trace from existing data (for programmatic use without ALS). */
export function createTraceFrom(traceId?: string): TraceContext {
  return {
    traceId: traceId || uuidv4(),
    startTime: Date.now(),
    hops: [],
  };
}

/** Format trace as log-friendly string. */
export function formatTrace(trace: TraceContext): string {
  const duration = Date.now() - trace.startTime;
  const hops = trace.hops
    .map((h) => `${h.provider}/${h.model} ${h.status}${h.error ? ` err=${h.error.slice(0, 40)}` : ""}`)
    .join(" → ");
  return `[Trace:${trace.traceId.slice(0, 8)}] ${hops} total=${duration}ms`;
}
