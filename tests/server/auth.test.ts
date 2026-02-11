// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

describe("auth config", () => {
  it("exports an auth instance with expected API methods", async () => {
    const { auth } = await import("@/server/auth");

    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
    expect(auth.api.getSession).toBeTypeOf("function");
    expect(auth.handler).toBeTypeOf("function");
  });
});
