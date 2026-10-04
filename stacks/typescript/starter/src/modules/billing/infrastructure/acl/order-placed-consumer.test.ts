import { assert, describe, expect, it, vi } from 'vitest';
import { brand } from '../../../../shared/kernel/brand.ts';
import type { OrderPlacedV1 } from '../../../ordering/contracts/order-placed-v1.ts';
import { IssueInvoiceUseCase } from '../../application/issue-invoice-use-case.ts';
import { Invoice } from '../../domain/invoice.ts';
import { InMemoryInvoiceRepository } from '../persistence/in-memory-invoice-repository.ts';
import { OrderPlacedConsumer } from './order-placed-consumer.ts';

const now = new Date('2026-01-15T09:00:00Z');
const orderId = '0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10';
const customerId = '5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40';
const eventId = 'e1f3c1d2-7a4b-4c5d-8e9f-0a1b2c3d4e5f';

function createConsumer() {
  const invoices = new InMemoryInvoiceRepository();
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const issueInvoice = new IssueInvoiceUseCase(invoices, { now: () => now });
  return { consumer: new OrderPlacedConsumer(issueInvoice, logger), invoices, logger };
}

function createEvent(quantity: number): OrderPlacedV1 {
  return {
    type: 'ordering.order-placed.v1',
    eventId,
    occurredAt: now.toISOString(),
    orderId,
    customerId,
    quantity,
  };
}

describe('OrderPlacedConsumer', () => {
  it('issues an invoice in billing terms for a placed order', async () => {
    const { consumer, invoices, logger } = createConsumer();

    await consumer.handle(createEvent(4));

    const invoice = await invoices.findByOrderReference(brand(orderId, 'OrderReference'));
    assert(invoice !== undefined);
    expect(invoice).toStrictEqual(
      Invoice.restore(
        invoice.id,
        brand(orderId, 'OrderReference'),
        brand(customerId, 'CustomerReference'),
        brand({ cents: 6_000, currency: 'USD' }, 'Money'),
        now,
      ),
    );
    expect(logger.error.mock.calls).toStrictEqual([]);
  });

  it('reports an event billing cannot accept instead of failing delivery', async () => {
    const { consumer, logger } = createConsumer();

    await consumer.handle(createEvent(0));

    expect(logger.error.mock.calls).toStrictEqual([
      [
        'Rejected order-placed event',
        { eventId, reason: { type: 'InvalidBillableUnits', raw: 0 } },
      ],
    ]);
  });
});
