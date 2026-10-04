import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';

export const Currency = { Usd: 'USD', Eur: 'EUR' } as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export type Money = Brand<{ readonly cents: number; readonly currency: Currency }, 'Money'>;
export type InvalidMoney = { readonly type: 'InvalidMoney'; readonly cents: number };

export const Money = {
  of: (cents: number, currency: Currency): Result<Money, InvalidMoney> =>
    Number.isSafeInteger(cents) && cents >= 0
      ? ok(brand({ cents, currency }, 'Money'))
      : err({ type: 'InvalidMoney', cents }),
  multiply: (money: Money, factor: number): Money =>
    brand({ cents: money.cents * factor, currency: money.currency }, 'Money'),
} as const;
