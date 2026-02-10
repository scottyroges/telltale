# ADR 002: tRPC for API Layer

**Status:** Accepted
**Date:** 2025-02

## Context
Need an API layer between the Next.js frontend and backend services. Type safety is a priority.

## Decision
Use tRPC for all API communication.

## Alternatives Considered
- **REST** — requires manual type definitions or codegen, no end-to-end type safety
- **GraphQL** — powerful but heavy for a solo dev; schema maintenance overhead, codegen required

## Consequences
- End-to-end TypeScript types from Prisma → tRPC → frontend with zero codegen
- Pairs naturally with Prisma-generated types and Zod validation
- Locked into TypeScript backend (acceptable given monolith-first approach)
- tRPC routers serve as thin wrappers; business logic stays in services
