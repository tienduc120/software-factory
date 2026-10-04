import { assert, describe, expect, it } from 'vitest';
import { createContainer } from './main.ts';
import { FindInvoiceByOrderUseCase } from './modules/billing/application/find-invoice-by-order-use-case.ts';
import { CancelOrderUseCase } from './modules/ordering/application/cancel-order-use-case.ts';
import { PlaceOrderUseCase } from './modules/ordering/application/place-order-use-case.ts';
import { OutboxDispatcher } from './platform/messaging/outbox-dispatcher.ts';

const customerId = '5c2e4f1a-8b7d-4e3c-a1f0-9d8e7c6b5a40';

async function placeOrder(container: ReturnType<typeof createContainer>, quantity: number) {
  const placed = await container.get(PlaceOrderUseCase).execute({ customerId, quantity });
  assert(placed.ok);
  return placed.value.orderId;
}

describe('createContainer', () => {
  it('bills a placed order once its events are dispatched', async () => {
    const container = createContainer();
    const orderId = await placeOrder(container, 3);

    await container.get(OutboxDispatcher).dispatchDue();

    expect(await container.get(FindInvoiceByOrderUseCase).execute({ orderId })).toStrictEqual({
      ok: true,
      value: { invoiceId: expect.any(String), orderId, amountCents: 4_500, currency: 'USD' },
    });
  });

  it('bills nothing until events are dispatched', async () => {
    const container = createContainer();
    const orderId = await placeOrder(container, 1);

    const result = await container.get(FindInvoiceByOrderUseCase).execute({ orderId });

    expect(result).toStrictEqual({ ok: false, error: { type: 'InvoiceNotFound', orderId } });
  });

  it('wires ordering use cases to one shared repository', async () => {
    const container = createContainer();
    const orderId = await placeOrder(container, 1);

    const cancelled = await container.get(CancelOrderUseCase).execute({ orderId });

    expect(cancelled).toStrictEqual({ ok: true, value: { orderId, status: 'cancelled' } });
  });
});
