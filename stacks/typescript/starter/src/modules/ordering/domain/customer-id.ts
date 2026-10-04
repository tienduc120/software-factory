import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { isUuid } from '../../../shared/kernel/uuid.ts';

export type CustomerId = Brand<string, 'CustomerId'>;
export type InvalidCustomerId = { readonly type: 'InvalidCustomerId'; readonly raw: string };

export const CustomerId = {
  parse: (raw: string): Result<CustomerId, InvalidCustomerId> =>
    isUuid(raw) ? ok(brand(raw, 'CustomerId')) : err({ type: 'InvalidCustomerId', raw }),
} as const;
