import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { mockRefresh, mockApproveMutate, mockRejectMutate } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
  mockApproveMutate: vi.fn(),
  mockRejectMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@/lib/trpc/client", () => ({
  useTRPC: () => ({
    admin: {
      approveUser: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockApproveMutate,
          ...opts,
        }),
      },
      rejectUser: {
        mutationOptions: (opts: Record<string, unknown>) => ({
          mutationFn: mockRejectMutate,
          ...opts,
        }),
      },
    },
  }),
}));

import { UserList } from "./user-list";

const mockUsers = [
  {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    approvalStatus: "PENDING" as const,
    role: "USER" as const,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "user-2",
    name: "Another User",
    email: "another@example.com",
    emailVerified: true,
    image: null,
    approvalStatus: "PENDING" as const,
    role: "USER" as const,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
];

function renderUserList(users = mockUsers) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserList users={users} />
    </QueryClientProvider>,
  );
}

describe("UserList", () => {
  beforeEach(() => {
    mockRefresh.mockReset();
    mockApproveMutate.mockReset();
    mockRejectMutate.mockReset();
  });

  it("renders list of pending users", () => {
    renderUserList();

    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("Another User")).toBeInTheDocument();
    expect(screen.getByText("another@example.com")).toBeInTheDocument();
  });

  it("shows formatted signup dates", () => {
    renderUserList();

    // Date format varies by timezone, just check dates are shown for both users
    const dateElements = screen.getAllByText(/Signed up:/);
    expect(dateElements).toHaveLength(2);
  });

  it("shows approve and reject buttons for each user", () => {
    renderUserList();

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });

    expect(approveButtons).toHaveLength(2);
    expect(rejectButtons).toHaveLength(2);
  });

  it("shows confirmation modal when approve is clicked", async () => {
    const user = userEvent.setup();
    renderUserList();

    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]!);

    expect(screen.getByText("Confirm Approval")).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to approve/i)).toBeInTheDocument();
  });

  it("shows confirmation modal when reject is clicked", async () => {
    const user = userEvent.setup();
    renderUserList();

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]!);

    expect(screen.getByText("Confirm Rejection")).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to reject/i)).toBeInTheDocument();
  });

  it("approves user when confirmed", async () => {
    mockApproveMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderUserList();

    // Click approve button
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]!);

    // Confirm in modal
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockApproveMutate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("rejects user when confirmed", async () => {
    mockRejectMutate.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderUserList();

    // Click reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await user.click(rejectButtons[0]!);

    // Confirm in modal
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockRejectMutate).toHaveBeenCalledWith(
        { userId: "user-1" },
        expect.anything(),
      );
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("closes modal when cancel is clicked", async () => {
    const user = userEvent.setup();
    renderUserList();

    // Open modal
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]!);

    expect(screen.getByText("Confirm Approval")).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Confirm Approval")).not.toBeInTheDocument();
    });
  });

  it("disables buttons while mutation is pending", async () => {
    let resolveApprove: (value: unknown) => void;
    mockApproveMutate.mockReturnValue(
      new Promise((resolve) => {
        resolveApprove = resolve;
      }),
    );
    const user = userEvent.setup();
    renderUserList();

    // Click approve and confirm
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    await user.click(approveButtons[0]!);

    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    await user.click(confirmButton);

    // Buttons should be disabled
    await waitFor(() => {
      expect(screen.getByText("Processing...")).toBeInTheDocument();
    });

    // All action buttons should be disabled
    const allButtons = screen.getAllByRole("button");
    allButtons.forEach((button) => {
      expect(button).toBeDisabled();
    });

    resolveApprove!(undefined);
  });

  it("renders empty list when no users", () => {
    renderUserList([]);

    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });
});
