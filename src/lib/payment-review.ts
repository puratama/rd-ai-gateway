import { prisma } from "./db";
import { handlePaidBilling } from "./billing-fulfillment";

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

  const updated = await prisma.billingRecord.update({
    where: { id },
    data: {
      status: decision === "approve" ? "paid" : "failed",
      paidAt: decision === "approve" ? new Date() : billing.paidAt,
      verifiedAt: new Date(),
    },
  });

  if (decision === "approve") {
    await handlePaidBilling(updated);
  }

  return { status: updated.status };
}