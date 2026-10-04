import { injectable } from 'inversify';
import type { InvoiceIssued } from '../../domain/invoice-events.ts';
import type { InvoiceRepository } from '../../domain/invoice-repository.ts';
import type { Invoice } from '../../domain/invoice.ts';
import type { OrderReference } from '../../domain/order-reference.ts';

@injectable()
export class InMemoryInvoiceRepository implements InvoiceRepository {
  private readonly rowsByOrder = new Map<OrderReference, Invoice>();

  findByOrderReference(orderReference: OrderReference): Promise<Invoice | undefined> {
    return Promise.resolve(this.rowsByOrder.get(orderReference));
  }

  create(event: InvoiceIssued): Promise<void> {
    this.rowsByOrder.set(event.invoice.orderReference, event.invoice);
    return Promise.resolve();
  }
}
