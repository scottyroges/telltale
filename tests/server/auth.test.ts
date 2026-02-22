// @vitest-environment node
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  db: {},
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
}));

vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");
vi.stubEnv("RESEND_API_KEY", "test-resend-key");

describe("auth config", () => {
  it("exports an auth instance with expected API methods", async () => {
    const { auth } = await import("@/server/auth");

    expect(auth).toBeDefined();
    expect(auth.api).toBeDefined();
    expect(auth.api.getSession).toBeTypeOf("function");
    expect(auth.handler).toBeTypeOf("function");
  });

  it("enables email and password authentication", async () => {
    const { auth } = await import("@/server/auth");

    expect(auth).toBeDefined();
    // Verify the config was set (Better Auth internals don't expose config directly,
    // so we verify behavior via API endpoints existence)
    expect(auth.api).toHaveProperty("signUpEmail");
    expect(auth.api).toHaveProperty("signInEmail");
  });

  it("configures email verification", async () => {
    const { auth } = await import("@/server/auth");

    expect(auth.api).toHaveProperty("sendVerificationEmail");
  });
});
