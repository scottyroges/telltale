#!/usr/bin/env tsx
/**
 * Script to add questions to the database for testing and manual setup.
 *
 * Usage:
 *   # Local database:
 *   npm run script:add-question
 *
 *   # Production database (requires PROD_DATABASE_URL):
 *   PROD_DATABASE_URL="postgres://..." npm run script:add-question -- --prod
 *
 *   # Custom question:
 *   npm run script:add-question -- --category "Childhood" --prompt "What was your favorite toy?"
 */

import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { createId } from "@paralleldrive/cuid2";
import type { DB } from "@/db/types";
import type { Question } from "@/domain/question";

interface QuestionInput {
  category: string;
  prompt: string;
  orderIndex: number;
}

/**
 * Default questions for manual testing (from docs/manual-testing.md)
 */
const DEFAULT_QUESTIONS: QuestionInput[] = [
  {
    category: "Childhood",
    prompt: "Tell me about your first car.",
    orderIndex: 1,
  },
  {
    category: "Family",
    prompt: "Tell me about your relationship with your grandparents.",
    orderIndex: 2,
  },
  {
    category: "Family",
    prompt: "What were family dinners like when you were growing up?",
    orderIndex: 3,
  },
  {
    category: "Life Events",
    prompt: "Tell me about a time you experienced loss.",
    orderIndex: 4,
  },
  {
    category: "Childhood",
    prompt: "What's your earliest memory?",
    orderIndex: 5,
  },
  {
    category: "Relationships",
    prompt: "Tell me about your wedding day.",
    orderIndex: 6,
  },
  {
    category: "Childhood",
    prompt: "What was your childhood home like?",
    orderIndex: 7,
  },
  {
    category: "Family",
    prompt: "Tell me about your parents.",
    orderIndex: 8,
  },
  {
    category: "Education",
    prompt: "What do you remember about your first day of school?",
    orderIndex: 9,
  },
  {
    category: "Childhood",
    prompt: "Who was your best friend growing up?",
    orderIndex: 10,
  },
  {
    category: "Hobbies",
    prompt: "What did you love to do for fun as a child?",
    orderIndex: 11,
  },
  {
    category: "Family",
    prompt: "Tell me about your siblings.",
    orderIndex: 12,
  },
  {
    category: "Life Events",
    prompt: "What was your first job?",
    orderIndex: 13,
  },
  {
    category: "Relationships",
    prompt: "How did you meet your spouse/partner?",
    orderIndex: 14,
  },
  {
    category: "Education",
    prompt: "Tell me about your favorite teacher.",
    orderIndex: 15,
  },
  {
    category: "Life Events",
    prompt: "What was the proudest moment of your life?",
    orderIndex: 16,
  },
  {
    category: "Family",
    prompt: "What traditions did your family have?",
    orderIndex: 17,
  },
  {
    category: "Childhood",
    prompt: "What was your neighborhood like when you were growing up?",
    orderIndex: 18,
  },
  {
    category: "Hobbies",
    prompt: "Tell me about a hobby or passion you've pursued.",
    orderIndex: 19,
  },
  {
    category: "Life Events",
    prompt: "Tell me about becoming a parent.",
    orderIndex: 20,
  },
];

/**
 * Create database connection (local or production)
 */
function createDb(isProd: boolean): Kysely<DB> {
  const connectionString = isProd
    ? process.env.PROD_DATABASE_URL
    : process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(`❌ Error: ${isProd ? 'PROD_DATABASE_URL' : 'DATABASE_URL'} environment variable not set`);
    process.exit(1);
  }

  console.log(`🔌 Connecting to ${isProd ? 'PRODUCTION' : 'local'} database...`);

  return new Kysely<DB>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString,
        max: 1, // Script only needs one connection
      }),
    }),
  });
}

/**
 * Create question repository instance with custom db
 */
function createQuestionRepository(db: Kysely<DB>) {
  const columns = [
    "id",
    "category",
    "prompt",
    "orderIndex",
    "createdAt",
    "updatedAt",
  ] as const;

  return {
    async create(data: {
      category: string;
      prompt: string;
      orderIndex: number;
    }): Promise<Question> {
      return db
        .insertInto("question")
        .values({
          id: createId(),
          ...data,
          updatedAt: new Date(),
        })
        .returning([...columns])
        .executeTakeFirstOrThrow();
    },
  };
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { customQuestion: QuestionInput | null; isProd: boolean } {
  const args = process.argv.slice(2);

  let category: string | undefined;
  let prompt: string | undefined;
  let orderIndex: number | undefined;
  let isProd = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--category" && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if (args[i] === "--prompt" && args[i + 1]) {
      prompt = args[i + 1];
      i++;
    } else if (args[i] === "--order" && args[i + 1]) {
      orderIndex = parseInt(args[i + 1]!, 10);
      i++;
    } else if (args[i] === "--prod") {
      isProd = true;
    }
  }

  // If category or prompt provided, both are required
  if ((category || prompt) && (!category || !prompt)) {
    console.error("❌ Error: --category and --prompt are both required for custom questions");
    console.log("\nUsage:");
    console.log('  npm run script:add-question -- --category "Childhood" --prompt "Your question here?" --order 100');
    process.exit(1);
  }

  const customQuestion = category && prompt ? {
    category,
    prompt,
    orderIndex: orderIndex ?? 999,
  } : null;

  return { customQuestion, isProd };
}

/**
 * Add a single question to the database
 */
async function addQuestion(
  repository: ReturnType<typeof createQuestionRepository>,
  question: QuestionInput
): Promise<void> {
  try {
    const created = await repository.create(question);
    console.log(`✅ Created question: [${question.category}] ${question.prompt.substring(0, 50)}...`);
    console.log(`   ID: ${created.id}, Order: ${created.orderIndex}`);
  } catch (error) {
    console.error(`❌ Failed to create question: ${question.prompt}`);
    console.error(error);
  }
}

/**
 * Add all default questions
 */
async function addDefaultQuestions(
  repository: ReturnType<typeof createQuestionRepository>
): Promise<void> {
  console.log(`Adding ${DEFAULT_QUESTIONS.length} default questions...\n`);

  for (const question of DEFAULT_QUESTIONS) {
    await addQuestion(repository, question);
  }

  console.log(`\n✅ Finished adding default questions`);
}

/**
 * Main script execution
 */
async function main() {
  const { customQuestion, isProd } = parseArgs();

  if (isProd) {
    console.log("⚠️  WARNING: Running against PRODUCTION database!");
    console.log("   Press Ctrl+C to cancel or wait 3 seconds to continue...\n");
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const db = createDb(isProd);
  const repository = createQuestionRepository(db);

  try {
    if (customQuestion) {
      console.log("Adding custom question...\n");
      await addQuestion(repository, customQuestion);
    } else {
      await addDefaultQuestions(repository);
    }

    console.log("\n✨ Done!");
  } finally {
    await db.destroy();
  }
}

main()
  .catch((error) => {
    console.error("❌ Script failed:");
    console.error(error);
    process.exit(1);
  });
