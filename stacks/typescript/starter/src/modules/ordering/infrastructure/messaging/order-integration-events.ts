import { ORDER_PLACED_V1, type OrderPlacedV1 } from '../../contracts/order-placed-v1.ts';
import type { OrderPlaced } from '../../domain/order-events.ts';

export function toOrderPlacedV1(event: OrderPlaced): OrderPlacedV1 {
  return {
    type: ORDER_PLACED_V1,
    eventId: crypto.randomUUID(),
    occurredAt: event.occurredAt.toISOString(),
    orderId: event.order.id,
    customerId: event.order.customerId,
    quantity: event.order.quantity,
  };
}
