import { prisma } from "../db";

// ====== Billing ======

export async function createBillingRecord(data: {
  userId: string;
  type: string;
  amount: number;
  status?: string;
  midtransOrderId?: string;
  planId?: string;
  description?: string;
}) {
  return prisma.billingRecord.create({ data: { ...data, status: data.status || "pending" } });
}

/**
 * Atomic transition to "paid" — succeeds (returns true) for exactly one caller
 * even under concurrent webhook/confirm races. Use as the fulfill ticket:
 * only call handlePaidBilling when this returns true.
 */
export async function markBillingPaidOnce(
  key: { id: string } | { midtransOrderId: string }
): Promise<boolean> {
  const res = await prisma.billingRecord.updateMany({
    where: { ...key, status: { not: "paid" } },
    data: { status: "paid", paidAt: new Date() },
  });
  return res.count === 1;
}

export async function updateBillingStatus(orderId: string, status: string) {
  return prisma.billingRecord.update({
    where: { midtransOrderId: orderId },
    data: { status, paidAt: status === "paid" ? new Date() : undefined },
  });
}

export async function getBillingByOrderId(orderId: string) {
  return prisma.billingRecord.findUnique({ where: { midtransOrderId: orderId } });
}

export const getBillingRecord = getBillingByOrderId;
