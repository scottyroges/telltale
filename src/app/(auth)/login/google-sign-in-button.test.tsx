import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

const { mockSignInSocial } = vi.hoisted(() => ({
  mockSignInSocial: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: mockSignInSocial,
    },
  },
}));

import { GoogleSignInButton } from "./google-sign-in-button";

describe("GoogleSignInButton", () => {
  it("renders a button with correct text", () => {
    render(<GoogleSignInButton />);
    expect(
      screen.getByRole("button", { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it("calls signIn.social with google provider on click", async () => {
    const user = userEvent.setup();
    render(<GoogleSignInButton />);

    await user.click(
      screen.getByRole("button", { name: /continue with google/i }),
    );

    expect(mockSignInSocial).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/dashboard",
    });
  });

  it("shows loading state after click", async () => {
    const user = userEvent.setup();
    mockSignInSocial.mockImplementation(() => {
      // Simulate a delayed OAuth redirect
      return new Promise((resolve) => setTimeout(resolve, 100));
    });

    render(<GoogleSignInButton />);

    const button = screen.getByRole("button", { name: /continue with google/i });
    await user.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/redirecting to google/i);
  });
});
