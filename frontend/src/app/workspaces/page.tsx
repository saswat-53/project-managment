"use client";

import React, { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useLogoutMutation,
  Workspace,
} from "@/state/api";
import { setActiveWorkspaceId } from "@/state";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import ModalInviteMember from "@/components/ModalInviteMember";

export default function WorkspacesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);

  const { data: workspaces, isLoading, isError } = useGetWorkspacesQuery();
  const [createWorkspace, { isLoading: isCreating }] =
    useCreateWorkspaceMutation();
  const [deleteWorkspace] = useDeleteWorkspaceMutation();
  const [logout] = useLogoutMutation();

  const [showModal, setShowModal] = useState(false);
  const [wsName, setWsName] = useState("");
  const [wsDesc, setWsDesc] = useState("");
  const [createError, setCreateError] = useState("");

  const [invitingWorkspaceId, setInvitingWorkspaceId] = useState<string | null>(null);

  const handleSelect = (workspace: Workspace) => {
    dispatch(setActiveWorkspaceId(workspace._id));
    router.push("/dashboard");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      await createWorkspace({ name: wsName, description: wsDesc }).unwrap();
      setWsName("");
      setWsDesc("");
      setShowModal(false);
    } catch (err: any) {
      setCreateError(err?.data?.message || "Failed to create workspace.");
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    await deleteWorkspace(workspaceId).unwrap();
    if (activeWorkspaceId === workspaceId) {
      dispatch(setActiveWorkspaceId(null));
    }
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {}
    dispatch(setActiveWorkspaceId(null));
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen bg-white font-mono text-gray-900 dark:bg-dark-bg dark:text-white">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between border-b border-gray-200 px-8 py-5 dark:border-stroke-dark">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-amber-400">
            <div className="h-3 w-3 bg-amber-400" />
          </div>
          <span className="text-base font-bold uppercase tracking-widest text-gray-900 dark:text-white">
            ProjectFlow
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="border border-gray-200 px-5 py-2.5 text-sm uppercase tracking-[0.15em] text-gray-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 dark:border-stroke-dark dark:text-zinc-500"
        >
          Sign Out
        </button>
      </header>

      {/* ── Main ───────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-5xl px-8 py-16">
        {/* Title block */}
        <div className="mb-14">
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-zinc-500">
            — Select workspace
          </p>
          <h1 className="text-5xl font-light text-gray-900 dark:text-white">
            Your <span className="text-amber-400">bases</span>
          </h1>
          <div className="mt-4 h-px w-12 bg-amber-400" />
          <p className="mt-4 text-base text-gray-500 dark:text-zinc-400">
            Choose a workspace to enter, or create a new one.
          </p>
        </div>

        {/* Create button */}
        <div className="mb-10 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            {workspaces ? `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}` : ""}
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="group flex items-center gap-2 border border-amber-400/40 px-6 py-3 text-sm uppercase tracking-[0.15em] text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-400 hover:text-zinc-950"
          >
            <span className="text-lg leading-none">+</span>
            New Workspace
          </button>
        </div>

        {/* States */}
        {isLoading && (
          <div className="flex items-center gap-3 py-20 text-zinc-600">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-400" />
            <span className="text-sm uppercase tracking-widest">Loading...</span>
          </div>
        )}

        {isError && (
          <div className="border border-red-800 bg-red-950/30 px-6 py-4">
            <p className="text-sm text-red-400">Failed to load workspaces.</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && workspaces?.length === 0 && (
          <div className="relative border border-dashed border-gray-200 px-8 py-20 text-center dark:border-stroke-dark">
            <div className="absolute left-4 top-4 h-6 w-6 border-l border-t border-gray-200 dark:border-stroke-dark" />
            <div className="absolute bottom-4 right-4 h-6 w-6 border-b border-r border-gray-200 dark:border-stroke-dark" />
            <p className="text-4xl text-zinc-800">[ ]</p>
            <p className="mt-4 text-base text-gray-500 dark:text-zinc-500">No workspaces yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-6 border border-amber-400/30 px-6 py-2.5 text-sm uppercase tracking-[0.15em] text-amber-400 transition-all hover:border-amber-400"
            >
              Create first workspace
            </button>
          </div>
        )}

        {/* Workspace grid */}
        {!isLoading && workspaces && workspaces.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws, i) => (
              <WorkspaceCard
                key={ws._id}
                workspace={ws}
                index={i}
                onSelect={handleSelect}
                onDelete={handleDeleteWorkspace}
                onInvite={(id) => setInvitingWorkspaceId(id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Invite Modal ───────────────────────────────────── */}
      {invitingWorkspaceId && (
        <ModalInviteMember
          workspaceId={invitingWorkspaceId}
          isOpen={!!invitingWorkspaceId}
          onClose={() => setInvitingWorkspaceId(null)}
        />
      )}

      {/* ── Create Modal ───────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-6 backdrop-blur-sm dark:bg-dark-bg/90"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="relative w-full max-w-[440px] border border-gray-200 bg-gray-50 p-10 dark:border-dark-tertiary dark:bg-dark-secondary">
            <div className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-amber-400" />
            <div className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-amber-400" />

            <div className="mb-8">
              <h2 className="text-xl font-light text-gray-900 dark:text-white">New Workspace</h2>
              <div className="mt-3 h-px w-8 bg-amber-400" />
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  required
                  placeholder="e.g. Acme Corp"
                  className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                  Description
                </label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="Optional — what's this workspace for?"
                  rows={3}
                  className="w-full resize-none border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
                />
              </div>

              {createError && (
                <p className="text-sm text-red-400">{createError}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 py-3 text-sm uppercase tracking-[0.15em] text-gray-500 transition-all hover:border-zinc-500 hover:text-zinc-300 dark:border-stroke-dark dark:text-zinc-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !wsName}
                  className="flex-1 bg-amber-400 py-3 text-sm font-bold uppercase tracking-[0.15em] text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Workspace Card Component ──────────────────────────────────────────────────

function WorkspaceCard({
  workspace,
  index,
  onSelect,
  onDelete,
  onInvite,
}: {
  workspace: Workspace;
  index: number;
  onSelect: (ws: Workspace) => void;
  onDelete: (workspaceId: string) => Promise<void>;
  onInvite: (workspaceId: string) => void;
}) {
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const myRole = workspace.myRole;
  const isAdmin = myRole === "admin";
  const canInvite = myRole === "admin" || myRole === "manager";

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    setDeleteError("");
    try {
      await onDelete(workspace._id);
    } catch (err: any) {
      setDeleteError(err?.data?.message || "Failed to delete.");
      setIsDeleting(false);
      setIsDeleteConfirming(false);
    }
  };

  return (
    <div
      onClick={() => !isDeleteConfirming && onSelect(workspace)}
      className="group relative cursor-pointer border border-gray-200 bg-gray-50/50 p-7 text-left transition-all duration-200 hover:border-amber-400/50 hover:bg-gray-50 dark:border-stroke-dark dark:bg-dark-secondary/50 dark:hover:bg-dark-secondary"
    >
      {/* Index badge */}
      <div className="absolute right-4 top-4 text-xs text-zinc-700 transition-colors group-hover:text-amber-400/50">
        {String(index + 1).padStart(2, "0")}
      </div>

      {/* Top accent line */}
      <div className="absolute left-0 top-0 h-px w-0 bg-amber-400 transition-all duration-300 group-hover:w-full" />

      {/* Icon */}
      <div className="mb-5 flex h-11 w-11 items-center justify-center border border-gray-200 transition-colors group-hover:border-amber-400/40 dark:border-stroke-dark">
        <span className="text-xl text-zinc-600 transition-colors group-hover:text-amber-400">
          ⬡
        </span>
      </div>

      {/* Content */}
      <h3 className="mb-2 text-base font-bold uppercase tracking-wide text-gray-900 transition-colors group-hover:text-amber-400 dark:text-white">
        {workspace.name}
      </h3>

      {workspace.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-500 dark:text-zinc-500">
          {workspace.description}
        </p>
      )}

      {deleteError && (
        <p className="mb-2 text-xs text-red-400">{deleteError}</p>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t border-gray-200 pt-4 transition-colors group-hover:border-gray-200 dark:border-stroke-dark dark:group-hover:border-stroke-dark"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left — delete (admins) / invite (admins + managers) or member count */}
        {isAdmin || canInvite ? (
          isDeleteConfirming ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs uppercase tracking-[0.15em] text-red-400 hover:text-red-300 disabled:opacity-50"
              >
                {isDeleting ? "..." : "Confirm"}
              </button>
              <button
                onClick={() => { setIsDeleteConfirming(false); setDeleteError(""); }}
                disabled={isDeleting}
                className="text-xs uppercase tracking-[0.15em] text-zinc-600 hover:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 opacity-0 transition-all group-hover:opacity-100">
              {canInvite && (
                <button
                  onClick={(e) => { e.stopPropagation(); onInvite(workspace._id); }}
                  className="text-zinc-600 hover:text-amber-400"
                  title="Invite member"
                >
                  <UserPlus size={14} />
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setIsDeleteConfirming(true)}
                  className="text-zinc-600 hover:text-red-400"
                  title="Delete workspace"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        ) : (
          <span className="text-xs uppercase tracking-[0.15em] text-gray-500 dark:text-zinc-500">
            {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""}
          </span>
        )}

        {/* Right — Enter */}
        <span className="text-xs uppercase tracking-[0.15em] text-zinc-600 transition-colors group-hover:text-amber-400">
          Enter →
        </span>
      </div>
    </div>
  );
}
