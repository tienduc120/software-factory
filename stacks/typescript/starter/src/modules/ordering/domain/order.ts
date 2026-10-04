import { err, ok, type Result } from '../../../shared/kernel/result.ts';
import type { CustomerId } from './customer-id.ts';
import type { OrderCancelled, OrderPlaced } from './order-events.ts';
import { OrderId } from './order-id.ts';
import type { Quantity } from './quantity.ts';

export const OrderStatus = { Placed: 'placed', Cancelled: 'cancelled' } as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export type OrderAlreadyCancelled = {
  readonly type: 'OrderAlreadyCancelled';
  readonly orderId: OrderId;
};

export class Order {
  declare private readonly brand: 'Order';

  private constructor(
    readonly id: OrderId,
    readonly customerId: CustomerId,
    readonly quantity: Quantity,
    readonly status: OrderStatus,
  ) {}

  static place(customerId: CustomerId, quantity: Quantity, now: Date): OrderPlaced {
    return {
      type: 'OrderPlaced',
      order: new Order(OrderId.generate(), customerId, quantity, OrderStatus.Placed),
      occurredAt: now,
    };
  }

  static restore(
    id: OrderId,
    customerId: CustomerId,
    quantity: Quantity,
    status: OrderStatus,
  ): Order {
    return new Order(id, customerId, quantity, status);
  }

  cancel(now: Date): Result<OrderCancelled, OrderAlreadyCancelled> {
    if (this.status === OrderStatus.Cancelled) {
      return err({ type: 'OrderAlreadyCancelled', orderId: this.id });
    }
    return ok({
      type: 'OrderCancelled',
      order: new Order(this.id, this.customerId, this.quantity, OrderStatus.Cancelled),
      occurredAt: now,
    });
  }
}
