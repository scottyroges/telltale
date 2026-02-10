# Scaling Strategy

## Deployment Phases

### Phase 1: Free Tier
- Vercel free tier + Neon free tier
- ~$0/mo + API costs (~$5-10/mo during development)

### Phase 2: Paid Tiers
- Vercel Pro ($20/mo) + Neon Pro (~$20/mo)
- Triggered by: paying users, need for longer function timeouts (60s vs 10s)

### Phase 3: Service Extraction
- Extract conversation engine to dedicated service on Railway or Fly.io (~$5-20/mo)
- Next.js stays on Vercel as frontend + CRUD API
- Triggered by: need for WebSockets, long-running connections, or independent scaling of the AI service

### Phase 4: Full Backend Extraction (unlikely)
- Full backend extraction to Kotlin/Spring Boot
- Triggered by: thousands of concurrent users, complex orchestration

## Why This Order

The conversation engine is the most likely candidate for extraction because it involves streaming AI responses and will eventually need WebSockets for real-time voice. The service layer isolation pattern means extraction is a clean operation — the `conversation.service` already has no framework dependencies.

Everything else (CRUD, auth, book assembly) is standard request/response and can stay in Next.js serverless functions indefinitely.
