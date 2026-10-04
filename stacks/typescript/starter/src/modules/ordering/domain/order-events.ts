import type { Order } from './order.ts';

export type OrderPlaced = {
  readonly type: 'OrderPlaced';
  readonly order: Order;
  readonly occurredAt: Date;
};

export type OrderCancelled = {
  readonly type: 'OrderCancelled';
  readonly order: Order;
  readonly occurredAt: Date;
};
