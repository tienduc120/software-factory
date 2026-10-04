import { inject, injectable } from 'inversify';
import { Clock } from '../../shared/kernel/clock.ts';
import type { IntegrationEvent } from '../../shared/kernel/integration-event.ts';
import { Logger } from '../observability/logger.ts';
import { EventBus } from './event-bus.ts';
import { Outbox } from './outbox.ts';

export const MAX_DELIVERY_ATTEMPTS = 5;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 60_000;

/** Run on a schedule (every second or so) by a job runner. */
@injectable()
export class OutboxDispatcher {
  constructor(
    @inject(Outbox) private readonly outbox: Outbox,
    @inject(EventBus) private readonly bus: EventBus,
    @inject(Clock) private readonly clock: Clock,
    @inject(Logger) private readonly logger: Logger,
  ) {}

  async dispatchDue(): Promise<void> {
    for (const { event, attempts } of await this.outbox.listDue(this.clock.now())) {
      try {
        await this.bus.publish(event);
        await this.outbox.markDispatched(event.eventId);
      } catch (error: unknown) {
        await this.recordFailure(event, attempts + 1, error);
      }
    }
  }

  private async recordFailure(
    event: IntegrationEvent,
    attempts: number,
    error: unknown,
  ): Promise<void> {
    const context = { eventId: event.eventId, eventType: event.type, attempts, err: error };
    if (attempts >= MAX_DELIVERY_ATTEMPTS) {
      await this.outbox.markDeadLettered(event.eventId);
      this.logger.error('Integration event dead-lettered', context);
      return;
    }
    const delayMs = Math.min(BASE_RETRY_DELAY_MS * 2 ** (attempts - 1), MAX_RETRY_DELAY_MS);
    await this.outbox.scheduleRetry(event.eventId, new Date(this.clock.now().getTime() + delayMs));
    this.logger.warn('Integration event delivery failed; retry scheduled', { ...context, delayMs });
  }
}
