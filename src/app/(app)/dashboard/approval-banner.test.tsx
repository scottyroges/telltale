import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ApprovalBanner } from "./approval-banner";

describe("ApprovalBanner", () => {
  it("renders pending approval message", () => {
    render(<ApprovalBanner />);

    expect(screen.getByText("Account Pending Approval")).toBeInTheDocument();
    expect(
      screen.getByText(/your account is awaiting approval/i),
    ).toBeInTheDocument();
  });

  it("explains what users can and cannot do", () => {
    render(<ApprovalBanner />);

    expect(
      screen.getByText(/you can browse books and questions/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/won't be able to start interviews/i),
    ).toBeInTheDocument();
  });

  it("shows hourglass icon", () => {
    render(<ApprovalBanner />);

    expect(screen.getByText("⏳")).toBeInTheDocument();
  });
});
