# Scripts

Utility scripts for development and operations tasks.

## Available Scripts

### `add-question.ts`

Add questions to the database for testing and manual setup.

**Usage:**

```bash
# Local database: Add all default questions (20 questions from manual-testing.md)
npm run script:add-question

# Local database: Add a custom question
npm run script:add-question -- --category "Childhood" --prompt "What was your favorite toy?" --order 100

# Production database: Add all default questions
PROD_DATABASE_URL="postgresql://..." npm run script:add-question -- --prod

# Production database: Add a custom question
PROD_DATABASE_URL="postgresql://..." npm run script:add-question -- --prod --category "Family" --prompt "Tell me about your siblings."
```

**Options:**
- `--prod` - Run against production database (requires PROD_DATABASE_URL env var, shows 3-second warning)
- `--category` - Question category (required for custom questions)
- `--prompt` - Question text (required for custom questions)
- `--order` - Order index (optional, defaults to 999)

**Getting Production Database URL:**

From Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Copy the `DATABASE_URL` value
4. Use it as `PROD_DATABASE_URL` when running the script

Or use Vercel CLI:
```bash
# Get environment variables
vercel env pull .env.production

# Then use the DATABASE_URL from that file
source .env.production && PROD_DATABASE_URL=$DATABASE_URL npm run script:add-question -- --prod
```

**Examples:**

```bash
# Local: Add childhood question
npm run script:add-question -- --category "Childhood" --prompt "Tell me about your first pet."

# Local: Add family question with specific order
npm run script:add-question -- --category "Family" --prompt "What holidays did your family celebrate?" --order 50

# Production: Add all default questions (with warning)
PROD_DATABASE_URL="postgresql://user:pass@host/db" npm run script:add-question -- --prod

# Production: Add one custom question
PROD_DATABASE_URL="postgresql://user:pass@host/db" npm run script:add-question -- --prod --category "Education" --prompt "Tell me about your college experience."
```

## Adding New Scripts

1. Create a new `.ts` file in this directory
2. Add shebang: `#!/usr/bin/env tsx`
3. Add npm script to `package.json`: `"script:your-name": "tsx scripts/your-name.ts"`
4. Document usage in this README
5. Make script executable (optional): `chmod +x scripts/your-name.ts`

## Notes

- Scripts run with `tsx` for TypeScript support
- Scripts have access to all project dependencies and path aliases (`@/...`)
- Use scripts for one-off tasks, admin operations, and data setup
- For recurring tasks, consider making them part of the app's admin UI (see `docs/ideas/admin-ui.md`)
