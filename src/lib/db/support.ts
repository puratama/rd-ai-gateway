import { prisma } from "../db";
import { Prisma } from "@prisma/client";

export interface SupportMessage {
  authorRole: "user" | "admin";
  body: string;
  createdAt: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  messages: SupportMessage[];
  createdAt: number;
  updatedAt: number;
  userEmail?: string;
  userName?: string | null;
}

export function mapSupportTicket(
  t: {
    id: string;
    userId: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    messages: unknown;
    createdAt: Date;
    updatedAt: Date;
    user?: { email: string; name: string | null } | null;
  }
): SupportTicket {
  return {
    id: t.id,
    userId: t.userId,
    subject: t.subject,
    category: t.category,
    priority: t.priority,
    status: t.status,
    messages: Array.isArray(t.messages) ? (t.messages as SupportMessage[]) : [],
    createdAt: t.createdAt.getTime(),
    updatedAt: t.updatedAt.getTime(),
    userEmail: t.user?.email,
    userName: t.user?.name,
  };
}

export async function loadUserTickets(userId: string) {
  const rows = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapSupportTicket);
}

export async function loadTicket(id: string) {
  const row = await prisma.supportTicket.findUnique({ where: { id } });
  return row ? mapSupportTicket(row) : null;
}

export async function loadAdminTickets() {
  const rows = await prisma.supportTicket.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { email: true, name: true } } },
  });
  return rows.map(mapSupportTicket);
}

export async function createTicket(data: {
  userId: string;
  subject: string;
  category: string;
  priority: string;
  body: string;
}) {
  const row = await prisma.supportTicket.create({
    data: {
      userId: data.userId,
      subject: data.subject,
      category: data.category,
      priority: data.priority,
      messages: [
        { authorRole: "user", body: data.body, createdAt: Date.now() },
      ] as unknown as Prisma.InputJsonValue,
    },
  });
  return mapSupportTicket(row);
}

async function appendMessage(id: string, message: SupportMessage) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return null;
  const messages = Array.isArray(ticket.messages) ? (ticket.messages as unknown as SupportMessage[]) : [];
  const row = await prisma.supportTicket.update({
    where: { id },
    data: { messages: [...messages, message] as unknown as Prisma.InputJsonValue },
  });
  return mapSupportTicket(row);
}

export async function replyAsUser(id: string, body: string) {
  const ticket = await appendMessage(id, { authorRole: "user", body, createdAt: Date.now() });
  // auto-reopen: user replied to a resolved ticket
  if (ticket && ticket.status === "resolved") {
    await prisma.supportTicket.update({ where: { id }, data: { status: "in_progress" } });
    ticket.status = "in_progress";
  }
  return ticket;
}

export async function replyAsAdmin(id: string, body: string) {
  const ticket = await appendMessage(id, { authorRole: "admin", body, createdAt: Date.now() });
  if (ticket && ticket.status === "open") {
    await prisma.supportTicket.update({ where: { id }, data: { status: "in_progress" } });
    ticket.status = "in_progress";
  }
  return ticket;
}

export async function updateTicketStatus(id: string, status: string) {
  const row = await prisma.supportTicket.update({ where: { id }, data: { status } });
  return mapSupportTicket(row);
}
