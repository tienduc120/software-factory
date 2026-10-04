import type { Container } from 'inversify';
import { Clock } from '../shared/kernel/clock.ts';
import { EventBus, InProcessEventBus } from './messaging/event-bus.ts';
import { Inbox, InMemoryInbox } from './messaging/inbox.ts';
import { InMemoryOutbox, Outbox } from './messaging/outbox.ts';
import { OutboxDispatcher } from './messaging/outbox-dispatcher.ts';
import { createLogger, Logger } from './observability/logger.ts';
import { SystemClock } from './time/system-clock.ts';

export function bindPlatform(container: Container): void {
  container.bind<Clock>(Clock).to(SystemClock).inSingletonScope();
  container.bind<Logger>(Logger).toConstantValue(createLogger());
  container.bind<Outbox>(Outbox).to(InMemoryOutbox).inSingletonScope();
  container.bind<Inbox>(Inbox).to(InMemoryInbox).inSingletonScope();
  container.bind<EventBus>(EventBus).to(InProcessEventBus).inSingletonScope();
  container.bind(OutboxDispatcher).toSelf().inSingletonScope();
}
