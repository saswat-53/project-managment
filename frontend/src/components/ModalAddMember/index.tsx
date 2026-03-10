"use client";

import Modal from "@/components/Modal";
import {
  useGetWorkspaceMembersQuery,
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useRemoveProjectMemberMutation,
} from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState } from "react";
import { Trash2 } from "lucide-react";

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
  const [updateProject, { isLoading: isAdding }] = useUpdateProjectMutation();
  const [removeProjectMember] = useRemoveProjectMemberMutation();

  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const currentMembers = (project?.members as any[]) ?? [];
  const projectMemberIds = new Set(
    currentMembers.map((m) => (typeof m === "string" ? m : m._id)),
  );
  const eligibleMembers = workspaceMembers.filter(
    (m) => !projectMemberIds.has(m._id),
  );

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleAdd = async (e: React.FormEvent) => {
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

  const handleRemove = async (memberId: string) => {
    setFeedback(null);
    setRemovingId(memberId);
    try {
      await removeProjectMember({ projectId, memberId }).unwrap();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.data?.message ?? "Failed to remove member." });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Manage Project Members">
      <div className="mt-4 space-y-6">
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

        {/* Current Members */}
        {currentMembers.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Current Members
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {currentMembers.map((member: any) => {
                const id = typeof member === "string" ? member : member._id;
                const name = typeof member === "string" ? id : member.name;
                const email = typeof member === "string" ? "" : member.email;
                const avatar = typeof member === "string" ? null : member.avatarUrl;
                const isRemoving = removingId === id;

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between rounded-md border border-gray-200 p-3 dark:border-stroke-dark"
                  >
                    <div className="flex items-center gap-2">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-zinc-950">
                          {name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium dark:text-white">{name}</p>
                        {email && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(id)}
                      disabled={isRemoving}
                      title="Remove from project"
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Members */}
        <form onSubmit={handleAdd} className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Add Members
          </p>
          {eligibleMembers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All workspace members are already in this project.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2">
              {eligibleMembers.map((member) => (
                <label
                  key={member._id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50 dark:border-stroke-dark dark:hover:bg-dark-tertiary"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(member._id)}
                    onChange={() => toggle(member._id)}
                    className="h-4 w-4 rounded border-gray-300 accent-amber-400"
                  />
                  <div className="flex items-center gap-2">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-zinc-950">
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

          {eligibleMembers.length > 0 && (
            <button
              type="submit"
              disabled={selected.length === 0 || isAdding}
              className="flex w-full justify-center rounded-md border border-transparent bg-amber-400 px-4 py-2 text-base font-medium text-zinc-950 shadow-sm hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAdding
                ? "Adding..."
                : selected.length > 0
                  ? `Add ${selected.length} Member${selected.length > 1 ? "s" : ""}`
                  : "Select members above"}
            </button>
          )}
        </form>
      </div>
    </Modal>
  );
};

export default ModalAddMember;
