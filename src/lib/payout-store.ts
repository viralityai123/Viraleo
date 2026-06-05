import { getKv } from "./kv";

export interface PayoutRecord {
  id: string;
  partnerSlug: string;
  amount: number;
  currency: string;
  wiseTransferId?: number;
  quoteId?: string;
  recipientId?: number;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  errorMessage?: string;
  commissionIds: string[];
}

function payoutKey(id: string): string {
  return `payout:${id}`;
}

const ALL_PAYOUTS_KEY = "payouts:all";

export async function createPayout(data: Omit<PayoutRecord, "id" | "createdAt">): Promise<string> {
  const client = getKv();
  const id = `po_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: PayoutRecord = { ...data, id, createdAt: Date.now() };
  if (client) {
    await client.set(payoutKey(id), record);
    const all = (await client.get<string[]>(ALL_PAYOUTS_KEY)) || [];
    all.push(id);
    await client.set(ALL_PAYOUTS_KEY, all);
  }
  return id;
}

export async function updatePayout(id: string, updates: Partial<PayoutRecord>): Promise<void> {
  const client = getKv();
  if (!client) return;
  const existing = await client.get<PayoutRecord>(payoutKey(id));
  if (!existing) return;
  await client.set(payoutKey(id), { ...existing, ...updates });
}

export async function getPayout(id: string): Promise<PayoutRecord | null> {
  const client = getKv();
  if (!client) return null;
  return client.get<PayoutRecord>(payoutKey(id));
}

export async function getPayoutsForPartner(slug: string): Promise<PayoutRecord[]> {
  const client = getKv();
  if (!client) return [];
  const all = (await client.get<string[]>(ALL_PAYOUTS_KEY)) || [];
  const payouts: PayoutRecord[] = [];
  for (const id of all) {
    const p = await client.get<PayoutRecord>(payoutKey(id));
    if (p && p.partnerSlug === slug) payouts.push(p);
  }
  return payouts.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAllPayouts(): Promise<PayoutRecord[]> {
  const client = getKv();
  if (!client) return [];
  const all = (await client.get<string[]>(ALL_PAYOUTS_KEY)) || [];
  const payouts: PayoutRecord[] = [];
  for (const id of all) {
    const p = await client.get<PayoutRecord>(payoutKey(id));
    if (p) payouts.push(p);
  }
  return payouts.sort((a, b) => b.createdAt - a.createdAt);
}
