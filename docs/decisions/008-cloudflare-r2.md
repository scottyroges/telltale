# ADR 008: Cloudflare R2 for File Storage

**Status:** Accepted
**Date:** 2025-02

## Context
Need object storage for audio files (voice recordings in Phase 2). Audio files will be read frequently (playback) so egress costs matter.

## Decision
Use Cloudflare R2 for file storage.

## Alternatives Considered
- **AWS S3** — industry standard but egress fees add up with audio playback
- **Supabase Storage** — ties us to Supabase ecosystem

## Consequences
- No egress fees (significant for audio file playback)
- S3-compatible API — can swap to AWS S3 if needed
- Generous free tier
- Bucket name: `telltale-audio`
