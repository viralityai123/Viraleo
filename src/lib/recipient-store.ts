import { getKv } from "./kv";

export interface RecipientData {
  wiseRecipientId?: number;
  accountHolderName: string;
  currency: string;
  type: string;
  details: Record<string, string>;
  createdAt: number;
}

function recipientKey(slug: string): string {
  return `recipient:${slug}`;
}

export async function setRecipient(slug: string, data: RecipientData): Promise<void> {
  const client = getKv();
  if (client) {
    const existing = await client.get<RecipientData>(recipientKey(slug));
    await client.set(recipientKey(slug), {
      ...existing,
      ...data,
      createdAt: existing?.createdAt || Date.now(),
    });
  }
}

export async function getRecipient(slug: string): Promise<RecipientData | null> {
  const client = getKv();
  if (!client) return null;
  return client.get<RecipientData>(recipientKey(slug));
}

export async function deleteRecipient(slug: string): Promise<void> {
  const client = getKv();
  if (client) {
    await client.del(recipientKey(slug));
  }
}
