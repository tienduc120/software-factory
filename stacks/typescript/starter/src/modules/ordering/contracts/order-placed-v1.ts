import type { IntegrationEvent } from '../../../shared/kernel/integration-event.ts';

export const ORDER_PLACED_V1 = 'ordering.order-placed.v1';

export type OrderPlacedV1 = IntegrationEvent & {
  readonly type: typeof ORDER_PLACED_V1;
  readonly orderId: string;
  readonly customerId: string;
  readonly quantity: number;
};

export function isOrderPlacedV1(event: IntegrationEvent): event is OrderPlacedV1 {
  return event.type === ORDER_PLACED_V1;
}
