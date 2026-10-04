import { assert, describe, expect, it } from 'vitest';
import { brand } from '../../../shared/kernel/brand.ts';
import { Order, OrderStatus } from '../domain/order.ts';
import { InMemoryOutbox } from '../../../platform/messaging/outbox.ts';
import { InMemoryOrderRepository } from '../infrastructure/persistence/in-memory-order-repository.ts';
import { PlaceOrderUseCase } from './place-order-use-case.ts';

const customerId = '5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40';
const clock = { now: () => new Date('2026-01-15T09:00:00Z') };

describe('PlaceOrderUseCase', () => {
  it('stores a placed order', async () => {
    const orders = new InMemoryOrderRepository(new InMemoryOutbox());

    const result = await new PlaceOrderUseCase(orders, clock).execute({ customerId, quantity: 2 });

    assert(result.ok);
    const orderId = brand(result.value.orderId, 'OrderId');
    expect(await orders.findById(orderId)).toStrictEqual(
      Order.restore(
        orderId,
        brand(customerId, 'CustomerId'),
        brand(2, 'Quantity'),
        OrderStatus.Placed,
      ),
    );
  });

  it('rejects an invalid quantity', async () => {
    const orders = new InMemoryOrderRepository(new InMemoryOutbox());

    const result = await new PlaceOrderUseCase(orders, clock).execute({ customerId, quantity: 0 });

    expect(result).toStrictEqual({ ok: false, error: { type: 'InvalidQuantity', raw: 0 } });
  });

  it('rejects an invalid customer id', async () => {
    const useCase = new PlaceOrderUseCase(new InMemoryOrderRepository(new InMemoryOutbox()), clock);

    const result = await useCase.execute({ customerId: 'not-a-uuid', quantity: 2 });

    expect(result).toStrictEqual({
      ok: false,
      error: { type: 'InvalidCustomerId', raw: 'not-a-uuid' },
    });
  });
});
