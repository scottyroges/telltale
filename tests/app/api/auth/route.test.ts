// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

describe("auth API route", () => {
  it("exports GET and POST handlers", async () => {
    const route = await import("@/app/api/auth/[...all]/route");

    expect(route.GET).toBeTypeOf("function");
    expect(route.POST).toBeTypeOf("function");
  });
});
