import { describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Order, OrderStatus } from './order.ts';

const orderId = brand('0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10', 'OrderId');
const customerId = brand('5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40', 'CustomerId');
const quantity = brand(2, 'Quantity');
const now = new Date('2026-01-15T09:00:00Z');

describe('Order', () => {
  it('is placed with a new id and the placed status', () => {
    const placed = Order.place(customerId, quantity, now);

    expect(placed).toStrictEqual({
      type: 'OrderPlaced',
      order: Order.restore(placed.order.id, customerId, quantity, OrderStatus.Placed),
      occurredAt: now,
    });
  });

  it('is cancelled when placed', () => {
    const order = Order.restore(orderId, customerId, quantity, OrderStatus.Placed);

    expect(order.cancel(now)).toStrictEqual({
      ok: true,
      value: {
        type: 'OrderCancelled',
        order: Order.restore(orderId, customerId, quantity, OrderStatus.Cancelled),
        occurredAt: now,
      },
    });
  });

  it('rejects a second cancellation', () => {
    const order = Order.restore(orderId, customerId, quantity, OrderStatus.Cancelled);

    expect(order.cancel(now)).toStrictEqual({
      ok: false,
      error: { type: 'OrderAlreadyCancelled', orderId },
    });
  });
});
