import { prisma } from "../db";

export interface AnnouncementItem {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

function mapAnnouncement(a: {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): AnnouncementItem {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    isActive: a.isActive,
    createdAt: a.createdAt.getTime(),
    updatedAt: a.updatedAt.getTime(),
  };
}

export async function loadAnnouncements() {
  const rows = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(mapAnnouncement);
}

export async function loadActiveAnnouncements() {
  const rows = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(mapAnnouncement);
}

export async function createAnnouncement(data: { title: string; description: string }) {
  const row = await prisma.announcement.create({ data });
  return mapAnnouncement(row);
}

export async function updateAnnouncement(id: string, data: { title?: string; description?: string; isActive?: boolean }) {
  const row = await prisma.announcement.update({ where: { id }, data });
  return mapAnnouncement(row);
}

export async function deleteAnnouncement(id: string) {
  try {
    await prisma.announcement.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}
