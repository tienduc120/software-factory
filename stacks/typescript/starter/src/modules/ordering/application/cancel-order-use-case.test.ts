import { describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Order, OrderStatus } from '../domain/order.ts';
import { InMemoryOutbox } from '../../../platform/messaging/outbox.ts';
import { InMemoryOrderRepository } from '../infrastructure/persistence/in-memory-order-repository.ts';
import { CancelOrderUseCase } from './cancel-order-use-case.ts';

const now = new Date('2026-01-15T09:00:00Z');
const clock = { now: () => now };
const customerId = brand('5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40', 'CustomerId');
const quantity = brand(2, 'Quantity');

async function createRepositoryWithPlacedOrder() {
  const orders = new InMemoryOrderRepository(new InMemoryOutbox());
  const placed = Order.place(customerId, quantity, now);
  await orders.create(placed);
  return { orders, orderId: placed.order.id };
}

describe('CancelOrderUseCase', () => {
  it('cancels a placed order', async () => {
    const { orders, orderId } = await createRepositoryWithPlacedOrder();

    const result = await new CancelOrderUseCase(orders, clock).execute({ orderId });

    expect(result).toStrictEqual({ ok: true, value: { orderId, status: OrderStatus.Cancelled } });
    expect(await orders.findById(orderId)).toStrictEqual(
      Order.restore(orderId, customerId, quantity, OrderStatus.Cancelled),
    );
  });

  it('rejects cancelling twice', async () => {
    const { orders, orderId } = await createRepositoryWithPlacedOrder();
    const useCase = new CancelOrderUseCase(orders, clock);
    await useCase.execute({ orderId });

    const result = await useCase.execute({ orderId });

    expect(result).toStrictEqual({
      ok: false,
      error: { type: 'OrderAlreadyCancelled', orderId },
    });
  });

  it('reports an unknown order', async () => {
    const orderId = '0b9d6a8e-6f43-4c1e-9a52-3f2d8c7e1a10';
    const useCase = new CancelOrderUseCase(
      new InMemoryOrderRepository(new InMemoryOutbox()),
      clock,
    );

    const result = await useCase.execute({ orderId });

    expect(result).toStrictEqual({ ok: false, error: { type: 'OrderNotFound', orderId } });
  });

  it('rejects a malformed order id', async () => {
    const useCase = new CancelOrderUseCase(
      new InMemoryOrderRepository(new InMemoryOutbox()),
      clock,
    );

    const result = await useCase.execute({ orderId: '42' });

    expect(result).toStrictEqual({ ok: false, error: { type: 'InvalidOrderId', raw: '42' } });
  });
});
