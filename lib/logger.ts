type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      data,
      timestamp: new Date().toISOString(),
    };

    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.context}]`;

    switch (level) {
      case "error":
        console.error(prefix, message, data || "");
        break;
      case "warn":
        console.warn(prefix, message, data || "");
        break;
      case "info":
        console.info(prefix, message, data || "");
        break;
      case "debug":
        if (process.env.NODE_ENV === "development") {
          console.debug(prefix, message, data || "");
        }
        break;
    }
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>) {
    this.log("error", message, data);
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
