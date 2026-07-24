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
