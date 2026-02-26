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

## Corpus & Knowledge Graph Infrastructure

The post-interview pipeline (see [biography-reverse-chain](../notes/biography-reverse-chain.md)) needs a temporal knowledge graph: entities, relationships with bi-temporal timestamps, and eventually semantic search. The strategy is to stay in Postgres as long as possible.

### Option 1: Relational Tables (Start Here)

Model the graph as regular Postgres tables — entities, edges, and episodes — with temporal columns:

- **Entities:** people, places, organizations, events with metadata
- **Edges:** relationships between entities with bi-temporal timestamps (`valid_from`/`valid_to` for real-world truth, `created_at`/`invalidated_at` for system knowledge). Contradictions preserved, not overwritten.
- **Episodes:** links to interview segments as source provenance

Graph traversal via recursive CTEs. Full-text search via built-in `tsvector`. No extensions needed — works on Neon free tier as-is.

**Sufficient for:** Post-interview entity extraction and storage (Stage 2), querying by entity/interview/time period, multi-hop traversal, contradiction tracking. Covers everything the async pipeline needs.

### Option 2: Add pgvector (When Retrieval Needs Semantic Search)

Add vector columns to entities and edges for embedding-based similarity search. Neon supports pgvector natively (`CREATE EXTENSION vector`).

**Unlocks:** Semantic retrieval ("find edges similar to 'family conflict'") alongside keyword + graph traversal — the full hybrid retrieval pattern from Graphiti. This is what makes corpus-level analysis (Stage 3), chapter dossier assembly (Stage 5), and curated interview briefings powerful.

**Cost:** Embedding via `text-embedding-3-small` is ~$0.02/1M tokens (negligible at our scale). Vector storage is ~6KB per 1536-dim embedding — a book with 10K edges uses ~60MB, well within Neon free tier's 0.5GB limit.

**Triggered by:** Building corpus-level analysis or chapter dossier assembly. Not needed for the post-interview extraction pipeline alone.

### Option 3: Dedicated Graph DB (Unlikely)

Neo4j Aura Free (200K nodes, 400K relationships) if Postgres recursive CTEs become painful. Native Cypher queries, graph algorithms (community detection, centrality, pathfinding).

**Triggered by:** Needing graph algorithms that are impractical in SQL, or finding that recursive CTEs are too complex to maintain. Unlikely at biography scale — a book produces hundreds of entities and low thousands of edges, not millions.

**Trade-off:** Second datastore to manage, data sync between Postgres and Neo4j, additional failure modes. Only justified if the query complexity genuinely demands it.

### Why This Works

A biography project generates modest graph data — roughly 200 entities and 1,000 temporal edges per book. Postgres handles this without breaking a sweat. The relational model isn't a compromise; it's genuinely sufficient for the data volumes involved. Starting relational and adding pgvector later is a column addition, not a migration.
