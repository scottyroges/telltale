import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Interview } from "@/domain/interview";
import { InterviewList } from "./interview-list";

function makeInterview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: "int-1",
    bookId: "book-1",
    topic: "My childhood memories",
    status: "ACTIVE",
    completedAt: null,
    createdAt: new Date("2025-06-15"),
    updatedAt: new Date("2025-06-15"),
    ...overrides,
  };
}

describe("InterviewList", () => {
  it("shows empty state when no interviews", () => {
    render(<InterviewList interviews={[]} />);

    expect(
      screen.getByText(/no interviews yet/i),
    ).toBeInTheDocument();
  });

  it("renders interview topics", () => {
    render(
      <InterviewList
        interviews={[
          makeInterview({ id: "int-1", topic: "My first day of school" }),
          makeInterview({ id: "int-2", topic: "Summer vacations" }),
        ]}
      />,
    );

    expect(screen.getByText("My first day of school")).toBeInTheDocument();
    expect(screen.getByText("Summer vacations")).toBeInTheDocument();
  });

  it("shows Active status with dot for ACTIVE interviews", () => {
    render(
      <InterviewList
        interviews={[makeInterview({ status: "ACTIVE" })]}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Active status with dot for PAUSED interviews", () => {
    render(
      <InterviewList
        interviews={[makeInterview({ status: "PAUSED" })]}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows Completed status with checkmark for COMPLETE interviews", () => {
    render(
      <InterviewList
        interviews={[
          makeInterview({ status: "COMPLETE", completedAt: new Date() }),
        ]}
      />,
    );

    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("links each item to /interview/{id}", () => {
    render(
      <InterviewList
        interviews={[
          makeInterview({ id: "int-42" }),
          makeInterview({ id: "int-99" }),
        ]}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/interview/int-42");
    expect(links[1]).toHaveAttribute("href", "/interview/int-99");
  });

  it("shows formatted date", () => {
    const date = new Date("2025-06-15T12:00:00");
    render(
      <InterviewList
        interviews={[makeInterview({ createdAt: date })]}
      />,
    );

    expect(
      screen.getByText(date.toLocaleDateString()),
    ).toBeInTheDocument();
  });
});
