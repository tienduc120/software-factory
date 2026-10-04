import type { Invoice } from './invoice.ts';

export type InvoiceIssued = {
  readonly type: 'InvoiceIssued';
  readonly invoice: Invoice;
  readonly occurredAt: Date;
};
