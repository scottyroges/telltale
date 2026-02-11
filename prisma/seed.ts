import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@telltale.local" },
    update: {},
    create: {
      email: "dev@telltale.local",
      name: "Dev User",
      emailVerified: new Date(),
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
