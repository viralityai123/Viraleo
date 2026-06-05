const LS_API = "https://api.lemonsqueezy.com/v1";

export function getLsHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
  };
}

export async function createCheckout(opts: {
  variantId: string;
  email: string;
  name: string;
  redirectUrl: string;
  referrer?: string;
}) {
  const custom: Record<string, string> = {};
  if (opts.referrer) custom.referrer = opts.referrer;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        product_options: { redirect_url: opts.redirectUrl },
        checkout_data: {
          email: opts.email,
          name: opts.name,
          custom,
        },
      },
      relationships: {
        store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } },
        variant: { data: { type: "variants", id: opts.variantId } },
      },
    },
  };

  const res = await fetch(`${LS_API}/checkouts`, {
    method: "POST",
    headers: getLsHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LemonSqueezy API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (!json.data?.attributes?.url) {
    throw new Error("LemonSqueezy returned unexpected response");
  }
  return {
    url: json.data.attributes.url as string,
    id: json.data.id as string,
  };
}

export async function getStoreStatus(): Promise<string | null> {
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  if (!storeId) return null;
  try {
    const res = await fetch(`${LS_API}/stores/${storeId}`, { headers: getLsHeaders() });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.attributes?.status || null;
  } catch {
    return null;
  }
}

export async function getSubscription(subId: string) {
  const res = await fetch(`${LS_API}/subscriptions/${subId}`, {
    headers: getLsHeaders(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LemonSqueezy API error ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (!json.data?.attributes) {
    throw new Error("LemonSqueezy returned unexpected response");
  }
  return json.data.attributes;
}
