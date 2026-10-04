import { startTelemetry } from './telemetry.ts';

// Loaded with `node --import` so instrumentation is in place before application modules load.
const sdk = startTelemetry();

process.once('SIGTERM', () => {
  void (sdk?.shutdown() ?? Promise.resolve()).finally(() => process.exit(0));
});
