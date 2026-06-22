export function errorHandler(c: any, next: any) {
  return next().catch((err: Error) => {
    console.error(`[http-bridge:error]`, err.message);
    return c.json({ error: err.message }, 500);
  });
}
