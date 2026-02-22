# Idea: Admin UI & Admin Accounts

**Status:** Deferred
**Created:** 2026-02-22
**Category:** Tooling & Operations

## Problem

Several features currently lack user-facing interfaces but are needed for managing the platform:

1. **Question Library Management**
   - No UI to create, edit, or organize interview questions
   - Manual testing guide references questions, but users can't access them
   - Questions must be added via direct database access or scripts

2. **User Management**
   - No way to view registered users
   - No way to manage user accounts (disable, delete, reset)
   - No visibility into user activity or engagement

3. **Content Moderation** _(future)_
   - No way to review flagged content
   - No reporting mechanism for users
   - No moderation queue

4. **System Monitoring** _(future)_
   - No dashboard for system health
   - No visibility into API usage or costs
   - No way to monitor conversation quality or errors

## Proposed Solution

### Admin Role & Permissions

**Admin User Model:**
- Add `role` field to User model (default: "user", admin: "admin")
- Admin flag set manually via database or bootstrap script
- Cannot self-promote to admin through UI

**Permission Levels:**
```
User (default):
  - Create books, interviews, stories
  - Manage own content only
  - No access to admin routes

Admin:
  - All user permissions
  - Access to /admin routes
  - Manage question library
  - View user list (read-only initially)
  - View system metrics
```

### Admin UI Structure

**Route:** `/admin`

**Main Sections:**

#### 1. Question Library (`/admin/questions`)
- **List View:**
  - Table of all questions
  - Columns: Category | Prompt (truncated) | Order | Created | Actions
  - Filter by category
  - Sort by order index or creation date
  - Search by prompt text

- **Create/Edit Form:**
  - Category (text input or select from existing categories)
  - Prompt (textarea)
  - Order Index (number input)
  - Preview of how question appears in interview UI

- **Bulk Operations:**
  - Reorder questions within category (drag-and-drop or number inputs)
  - Bulk delete
  - Export/import questions (JSON/CSV)

#### 2. Users (`/admin/users`) _(Phase 2)_
- **List View:**
  - Table: Email | Name | Auth Method | Created | Last Active | Books | Interviews
  - Search by email
  - Filter by auth method (Google, email/password)
  - Sort by activity or creation date

- **User Detail:**
  - Basic info (read-only)
  - Activity summary (books created, interviews conducted, messages sent)
  - Link to user's books (view as admin)
  - Actions: Disable account, Reset password (send email)

#### 3. System Overview (`/admin/overview`) _(Phase 3)_
- **Metrics Dashboard:**
  - Total users (active, inactive)
  - Total books, interviews, messages
  - AI API usage (requests, tokens, cost estimates)
  - Recent errors/issues
  - Database size

### Technical Implementation

**Middleware:**
- Extend `src/middleware.ts` to check for admin role
- Redirect non-admins away from `/admin/*` routes

**tRPC Routers:**
- `admin.questions.*` - CRUD operations for questions
- `admin.users.*` - Read-only user management
- `admin.system.*` - System metrics (later)

**Repository Changes:**
- `questionRepository.update()` - currently missing
- `questionRepository.delete()` - currently missing
- `questionRepository.updateOrderIndex()` - batch reordering

**UI Components:**
- Reuse existing form patterns from auth pages
- Table component for list views (could use Radix UI Accordion or build custom)
- Admin-only layout wrapper (sidebar nav for sections)

### Security Considerations

1. **Role-based access control (RBAC):**
   - Check admin role in middleware AND in tRPC procedures
   - Never trust client-side role checks alone

2. **Audit logging:**
   - Log all admin actions (who did what, when)
   - Store in separate `admin_audit_log` table
   - Fields: userId, action, resourceType, resourceId, timestamp, metadata

3. **Rate limiting:**
   - Admin endpoints should have stricter rate limits
   - Prevent abuse even from compromised admin accounts

4. **No destructive defaults:**
   - Deletion should require confirmation
   - Consider soft-delete for users (mark inactive vs. hard delete)

## When to Build This

**Don't build yet if:**
- Still in early development/testing phase
- Question library is small and stable
- Direct database access is acceptable for now
- Team is technical and comfortable with scripts

**Build when:**
- ✅ **Question library needs frequent updates** - If we're constantly adding/editing questions
- ✅ **Non-technical team members need access** - Product/content folks managing questions
- User base grows beyond manual management (100+ users)
- Need to moderate content or handle support issues at scale
- Regulatory/compliance requires audit trails

## Alternatives to Full Admin UI

**Short-term solutions (Phase 1 enhancements timeframe):**

1. **Scripts only** (current approach):
   - Create `scripts/add-question.ts` for easy question creation
   - Use Prisma Studio for ad-hoc edits
   - Acceptable for now, not scalable long-term

2. **Seed file with version control:**
   - Maintain questions in `prisma/seeds/questions.json`
   - Load via seed script
   - Version-controlled, reviewable changes
   - Still requires technical knowledge

3. **Google Sheets + sync script:**
   - Non-technical team edits questions in Sheets
   - Script syncs to database on demand
   - Hybrid approach, lower dev cost than full UI

4. **Headless CMS (e.g., Sanity, Contentful):**
   - Use existing CMS for question management
   - Overkill for just questions, but scales to other content
   - Monthly cost for hosted CMS

## Recommendation

**For Phase 1 enhancements:** Use scripts approach (see `scripts/add-question.ts`). This unblocks manual testing immediately with minimal dev cost.

**For Phase 2 or later:** Build lightweight admin UI focused on question management first. Add user management and system monitoring as needs arise.

**Admin UI is not urgent, but will become necessary when:**
- Team grows beyond developers
- Question library exceeds 50-100 items
- Need non-technical users to manage content

## Acceptance Criteria (When Implemented)

- [ ] Admin role exists in User model
- [ ] Middleware protects `/admin` routes
- [ ] Admin can create, edit, delete, and reorder questions
- [ ] Admin can view list of users (read-only)
- [ ] All admin actions logged for audit trail
- [ ] Admin UI is responsive (works on desktop, tablet)
- [ ] Regular users cannot access admin features (tested)
- [ ] Documentation updated with admin user creation process

## Related

- **Phase 1 Enhancements** - Question management needed for manual testing
- **ADR 007** - CSS Modules + Radix UI (applies to admin UI components)
- **Security best practices** - RBAC, audit logging, defense in depth
