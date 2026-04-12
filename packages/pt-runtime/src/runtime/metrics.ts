// packages/pt-runtime/src/runtime/metrics.ts
// PT Metrics — Lightweight metrics collection for QtScript

import { getLogger, type PtLogger } from "./logger";

export interface MetricEntry {
  name: string;
  type: "counter" | "gauge" | "histogram";
  value: number;
  labels?: Record<string, string>;
  timestamp: string;
}

export class PtMetrics {
  private counters: Record<string, number> = {};
  private gauges: Record<string, number> = {};
  private histograms: Record<string, number[]> = {};
  private logger: PtLogger;

  constructor(logger?: PtLogger) {
    this.logger = logger || getLogger("metrics");
  }

  increment(name: string, labels?: Record<string, string>): void {
    var key = this.metricKey(name, labels);
    this.counters[key] = (this.counters[key] || 0) + 1;
  }

  gauge(name: string, value: number, labels?: Record<string, string>): void {
    var key = this.metricKey(name, labels);
    this.gauges[key] = value;
  }

  observe(name: string, value: number, labels?: Record<string, string>): void {
    var key = this.metricKey(name, labels);
    if (!this.histograms[key]) {
      this.histograms[key] = [];
    }
    this.histograms[key].push(value);
    if (this.histograms[key].length > 100) {
      this.histograms[key] = this.histograms[key].slice(-100);
    }
  }

  measure<T>(name: string, fn: () => T, labels?: Record<string, string>): T {
    var self = this;
    var start = this.now();
    try {
      var result = fn();
      var elapsed = this.now() - start;
      self.observe(name + ".duration_ms", elapsed, labels);
      self.increment(name + ".total", labels);
      self.increment(name + ".success", labels);
      return result;
    } catch (e) {
      var elapsed = this.now() - start;
      self.observe(name + ".duration_ms", elapsed, labels);
      self.increment(name + ".total", labels);
      self.increment(name + ".error", labels);
      throw e;
    }
  }

  snapshot(): MetricEntry[] {
    var entries: MetricEntry[] = [];
    var ts = new Date().toISOString();

    for (var key in this.counters) {
      entries.push({ name: key, type: "counter", value: this.counters[key], timestamp: ts });
    }
    for (var key in this.gauges) {
      entries.push({ name: key, type: "gauge", value: this.gauges[key], timestamp: ts });
    }
    for (var key in this.histograms) {
      var values = this.histograms[key];
      var sum = 0;
      for (var i = 0; i < values.length; i++) sum += values[i];
      var avg = values.length > 0 ? sum / values.length : 0;
      entries.push({ name: key + ".avg", type: "gauge", value: avg, timestamp: ts });
      entries.push({ name: key + ".count", type: "counter", value: values.length, timestamp: ts });
      entries.push({ name: key + ".p99", type: "gauge", value: this.percentile(values, 0.99), timestamp: ts });
    }

    return entries;
  }

  flush(): void {
    var snapshot = this.snapshot();
    this.logger.info("metrics_snapshot", {
      counters: Object.keys(this.counters).length,
      gauges: Object.keys(this.gauges).length,
      histograms: Object.keys(this.histograms).length,
      entries: snapshot.length,
    });
  }

  reset(): void {
    this.counters = {};
    this.gauges = {};
    this.histograms = {};
  }

  private metricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    var parts = [name];
    var keys = Object.keys(labels).sort();
    for (var i = 0; i < keys.length; i++) {
      parts.push(keys[i] + "=" + labels[keys[i]]);
    }
    return parts.join(",");
  }

  private percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    var sorted = values.slice().sort(function(a, b) { return a - b; });
    var idx = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private now(): number {
    try {
      return Date.now();
    } catch (e) {
      return 0;
    }
  }
}

var _metrics: PtMetrics | null = null;

export function getMetrics(): PtMetrics {
  if (!_metrics) {
    _metrics = new PtMetrics(getLogger("metrics"));
  }
  return _metrics;
}

export function resetMetrics(): void {
  if (_metrics) {
    _metrics.reset();
  }
}
