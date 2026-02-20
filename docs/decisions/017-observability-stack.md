# ADR 017: Observability Stack for Production

**Status:** Accepted
**Date:** 2025-02

## Context

Need production observability (logging, error tracking, uptime monitoring, product analytics) for a solo-dev project with tight budget constraints. Traditional enterprise tools like Datadog ($15-31/host/month) are cost-prohibitive for an early-stage product doing $0-100/mo revenue.

Vercel provides basic built-in observability (request logs, function metrics, web vitals, deployment logs), but lacks custom metrics, distributed tracing, alerting, and long-term log retention on the free tier.

## Decision

Use a multi-tool free-tier stack optimized for Next.js on Vercel:

**Core observability (Phase 5 — early):**
- **Axiom** — Structured logging and custom events (500GB/month free tier)
- **Sentry** — Error tracking with stack traces and breadcrumbs (5K errors/month free tier)

**Launch readiness (Phase 5 — later):**
- **Better Stack** — Uptime monitoring and status page (free tier, 3-minute check intervals)
- **PostHog** — Product analytics and user behavior tracking (1M events/month free tier)

**Built-in:**
- **Vercel** — Function metrics, web vitals, deployment logs (included with hosting)

## Alternatives Considered

- **Datadog** — Full-featured observability platform, but $15-31/host/month is cost-prohibitive for a solo project
- **Grafana Cloud** — Free tier (50GB logs, 10K metrics), but more complex setup and overkill until distributed tracing is needed (Phase 3+ of scaling, when conversation engine is extracted)
- **Self-hosted OpenTelemetry** — Maximum flexibility, but operational overhead not justified at this scale

## Implementation

**Axiom setup:**
```bash
npm install @axiomhq/nextjs
```

Add to middleware:
```typescript
// src/middleware.ts
export { withAxiom as middleware } from '@axiomhq/nextjs';
```

Custom event logging:
```typescript
import { Logger } from '@axiomhq/nextjs';

const log = new Logger();
log.info('conversation.message', {
  sessionId,
  role: 'user',
  threadCount: extractedThreads.length,
  responseTimeMs: duration,
});
```

**Sentry setup:**
```bash
npx @sentry/wizard@latest -i nextjs
```

Captures both client-side React errors and server-side failures with full context.

**Better Stack:** Configure uptime checks for main page and critical API endpoints (5 minutes to set up).

**PostHog:** Track product events like "user started conversation," "user completed story," "user exported book."

## Consequences

**Advantages:**
- **$0 total cost** — all tools have generous free tiers suitable for early-stage product
- **Covers 95% of Datadog use cases** at this scale — structured logs, error tracking, uptime monitoring, product analytics
- **Minimal setup overhead** — Axiom and Sentry integrate natively with Next.js/Vercel
- **Room to grow** — Free tiers support well beyond MVP scale (500GB logs, 5K errors, 1M events)

**Limitations:**
- **No distributed tracing** — Can't follow requests across multiple services. Not needed until Phase 3+ of scaling (when conversation engine is extracted). At that point, consider Grafana Cloud or self-hosted OpenTelemetry.
- **Limited log retention** — Axiom free tier retains logs for 30 days (vs. Datadog's configurable retention)
- **Tool sprawl** — Four separate dashboards instead of one unified observability platform. Acceptable trade-off for cost savings.

**What we get:**
- Request logs with status codes, durations, routes, custom fields (Axiom)
- Stack traces, breadcrumbs, release tracking for client and server errors (Sentry)
- Uptime checks and downtime alerts via email/Slack/SMS (Better Stack)
- User behavior and feature adoption metrics (PostHog)
- Function invocation counts, web vitals, deployment logs (Vercel built-in)

**What we don't get (but don't need yet):**
- Distributed tracing across services (not relevant until microservices extraction)
- Custom metrics dashboards (Vercel metrics + Axiom queries cover current needs)
- Long-term log retention (30 days sufficient for early-stage debugging)
- Unified observability interface (multiple tools acceptable at this scale)
