import { defineEventHandler, readRawBody, getHeader, createError } from "h3";
import { createHmac, timingSafeEqual } from "node:crypto";
import { addCommissionEvent } from "../../../../src/lib/partner-store";
import { saveUserPlan } from "../../../../src/lib/user-plan";

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(rawBody, "utf8");
  const expected = hmac.digest("hex");
  if (signature.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export default defineEventHandler(async (event) => {
  const rawBody = (await readRawBody(event, "utf8")) || "";
  const signature = getHeader(event, "x-signature") || "";

  console.log(
    `[Webhook] Called | body: ${rawBody.length} bytes | sig: ${signature ? "present" : "missing"}`,
  );

  if (!signature) {
    console.log("[Webhook] Missing signature");
    throw createError({ statusCode: 401, statusMessage: "Missing signature" });
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
  if (!secret) {
    console.log("[Webhook] No secret configured");
    throw createError({ statusCode: 500, statusMessage: "Server misconfigured" });
  }

  if (!verifySignature(rawBody, signature, secret)) {
    console.log("[Webhook] Invalid signature");
    throw createError({ statusCode: 401, statusMessage: "Invalid signature" });
  }

  console.log("[Webhook] Signature valid");

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch {
    console.log("[Webhook] Invalid JSON");
    throw createError({ statusCode: 400, statusMessage: "Invalid JSON body" });
  }

  const eventName = eventData.meta?.event_name;
  console.log(`[Webhook] Event: ${eventName}`);

  if (eventName === "order_created" || eventName === "subscription_created") {
    const customData = eventData.meta?.custom_data || {};
    const referrer = customData.referrer || "";
    const attributes = eventData.data?.attributes;
    const userEmail = attributes?.user_email || attributes?.customer_email || "";
    const variantId = attributes?.variant_id?.toString() || "";
    const subId = eventData.data?.id?.toString() || "";

    const creatorVariant = process.env.LEMONSQUEEZY_VARIANT_CREATOR || "";
    const proVariant = process.env.LEMONSQUEEZY_VARIANT_PRO || "";
    const tier =
      variantId === creatorVariant ? "creator" : variantId === proVariant ? "pro" : "free";
    const amount = tier === "pro" ? 25 : tier === "creator" ? 10 : 0;

    console.log(
      `[Webhook] Recording: email=${userEmail} tier=${tier} variant=${variantId} ref=${referrer} amount=${amount}`,
    );

    await addCommissionEvent({
      id: subId || `${Date.now()}`,
      userEmail,
      tier,
      variantId,
      subId,
      eventName,
      timestamp: Date.now(),
      referralSlug: referrer,
      amount,
    });

    console.log("[Webhook] Commission recorded");

    if (userEmail && tier !== "free") {
      await saveUserPlan(userEmail, tier as any);
      console.log(`[Webhook] Plan saved: ${userEmail} → ${tier}`);
    }
  } else {
    console.log(`[Webhook] Ignored event: ${eventName}`);
  }

  return "OK";
});
