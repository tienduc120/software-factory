import 'reflect-metadata';
import { Container } from 'inversify';
import { bindBillingModule, subscribeBillingModule } from './modules/billing/billing-module.ts';
import { bindOrderingModule } from './modules/ordering/ordering-module.ts';
import { bindPlatform } from './platform/platform-module.ts';

export function createContainer(): Container {
  const container = new Container();
  bindPlatform(container);
  bindOrderingModule(container);
  bindBillingModule(container);
  subscribeBillingModule(container);
  return container;
}
