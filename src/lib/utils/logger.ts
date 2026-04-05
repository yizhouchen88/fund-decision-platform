type LogLevel = "info" | "warn" | "error";

export function log(level: LogLevel, scope: string, message: string, details?: unknown) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    details
  };

  const serialized = JSON.stringify(payload);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}
