import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import GuidePage from "@/app/(app)/guide/page";

describe("GuidePage", () => {
  it("renders the page title", () => {
    render(<GuidePage />);
    expect(
      screen.getByRole("heading", { name: /interview tips/i })
    ).toBeInTheDocument();
  });

  it("displays key guidance principles", () => {
    render(<GuidePage />);

    expect(screen.getByText(/you\u2019re in control/i)).toBeInTheDocument();
    expect(
      screen.getByText(/the ai helps you remember details/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/don\u2019t worry about making it polished/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we\u2019ll craft your story later/i)
    ).toBeInTheDocument();
  });

  it("displays quick tips section", () => {
    render(<GuidePage />);

    expect(
      screen.getByRole("heading", { name: /quick tips/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/try a different question/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/end interview/i)).toBeInTheDocument();
    expect(screen.getByText(/no time limit/i)).toBeInTheDocument();
  });
});
