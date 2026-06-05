const WISE_API = "https://api.wise.com";

function getApiKey(): string {
  const key = process.env.WISE_API_KEY;
  if (!key) throw new Error("WISE_API_KEY not configured");
  return key;
}

async function wiseFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getApiKey();
  const res = await fetch(`${WISE_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Wise API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getProfileId(): Promise<string> {
  const envProfile = process.env.WISE_PROFILE_ID;
  if (envProfile) return envProfile;
  const profiles: any[] = await wiseFetch("/v1/profiles");
  const business = profiles.find((p) => p.type === "business");
  return (business?.id || profiles[0]?.id)?.toString();
}

export interface RecipientInput {
  currency: string;
  type: string;
  accountHolderName: string;
  details: Record<string, string>;
}

export async function createRecipient(input: RecipientInput): Promise<{ id: number }> {
  return wiseFetch("/v1/accounts", {
    method: "POST",
    body: JSON.stringify({
      currency: input.currency,
      type: input.type,
      accountHolderName: input.accountHolderName,
      details: input.details,
      legalEntityType: "PRIVATE",
    }),
  });
}

export async function getRecipient(recipientId: number): Promise<any> {
  return wiseFetch(`/v1/accounts/${recipientId}`);
}

export async function createQuote(args: {
  profileId: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
}): Promise<{ id: string; rate: number; fee: number; sourceAmount: number; targetAmount: number }> {
  return wiseFetch(`/v3/profiles/${args.profileId}/quotes`, {
    method: "POST",
    body: JSON.stringify({
      sourceCurrency: args.sourceCurrency,
      targetCurrency: args.targetCurrency,
      sourceAmount: args.sourceAmount,
    }),
  });
}

export async function createTransfer(args: {
  recipientId: number;
  quoteUuid: string;
  customerTransactionId: string;
  reference: string;
}): Promise<{ id: number; status: string }> {
  return wiseFetch("/v1/transfers", {
    method: "POST",
    body: JSON.stringify({
      targetAccount: args.recipientId,
      quoteUuid: args.quoteUuid,
      customerTransactionId: args.customerTransactionId,
      details: { reference: args.reference },
    }),
  });
}

export async function fundTransfer(args: {
  profileId: string;
  transferId: number;
}): Promise<any> {
  return wiseFetch(`/v3/profiles/${args.profileId}/transfers/${args.transferId}/payments`, {
    method: "POST",
    body: JSON.stringify({ type: "BALANCE" }),
  });
}

export async function getTransferStatus(transferId: number): Promise<{ status: string }> {
  return wiseFetch(`/v1/transfers/${transferId}`);
}

export function isWiseConfigured(): boolean {
  return !!process.env.WISE_API_KEY;
}
