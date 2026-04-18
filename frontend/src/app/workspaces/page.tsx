"use client";

import React, { useState } from "react";
import { LogOut, Plus, Trash2, UserPlus, X } from "lucide-react";
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
  const [createWorkspace, { isLoading: isCreating }] = useCreateWorkspaceMutation();
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
    if (activeWorkspaceId === workspaceId) dispatch(setActiveWorkspaceId(null));
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {}
    dispatch(setActiveWorkspaceId(null));
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-dark-bg font-mono text-white">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-zinc-700 px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-amber-400">
            <div className="h-3 w-3 bg-amber-400" />
          </div>
          <span className="text-sm font-bold uppercase tracking-widest text-white">
            ProjectFlow
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-5xl px-8 py-16">
        {/* Hero */}
        <div className="mb-12">
          <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-zinc-600">
            — select workspace
          </p>
          <h1 className="text-4xl font-light text-white">
            Your <span className="text-amber-400">workspaces</span>
          </h1>
          <div className="mt-4 h-px w-10 bg-amber-400/60" />
          <p className="mt-4 text-sm text-zinc-500">
            Choose a workspace to enter, or create a new one.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-8 flex items-center justify-between">
          <span className="text-xs text-zinc-600">
            {workspaces
              ? `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`
              : ""}
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/5 px-5 py-2.5 text-xs uppercase tracking-widest text-amber-400 transition-all hover:border-amber-400/60 hover:bg-amber-400/10"
          >
            <Plus className="h-3.5 w-3.5" />
            New Workspace
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center gap-3 py-20 text-zinc-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-400" />
            <span className="text-xs uppercase tracking-widest">Loading...</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-5 py-4">
            <p className="text-sm text-red-400">Failed to load workspaces.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && workspaces?.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 py-24 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center border-2 border-zinc-700">
              <div className="h-5 w-5 border-2 border-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">No workspaces yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 rounded-md border border-amber-400/30 px-5 py-2.5 text-xs uppercase tracking-widest text-amber-400 transition-all hover:border-amber-400/60"
            >
              Create first workspace
            </button>
          </div>
        )}

        {/* Grid */}
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

      {/* INVITE MODAL */}
      {invitingWorkspaceId && (
        <ModalInviteMember
          workspaceId={invitingWorkspaceId}
          isOpen={!!invitingWorkspaceId}
          onClose={() => setInvitingWorkspaceId(null)}
        />
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-6 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="relative w-full max-w-[440px] rounded-xl border border-zinc-700 bg-zinc-700 p-8 shadow-2xl">
            {/* Amber corner accents */}
            <div className="absolute left-0 top-0 h-px w-16 bg-gradient-to-r from-amber-400 to-transparent" />
            <div className="absolute left-0 top-0 h-16 w-px bg-gradient-to-b from-amber-400 to-transparent" />

            <div className="mb-7 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">New Workspace</h2>
                <p className="mt-1 text-xs text-zinc-500">Create a shared space for your team.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-md p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-zinc-500">
                  Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={wsName}
                  onChange={(e) => setWsName(e.target.value)}
                  required
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-amber-400/50 focus:ring-0"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] uppercase tracking-widest text-zinc-500">
                  Description
                </label>
                <textarea
                  value={wsDesc}
                  onChange={(e) => setWsDesc(e.target.value)}
                  placeholder="Optional — what's this workspace for?"
                  rows={3}
                  className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors focus:border-amber-400/50"
                />
              </div>

              {createError && (
                <p className="rounded-md border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-400">
                  {createError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-md border border-zinc-700 py-2.5 text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !wsName}
                  className="flex-1 rounded-md bg-amber-400 py-2.5 text-xs font-bold uppercase tracking-widest text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── WorkspaceCard ─────────────────────────────────────────────────────────────

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

  /* Stable color per workspace initial */
  const initials = workspace.name.slice(0, 2).toUpperCase();
  const hues = [334, 262, 199, 150, 38, 16];
  const hue = hues[workspace.name.charCodeAt(0) % hues.length];

  return (
    <div
      onClick={() => !isDeleteConfirming && onSelect(workspace)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-600 bg-zinc-700 p-8 transition-all duration-200 hover:border-amber-400/40"
    >
      {/* Top amber reveal line */}
      <div className="absolute left-0 top-0 h-px w-0 bg-gradient-to-r from-amber-400 to-amber-400/0 transition-all duration-500 group-hover:w-full" />

      {/* Index */}
      <span className="absolute right-4 top-4 text-[11px] font-mono text-zinc-500 group-hover:text-amber-400/60 transition-colors">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Avatar */}
      <div
        className="mb-6 flex h-14 w-14 items-center justify-center rounded text-lg font-bold transition-all duration-200 group-hover:scale-110 group-hover:brightness-125"
        style={{ background: `hsl(${hue} 65% 35%)`, color: `hsl(${hue} 90% 85%)` }}
      >
        {initials}
      </div>

      {/* Name + description */}
      <h3 className="mb-2 text-base font-semibold text-white group-hover:text-amber-400 transition-colors leading-snug">
        {workspace.name}
      </h3>

      {workspace.description && (
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-400">
          {workspace.description}
        </p>
      )}

      {deleteError && (
        <p className="mb-2 text-[11px] text-red-400">{deleteError}</p>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t border-zinc-700 pt-4 mt-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isDeleteConfirming ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-[11px] uppercase tracking-widest text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? "…" : "Confirm"}
            </button>
            <button
              onClick={() => { setIsDeleteConfirming(false); setDeleteError(""); }}
              disabled={isDeleting}
              className="text-[11px] uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (isAdmin || canInvite) ? (
          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {canInvite && (
              <button
                onClick={(e) => { e.stopPropagation(); onInvite(workspace._id); }}
                className="rounded-md p-2 text-zinc-400 hover:bg-zinc-600 hover:text-amber-400 transition-colors"
                title="Invite member"
              >
                <UserPlus className="h-5 w-5" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setIsDeleteConfirming(true)}
                className="rounded-md p-2 text-zinc-400 hover:bg-zinc-600 hover:text-red-400 transition-colors"
                title="Delete workspace"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-zinc-600">
            {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""}
          </span>
        )}

        <span className="text-[11px] uppercase tracking-widest text-zinc-700 group-hover:text-amber-400 transition-colors">
          Enter →
        </span>
      </div>
    </div>
  );
}
