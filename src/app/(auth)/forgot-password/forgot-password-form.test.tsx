import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ForgotPasswordPage from "./page";

// Mock auth client
const { mockRequestPasswordReset } = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mockRequestPasswordReset,
  },
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("calls authClient.requestPasswordReset on submit", async () => {
    const user = userEvent.setup();
    mockRequestPasswordReset.mockResolvedValueOnce({});

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(mockRequestPasswordReset).toHaveBeenCalledWith({
      email: "john@example.com",
      redirectTo: "/reset-password",
    });
  });

  it("shows generic success message after submit", async () => {
    const user = userEvent.setup();
    mockRequestPasswordReset.mockResolvedValueOnce({});

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/if an account exists with that email/i)).toBeInTheDocument();
  });

  it("shows generic success message even on error", async () => {
    const user = userEvent.setup();
    mockRequestPasswordReset.mockRejectedValueOnce(new Error("User not found"));

    render(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "nonexistent@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    // Should show success message to prevent email enumeration
    expect(await screen.findByText(/if an account exists with that email/i)).toBeInTheDocument();
  });
});
