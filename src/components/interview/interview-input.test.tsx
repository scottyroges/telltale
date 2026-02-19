import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InterviewInput } from "@/components/interview/interview-input";

describe("InterviewInput", () => {
  it("calls onSend when Enter pressed (without Shift)", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput onSend={onSend} isDisabled={false} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Hello world");
    await user.keyboard("{Enter}");

    expect(onSend).toHaveBeenCalledWith("Hello world");
  });

  it("inserts newline when Shift+Enter pressed", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput onSend={onSend} isDisabled={false} />);

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

    render(<InterviewInput onSend={onSend} isDisabled={false} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    await user.type(textarea, "Test message");

    const sendButton = screen.getByRole("button", { name: /send/i });
    await user.click(sendButton);

    expect(onSend).toHaveBeenCalledWith("Test message");
  });

  it("disables textarea when isDisabled={true}", () => {
    render(<InterviewInput onSend={vi.fn()} isDisabled={true} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    expect(textarea).toBeDisabled();
  });

  it("disables Send button when isDisabled={true}", () => {
    render(<InterviewInput onSend={vi.fn()} isDisabled={true} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("disables Send button when textarea is empty", () => {
    render(<InterviewInput onSend={vi.fn()} isDisabled={false} />);

    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();
  });

  it("clears textarea after sending", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();

    render(<InterviewInput onSend={onSend} isDisabled={false} />);

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
    render(<InterviewInput onSend={vi.fn()} isDisabled={false} />);

    const textarea = screen.getByPlaceholderText("Share your story...");
    expect(textarea).toHaveFocus();
  });
});
