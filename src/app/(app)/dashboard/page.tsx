import { serverTRPC } from "@/lib/trpc/server";

export default async function DashboardPage() {
  const trpc = await serverTRPC();
  const { status, user, timestamp } = await trpc.health.dbCheck();

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <dl>
        <dt>User ID</dt>
        <dd>{user.id}</dd>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>DB Status</dt>
        <dd>{status}</dd>
        <dt>Timestamp</dt>
        <dd>{timestamp.toISOString()}</dd>
      </dl>
    </div>
  );
}
