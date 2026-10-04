import { describe, expect, it, vi } from 'vitest';
import type { IntegrationEvent } from '../../shared/kernel/integration-event.ts';
import { EventDeliveryError, InProcessEventBus } from './event-bus.ts';
import { InMemoryInbox } from './inbox.ts';

const event: IntegrationEvent = {
  type: 'test.thing-happened.v1',
  eventId: '6a1d1b7e-0f2a-4c3b-9d4e-5f6a7b8c9d0e',
  occurredAt: '2026-01-15T09:00:00.000Z',
};
const isThingHappened = (e: IntegrationEvent): e is IntegrationEvent =>
  e.type === 'test.thing-happened.v1';
const isOtherThing = (e: IntegrationEvent): e is IntegrationEvent => e.type === 'test.other.v1';

describe('InProcessEventBus', () => {
  it('delivers an event only to consumers that accept it', async () => {
    const bus = new InProcessEventBus(new InMemoryInbox());
    const interested = vi.fn((_event: IntegrationEvent) => Promise.resolve());
    const uninterested = vi.fn((_event: IntegrationEvent) => Promise.resolve());
    bus.subscribe('interested', isThingHappened, interested);
    bus.subscribe('uninterested', isOtherThing, uninterested);

    await bus.publish(event);

    expect(interested.mock.calls).toStrictEqual([[event]]);
    expect(uninterested.mock.calls).toStrictEqual([]);
  });

  it('skips a consumer that already processed the event', async () => {
    const bus = new InProcessEventBus(new InMemoryInbox());
    const handle = vi.fn((_event: IntegrationEvent) => Promise.resolve());
    bus.subscribe('consumer', isThingHappened, handle);

    await bus.publish(event);
    await bus.publish(event);

    expect(handle.mock.calls).toStrictEqual([[event]]);
  });

  it('reports a failed consumer without blocking the others, then retries only the failed one', async () => {
    const bus = new InProcessEventBus(new InMemoryInbox());
    const outage = new TypeError('downstream unavailable');
    const failing = vi
      .fn((_event: IntegrationEvent) => Promise.resolve())
      .mockRejectedValueOnce(outage);
    const healthy = vi.fn((_event: IntegrationEvent) => Promise.resolve());
    bus.subscribe('failing', isThingHappened, failing);
    bus.subscribe('healthy', isThingHappened, healthy);

    await expect(bus.publish(event)).rejects.toStrictEqual(
      new EventDeliveryError(event.eventId, [{ consumer: 'failing', cause: outage }]),
    );
    await bus.publish(event);

    expect(failing.mock.calls).toStrictEqual([[event], [event]]);
    expect(healthy.mock.calls).toStrictEqual([[event]]);
  });
});
