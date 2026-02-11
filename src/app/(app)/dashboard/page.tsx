import { headers } from "next/headers";
import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return <h1>Welcome, {session?.user.name}</h1>;
}
