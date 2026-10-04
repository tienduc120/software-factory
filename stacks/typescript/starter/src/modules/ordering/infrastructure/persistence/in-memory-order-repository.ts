import { inject, injectable } from 'inversify';
import { Outbox } from '../../../../platform/messaging/outbox.ts';
import type { OrderCancelled, OrderPlaced } from '../../domain/order-events.ts';
import type { OrderId } from '../../domain/order-id.ts';
import type { OrderRepository } from '../../domain/order-repository.ts';
import type { Order } from '../../domain/order.ts';
import { toOrderPlacedV1 } from '../messaging/order-integration-events.ts';

// Stand-in until a database adapter exists, which writes the row and the outbox entry in one transaction.
@injectable()
export class InMemoryOrderRepository implements OrderRepository {
  private readonly rows = new Map<OrderId, Order>();

  constructor(@inject(Outbox) private readonly outbox: Outbox) {}

  findById(id: OrderId): Promise<Order | undefined> {
    return Promise.resolve(this.rows.get(id));
  }

  async create(event: OrderPlaced): Promise<void> {
    this.rows.set(event.order.id, event.order);
    await this.outbox.append(toOrderPlacedV1(event));
  }

  update(event: OrderCancelled): Promise<void> {
    this.rows.set(event.order.id, event.order);
    return Promise.resolve();
  }
}
