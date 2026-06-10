import { getPartnerAnalytics, markCommissionsAsPaid, type PartnerData } from "./partner-store";
import { getAllPartnersSlugs } from "./partner-store";
import { createPayout, updatePayout, type PayoutRecord } from "./payout-store";
import { getRecipient, setRecipient, type RecipientData } from "./recipient-store";
import {
  getProfileId,
  createRecipient,
  createQuote,
  createTransfer,
  fundTransfer,
  getTransferStatus,
  isWiseConfigured,
} from "./wise";

export const COMMISSION_AMOUNTS = { creator: 10, pro: 25 } as const;
const PAYOUT_CURRENCY = "USD";

export function getUnpaidCommissions(data: PartnerData) {
  return data.commissions.filter((c) => !c.paid);
}

export function getPendingPayout(data: PartnerData): number {
  return getUnpaidCommissions(data).reduce((sum, c) => sum + c.amount, 0);
}

export interface PayoutResult {
  success: boolean;
  payoutId?: string;
  error?: string;
}

export async function processPartnerPayout(slug: string): Promise<PayoutResult> {
  if (!isWiseConfigured()) {
    return { success: false, error: "Wise API not configured" };
  }

  const [data, recipient] = await Promise.all([getPartnerAnalytics(slug), getRecipient(slug)]);

  if (!data) return { success: false, error: "Partner not found" };
  if (!recipient) return { success: false, error: "No bank details set up" };

  let wiseRecipientId = recipient.wiseRecipientId;
  if (!wiseRecipientId) {
    try {
      const wiseRecipient = await createRecipient({
        currency: recipient.currency,
        type: recipient.type,
        accountHolderName: recipient.accountHolderName,
        details: recipient.details,
      });
      wiseRecipientId = wiseRecipient.id;
      await setRecipient(slug, { ...recipient, wiseRecipientId });
    } catch (err: any) {
      return { success: false, error: `Failed to create Wise recipient: ${err.message}` };
    }
  }

  const unpaid = getUnpaidCommissions(data);
  if (unpaid.length === 0) return { success: false, error: "No pending commissions" };

  const totalAmount = unpaid.reduce((sum, c) => sum + c.amount, 0);
  const commissionIds = unpaid.map((c) => c.id);

  try {
    const profileId = await getProfileId();
    if (!profileId) return { success: false, error: "Could not determine Wise profile" };

    const quote = await createQuote({
      profileId,
      sourceCurrency: PAYOUT_CURRENCY,
      targetCurrency: recipient.currency || "INR",
      sourceAmount: totalAmount,
    });

    const customerTransactionId = crypto.randomUUID();

    const transfer = await createTransfer({
      recipientId: wiseRecipientId,
      quoteUuid: quote.id,
      customerTransactionId,
      reference: `Viraleo payout ${new Date().toISOString().slice(0, 10)}`,
    });

    const payoutId = await createPayout({
      partnerSlug: slug,
      amount: totalAmount,
      currency: PAYOUT_CURRENCY,
      wiseTransferId: transfer.id,
      quoteId: quote.id,
      recipientId: wiseRecipientId,
      status: "processing",
      commissionIds,
    });

    try {
      await fundTransfer({ profileId, transferId: transfer.id });
      await updatePayout(payoutId, { status: "completed", completedAt: Date.now() });
      await markCommissionsAsPaid(slug, commissionIds);
      return { success: true, payoutId };
    } catch (fundError: any) {
      await updatePayout(payoutId, {
        status: "pending",
        errorMessage: `Transfer created (${transfer.id}) but funding failed: ${fundError.message}`,
      });
      return { success: false, error: `Funding failed: ${fundError.message}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function processAllPartnerPayouts(): Promise<
  { slug: string; result: PayoutResult }[]
> {
  const slugs = await getAllPartnersSlugs();
  const results: { slug: string; result: PayoutResult }[] = [];
  for (const slug of slugs) {
    try {
      const result = await processPartnerPayout(slug);
      results.push({ slug, result });
    } catch (err: any) {
      results.push({ slug, result: { success: false, error: err.message } });
    }
  }
  return results;
}
