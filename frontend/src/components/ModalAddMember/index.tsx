"use client";

import Modal from "@/components/Modal";
import {
  useGetWorkspaceMembersQuery,
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
} from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
};

const ModalAddMember = ({ isOpen, onClose, projectId }: Props) => {
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const { data: workspaceMembers = [] } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId },
  );
  const { data: project } = useGetProjectByIdQuery(projectId, {
    skip: !projectId,
  });
  const [updateProject, { isLoading }] = useUpdateProjectMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Only show workspace members not already in the project
  const projectMemberIds = new Set(
    (project?.members as any[])?.map((m) =>
      typeof m === "string" ? m : m._id,
    ) ?? [],
  );
  const eligibleMembers = workspaceMembers.filter(
    (m) => !projectMemberIds.has(m._id),
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (selected.length === 0) return;

    try {
      await updateProject({ projectId, members: selected }).unwrap();
      setFeedback({ type: "success", message: `${selected.length} member(s) added.` });
      setSelected([]);
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.data?.message ?? "Failed to add members." });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Add Members to Project">
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        {feedback && (
          <div
            className={`rounded px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {eligibleMembers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            All workspace members are already in this project.
          </p>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {eligibleMembers.map((member) => (
              <label
                key={member._id}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(member._id)}
                  onChange={() => toggle(member._id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-primary"
                />
                <div className="flex items-center gap-2">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-primary text-xs font-bold text-white">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium dark:text-white">{member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <button
          type="submit"
          disabled={selected.length === 0 || isLoading}
          className="mt-2 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading
            ? "Adding..."
            : selected.length > 0
              ? `Add ${selected.length} Member${selected.length > 1 ? "s" : ""}`
              : "Select members above"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalAddMember;
