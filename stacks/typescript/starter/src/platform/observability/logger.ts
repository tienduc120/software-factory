import { pino } from 'pino';

export type LogContext = Readonly<Record<string, unknown>>;

export type Logger = {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
};

export const Logger = Symbol('Logger');

/** JSON logs to stdout; the platform ships them, so the app never writes log files. */
export function createLogger(level: string = process.env.LOG_LEVEL ?? 'info'): Logger {
  const base = pino({ level });
  return {
    info: (message, context = {}) => {
      base.info(context, message);
    },
    warn: (message, context = {}) => {
      base.warn(context, message);
    },
    error: (message, context = {}) => {
      base.error(context, message);
    },
  };
}
