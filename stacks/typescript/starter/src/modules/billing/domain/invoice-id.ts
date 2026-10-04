import { brand, type Brand } from '../../../shared/kernel/brand.ts';

export type InvoiceId = Brand<string, 'InvoiceId'>;

export const InvoiceId = {
  generate: (): InvoiceId => brand(crypto.randomUUID(), 'InvoiceId'),
} as const;
