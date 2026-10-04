import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { isUuid } from '../../../shared/kernel/uuid.ts';

export type OrderId = Brand<string, 'OrderId'>;
export type InvalidOrderId = { readonly type: 'InvalidOrderId'; readonly raw: string };

export const OrderId = {
  generate: (): OrderId => brand(crypto.randomUUID(), 'OrderId'),
  parse: (raw: string): Result<OrderId, InvalidOrderId> =>
    isUuid(raw) ? ok(brand(raw, 'OrderId')) : err({ type: 'InvalidOrderId', raw }),
} as const;
