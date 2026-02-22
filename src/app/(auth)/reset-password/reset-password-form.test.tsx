import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import ResetPasswordPage from "./page";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams("?token=test-token"),
}));

// Mock auth client
const { mockResetPassword } = vi.hoisted(() => ({
  mockResetPassword: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    resetPassword: mockResetPassword,
  },
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders password inputs", () => {
    render(<ResetPasswordPage />);

    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("calls authClient.resetPassword with token from URL", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValueOnce({});

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), "newpassword123");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(mockResetPassword).toHaveBeenCalledWith({
      newPassword: "newpassword123",
      token: "test-token",
    });
  });

  it("validates passwords match before submit", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("validates password length before submit", async () => {
    const user = userEvent.setup();

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it("shows error for invalid/expired token", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockRejectedValueOnce({ message: "Token has expired" });

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/this reset link has expired or is invalid/i)).toBeInTheDocument();
  });

  it("redirects to login on success", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValueOnce({});

    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText(/new password/i), "newpassword123");
    await user.type(screen.getByLabelText(/confirm password/i), "newpassword123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login?message=password-reset");
    });
  });
});
