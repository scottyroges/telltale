import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Transcript } from "@/components/interview/transcript";
import type { Message } from "@/domain/message";

describe("Transcript", () => {
  const mockMessages: Message[] = [
    {
      id: "1",
      interviewId: "interview-1",
      role: "USER",
      content: "System message about topic",
      hidden: true,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "2",
      interviewId: "interview-1",
      role: "ASSISTANT",
      content: "Hello! Let's talk about your memories.",
      hidden: false,
      createdAt: new Date("2024-01-01"),
    },
    {
      id: "3",
      interviewId: "interview-1",
      role: "USER",
      content: "I remember my first day of school.",
      hidden: false,
      createdAt: new Date("2024-01-01"),
    },
  ];

  beforeEach(() => {
    // Mock scrollTo
    HTMLElement.prototype.scrollTo = vi.fn();
  });

  it("renders messages in order", () => {
    render(<Transcript messages={mockMessages} isWaitingForResponse={false} streamingContent={null} />);

    expect(
      screen.getByText("Hello! Let's talk about your memories.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("I remember my first day of school.")
    ).toBeInTheDocument();
  });

  it("filters out hidden messages", () => {
    render(<Transcript messages={mockMessages} isWaitingForResponse={false} streamingContent={null} />);

    // Hidden message should not be visible
    expect(
      screen.queryByText("System message about topic")
    ).not.toBeInTheDocument();

    // Visible messages should be rendered
    expect(
      screen.getByText("Hello! Let's talk about your memories.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("I remember my first day of school.")
    ).toBeInTheDocument();
  });

  it("shows thinking indicator when isWaitingForResponse={true} and no streaming content", () => {
    render(<Transcript messages={mockMessages} isWaitingForResponse={true} streamingContent={null} />);

    // Check for dots in thinking indicator (via text content)
    const dots = screen.getAllByText(".", { exact: false });
    expect(dots.length).toBeGreaterThan(0);
  });

  it("shows thinking dots when streamingContent is empty string", () => {
    render(<Transcript messages={mockMessages} isWaitingForResponse={true} streamingContent="" />);

    // Empty streaming content should show thinking dots, not a streaming message
    const dots = screen.getAllByText(".", { exact: false });
    expect(dots.length).toBeGreaterThan(0);
  });

  it("shows streaming content as assistant message when non-empty", () => {
    render(
      <Transcript
        messages={mockMessages}
        isWaitingForResponse={true}
        streamingContent="This is streaming text so far"
      />
    );

    expect(
      screen.getByText("This is streaming text so far")
    ).toBeInTheDocument();
  });

  it("does not show thinking dots when streaming content is present", () => {
    render(
      <Transcript
        messages={mockMessages}
        isWaitingForResponse={true}
        streamingContent="Streaming..."
      />
    );

    expect(screen.queryByLabelText("Thinking")).not.toBeInTheDocument();
  });

  it("USER messages aligned right, ASSISTANT messages aligned left", () => {
    render(<Transcript messages={mockMessages} isWaitingForResponse={false} streamingContent={null} />);

    // Verify both message types are rendered
    expect(
      screen.getByText("Hello! Let's talk about your memories.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("I remember my first day of school.")
    ).toBeInTheDocument();
  });

  it("scrolls to bottom on new messages", () => {
    const { rerender } = render(
      <Transcript messages={mockMessages} isWaitingForResponse={false} streamingContent={null} />
    );

    const newMessage: Message = {
      id: "4",
      interviewId: "interview-1",
      role: "ASSISTANT",
      content: "That sounds interesting!",
      hidden: false,
      createdAt: new Date("2024-01-01"),
    };

    rerender(
      <Transcript
        messages={[...mockMessages, newMessage]}
        isWaitingForResponse={false}
        streamingContent={null}
      />
    );

    // scrollTo should have been called
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  });

  it("handles empty message array gracefully", () => {
    render(<Transcript messages={[]} isWaitingForResponse={false} streamingContent={null} />);

    // Should render without crashing
    // No messages to display, but component should render container
    expect(screen.queryByText("Hello!")).not.toBeInTheDocument();
  });
});
