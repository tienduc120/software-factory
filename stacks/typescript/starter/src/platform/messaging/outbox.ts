import { injectable } from 'inversify';
import type { IntegrationEvent } from '../../shared/kernel/integration-event.ts';

export type OutboxEntry = {
  readonly event: IntegrationEvent;
  readonly attempts: number;
};

export type Outbox = {
  append(event: IntegrationEvent): Promise<void>;
  listDue(now: Date): Promise<readonly OutboxEntry[]>;
  markDispatched(eventId: string): Promise<void>;
  scheduleRetry(eventId: string, nextAttemptAt: Date): Promise<void>;
  markDeadLettered(eventId: string): Promise<void>;
};

export const Outbox = Symbol('Outbox');

const OutboxStatus = {
  Pending: 'pending',
  Dispatched: 'dispatched',
  DeadLettered: 'dead-lettered',
} as const;
type OutboxStatus = (typeof OutboxStatus)[keyof typeof OutboxStatus];

type OutboxRow = OutboxEntry & {
  readonly status: OutboxStatus;
  readonly nextAttemptAt: Date | undefined;
};

// Stand-in for an outbox table written in the same transaction as the aggregate.
@injectable()
export class InMemoryOutbox implements Outbox {
  private readonly rows = new Map<string, OutboxRow>();

  append(event: IntegrationEvent): Promise<void> {
    this.rows.set(event.eventId, {
      event,
      attempts: 0,
      status: OutboxStatus.Pending,
      nextAttemptAt: undefined,
    });
    return Promise.resolve();
  }

  listDue(now: Date): Promise<readonly OutboxEntry[]> {
    const due = [...this.rows.values()].filter(
      (row) =>
        row.status === OutboxStatus.Pending &&
        (row.nextAttemptAt === undefined || row.nextAttemptAt <= now),
    );
    return Promise.resolve(due.map(({ event, attempts }) => ({ event, attempts })));
  }

  markDispatched(eventId: string): Promise<void> {
    return this.updateRow(eventId, (row) => ({ ...row, status: OutboxStatus.Dispatched }));
  }

  scheduleRetry(eventId: string, nextAttemptAt: Date): Promise<void> {
    return this.updateRow(eventId, (row) => ({
      ...row,
      attempts: row.attempts + 1,
      nextAttemptAt,
    }));
  }

  markDeadLettered(eventId: string): Promise<void> {
    return this.updateRow(eventId, (row) => ({
      ...row,
      attempts: row.attempts + 1,
      status: OutboxStatus.DeadLettered,
    }));
  }

  private updateRow(eventId: string, change: (row: OutboxRow) => OutboxRow): Promise<void> {
    const row = this.rows.get(eventId);
    if (row !== undefined) this.rows.set(eventId, change(row));
    return Promise.resolve();
  }
}
