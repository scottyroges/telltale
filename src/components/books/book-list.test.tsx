import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import type { Book } from "@/domain/book";
import { BookList } from "./book-list";

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    userId: "user-1",
    title: "My Life Story",
    coreMemory: null,
    status: "IN_PROGRESS",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("BookList", () => {
  it("renders books with titles and correct links", () => {
    const books = [
      makeBook({ id: "b1", title: "First Book" }),
      makeBook({ id: "b2", title: "Second Book" }),
    ];

    render(<BookList books={books} />);

    expect(screen.getByText("First Book")).toBeInTheDocument();
    expect(screen.getByText("Second Book")).toBeInTheDocument();

    const links = screen.getAllByRole("link", { name: /open/i });
    expect(links[0]).toHaveAttribute("href", "/book/b1/interviews");
    expect(links[1]).toHaveAttribute("href", "/book/b2/interviews");
  });

  it("shows empty state when books array is empty", () => {
    render(<BookList books={[]} />);

    expect(
      screen.getByText("You don't have any books yet."),
    ).toBeInTheDocument();
  });

  it("empty state links to /books/new", () => {
    render(<BookList books={[]} />);

    const link = screen.getByRole("link", { name: /create your first book/i });
    expect(link).toHaveAttribute("href", "/books/new");
  });
});
