import { brand } from '../../../shared/kernel/brand.ts';
import type { BillableUnits } from './billable-units.ts';
import type { CustomerReference } from './customer-reference.ts';
import type { InvoiceIssued } from './invoice-events.ts';
import { InvoiceId } from './invoice-id.ts';
import { Currency, Money } from './money.ts';
import type { OrderReference } from './order-reference.ts';

// A literal known to be valid, so it skips Money.of's Result.
const PRICE_PER_UNIT: Money = brand({ cents: 1_500, currency: Currency.Usd }, 'Money');

export class Invoice {
  declare private readonly brand: 'Invoice';

  private constructor(
    readonly id: InvoiceId,
    readonly orderReference: OrderReference,
    readonly customerReference: CustomerReference,
    readonly amount: Money,
    readonly issuedAt: Date,
  ) {}

  static issue(
    orderReference: OrderReference,
    customerReference: CustomerReference,
    units: BillableUnits,
    now: Date,
  ): InvoiceIssued {
    const amount = Money.multiply(PRICE_PER_UNIT, units);
    return {
      type: 'InvoiceIssued',
      invoice: new Invoice(InvoiceId.generate(), orderReference, customerReference, amount, now),
      occurredAt: now,
    };
  }

  static restore(
    id: InvoiceId,
    orderReference: OrderReference,
    customerReference: CustomerReference,
    amount: Money,
    issuedAt: Date,
  ): Invoice {
    return new Invoice(id, orderReference, customerReference, amount, issuedAt);
  }
}
