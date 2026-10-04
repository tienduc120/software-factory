import { describe, expect, it } from 'vitest';
import { startTelemetry } from './telemetry.ts';

describe('startTelemetry', () => {
  it('stays off unless an OTLP endpoint is configured', () => {
    expect(startTelemetry({})).toStrictEqual(undefined);
  });
});
