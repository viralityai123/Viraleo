import { createStart, createMiddleware, createCsrfMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const rateLimitMiddleware = createMiddleware().server(async ({ next, request }) => {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const url = new URL(request.url);
  const key = `${ip}:${url.pathname}`;
  const now = Date.now();
  const windowMs = 60_000;
  const max = 30;

  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL || "",
      token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
    });
    const raw = await redis.get<{ ts: number; count: number }>(`rl:${key}`);
    const entry = raw || { ts: now, count: 0 };
    if (now - entry.ts > windowMs) {
      entry.ts = now;
      entry.count = 0;
    }
    entry.count++;
    if (entry.count > max) {
      return new Response("Too many requests", { status: 429 });
    }
    await redis.set(`rl:${key}`, entry, { ex: Math.ceil(windowMs / 1000) });
  } catch {
    /* rate limiting unavailable — allow through */
  }

  return next();
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrfMiddleware, rateLimitMiddleware, errorMiddleware],
}));
