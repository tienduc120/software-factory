import { inject, injectable } from 'inversify';
import { Logger } from '../../../../platform/observability/logger.ts';
import type { OrderPlacedV1 } from '../../../ordering/contracts/order-placed-v1.ts';
import { IssueInvoiceUseCase } from '../../application/issue-invoice-use-case.ts';

export const ORDER_PLACED_CONSUMER = 'billing.issue-invoice-on-order-placed';

/** Anti-corruption layer: translates ordering's published event into billing's own input. */
@injectable()
export class OrderPlacedConsumer {
  constructor(
    @inject(IssueInvoiceUseCase) private readonly issueInvoice: IssueInvoiceUseCase,
    @inject(Logger) private readonly logger: Logger,
  ) {}

  async handle(event: OrderPlacedV1): Promise<void> {
    const result = await this.issueInvoice.execute({
      orderId: event.orderId,
      customerId: event.customerId,
      units: event.quantity,
    });
    // Retrying can't repair invalid upstream data, so it is reported instead of thrown.
    if (!result.ok) {
      this.logger.error('Rejected order-placed event', {
        eventId: event.eventId,
        reason: result.error,
      });
    }
  }
}
