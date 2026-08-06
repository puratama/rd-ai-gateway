// Barrel re-export — domain logic lives in src/lib/db/*.ts
// All existing imports from "@/lib/server-store" keep working without changes.

export { generateId, loadServerKeys, validateServerKey, createServerKey, revokeServerKey, deleteServerKey, updateServerKeyUsage } from "./db/api-keys";
export { loadServerUsageRecords, addServerUsageRecord, getServerUsageSummary } from "./db/usage";
export type { BillingPeriod, MembershipPlan } from "./db/plans";
export { loadPlans, getPlan, createPlan, updatePlan, deletePlan } from "./db/plans";
export { getWallet, topupWallet, deductWallet } from "./db/wallet";
export { createBillingRecord, updateBillingStatus, getBillingByOrderId, getBillingRecord } from "./db/billing";
export { checkRateLimit, checkModelAccess, loadAppModels, updateAppModel, upsertAppModel } from "./db/quota";
export { getAggregatorConfig, updateAggregatorConfig, getAdminStats } from "./db/admin";
export { loadAnnouncements, loadActiveAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from "./db/announcements";
export type { AnnouncementItem } from "./db/announcements";
export { loadUserTickets, loadTicket, loadAdminTickets, createTicket, replyAsUser, replyAsAdmin, updateTicketStatus } from "./db/support";
export type { SupportTicket, SupportMessage } from "./db/support";
