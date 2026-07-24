import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 12;

async function main() {
  console.log("Seeding database...");

  // Wipe in FK-safe order
  await prisma.billingRecord.deleteMany();
  await prisma.usageRecord.deleteMany();
  await prisma.userPackage.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.appModel.deleteMany();
  await prisma.aggregatorConfig.deleteMany();
  await prisma.paymentGatewayConfig.deleteMany();
  await prisma.puterLimit.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password", BCRYPT_ROUNDS);

  const superadmin = await prisma.user.create({
    data: {
      email: "superadmin@mail.com",
      passwordHash,
      name: "Super Admin",
      role: "superadmin",
      status: "active",
      emailVerified: new Date(),
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "client@mail.com",
      passwordHash,
      name: "Client",
      role: "user",
      status: "active",
      emailVerified: new Date(),
    },
  });

  console.log("\n=== Seed Summary ===");
  console.log(`  Superadmin: ${superadmin.email} / password`);
  console.log(`  Client:     ${client.email} / password`);
  console.log("===================\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
