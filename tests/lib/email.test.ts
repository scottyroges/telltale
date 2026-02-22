// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Resend before importing the module
const mockSend = vi.fn();
vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockSend,
      };
    },
  };
});

vi.mock("server-only", () => ({}));

// Set required env vars for all tests
vi.stubEnv("RESEND_API_KEY", "re_test_key");
vi.stubEnv("EMAIL_FROM", "noreply@telltale.app");

describe("email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendEmail", () => {
    it("calls Resend with correct parameters", async () => {
      mockSend.mockResolvedValue({ data: { id: "test-id" }, error: null });

      const { sendEmail } = await import("@/lib/email");

      await sendEmail("user@example.com", "Test Subject", "<p>Test HTML</p>");

      expect(mockSend).toHaveBeenCalledWith({
        from: "noreply@telltale.app",
        to: "user@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
      });
    });

    it("throws when Resend returns an error", async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: "Invalid API key" },
      });

      const { sendEmail } = await import("@/lib/email");

      await expect(
        sendEmail("user@example.com", "Test Subject", "<p>Test</p>"),
      ).rejects.toThrow("Failed to send email: Invalid API key");
    });
  });

  describe("getVerificationEmailHtml", () => {
    it("returns valid HTML with verification URL", async () => {
      const { getVerificationEmailHtml } = await import("@/lib/email");

      const html = getVerificationEmailHtml(
        "https://telltale.app/verify?token=abc123",
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Telltale");
      expect(html).toContain("Verify Email Address");
      expect(html).toContain('href="https://telltale.app/verify?token=abc123"');
      expect(html).toContain("verify your email");
    });
  });

  describe("getPasswordResetEmailHtml", () => {
    it("returns valid HTML with reset URL", async () => {
      const { getPasswordResetEmailHtml } = await import("@/lib/email");

      const html = getPasswordResetEmailHtml(
        "https://telltale.app/reset-password?token=xyz789",
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Telltale");
      expect(html).toContain("Reset Password");
      expect(html).toContain(
        'href="https://telltale.app/reset-password?token=xyz789"',
      );
      expect(html).toContain("reset your password");
    });
  });
});
