import type { Container } from 'inversify';
import { CancelOrderUseCase } from './application/cancel-order-use-case.ts';
import { PlaceOrderUseCase } from './application/place-order-use-case.ts';
import { OrderRepository } from './domain/order-repository.ts';
import { InMemoryOrderRepository } from './infrastructure/persistence/in-memory-order-repository.ts';

export function bindOrderingModule(container: Container): void {
  container.bind<OrderRepository>(OrderRepository).to(InMemoryOrderRepository).inSingletonScope();
  container.bind(PlaceOrderUseCase).toSelf();
  container.bind(CancelOrderUseCase).toSelf();
}
