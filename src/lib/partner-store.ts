import { getKv, isKvConfigured } from "./kv";

export function getPartnerRef(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 20) || "creator"
  );
}

const ALIAS_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateAlias(): string {
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += ALIAS_CHARS[Math.floor(Math.random() * ALIAS_CHARS.length)];
  }
  return result;
}

function aliasKey(alias: string): string {
  return `refAlias:${alias}`;
}

function reverseAliasKey(slug: string): string {
  return `refAliasRev:${slug}`;
}

export async function getOrCreateAlias(slug: string): Promise<string> {
  const client = getKv();
  if (!client) return slug;
  const existing = await client.get<string>(reverseAliasKey(slug));
  if (existing) return existing;
  let alias: string;
  for (let i = 0; i < 20; i++) {
    alias = generateAlias();
    const exists = await client.get<string>(aliasKey(alias));
    if (!exists) {
      await client.set(aliasKey(alias), slug);
      await client.set(reverseAliasKey(slug), alias);
      return alias;
    }
  }
  return slug;
}

export async function resolveAlias(alias: string): Promise<string | null> {
  const client = getKv();
  if (!client) return null;
  return client.get<string>(aliasKey(alias));
}

export interface ClickEvent {
  timestamp: number;
  ip: string;
  userAgent: string;
  referrerPage: string;
}

export interface SignupEvent {
  timestamp: number;
  email: string;
}

export interface CommissionEvent {
  id: string;
  userEmail: string;
  tier: "creator" | "pro" | "free";
  variantId: string;
  subId: string;
  eventName: string;
  timestamp: number;
  referralSlug?: string;
  amount: number;
  paid?: boolean;
}

export interface PartnerData {
  name: string;
  discountCode: string;
  createdAt: number;
  totalClicks: number;
  totalSignups: number;
  totalCommissions: number;
  totalEarned: number;
  clicks: ClickEvent[];
  signups: SignupEvent[];
  commissions: CommissionEvent[];
}

function emptyPartnerData(name: string, discountCode: string): PartnerData {
  return {
    name,
    discountCode,
    createdAt: Date.now(),
    totalClicks: 0,
    totalSignups: 0,
    totalCommissions: 0,
    totalEarned: 0,
    clicks: [],
    signups: [],
    commissions: [],
  };
}

function partnerKey(slug: string): string {
  return `partner:${slug}`;
}

const PARTNERS_SET_KEY = "partners:all";

// In-memory fallback for local dev without KV
const memStore = new Map<string, PartnerData>();
const memPartners = new Set<string>();

async function getPartner(slug: string): Promise<PartnerData | null> {
  const client = getKv();
  if (client) {
    return client.get<PartnerData>(partnerKey(slug));
  }
  return memStore.get(slug) || null;
}

async function getAllSlugsFromKv(): Promise<string[]> {
  const client = getKv();
  if (!client) return [...memPartners];
  const raw = await client.get<string[]>(PARTNERS_SET_KEY);
  return raw || [];
}

async function saveAllSlugsToKv(slugs: string[]): Promise<void> {
  const client = getKv();
  if (!client) return;
  await client.set(PARTNERS_SET_KEY, slugs);
}

async function setPartner(slug: string, data: PartnerData): Promise<void> {
  const client = getKv();
  if (client) {
    await client.set(partnerKey(slug), data);
    const slugs = await getAllSlugsFromKv();
    if (!slugs.includes(slug)) {
      slugs.push(slug);
      await saveAllSlugsToKv(slugs);
    }
    return;
  }
  memStore.set(slug, data);
  memPartners.add(slug);
}

export async function trackClick(
  slug: string,
  click: Omit<ClickEvent, "timestamp">,
): Promise<void> {
  const event: ClickEvent = { ...click, timestamp: Date.now() };
  const existing = await getPartner(slug);
  if (existing) {
    existing.totalClicks++;
    existing.clicks.push(event);
    if (existing.clicks.length > 1000) existing.clicks = existing.clicks.slice(-1000);
    await setPartner(slug, existing);
  } else {
    const data = emptyPartnerData(slug, `${slug.slice(0, 4).toUpperCase()}10`);
    data.totalClicks = 1;
    data.clicks.push(event);
    await setPartner(slug, data);
    await getOrCreateAlias(slug);
  }
}

export async function trackSignup(slug: string, email: string): Promise<void> {
  const event: SignupEvent = { timestamp: Date.now(), email };
  const existing = await getPartner(slug);
  if (existing) {
    existing.totalSignups++;
    existing.signups.push(event);
    if (existing.signups.length > 100) existing.signups = existing.signups.slice(-100);
    await setPartner(slug, existing);
  } else {
    const data = emptyPartnerData(slug, `${slug.slice(0, 4).toUpperCase()}10`);
    data.totalSignups = 1;
    data.signups.push(event);
    await setPartner(slug, data);
    await getOrCreateAlias(slug);
  }
}

export async function addCommissionEvent(event: CommissionEvent): Promise<void> {
  const slug = event.referralSlug;
  if (!slug) return;

  const existing = await getPartner(slug);
  if (existing) {
    existing.totalCommissions++;
    existing.totalEarned += event.amount;
    existing.commissions.push(event);
    if (existing.commissions.length > 100) existing.commissions = existing.commissions.slice(-100);
    await setPartner(slug, existing);
  } else {
    const data = emptyPartnerData(slug, `${slug.slice(0, 4).toUpperCase()}10`);
    data.totalCommissions = 1;
    data.totalEarned = event.amount;
    data.commissions.push(event);
    await setPartner(slug, data);
    await getOrCreateAlias(slug);
  }
}

export async function getPartnerAnalytics(slug: string): Promise<PartnerData | null> {
  return getPartner(slug);
}

export async function getAllPartnersSlugs(): Promise<string[]> {
  return getAllSlugsFromKv();
}

export async function getCommissionsForReferrer(slug: string): Promise<CommissionEvent[]> {
  const data = await getPartner(slug);
  return data?.commissions || [];
}

export async function getAllCommissions(): Promise<CommissionEvent[]> {
  const slugs = await getAllPartnersSlugs();
  const all: CommissionEvent[] = [];
  for (const slug of slugs) {
    const data = await getPartner(slug);
    if (data) all.push(...data.commissions);
  }
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export async function markCommissionsAsPaid(slug: string, ids: string[]): Promise<void> {
  const data = await getPartner(slug);
  if (!data) return;
  for (const c of data.commissions) {
    if (ids.includes(c.id)) {
      c.paid = true;
    }
  }
  await setPartner(slug, data);
}

export async function getTotalEarned(slug?: string): Promise<number> {
  if (slug) {
    const data = await getPartner(slug);
    return data?.totalEarned || 0;
  }
  const slugs = await getAllPartnersSlugs();
  let total = 0;
  for (const s of slugs) {
    const data = await getPartner(s);
    if (data) total += data.totalEarned;
  }
  return total;
}
