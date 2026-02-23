import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { PasswordInput } from "@/components/ui/password-input";

describe("PasswordInput", () => {
  it("renders with label and password field", () => {
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Test Password"
        value=""
        onChange={mockOnChange}
      />
    );

    expect(screen.getByLabelText("Test Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Test Password")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("toggles password visibility when button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value="secret123"
        onChange={mockOnChange}
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    const toggleButton = screen.getByLabelText("Show password");

    // Initially hidden
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click to show
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Hide password")).toBeInTheDocument();

    // Click to hide again
    await user.click(screen.getByLabelText("Hide password"));
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(screen.getByLabelText("Show password")).toBeInTheDocument();
  });

  it("calls onChange when value is updated", async () => {
    const user = userEvent.setup();
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value=""
        onChange={mockOnChange}
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    await user.type(passwordInput, "test");

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("respects required and minLength props", () => {
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value=""
        onChange={mockOnChange}
        required
        minLength={8}
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toBeRequired();
    expect(passwordInput).toHaveAttribute("minLength", "8");
  });

  it("applies custom className when provided", () => {
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value=""
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveClass("custom-class");
  });

  it("applies autocomplete attribute when provided", () => {
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value=""
        onChange={mockOnChange}
        autoComplete="current-password"
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("autoComplete", "current-password");
  });

  it("disables input and toggle button when disabled prop is true", () => {
    const mockOnChange = vi.fn();
    render(
      <PasswordInput
        id="test-password"
        label="Password"
        value=""
        onChange={mockOnChange}
        disabled
      />
    );

    const passwordInput = screen.getByLabelText("Password");
    const toggleButton = screen.getByLabelText("Show password");

    expect(passwordInput).toBeDisabled();
    expect(toggleButton).toBeDisabled();
  });
});
