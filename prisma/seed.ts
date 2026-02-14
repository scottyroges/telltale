import crypto from "node:crypto";
import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "../src/db/types";

const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

async function main() {
  const user = await db
    .insertInto("user")
    .values({
      id: crypto.randomUUID(),
      email: "dev@telltale.local",
      name: "Dev User",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .onConflict((oc) => oc.column("email").doNothing())
    .returningAll()
    .executeTakeFirst();

  if (user) {
    console.log(`Seeded user: ${user.email} (${user.id})`);
  } else {
    console.log("User dev@telltale.local already exists, skipped.");
  }
}

main()
  .then(async () => {
    await db.destroy();
  })
  .catch(async (e) => {
    console.error(e);
    await db.destroy();
    process.exit(1);
  });
