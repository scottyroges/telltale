import "server-only";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { userRepository } from "@/repositories/user.repository";
import type { User } from "@/domain/types";

/**
 * Server-side helper to require admin role for a page.
 *
 * Usage in Server Components:
 * ```tsx
 * export default async function AdminPage() {
 *   const adminUser = await requireAdmin();
 *   if (!adminUser) {
 *     return <AccessDenied />;
 *   }
 *   // ... admin page content
 * }
 * ```
 *
 * @returns User object if admin, null if not admin (redirects if not authenticated)
 */
export async function requireAdmin(): Promise<User | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect unauthenticated users to home
  if (!session?.user?.id) {
    redirect("/");
  }

  // Check if user has admin role
  const user = await userRepository.findById(session.user.id);

  if (!user || user.role !== "ADMIN") {
    return null;
  }

  return user;
}
