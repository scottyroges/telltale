import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SmokeButton } from "./smoke-button";

describe("SmokeButton", () => {
  it("renders with initial text", () => {
    render(<SmokeButton />);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("changes text when clicked", async () => {
    const user = userEvent.setup();
    render(<SmokeButton />);

    await user.click(screen.getByRole("button", { name: "Click me" }));

    expect(screen.getByRole("button", { name: "Clicked!" })).toBeInTheDocument();
  });
});
