import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api/lemon/portal")({
  component: () => null,
  loader: async () => {
    // LemonSqueezy doesn't have a built-in customer portal like Stripe.
    // Redirect to the LemonSqueezy billing page or contact support.
    const storeId = process.env.LEMONSQUEEZY_STORE_ID || "";
    if (storeId) {
      throw redirect({ href: `https://app.lemonsqueezy.com/my-orders?store=${storeId}` });
    }
    throw redirect({ to: "/" });
  },
});
