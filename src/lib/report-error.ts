import { createServerFn } from "@tanstack/react-start";
import { sendErrorReportEmail } from "@/lib/email";

export const reportErrorFn = createServerFn({ method: "POST" })
  .inputValidator((d: {
    errorId?: string;
    message?: string;
    stack?: string;
    url?: string;
    userAgent?: string;
  }) => d)
  .handler(async ({ data }) => {
    const {
      errorId = "unknown",
      message = "Unknown error",
      stack = "",
      url = "unknown",
      userAgent = "unknown",
    } = data;

    // Send email to viraleo.support@gmail.com
    sendErrorReportEmail(errorId, message, stack, url, userAgent).catch((e) =>
      console.warn("[report-error] email send failed:", e),
    );

    return { ok: true };
  });
