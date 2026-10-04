import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { isUuid } from '../../../shared/kernel/uuid.ts';

export type CustomerReference = Brand<string, 'CustomerReference'>;
export type InvalidCustomerReference = {
  readonly type: 'InvalidCustomerReference';
  readonly raw: string;
};

export const CustomerReference = {
  parse: (raw: string): Result<CustomerReference, InvalidCustomerReference> =>
    isUuid(raw)
      ? ok(brand(raw, 'CustomerReference'))
      : err({ type: 'InvalidCustomerReference', raw }),
} as const;
