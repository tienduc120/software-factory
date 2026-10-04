import type { OrderCancelled, OrderPlaced } from './order-events.ts';
import type { OrderId } from './order-id.ts';
import type { Order } from './order.ts';

export type OrderRepository = {
  findById(id: OrderId): Promise<Order | undefined>;
  create(event: OrderPlaced): Promise<void>;
  update(event: OrderCancelled): Promise<void>;
};

export const OrderRepository = Symbol('OrderRepository');
