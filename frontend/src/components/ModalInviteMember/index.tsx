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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-[440px] rounded-xl border border-border bg-card p-8 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Invite Member</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <X size={16} />
          </button>
        </div>

        {/* Invite form */}
        {!inviteUrl && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Email address <span className="text-amber-400">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="colleague@company.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-800/30 bg-red-950/20 px-3 py-2">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-md border border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !email}
                className="flex-1 rounded-md bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Generate Link"}
              </button>
            </div>
          </form>
        )}

        {/* Invite URL result */}
        {inviteUrl && (
          <div className="space-y-4">
            <div className="rounded-md border border-green-800/30 bg-green-950/20 px-3 py-2.5">
              <p className="text-xs text-green-400">Invite link created — valid for 7 days, one-time use.</p>
            </div>

            {recipientExists === false && (
              <div className="rounded-md border border-amber-800/30 bg-amber-950/20 px-3 py-2.5">
                <p className="text-xs text-amber-400/80">
                  This email isn't registered yet. They'll need to create an account before joining.
                </p>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Invite link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-md border border-amber-400/30 px-3 py-2 text-xs text-amber-400 transition-colors hover:border-amber-400/60 hover:bg-amber-400/10"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setInviteUrl(""); setRecipientExists(null); }}
                className="flex-1 rounded-md border border-border py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Invite Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 rounded-md bg-amber-400 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-300"
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
