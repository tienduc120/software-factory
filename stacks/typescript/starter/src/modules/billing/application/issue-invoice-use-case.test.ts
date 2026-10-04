import { assert, describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Invoice } from '../domain/invoice.ts';
import { InMemoryInvoiceRepository } from '../infrastructure/persistence/in-memory-invoice-repository.ts';
import { IssueInvoiceUseCase } from './issue-invoice-use-case.ts';

const orderId = '0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10';
const customerId = '5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40';
const clock = { now: () => new Date('2026-01-15T09:00:00Z') };

function createUseCase() {
  const invoices = new InMemoryInvoiceRepository();
  return { invoices, useCase: new IssueInvoiceUseCase(invoices, clock) };
}

describe('IssueInvoiceUseCase', () => {
  it('issues an invoice for an order', async () => {
    const { invoices, useCase } = createUseCase();

    const result = await useCase.execute({ orderId, customerId, units: 2 });

    assert(result.ok);
    expect(result.value).toStrictEqual({ invoiceId: expect.any(String), isNewlyIssued: true });
    expect(await invoices.findByOrderReference(brand(orderId, 'OrderReference'))).toStrictEqual(
      Invoice.restore(
        brand(result.value.invoiceId, 'InvoiceId'),
        brand(orderId, 'OrderReference'),
        brand(customerId, 'CustomerReference'),
        brand({ cents: 3_000, currency: 'USD' }, 'Money'),
        clock.now(),
      ),
    );
  });

  it('returns the existing invoice when the same order arrives again', async () => {
    const { useCase } = createUseCase();
    const first = await useCase.execute({ orderId, customerId, units: 2 });
    assert(first.ok);

    const second = await useCase.execute({ orderId, customerId, units: 2 });

    expect(second).toStrictEqual({
      ok: true,
      value: { invoiceId: first.value.invoiceId, isNewlyIssued: false },
    });
  });

  it.each([
    [
      { orderId: 'x', customerId, units: 1 },
      { type: 'InvalidOrderReference', raw: 'x' },
    ],
    [
      { orderId, customerId: 'y', units: 1 },
      { type: 'InvalidCustomerReference', raw: 'y' },
    ],
    [
      { orderId, customerId, units: 0 },
      { type: 'InvalidBillableUnits', raw: 0 },
    ],
  ])('rejects invalid input %o', async (input, error) => {
    const { useCase } = createUseCase();

    expect(await useCase.execute(input)).toStrictEqual({ ok: false, error });
  });
});
