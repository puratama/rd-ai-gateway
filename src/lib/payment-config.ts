// Payment gateway config loader — reads from DB, not env vars
// Admin UI stores/edits config in PaymentGatewayConfig DB table.

import type { prisma } from "./db";

type PaymentProvider = "midtrans" | "xendit";

export interface PaymentConfig {
  serverKey: string;
  clientKey: string;
  environment: "sandbox" | "production";
  isActive: boolean;
}

/**
 * Load payment gateway configuration from DB.
 * Returns null if not found or inactive.
 */
export async function getPaymentConfig(
  provider: PaymentProvider
): Promise<PaymentConfig | null> {
  try {
    const { prisma: p } = await import("./db");

    const gateway = await (p as typeof prisma).paymentGatewayConfig.findFirst({
      where: { provider, isActive: true },
    });

    if (!gateway) return null;
    if (!gateway.serverKeyEnc && !gateway.clientKeyEnc) return null;

    return {
      serverKey: gateway.serverKeyEnc || "",
      clientKey: gateway.clientKeyEnc || "",
      environment: (gateway.environment as "sandbox" | "production") || "sandbox",
      isActive: gateway.isActive,
    };
  } catch {
    return null;
  }
}

/**
 * Get environment config for a provider (is production?).
 */
export async function getProviderEnvironment(
  provider: PaymentProvider
): Promise<boolean> {
  const config = await getPaymentConfig(provider);
  return config?.environment === "production";
}
