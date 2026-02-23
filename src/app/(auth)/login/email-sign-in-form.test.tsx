import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { EmailSignInForm } from "./email-sign-in-form";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth client
const { mockSignInEmail } = vi.hoisted(() => ({
  mockSignInEmail: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: mockSignInEmail,
    },
  },
}));

describe("EmailSignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs", () => {
    render(<EmailSignInForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("calls authClient.signIn.email on submit with correct params", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValueOnce({});

    render(<EmailSignInForm />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: "john@example.com",
      password: "password123",
      callbackURL: "/dashboard",
    });
  });

  it("shows error for invalid credentials", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockRejectedValueOnce({ code: "INVALID_CREDENTIALS" });

    render(<EmailSignInForm />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
  });

  it("shows error for unverified email", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockRejectedValueOnce({ code: "EMAIL_NOT_VERIFIED" });

    render(<EmailSignInForm />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/please verify your email first/i),
    ).toBeInTheDocument();
  });

  it("shows generic error for unknown errors", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockRejectedValueOnce({
      message: "Network error occurred",
    });

    render(<EmailSignInForm />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/network error occurred/i),
    ).toBeInTheDocument();
  });

  it("disables button while loading", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<EmailSignInForm />);

    const button = screen.getByRole("button", { name: /sign in/i });

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/signing in/i);
  });

  it("disables all inputs while loading", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<EmailSignInForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText("Password");
    const button = screen.getByRole("button", { name: /sign in/i });

    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");
    await user.click(button);

    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it("redirects to dashboard on successful sign-in", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValueOnce({});

    render(<EmailSignInForm />);

    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
