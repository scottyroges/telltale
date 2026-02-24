# ADR 020: Async Job Processing for Interview Post-Processing

**Status:** Accepted
**Date:** 2026-02

## Context

Need to process completed interviews asynchronously to generate stories, summaries, and other derived content. This involves long-running LLM operations that:
- Can take 30+ seconds (exceeds Vercel's 10-60s function timeout)
- Should not block the user experience
- Need retry logic and failure handling
- Will scale with user growth (hundreds to thousands of jobs/day)

**Key constraints:**
- Deployed to Vercel (serverless, cannot run persistent worker processes)
- Postgres database already in use
- Tight budget constraints ($0 initially, minimal cost at scale)
- Must avoid vendor lock-in that we'll regret later

## Decision

**Phase 1 (MVP — first 100 users):** Use **Inngest** free tier
- 50,000 executions/month free
- Native Next.js/Vercel integration
- Zero infrastructure to manage

**Phase 2 (Growth — 1000s of users):** Continue with Inngest or migrate to **Railway worker + BullMQ**
- If Inngest costs grow, deploy worker to Railway ($7/mo)
- Use BullMQ with managed Redis (Upstash ~$10/mo)
- Total: ~$17/month for unlimited job processing

## Alternatives Considered

### Postgres-Based Queues (pg-boss, Graphile Worker)
**Rejected:** Cannot run on Vercel serverless. Requires persistent worker process, which Vercel does not support. Would need separate worker server ($5-10/mo) anyway, negating the cost advantage.

From [pg-boss GitHub discussion](https://github.com/timgit/pg-boss/discussions/403):
> "You cannot use pg-boss in a serverless environment like Vercel; you need to use a long running server to run the background jobs."

### Trigger.dev
**Considered:** Similar to Inngest but smaller free tier ($5/month credit vs. 50k executions). Better for complex multi-step workflows but overkill for our initial needs.

### BullMQ + Redis (Self-Hosted)
**Deferred to Phase 2:** Requires separate worker server + managed Redis (~$17/mo total). More cost-effective at scale but unnecessary overhead for MVP.

### Vercel Cron Jobs
**Rejected:** Limited to 10-60s execution time, insufficient for LLM processing tasks that can take minutes.

## Implementation

### Phase 1: Inngest Setup

**Install:**
```bash
npm install inngest
```

**Create Inngest client:**
```typescript
// src/lib/inngest.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'telltale',
  name: 'Telltale'
});
```

**Queue job from API route:**
```typescript
// src/app/api/interviews/[id]/complete/route.ts
import { inngest } from '@/lib/inngest';

export async function POST(req: Request) {
  const interviewId = req.params.id;

  // Mark interview as complete in database
  await updateInterviewStatus(interviewId, 'completed');

  // Queue async processing
  await inngest.send({
    name: 'interview.process',
    data: { interviewId }
  });

  return Response.json({ status: 'processing' });
}
```

**Define worker function:**
```typescript
// src/inngest/functions/process-interview.ts
import { inngest } from '@/lib/inngest';
import { processInterviewContent } from '@/services/interview-processing.service';

export const processInterview = inngest.createFunction(
  {
    id: 'process-interview',
    name: 'Process Interview Content',
    retries: 3
  },
  { event: 'interview.process' },
  async ({ event, step }) => {
    const { interviewId } = event.data;

    // Step 1: Generate stories
    const stories = await step.run('generate-stories', async () => {
      return generateStoriesFromInterview(interviewId);
    });

    // Step 2: Generate summaries
    const summary = await step.run('generate-summary', async () => {
      return generateSummary(interviewId);
    });

    // Step 3: Extract insights
    const insights = await step.run('extract-insights', async () => {
      return extractInsights(interviewId);
    });

    return { stories, summary, insights };
  }
);
```

**Serve Inngest API:**
```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest';
import { processInterview } from '@/inngest/functions/process-interview';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processInterview],
});
```

### Phase 2: Migration to Railway + BullMQ (If Needed)

**Deploy separate worker process to Railway:**
```typescript
// worker/index.ts
import { Queue, Worker } from 'bullmq';
import { processInterviewContent } from '../src/services/interview-processing.service';

const queue = new Queue('interview-processing', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }
});

const worker = new Worker('interview-processing', async (job) => {
  await processInterviewContent(job.data.interviewId);
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});
```

**Queue jobs from Next.js (stays on Vercel):**
```typescript
// src/app/api/interviews/[id]/complete/route.ts
import { Queue } from 'bullmq';

const queue = new Queue('interview-processing', {
  connection: process.env.REDIS_URL
});

export async function POST(req: Request) {
  await queue.add('process-interview', {
    interviewId: req.params.id
  });

  return Response.json({ status: 'queued' });
}
```

## Consequences

### Advantages

**Phase 1 (Inngest):**
- **$0 cost** for MVP (50k executions covers early users)
- **Zero infrastructure** — no Redis, no worker servers, no deployment complexity
- **Built for Vercel** — native Next.js integration, automatic retries, observability dashboard
- **Great DX** — step functions for complex workflows, local development mode
- **Production-ready** — handles failures, retries, rate limiting out of the box

**Phase 2 (BullMQ + Railway):**
- **Cost-effective at scale** — $17/month for unlimited jobs vs. Inngest's usage-based pricing
- **Full control** — own the infrastructure, no vendor lock-in
- **Battle-tested** — BullMQ is industry standard (15k+ GitHub stars)
- **Rich observability** — BullBoard dashboard for monitoring

### Limitations

**Phase 1 (Inngest):**
- **Vendor lock-in risk** — migration requires rewriting job handlers (though straightforward)
- **Usage-based pricing** — costs grow with job volume (mitigated by generous free tier)
- **Less control** — can't optimize Redis config or worker concurrency as deeply

**Phase 2 (BullMQ + Railway):**
- **Infrastructure overhead** — need to manage Redis and deploy worker separately
- **More moving parts** — debugging spans multiple services
- **Initial cost** — $17/month minimum (vs. Inngest's free tier)

### What We Get

**Immediate (Phase 1):**
- Async processing for interview post-processing (story generation, summarization, insights)
- Automatic retries on LLM failures
- Observability dashboard showing job status, failures, execution time
- Step functions for multi-stage processing
- Local development mode for testing workflows

**At Scale (Phase 2):**
- Unlimited job processing at fixed cost
- Full control over worker concurrency and Redis configuration
- Can run custom worker logic (e.g., GPU-accelerated processing)
- Standard migration path used by thousands of companies

### What We Don't Get (But Don't Need Yet)

- **Complex orchestration** — Temporal-style workflows with signals, child workflows, etc. (Inngest provides simple step functions, sufficient for our needs)
- **Multi-language workers** — Both solutions are Node.js-focused (fine, our backend is TypeScript)
- **Real-time progress updates** — Job status is eventually consistent (acceptable for batch processing)

## Migration Path

If Inngest costs exceed budget:

1. Deploy worker to Railway ($7/mo)
2. Set up managed Redis on Upstash ($10/mo fixed tier)
3. Install BullMQ and rewrite job handlers (straightforward mapping)
4. Dual-write jobs to both Inngest and BullMQ during transition
5. Monitor for parity, then remove Inngest

Estimated migration time: 1-2 days for experienced developer.

## References

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Pricing](https://www.inngest.com/pricing) — 50k free executions/month
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Railway Pricing](https://railway.app/pricing) — ~$7/month for small worker
- [Upstash Redis](https://upstash.com/pricing) — $10/month fixed tier
- [pg-boss Serverless Discussion](https://github.com/timgit/pg-boss/discussions/403)
- [Vercel Long-Running Background Functions](https://www.inngest.com/blog/vercel-long-running-background-functions)
- [Railway vs Vercel Comparison](https://designrevision.com/blog/saas-hosting-compared)
