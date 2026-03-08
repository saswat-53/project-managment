"use client";

import Header from "@/components/Header";
import { useGetCurrentUserQuery, useChangePasswordMutation, useSendVerificationEmailMutation } from "@/state/api";
import { CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

const Settings = () => {
  const { data: user, isLoading } = useGetCurrentUserQuery();
  const [changePassword, { isLoading: isChanging }] = useChangePasswordMutation();
  const [sendVerificationEmail, { isLoading: isSending }] = useSendVerificationEmailMutation();

  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (isLoading) return <div className="p-8 dark:text-white">Loading...</div>;
  if (!user) return <div className="p-8 dark:text-white">Could not load user data.</div>;

  const labelStyles = "block text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400";
  const valueStyles = "mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800 dark:border-stroke-dark dark:bg-dark-tertiary dark:text-white";
  const inputStyles = "mt-1 block w-full rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 dark:border-stroke-dark dark:bg-dark-tertiary dark:text-white dark:focus:border-amber-400";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (form.newPassword !== form.confirmPassword) {
      setFeedback({ type: "error", message: "New passwords do not match." });
      return;
    }
    if (form.newPassword.length < 8) {
      setFeedback({ type: "error", message: "New password must be at least 8 characters." });
      return;
    }

    try {
      await changePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword }).unwrap();
      setFeedback({ type: "success", message: "Password updated successfully." });
      setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.data?.message ?? "Failed to change password." });
    }
  };

  const toggleVisibility = (field: "old" | "new" | "confirm") =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));

  const handleSendVerificationEmail = async () => {
    setVerifyFeedback(null);
    try {
      await sendVerificationEmail().unwrap();
      setVerifyFeedback({ type: "success", message: "Verification email sent. Check your inbox." });
    } catch (err: any) {
      setVerifyFeedback({ type: "error", message: err?.data?.message ?? "Failed to send verification email." });
    }
  };

  return (
    <div className="p-8">
      <Header name="Settings" />

      <div className="mt-6 max-w-xl space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.name}
              width={64}
              height={64}
              className="rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-xl font-bold text-zinc-950">
              {user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-semibold dark:text-white">{user.name}</p>
            <p className="text-sm capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className={labelStyles}>Name</label>
          <div className={valueStyles}>{user.name}</div>
        </div>

        {/* Email */}
        <div>
          <label className={labelStyles}>Email</label>
          <div className={valueStyles}>{user.email}</div>
        </div>

        {/* Avatar URL */}
        <div>
          <label className={labelStyles}>Avatar URL</label>
          <div className={`${valueStyles} truncate`}>
            {user.avatarUrl || <span className="text-gray-400 dark:text-gray-600">Not set</span>}
          </div>
        </div>

        {/* Email Verified */}
        <div>
          <label className={labelStyles}>Email Verified</label>
          <div className="mt-1 flex items-center gap-3">
            {user.isEmailVerified ? (
              <>
                <CheckCircle size={18} className="text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Verified</span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">Not verified</span>
                <button
                  onClick={handleSendVerificationEmail}
                  disabled={isSending}
                  className="ml-1 rounded border border-amber-400 px-3 py-1 text-xs font-medium text-amber-600 transition-all hover:bg-amber-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-400 dark:hover:text-zinc-950"
                >
                  {isSending ? "Sending..." : "Send verification email"}
                </button>
              </>
            )}
          </div>
          {verifyFeedback && (
            <p className={`mt-2 text-xs ${verifyFeedback.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {verifyFeedback.message}
            </p>
          )}
        </div>

        {/* Divider */}
        <hr className="border-gray-200 dark:border-stroke-dark" />

        {/* Change Password */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">
            Change Password
          </h2>

          {feedback && (
            <div
              className={`mt-3 rounded-md px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
            {/* Old Password */}
            <div>
              <label className={labelStyles}>Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.old ? "text" : "password"}
                  value={form.oldPassword}
                  onChange={(e) => setForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  className={inputStyles}
                  placeholder="Enter current password"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("old")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className={labelStyles}>New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? "text" : "password"}
                  value={form.newPassword}
                  onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
                  className={inputStyles}
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("new")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className={labelStyles}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => setForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className={inputStyles}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("confirm")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isChanging}
              className="rounded-md bg-amber-400 px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isChanging ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Settings;
