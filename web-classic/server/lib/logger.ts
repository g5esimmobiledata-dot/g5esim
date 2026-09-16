"use strict";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const levelEmoji = {
    debug: "🔍",
    info: "ℹ️",
    warn: "⚠️",
    error: "❌",
  };
  
  let formatted = `${timestamp} ${levelEmoji[level]} [${level.toUpperCase()}] ${message}`;
  
  if (context && Object.keys(context).length > 0) {
    formatted += ` ${JSON.stringify(context)}`;
  }
  
  return formatted;
}

function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const currentLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  return levels.indexOf(level) >= levels.indexOf(currentLevel);
}

export const logger: Logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      process.stdout.write(formatMessage("debug", message, context) + "\n");
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      process.stdout.write(formatMessage("info", message, context) + "\n");
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog("warn")) {
      process.stderr.write(formatMessage("warn", message, context) + "\n");
    }
  },

  error(message: string, context?: LogContext): void {
    if (shouldLog("error")) {
      process.stderr.write(formatMessage("error", message, context) + "\n");
    }
  },
};
