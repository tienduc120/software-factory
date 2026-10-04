import { describe, expect, it } from 'vitest';
import { Quantity } from './quantity.ts';

describe('Quantity', () => {
  it.each([1, 100])('accepts %d', (raw) => {
    expect(Quantity.parse(raw)).toStrictEqual({ ok: true, value: raw });
  });

  it.each([0, 101, 1.5, -1])('rejects %d', (raw) => {
    expect(Quantity.parse(raw)).toStrictEqual({
      ok: false,
      error: { type: 'InvalidQuantity', raw },
    });
  });
});
