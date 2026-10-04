import { describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Invoice } from './invoice.ts';

const orderReference = brand('0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10', 'OrderReference');
const customerReference = brand('5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40', 'CustomerReference');
const now = new Date('2026-01-15T09:00:00Z');

describe('Invoice', () => {
  it('is issued for the price per unit times the units', () => {
    const issued = Invoice.issue(orderReference, customerReference, brand(3, 'BillableUnits'), now);

    expect(issued).toStrictEqual({
      type: 'InvoiceIssued',
      invoice: Invoice.restore(
        issued.invoice.id,
        orderReference,
        customerReference,
        brand({ cents: 4_500, currency: 'USD' }, 'Money'),
        now,
      ),
      occurredAt: now,
    });
  });
});
