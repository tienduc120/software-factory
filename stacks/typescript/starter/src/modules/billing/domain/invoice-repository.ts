import type { InvoiceIssued } from './invoice-events.ts';
import type { Invoice } from './invoice.ts';
import type { OrderReference } from './order-reference.ts';

export type InvoiceRepository = {
  findByOrderReference(orderReference: OrderReference): Promise<Invoice | undefined>;
  create(event: InvoiceIssued): Promise<void>;
};

export const InvoiceRepository = Symbol('InvoiceRepository');
