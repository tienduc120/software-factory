import { describe, expect, it } from 'vitest';
import { brand } from '../../../../shared/kernel/brand.ts';
import { Order } from '../../domain/order.ts';
import { toOrderPlacedV1 } from './order-integration-events.ts';

describe('toOrderPlacedV1', () => {
  it('publishes the facts consumers need as plain data', () => {
    const placed = Order.place(
      brand('5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40', 'CustomerId'),
      brand(3, 'Quantity'),
      new Date('2026-01-15T09:00:00Z'),
    );

    expect(toOrderPlacedV1(placed)).toStrictEqual({
      type: 'ordering.order-placed.v1',
      eventId: expect.any(String),
      occurredAt: '2026-01-15T09:00:00.000Z',
      orderId: placed.order.id,
      customerId: '5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40',
      quantity: 3,
    });
  });
});
