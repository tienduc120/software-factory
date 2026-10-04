import { injectable } from 'inversify';

export type Inbox = {
  hasProcessed(consumer: string, eventId: string): Promise<boolean>;
  markProcessed(consumer: string, eventId: string): Promise<void>;
};

export const Inbox = Symbol('Inbox');

// A database inbox records the event id in the same transaction as the consumer's changes.
@injectable()
export class InMemoryInbox implements Inbox {
  private readonly processed = new Set<string>();

  hasProcessed(consumer: string, eventId: string): Promise<boolean> {
    return Promise.resolve(this.processed.has(`${consumer}:${eventId}`));
  }

  markProcessed(consumer: string, eventId: string): Promise<void> {
    this.processed.add(`${consumer}:${eventId}`);
    return Promise.resolve();
  }
}
