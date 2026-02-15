import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockPush, mockMutate } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    book: {
      create: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockMutate,
          ...opts,
        }),
      },
    },
  }),
}));

import { CreateBookForm } from "./create-book-form";

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateBookForm />
    </QueryClientProvider>,
  );
}

describe("CreateBookForm", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockMutate.mockReset();
  });

  it("submits title via mutation and navigates on success", async () => {
    mockMutate.mockResolvedValue({ id: "new-book-id" });
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/title/i), "My Story");
    await user.click(screen.getByRole("button", { name: /create book/i }));

    expect(mockMutate.mock.calls[0][0]).toEqual({ title: "My Story" });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/book/new-book-id/interviews");
    });
  });

  it("disables button while submitting", async () => {
    let resolveMutate: (value: unknown) => void;
    mockMutate.mockReturnValue(
      new Promise((resolve) => {
        resolveMutate = resolve;
      }),
    );
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/title/i), "My Story");
    await user.click(screen.getByRole("button", { name: /create book/i }));

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveTextContent("Creating…");

    resolveMutate!({ id: "book-1" });
    await waitFor(() => {
      expect(screen.getByRole("button")).toBeEnabled();
    });
  });

  it("shows error message on mutation failure", async () => {
    mockMutate.mockRejectedValue(new Error("Something went wrong"));
    const user = userEvent.setup();

    renderForm();

    await user.type(screen.getByLabelText(/title/i), "My Story");
    await user.click(screen.getByRole("button", { name: /create book/i }));

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
  });
});
