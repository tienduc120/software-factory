import { inject, injectable } from 'inversify';
import type { IntegrationEvent } from '../../shared/kernel/integration-event.ts';
import { Inbox } from './inbox.ts';

export type EventBus = {
  subscribe<E extends IntegrationEvent>(
    consumer: string,
    accepts: (event: IntegrationEvent) => event is E,
    handle: (event: E) => Promise<void>,
  ): void;
  publish(event: IntegrationEvent): Promise<void>;
};

export const EventBus = Symbol('EventBus');

export type ConsumerFailure = { readonly consumer: string; readonly cause: unknown };

export class EventDeliveryError extends Error {
  constructor(
    readonly eventId: string,
    readonly failures: readonly ConsumerFailure[],
  ) {
    super(`Event ${eventId} failed for consumers: ${failures.map((f) => f.consumer).join(', ')}`);
    this.name = 'EventDeliveryError';
  }
}

type Subscription = {
  readonly consumer: string;
  readonly accepts: (event: IntegrationEvent) => boolean;
  readonly deliver: (event: IntegrationEvent) => Promise<void>;
};

// Replaced by a message broker client when a context is extracted into its own service.
@injectable()
export class InProcessEventBus implements EventBus {
  private readonly subscriptions: Subscription[] = [];

  constructor(@inject(Inbox) private readonly inbox: Inbox) {}

  subscribe<E extends IntegrationEvent>(
    consumer: string,
    accepts: (event: IntegrationEvent) => event is E,
    handle: (event: E) => Promise<void>,
  ): void {
    this.subscriptions.push({
      consumer,
      accepts,
      deliver: (event) => (accepts(event) ? handle(event) : Promise.resolve()),
    });
  }

  /** Delivers to every interested consumer; failed consumers are retried on the next publish. */
  async publish(event: IntegrationEvent): Promise<void> {
    const failures: ConsumerFailure[] = [];
    for (const { consumer, accepts, deliver } of this.subscriptions) {
      if (!accepts(event) || (await this.inbox.hasProcessed(consumer, event.eventId))) continue;
      try {
        await deliver(event);
        await this.inbox.markProcessed(consumer, event.eventId);
      } catch (cause: unknown) {
        failures.push({ consumer, cause });
      }
    }
    if (failures.length > 0) throw new EventDeliveryError(event.eventId, failures);
  }
}
