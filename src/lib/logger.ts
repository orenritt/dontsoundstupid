import pino from "pino";

const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

const root = pino({
  level,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = pino.Logger;

export function createLogger(module: string, defaultBindings?: Record<string, unknown>): Logger {
  return root.child({ module, ...defaultBindings });
}

export function withUserId(logger: Logger, userId: string): Logger {
  return logger.child({ userId });
}

export function withRequestId(logger: Logger, requestId: string): Logger {
  return logger.child({ requestId });
}

export default root;
