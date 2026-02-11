import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@telltale.local" },
    update: {},
    create: {
      id: crypto.randomUUID(),
      email: "dev@telltale.local",
      name: "Dev User",
      emailVerified: true,
    },
  });

  console.log(`Seeded user: ${user.email} (${user.id})`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
