import { inject, injectable } from 'inversify';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { InvoiceRepository } from '../domain/invoice-repository.ts';
import { OrderReference, type InvalidOrderReference } from '../domain/order-reference.ts';

export type FindInvoiceByOrderInput = { readonly orderId: string };
export type FindInvoiceByOrderOutput = {
  readonly invoiceId: string;
  readonly orderId: string;
  readonly amountCents: number;
  readonly currency: string;
};
export type InvoiceNotFound = { readonly type: 'InvoiceNotFound'; readonly orderId: string };
export type FindInvoiceByOrderError = InvalidOrderReference | InvoiceNotFound;

@injectable()
export class FindInvoiceByOrderUseCase {
  constructor(@inject(InvoiceRepository) private readonly invoices: InvoiceRepository) {}

  async execute(
    input: FindInvoiceByOrderInput,
  ): Promise<Result<FindInvoiceByOrderOutput, FindInvoiceByOrderError>> {
    const orderReference = OrderReference.parse(input.orderId);
    if (!orderReference.ok) return orderReference;
    const invoice = await this.invoices.findByOrderReference(orderReference.value);
    if (invoice === undefined) return err({ type: 'InvoiceNotFound', orderId: input.orderId });

    return ok({
      invoiceId: invoice.id,
      orderId: invoice.orderReference,
      amountCents: invoice.amount.cents,
      currency: invoice.amount.currency,
    });
  }
}
