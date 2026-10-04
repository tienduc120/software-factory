import { inject, injectable } from 'inversify';
import { Clock } from '../../../shared/kernel/clock.ts';
import { ok, type Result } from '../../../shared/kernel/result.ts';
import { BillableUnits, type InvalidBillableUnits } from '../domain/billable-units.ts';
import { CustomerReference, type InvalidCustomerReference } from '../domain/customer-reference.ts';
import { InvoiceRepository } from '../domain/invoice-repository.ts';
import { Invoice } from '../domain/invoice.ts';
import { OrderReference, type InvalidOrderReference } from '../domain/order-reference.ts';

export type IssueInvoiceInput = {
  readonly orderId: string;
  readonly customerId: string;
  readonly units: number;
};
export type IssueInvoiceOutput = { readonly invoiceId: string; readonly isNewlyIssued: boolean };
export type IssueInvoiceError =
  InvalidOrderReference | InvalidCustomerReference | InvalidBillableUnits;

@injectable()
export class IssueInvoiceUseCase {
  constructor(
    @inject(InvoiceRepository) private readonly invoices: InvoiceRepository,
    @inject(Clock) private readonly clock: Clock,
  ) {}

  async execute(input: IssueInvoiceInput): Promise<Result<IssueInvoiceOutput, IssueInvoiceError>> {
    const orderReference = OrderReference.parse(input.orderId);
    if (!orderReference.ok) return orderReference;
    const customerReference = CustomerReference.parse(input.customerId);
    if (!customerReference.ok) return customerReference;
    const units = BillableUnits.parse(input.units);
    if (!units.ok) return units;

    // One invoice per order: a redelivered event must never bill twice.
    const existing = await this.invoices.findByOrderReference(orderReference.value);
    if (existing !== undefined) return ok({ invoiceId: existing.id, isNewlyIssued: false });

    const issued = Invoice.issue(
      orderReference.value,
      customerReference.value,
      units.value,
      this.clock.now(),
    );
    await this.invoices.create(issued);
    return ok({ invoiceId: issued.invoice.id, isNewlyIssued: true });
  }
}
