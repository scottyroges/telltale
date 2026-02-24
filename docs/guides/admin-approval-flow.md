# Admin & User Approval Flow

## Overview

The platform implements a user approval system to control access to expensive operations (LLM API calls). New users are created with `PENDING` approval status and cannot create interviews or send messages until approved by an admin.

## User Approval Statuses

- **PENDING** — Default for new signups. User can log in but cannot create interviews or send messages. Dashboard shows a banner informing them their account is pending approval.
- **APPROVED** — User has full access to all features.
- **REJECTED** — User is blocked from expensive operations (rare, typically for abuse cases).

## Admin Role

Users with the `ADMIN` role can access the admin panel at `/admin/users` to approve or reject pending users.

### Making a User an Admin

Currently, admin promotion is a manual database operation. To promote a user to admin:

```sql
-- Find the user
SELECT id, email, name, role FROM "user" WHERE email = 'admin@example.com';

-- Promote to admin
UPDATE "user"
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE email = 'admin@example.com';
```

Or by user ID:

```sql
UPDATE "user"
SET role = 'ADMIN', "updatedAt" = NOW()
WHERE id = 'user_id_here';
```

**Note:** At least one admin user must exist to bootstrap the approval system.

## Admin Panel

Once promoted to admin, users can access the admin panel at `/admin/users`:

1. **View pending users** — See all users awaiting approval, ordered by signup date
2. **Approve users** — Click "Approve" to grant full access
3. **Reject users** — Click "Reject" to block access (rare, for abuse cases)

The panel shows:
- User name and email
- Account creation date
- Current approval status
- Approve/Reject actions

## Protected Operations

The following operations require APPROVED status:

**Interview operations:**
- `interview.start` — Starting a new interview
- `interview.sendMessage` — Sending messages in an interview
- `interview.getById` — Viewing an interview
- `interview.getMessages` — Viewing interview messages
- `interview.getInsights` — Viewing interview insights
- `interview.getBookInsights` — Viewing book-level insights

**What pending users CAN do:**
- Sign in/out
- View dashboard (with approval banner)
- View books and questions (read-only)

## Implementation Details

- **Middleware:** `approvedProcedure` in `src/server/trpc.ts` checks approval status before expensive operations
- **Admin middleware:** `adminProcedure` in `src/server/routers/admin.ts` requires ADMIN role
- **Repository:** `userRepository.findPendingUsers()` and `userRepository.updateApprovalStatus()`
- **Service:** `adminService.ts` provides business logic for approval operations
- **Database:** `approvalStatus` and `role` columns on User model

## Future Improvements

Potential enhancements to the approval flow:

- Environment variable for auto-promoting admin emails (`ADMIN_EMAILS=scott@example.com,admin@example.com`)
- Email notifications when users are approved/rejected
- Admin audit log for approval actions
- Bulk approval actions
- Self-service admin promotion during initial setup
