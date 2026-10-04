import type { Container } from 'inversify';
import { EventBus } from '../../platform/messaging/event-bus.ts';
import { isOrderPlacedV1 } from '../ordering/contracts/order-placed-v1.ts';
import { FindInvoiceByOrderUseCase } from './application/find-invoice-by-order-use-case.ts';
import { IssueInvoiceUseCase } from './application/issue-invoice-use-case.ts';
import { InvoiceRepository } from './domain/invoice-repository.ts';
import {
  ORDER_PLACED_CONSUMER,
  OrderPlacedConsumer,
} from './infrastructure/acl/order-placed-consumer.ts';
import { InMemoryInvoiceRepository } from './infrastructure/persistence/in-memory-invoice-repository.ts';

export function bindBillingModule(container: Container): void {
  container
    .bind<InvoiceRepository>(InvoiceRepository)
    .to(InMemoryInvoiceRepository)
    .inSingletonScope();
  container.bind(IssueInvoiceUseCase).toSelf();
  container.bind(FindInvoiceByOrderUseCase).toSelf();
  container.bind(OrderPlacedConsumer).toSelf();
}

export function subscribeBillingModule(container: Container): void {
  const consumer = container.get(OrderPlacedConsumer);
  container
    .get<EventBus>(EventBus)
    .subscribe(ORDER_PLACED_CONSUMER, isOrderPlacedV1, (event) => consumer.handle(event));
}
