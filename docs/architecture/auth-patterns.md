# Auth Patterns

This document covers authentication patterns and conventions used in the Telltale project.

## Better Auth Configuration

We use [Better Auth](https://www.better-auth.com/) with Kysely adapter and Next.js integration.

### Core Setup

**Server configuration** (`src/server/auth.ts`):
```typescript
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: { db, type: "postgres" as const },
  plugins: [nextCookies()],
  // ... provider configurations
});
```

**Client setup** (`src/lib/auth-client.ts`):
```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
```

### Better Auth API Naming

Better Auth uses specific method names that may differ from common conventions:

| Task | Method | NOT |
|------|--------|-----|
| Request password reset email | `authClient.requestPasswordReset()` | `forgetPassword()` |
| Reset password with token | `authClient.resetPassword()` | `changePassword()` |
| Sign up with email/password | `authClient.signUp.email()` | `register()` |
| Sign in with email/password | `authClient.signIn.email()` | `login()` |
| Sign in with OAuth | `authClient.signIn.social()` | `signInWithProvider()` |

**Example: Password Reset Flow**

```typescript
// Step 1: Request reset email
await authClient.requestPasswordReset({
  email: "user@example.com",
  redirectTo: "/reset-password",
});

// Step 2: User clicks link in email, lands on /reset-password?token=...

// Step 3: Reset password with token
await authClient.resetPassword({
  newPassword: "newsecurepassword",
  token: tokenFromUrl,
});
```

## Authentication Flows

### Email/Password Sign Up

```typescript
await authClient.signUp.email({
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword",
  callbackURL: "/dashboard",
});
```

**Configuration requirements:**
- `emailAndPassword.enabled: true`
- `emailAndPassword.requireEmailVerification: true` (recommended)
- `emailVerification.sendOnSignUp: true`
- Email provider configured (e.g., Resend)

### Email/Password Sign In

```typescript
await authClient.signIn.email({
  email: "john@example.com",
  password: "securepassword",
  callbackURL: "/dashboard",
});
```

**Error handling:**
```typescript
try {
  await authClient.signIn.email({ email, password, callbackURL });
  router.push("/dashboard");
} catch (err) {
  const authError = err as { code?: string; message?: string };

  if (authError.code === "INVALID_CREDENTIALS") {
    setError("Invalid email or password");
  } else if (authError.code === "EMAIL_NOT_VERIFIED") {
    setError("Please verify your email first. Check your inbox for a verification link.");
  } else {
    setError(authError.message || "Something went wrong");
  }
}
```

### OAuth Sign In

```typescript
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

**Configuration requirements:**
- Provider credentials in environment variables
- `socialProviders` configured in `betterAuth()`

## Middleware

Use cookie-only session check in middleware for performance:

```typescript
// src/middleware.ts
import { getSessionCookie } from "better-auth/cookies";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !isPublicRoute(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

**Why cookie-only check:**
- Faster than database lookup
- Sufficient for route protection
- Full session available in server components via `auth.api.getSession()`

## Server Components

Use `auth.api.getSession()` with headers to get full session:

```typescript
import { headers } from "next/headers";
import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return <div>Hello {session.user.name}</div>;
}
```

## Database Integration

Better Auth uses Kysely internally — share the app's Kysely instance:

```typescript
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: { db, type: "postgres" as const },
  // ...
});
```

**Schema notes:**
- Better Auth generates its own Prisma models during setup
- IDs use `String @id` (no `@default(cuid())`) — Better Auth generates IDs at runtime
- `User.emailVerified`, `Account.password`, `Verification` table required for email/password auth

## Security Best Practices

### Password Reset

Always show a generic success message to prevent email enumeration:

```typescript
try {
  await authClient.requestPasswordReset({ email, redirectTo });
  setMessage("If an account exists with that email, we've sent a reset link.");
} catch {
  // Still show success message
  setMessage("If an account exists with that email, we've sent a reset link.");
}
```

### Email Verification

Require email verification for email/password accounts:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
}
```

### Session Management

- Sessions are managed by Better Auth via cookies
- Middleware uses cookie-only check for performance
- Server components validate full session via database when needed
- No manual session handling required
