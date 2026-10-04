import { describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Invoice } from '../domain/invoice.ts';
import { InMemoryInvoiceRepository } from '../infrastructure/persistence/in-memory-invoice-repository.ts';
import { FindInvoiceByOrderUseCase } from './find-invoice-by-order-use-case.ts';

const orderId = '0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10';

describe('FindInvoiceByOrderUseCase', () => {
  it('returns the invoice issued for the order', async () => {
    const invoices = new InMemoryInvoiceRepository();
    const issued = Invoice.issue(
      brand(orderId, 'OrderReference'),
      brand('5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40', 'CustomerReference'),
      brand(1, 'BillableUnits'),
      new Date('2026-01-15T09:00:00Z'),
    );
    await invoices.create(issued);

    const result = await new FindInvoiceByOrderUseCase(invoices).execute({ orderId });

    expect(result).toStrictEqual({
      ok: true,
      value: { invoiceId: issued.invoice.id, orderId, amountCents: 1_500, currency: 'USD' },
    });
  });

  it('reports an order without an invoice', async () => {
    const result = await new FindInvoiceByOrderUseCase(new InMemoryInvoiceRepository()).execute({
      orderId,
    });

    expect(result).toStrictEqual({ ok: false, error: { type: 'InvoiceNotFound', orderId } });
  });

  it('rejects a malformed order id', async () => {
    const result = await new FindInvoiceByOrderUseCase(new InMemoryInvoiceRepository()).execute({
      orderId: '42',
    });

    expect(result).toStrictEqual({
      ok: false,
      error: { type: 'InvalidOrderReference', raw: '42' },
    });
  });
});
