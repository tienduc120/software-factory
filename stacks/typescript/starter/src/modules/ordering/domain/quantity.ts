import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';

const MAX_PER_ORDER = 100;

export type Quantity = Brand<number, 'Quantity'>;
export type InvalidQuantity = { readonly type: 'InvalidQuantity'; readonly raw: number };

export const Quantity = {
  parse: (raw: number): Result<Quantity, InvalidQuantity> =>
    Number.isInteger(raw) && raw >= 1 && raw <= MAX_PER_ORDER
      ? ok(brand(raw, 'Quantity'))
      : err({ type: 'InvalidQuantity', raw }),
} as const;
