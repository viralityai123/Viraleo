import "./lib/error-capture";

import serverEntry from "@tanstack/react-start/server-entry";
import { renderErrorPage } from "./lib/error-page";
import { startThreadsMonitor } from "./lib/threads/monitor";

startThreadsMonitor();

// Self-heartbeat: keeps Render's free tier awake (15 min idle sleep). The
// monitor loop runs in-process, so if the instance sleeps, lead catching stops.
const HEARTBEAT_URL = process.env.APP_URL;
if (HEARTBEAT_URL && process.env.VERCEL !== "1") {
  setInterval(() => {
    fetch(`${HEARTBEAT_URL}/`).catch(() => {});
  }, 10 * 60 * 1000);
}

const SECURITY_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  "referrer-policy": "strict-origin-when-cross-origin",
};

async function handler(request: Request): Promise<Response> {
  try {
    const response = await (serverEntry as { fetch: Function }).fetch(request, {}, {});
    if (response.status < 500) return response;
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return response;
    const body = await response.clone().text();
    if (body.includes('"unhandled"') && body.includes("HTTPError")) {
      return new Response(renderErrorPage(), {
        status: 500,
        headers: SECURITY_HEADERS,
      });
    }
    return response;
  } catch (error) {
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: SECURITY_HEADERS,
    });
  }
}

export { handler as fetch };
export default handler;
