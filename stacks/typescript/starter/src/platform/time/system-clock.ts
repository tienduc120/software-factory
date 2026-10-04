import { injectable } from 'inversify';
import type { Clock } from '../../shared/kernel/clock.ts';

@injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
