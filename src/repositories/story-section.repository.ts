import { db } from "@/lib/db";
import { createId } from "@/lib/id";
import type { StorySection, StorySectionStatus } from "@/domain/story-section";

const columns = [
  "id",
  "storyId",
  "orderIndex",
  "content",
  "status",
  "createdAt",
  "updatedAt",
] as const;

export const storySectionRepository = {
  async create(data: {
    storyId: string;
    orderIndex: number;
    content: string;
  }): Promise<StorySection> {
    // INSERT INTO story_section (id, "storyId", "orderIndex", content, status, "updatedAt")
    //   VALUES ($1, $2, $3, $4, 'GENERATING', $5)
    //   RETURNING <columns>
    return db
      .insertInto("story_section")
      .values({
        id: createId(),
        ...data,
        status: "GENERATING",
        updatedAt: new Date(),
      })
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async findByStoryId(storyId: string): Promise<StorySection[]> {
    // SELECT <columns> FROM story_section WHERE "storyId" = $1 ORDER BY "orderIndex" ASC
    return db
      .selectFrom("story_section")
      .where("storyId", "=", storyId)
      .select([...columns])
      .orderBy("orderIndex", "asc")
      .execute();
  },

  async updateContent(id: string, content: string): Promise<StorySection> {
    // UPDATE story_section SET content = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("story_section")
      .set({ content, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },

  async updateStatus(
    id: string,
    status: StorySectionStatus,
  ): Promise<StorySection> {
    // UPDATE story_section SET status = $1, "updatedAt" = $2 WHERE id = $3 RETURNING <columns>
    return db
      .updateTable("story_section")
      .set({ status, updatedAt: new Date() })
      .where("id", "=", id)
      .returning([...columns])
      .executeTakeFirstOrThrow();
  },
};
