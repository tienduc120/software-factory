import { inject, injectable } from 'inversify';
import { Clock } from '../../../shared/kernel/clock.ts';
import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import { OrderId, type InvalidOrderId } from '../domain/order-id.ts';
import { OrderRepository } from '../domain/order-repository.ts';
import type { OrderAlreadyCancelled, OrderStatus } from '../domain/order.ts';

export type CancelOrderInput = { readonly orderId: string };
export type CancelOrderOutput = { readonly orderId: string; readonly status: OrderStatus };
export type OrderNotFound = { readonly type: 'OrderNotFound'; readonly orderId: OrderId };
export type CancelOrderError = InvalidOrderId | OrderNotFound | OrderAlreadyCancelled;

@injectable()
export class CancelOrderUseCase {
  constructor(
    @inject(OrderRepository) private readonly orders: OrderRepository,
    @inject(Clock) private readonly clock: Clock,
  ) {}

  async execute(input: CancelOrderInput): Promise<Result<CancelOrderOutput, CancelOrderError>> {
    const orderId = OrderId.parse(input.orderId);
    if (!orderId.ok) return orderId;
    const order = await this.orders.findById(orderId.value);
    if (order === undefined) return err({ type: 'OrderNotFound', orderId: orderId.value });

    const cancelled = order.cancel(this.clock.now());
    if (!cancelled.ok) return cancelled;
    await this.orders.update(cancelled.value);
    return ok({ orderId: order.id, status: cancelled.value.order.status });
  }
}
