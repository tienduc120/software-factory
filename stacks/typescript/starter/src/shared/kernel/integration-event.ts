/** The envelope every integration event carries; payload fields sit beside these. */
export type IntegrationEvent = {
  readonly type: string;
  readonly eventId: string;
  readonly occurredAt: string;
};
