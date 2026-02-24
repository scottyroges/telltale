"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/lib/trpc/client";
import type { User } from "@/domain/types";
import styles from "./admin-users.module.css";

type UserListProps = {
  users: User[];
};

export function UserList({ users }: UserListProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [confirmingAction, setConfirmingAction] = useState<{
    userId: string;
    action: "approve" | "reject";
  } | null>(null);

  const approveMutation = useMutation(
    trpc.admin.approveUser.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setConfirmingAction(null);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.admin.rejectUser.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setConfirmingAction(null);
      },
    })
  );

  const handleApprove = (userId: string) => {
    setConfirmingAction({ userId, action: "approve" });
  };

  const handleReject = (userId: string) => {
    setConfirmingAction({ userId, action: "reject" });
  };

  const confirmAction = () => {
    if (!confirmingAction) return;

    if (confirmingAction.action === "approve") {
      approveMutation.mutate({ userId: confirmingAction.userId });
    } else {
      rejectMutation.mutate({ userId: confirmingAction.userId });
    }
  };

  const cancelAction = () => {
    setConfirmingAction(null);
  };

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    confirmingAction !== null;

  return (
    <>
      <div className={styles.userList}>
        {users.map((user) => (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userEmail}>{user.email}</div>
              <div className={styles.userDate}>
                Signed up: {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className={styles.userActions}>
              <button
                onClick={() => handleApprove(user.id)}
                disabled={isPending}
                className={styles.approveButton}
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(user.id)}
                disabled={isPending}
                className={styles.rejectButton}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmingAction && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Confirm {confirmingAction.action === "approve" ? "Approval" : "Rejection"}</h2>
            <p>
              Are you sure you want to {confirmingAction.action} this user?
            </p>
            <div className={styles.modalActions}>
              <button
                onClick={confirmAction}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={
                  confirmingAction.action === "approve"
                    ? styles.approveButton
                    : styles.rejectButton
                }
              >
                {approveMutation.isPending || rejectMutation.isPending
                  ? "Processing..."
                  : "Confirm"}
              </button>
              <button
                onClick={cancelAction}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
