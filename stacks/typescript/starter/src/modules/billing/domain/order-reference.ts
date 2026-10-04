import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { isUuid } from '../../../shared/kernel/uuid.ts';

/** Billing's own handle on an order; billing never holds ordering's types. */
export type OrderReference = Brand<string, 'OrderReference'>;
export type InvalidOrderReference = {
  readonly type: 'InvalidOrderReference';
  readonly raw: string;
};

export const OrderReference = {
  parse: (raw: string): Result<OrderReference, InvalidOrderReference> =>
    isUuid(raw) ? ok(brand(raw, 'OrderReference')) : err({ type: 'InvalidOrderReference', raw }),
} as const;
