import { serverTRPC } from "@/lib/trpc/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AccessDenied } from "@/components/admin/access-denied";
import { UserList } from "./user-list";
import styles from "./admin-users.module.css";

export default async function AdminUsersPage() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return <AccessDenied />;
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
