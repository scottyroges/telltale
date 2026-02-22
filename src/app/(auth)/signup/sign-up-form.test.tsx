import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

// Mock router
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock auth client
const { mockSignUpEmail } = vi.hoisted(() => ({
  mockSignUpEmail: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signUp: {
      email: mockSignUpEmail,
    },
  },
}));

describe("SignUpForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
  });

  it("calls authClient.signUp.email on submit", async () => {
    const user = userEvent.setup();
    mockSignUpEmail.mockResolvedValueOnce({});

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(mockSignUpEmail).toHaveBeenCalledWith({
      name: "John Doe",
      email: "john@example.com",
      password: "password123",
      callbackURL: "/dashboard",
    });
  });

  it("validates passwords match before submit", async () => {
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "different");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("validates password length before submit", async () => {
    const user = userEvent.setup();

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "short");
    await user.type(screen.getByLabelText(/confirm password/i), "short");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    expect(mockSignUpEmail).not.toHaveBeenCalled();
  });

  it("shows error when user already exists", async () => {
    const user = userEvent.setup();
    mockSignUpEmail.mockRejectedValueOnce({ code: "USER_ALREADY_EXISTS" });

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByText(/an account with this email already exists/i)).toBeInTheDocument();
  });

  it("redirects to check-email page on success", async () => {
    const user = userEvent.setup();
    mockSignUpEmail.mockResolvedValueOnce({});

    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await vi.waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/signup/check-email?email=john%40example.com");
    });
  });

  it("disables button while loading", async () => {
    const user = userEvent.setup();
    mockSignUpEmail.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<SignUpForm />);

    const button = screen.getByRole("button", { name: /sign up/i });

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/^email$/i), "john@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/creating account/i);
  });
});
