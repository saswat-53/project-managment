"use client";

import React, { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { useInviteToWorkspaceMutation } from "@/state/api";

type Props = {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
};

export default function ModalInviteMember({ workspaceId, isOpen, onClose }: Props) {
  const [inviteToWorkspace, { isLoading }] = useInviteToWorkspaceMutation();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [recipientExists, setRecipientExists] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setEmail("");
    setError("");
    setInviteUrl("");
    setRecipientExists(null);
    setCopied(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInviteUrl("");
    setRecipientExists(null);
    try {
      const result = await inviteToWorkspace({ workspaceId, email }).unwrap();
      setInviteUrl(result.inviteUrl);
      setRecipientExists(result.recipientExists);
      setEmail("");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to create invite.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input text
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-6 backdrop-blur-sm dark:bg-dark-bg/90"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-[440px] border border-gray-200 bg-gray-50 p-10 dark:border-dark-tertiary dark:bg-dark-secondary">
        {/* Corner accents */}
        <div className="absolute -left-px -top-px h-5 w-5 border-l-2 border-t-2 border-amber-400" />
        <div className="absolute -bottom-px -right-px h-5 w-5 border-b-2 border-r-2 border-amber-400" />

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-light text-gray-900 dark:text-white">Invite Member</h2>
            <div className="mt-3 h-px w-8 bg-amber-400" />
          </div>
          <button
            onClick={handleClose}
            className="text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <X size={18} />
          </button>
        </div>

        {/* Invite form */}
        {!inviteUrl && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                Email address <span className="text-amber-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
                className="w-full border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900 placeholder-gray-400 outline-none focus:border-amber-400 dark:border-dark-tertiary dark:bg-dark-secondary dark:text-white dark:placeholder-zinc-600"
              />
            </div>

            {error && (
              <div className="border border-red-800 bg-red-950/40 px-4 py-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 border border-gray-200 py-3 text-sm uppercase tracking-[0.15em] text-gray-500 transition-all hover:border-zinc-500 hover:text-zinc-300 dark:border-stroke-dark dark:text-zinc-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="flex-1 bg-amber-400 py-3 text-sm font-bold uppercase tracking-[0.15em] text-zinc-950 transition-all hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Generate Link"}
              </button>
            </div>
          </form>
        )}

        {/* Invite URL result */}
        {inviteUrl && (
          <div className="space-y-5">
            <div className="border border-green-800 bg-green-950/30 px-4 py-3">
              <p className="text-xs text-green-400">
                Invite link created — valid for 7 days, one-time use.
              </p>
            </div>

            {recipientExists === false && (
              <div className="border border-amber-800/40 bg-amber-950/20 px-4 py-3">
                <p className="text-xs text-amber-400/80">
                  This email isn't registered yet. They'll need to create an account before joining.
                </p>
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
                Invite link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 border border-gray-200 bg-gray-100 px-4 py-3 text-xs text-gray-600 outline-none dark:border-dark-tertiary dark:bg-dark-secondary dark:text-zinc-400"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 border border-amber-400/40 px-4 py-3 text-xs uppercase tracking-[0.15em] text-amber-400 transition-all hover:border-amber-400 hover:bg-amber-400 hover:text-zinc-950"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setInviteUrl(""); setRecipientExists(null); }}
                className="flex-1 border border-gray-200 py-3 text-sm uppercase tracking-[0.15em] text-gray-500 transition-all hover:border-zinc-500 hover:text-zinc-300 dark:border-stroke-dark dark:text-zinc-500"
              >
                Invite Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-amber-400 py-3 text-sm font-bold uppercase tracking-[0.15em] text-zinc-950 transition-all hover:bg-amber-300"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
