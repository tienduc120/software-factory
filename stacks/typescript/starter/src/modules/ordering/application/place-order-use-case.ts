import { inject, injectable } from 'inversify';
import { Clock } from '../../../shared/kernel/clock.ts';
import { ok, type Result } from '../../../shared/kernel/result.ts';
import { CustomerId, type InvalidCustomerId } from '../domain/customer-id.ts';
import { OrderRepository } from '../domain/order-repository.ts';
import { Order } from '../domain/order.ts';
import { Quantity, type InvalidQuantity } from '../domain/quantity.ts';

export type PlaceOrderInput = { readonly customerId: string; readonly quantity: number };
export type PlaceOrderOutput = { readonly orderId: string };
export type PlaceOrderError = InvalidCustomerId | InvalidQuantity;

@injectable()
export class PlaceOrderUseCase {
  constructor(
    @inject(OrderRepository) private readonly orders: OrderRepository,
    @inject(Clock) private readonly clock: Clock,
  ) {}

  async execute(input: PlaceOrderInput): Promise<Result<PlaceOrderOutput, PlaceOrderError>> {
    const customerId = CustomerId.parse(input.customerId);
    if (!customerId.ok) return customerId;
    const quantity = Quantity.parse(input.quantity);
    if (!quantity.ok) return quantity;

    const placed = Order.place(customerId.value, quantity.value, this.clock.now());
    await this.orders.create(placed);
    return ok({ orderId: placed.order.id });
  }
}
