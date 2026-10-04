import { describe, expect, it, vi } from 'vitest';
import type { IntegrationEvent } from '../../shared/kernel/integration-event.ts';
import { EventDeliveryError, InProcessEventBus } from './event-bus.ts';
import { InMemoryInbox } from './inbox.ts';
import { InMemoryOutbox } from './outbox.ts';
import { MAX_DELIVERY_ATTEMPTS, OutboxDispatcher } from './outbox-dispatcher.ts';

const event: IntegrationEvent = {
  type: 'test.thing-happened.v1',
  eventId: '6a1d1b7e-0f2a-4c3b-9d4e-5f6a7b8c9d0e',
  occurredAt: '2026-01-15T09:00:00.000Z',
};
const isThingHappened = (e: IntegrationEvent): e is IntegrationEvent =>
  e.type === 'test.thing-happened.v1';
const FAR_FUTURE = new Date('2100-01-01T00:00:00Z');

async function createDispatcher(handle: (event: IntegrationEvent) => Promise<void>) {
  let current = new Date('2026-01-15T09:00:00Z');
  const clock = { now: () => current };
  const outbox = new InMemoryOutbox();
  const bus = new InProcessEventBus(new InMemoryInbox());
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  bus.subscribe('consumer', isThingHappened, handle);
  await outbox.append(event);
  return {
    dispatcher: new OutboxDispatcher(outbox, bus, clock, logger),
    outbox,
    logger,
    advanceClockMs: (ms: number) => {
      current = new Date(current.getTime() + ms);
    },
  };
}

describe('OutboxDispatcher', () => {
  it('publishes a due event once and marks it dispatched', async () => {
    const handle = vi.fn((_event: IntegrationEvent) => Promise.resolve());
    const { dispatcher, outbox } = await createDispatcher(handle);

    await dispatcher.dispatchDue();
    await dispatcher.dispatchDue();

    expect(handle.mock.calls).toStrictEqual([[event]]);
    expect(await outbox.listDue(FAR_FUTURE)).toStrictEqual([]);
  });

  it('waits for the backoff before retrying a failed event', async () => {
    const handle = vi
      .fn((_event: IntegrationEvent) => Promise.resolve())
      .mockRejectedValueOnce(new TypeError('downstream unavailable'));
    const { dispatcher, advanceClockMs } = await createDispatcher(handle);
    await dispatcher.dispatchDue();

    await dispatcher.dispatchDue();
    const callsBeforeBackoff = handle.mock.calls.length;
    advanceClockMs(1_000);
    await dispatcher.dispatchDue();

    expect({ callsBeforeBackoff, calls: handle.mock.calls }).toStrictEqual({
      callsBeforeBackoff: 1,
      calls: [[event], [event]],
    });
  });

  it('dead-letters an event after the last attempt and logs an error', async () => {
    const handle = vi.fn((_event: IntegrationEvent) =>
      Promise.reject(new TypeError('always failing')),
    );
    const { dispatcher, outbox, logger, advanceClockMs } = await createDispatcher(handle);

    for (let attempt = 1; attempt <= MAX_DELIVERY_ATTEMPTS + 1; attempt++) {
      await dispatcher.dispatchDue();
      advanceClockMs(60_000);
    }

    expect(handle.mock.calls).toStrictEqual(
      Array.from({ length: MAX_DELIVERY_ATTEMPTS }, () => [event]),
    );
    expect(await outbox.listDue(FAR_FUTURE)).toStrictEqual([]);
    expect(logger.error.mock.calls).toStrictEqual([
      [
        'Integration event dead-lettered',
        {
          eventId: event.eventId,
          eventType: event.type,
          attempts: MAX_DELIVERY_ATTEMPTS,
          err: expect.any(EventDeliveryError),
        },
      ],
    ]);
  });
});
