import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InterviewInput } from "@/components/interview/interview-input";

describe("InterviewInput", () => {
  const defaultProps = {
    onSend: vi.fn(),
    onRedirect: vi.fn(),
    isDisabled: false,
    redirectDisabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls onSend when Enter pressed (without Shift)", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Hello world");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("inserts newline when Shift+Enter pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(
      "Share your story..."
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Line 1{Shift>}{Enter}{/Shift}Line 2");

    expect(textarea.value).toContain("Line 1\nLine 2");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onSend when Send button clicked", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    expect(onSend).toHaveBeenCalledWith("Test message");
  });

  it("disables textarea when isDisabled={true}", () => {
    render(<InterviewInput {...defaultProps} isDisabled={true} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    expect(textarea).toBeDisabled();
  });

  it("disables Send button when isDisabled={true}", () => {
    render(<InterviewInput {...defaultProps} isDisabled={true} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("disables Send button when textarea is empty", () => {
    render(<InterviewInput {...defaultProps} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput {...defaultProps} onSend={onSend} />);

    const textarea = screen.getByPlaceholderText(
      "Share your story..."
    ) as HTMLTextAreaElement;
    await user.type(textarea, "Test message");
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("auto-focuses on mount", () => {
    render(<InterviewInput {...defaultProps} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    expect(textarea).toHaveFocus();
  });

  describe("redirect button", () => {
    it("renders and calls onRedirect when clicked", async () => {
      const user = userEvent.setup();
      const onRedirect = vi.fn();

      render(<InterviewInput {...defaultProps} onRedirect={onRedirect} />);

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      await user.click(redirectButton);

      expect(onRedirect).toHaveBeenCalledOnce();
    });

    it("is disabled when redirectDisabled is true", () => {
      render(<InterviewInput {...defaultProps} redirectDisabled={true} />);

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      expect(redirectButton).toBeDisabled();
    });

    it("is enabled when redirectDisabled is false even if isDisabled is false", () => {
      render(<InterviewInput {...defaultProps} redirectDisabled={false} />);

      const redirectButton = screen.getByRole("button", {
        name: /ask me something else/i,
      });
      expect(redirectButton).not.toBeDisabled();
    });
  });
});
