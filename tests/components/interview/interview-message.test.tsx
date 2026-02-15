import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { InterviewMessage } from "@/components/interview/interview-message";

describe("InterviewMessage", () => {
  it("renders USER message", () => {
    render(<InterviewMessage role="USER" content="Hello, this is my story." />);

    expect(screen.getByText("Hello, this is my story.")).toBeInTheDocument();
  });

  it("renders ASSISTANT message", () => {
    render(
      <InterviewMessage
        role="ASSISTANT"
        content="Tell me more about that experience."
      />
    );

    expect(
      screen.getByText("Tell me more about that experience.")
    ).toBeInTheDocument();
  });

  it("displays message content correctly", () => {
    render(
      <InterviewMessage
        role="USER"
        content="This is a multi-line\nmessage with special characters: !@#$%"
      />
    );

    expect(
      screen.getByText(/This is a multi-line/)
    ).toBeInTheDocument();
  });
});
