import { assert, describe, expect, it } from 'vitest';
import { Currency, Money } from './money.ts';

describe('Money', () => {
  it('accepts zero and positive whole cents', () => {
    expect(Money.of(0, Currency.Usd)).toStrictEqual({
      ok: true,
      value: { cents: 0, currency: 'USD' },
    });
  });

  it.each([-1, 1.5, Number.NaN])('rejects %d cents', (cents) => {
    expect(Money.of(cents, Currency.Usd)).toStrictEqual({
      ok: false,
      error: { type: 'InvalidMoney', cents },
    });
  });

  it('multiplies and keeps the currency', () => {
    const price = Money.of(1_250, Currency.Eur);
    assert(price.ok);

    expect(Money.multiply(price.value, 3)).toStrictEqual({ cents: 3_750, currency: 'EUR' });
  });
});
