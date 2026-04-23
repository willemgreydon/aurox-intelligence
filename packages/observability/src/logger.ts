export function createLogger(scope: string) {
  return {
    info: (message: string, meta?: unknown) => console.log(scope, message, meta),
    error: (message: string, meta?: unknown) => console.error(scope, message, meta),
  };
}
