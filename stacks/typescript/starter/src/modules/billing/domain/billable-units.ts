import { brand, type Brand } from '../../../shared/kernel/brand.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';

export type BillableUnits = Brand<number, 'BillableUnits'>;
export type InvalidBillableUnits = { readonly type: 'InvalidBillableUnits'; readonly raw: number };

export const BillableUnits = {
  parse: (raw: number): Result<BillableUnits, InvalidBillableUnits> =>
    Number.isSafeInteger(raw) && raw >= 1
      ? ok(brand(raw, 'BillableUnits'))
      : err({ type: 'InvalidBillableUnits', raw }),
} as const;
