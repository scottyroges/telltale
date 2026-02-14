import { db } from "@/lib/db";

export const userRepository = {
  async findById(id: string) {
    // SELECT id, name, email FROM "user" WHERE id = $1
    return (
      (await db
        .selectFrom("user")
        .where("id", "=", id)
        .select(["id", "name", "email"])
        .executeTakeFirst()) ?? null
    );
  },
};
