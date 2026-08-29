import { prisma } from "./db";
import { handlePaidBilling } from "./billing-fulfillment";
import { markBillingPaidOnce } from "./db/billing";

export type ReviewDecision = "approve" | "reject";

export class ReviewError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ReviewError";
  }
}

/**
 * Shared approval/rejection logic for manual (QRIS) payment verification.
 * Used both by the admin page route and the Telegram bot so both paths
 * behave identically. Idempotent: only pending_confirmation can be reviewed.
 */
export async function reviewBillingPayment(
  id: string,
  decision: ReviewDecision
): Promise<{ status: string }> {
  const billing = await prisma.billingRecord.findUnique({ where: { id } });
  if (!billing) {
    throw new ReviewError("Billing record not found", 404);
  }
  if (billing.status !== "pending_confirmation") {
    throw new ReviewError("Only pending_confirmation payments can be reviewed", 409);
  }

  if (decision === "approve") {
    // Atomic paid transition — fulfills exactly once across review/webhook races
    const marked = await markBillingPaidOnce({ id });
    await prisma.billingRecord.update({
      where: { id },
      data: { verifiedAt: new Date() },
    });
    if (marked) {
      await handlePaidBilling(billing);
    }
    return { status: "paid" };
  }

  await prisma.billingRecord.update({
    where: { id },
    data: { status: "failed", verifiedAt: new Date() },
  });

  return { status: "failed" };
}