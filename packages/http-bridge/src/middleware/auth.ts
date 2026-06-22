export function authMiddleware(apiKey: string) {
  return async (c: any, next: any) => {
    const key = c.req.header("x-api-key");
    if (key !== apiKey) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  };
}
