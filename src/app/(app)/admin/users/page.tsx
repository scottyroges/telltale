import { redirect } from "next/navigation";
import { serverTRPC } from "@/lib/trpc/server";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import { userRepository } from "@/repositories/user.repository";
import { UserList } from "./user-list";
import styles from "./admin-users.module.css";

export default async function AdminUsersPage() {
  // Check if user is admin
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await userRepository.findById(session.user.id);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const trpc = await serverTRPC();
  const pendingUsers = await trpc.admin.getPendingUsers();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Pending User Approvals</h1>
      {pendingUsers.length === 0 ? (
        <p className={styles.emptyState}>No pending users</p>
      ) : (
        <UserList users={pendingUsers} />
      )}
    </div>
  );
}
