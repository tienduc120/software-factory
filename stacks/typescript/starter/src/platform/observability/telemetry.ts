import { metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { NodeSDK, metrics as sdkMetrics } from '@opentelemetry/sdk-node';

/**
 * Traces plus runtime metrics (event loop delay, heap, GC) and host metrics (CPU, memory).
 * Disabled unless OTEL_EXPORTER_OTLP_ENDPOINT is set; OTEL_SERVICE_NAME names the service.
 */
export function startTelemetry(env: NodeJS.ProcessEnv = process.env): NodeSDK | undefined {
  if (env.OTEL_EXPORTER_OTLP_ENDPOINT === undefined) return undefined;
  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [
      new sdkMetrics.PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() }),
    ],
    instrumentations: [new RuntimeNodeInstrumentation()],
  });
  sdk.start();
  new HostMetrics({ meterProvider: metrics.getMeterProvider(), name: 'host-metrics' }).start();
  return sdk;
}
