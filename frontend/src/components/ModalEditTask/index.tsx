"use client";

import Modal from "@/components/Modal";
import { Task, useUpdateTaskMutation, useGetWorkspaceMembersQuery, useAddTaskCommentMutation, useEditTaskCommentMutation, useDeleteTaskCommentMutation, useAddTaskReplyMutation, useDeleteTaskReplyMutation, useGetCurrentUserQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import Image from "next/image";
import { CornerDownRight, Pencil, Trash2, User as UserIcon } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
};

const ModalEditTask = ({ isOpen, onClose, task }: Props) => {
  const [updateTask, { isLoading }] = useUpdateTaskMutation();
  const [addTaskComment, { isLoading: isCommenting }] = useAddTaskCommentMutation();
  const [editTaskComment] = useEditTaskCommentMutation();
  const [deleteTaskComment] = useDeleteTaskCommentMutation();
  const [addTaskReply] = useAddTaskReplyMutation();
  const [deleteTaskReply] = useDeleteTaskReplyMutation();
  const { data: currentUser } = useGetCurrentUserQuery();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const { data: members } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId },
  );

  const myRole = members?.find((m) => m._id === currentUser?._id)?.workspaceRole;
  const canModerate = myRole === "admin" || myRole === "manager";

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done">(
    task.status ?? "todo",
  );
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : "",
  );
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?._id ?? "");
  const [commentText, setCommentText] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status ?? "todo");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setAssignedTo(task.assignedTo?._id ?? "");
  }, [task]);

  const handleEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    await editTaskComment({ taskId: task._id, commentId, text: editingCommentText.trim() });
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteTaskComment({ taskId: task._id, commentId });
  };

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task.comments]);

  const handleAddReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    await addTaskReply({ taskId: task._id, commentId, text: replyText.trim() });
    setReplyingToCommentId(null);
    setReplyText("");
  };

  const handleDeleteReply = async (commentId: string, replyId: string) => {
    await deleteTaskReply({ taskId: task._id, commentId, replyId });
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    await addTaskComment({ taskId: task._id, text: commentText.trim() });
    setCommentText("");
  };

  const handleSubmit = async () => {
    if (!title) return;
    await updateTask({
      taskId: task._id,
      title,
      description,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      assignedTo: assignedTo || null,
    });
    onClose();
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";
  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Edit Task" size="md">
      <form
        className="mt-4 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <input
          type="text"
          className={inputStyles}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          className={selectStyles}
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as "todo" | "in-progress" | "done")
          }
        >
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <input
          type="date"
          className={inputStyles}
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          className={selectStyles}
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
        >
          <option value="">Unassigned</option>
          {members?.map((member) => (
            <option key={member._id} value={member._id}>
              {member.name} ({member.workspaceRole})
            </option>
          ))}
        </select>
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-amber-400 px-4 py-2 text-base font-medium text-zinc-950 shadow-sm hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            !title || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!title || isLoading}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>

        {/* Comments */}
        <div className="border-t border-gray-200 pt-4 dark:border-stroke-dark">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
            Comments {task.comments?.length ? `(${task.comments.length})` : ""}
          </h3>

          {/* Existing comments */}
          {task.comments && task.comments.length > 0 ? (
            <div className="mb-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {task.comments.map((comment) => {
                const isOwn = comment.author._id === currentUser?._id;
                const isEditing = editingCommentId === comment._id;
                return (
                  <div key={comment._id} className="group flex gap-2.5">
                    {comment.author.avatarUrl ? (
                      <Image
                        src={comment.author.avatarUrl}
                        alt={comment.author.name}
                        width={28}
                        height={28}
                        className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                        <UserIcon size={13} className="text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {isOwn ? "You" : comment.author.name}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-neutral-500">
                            {format(new Date(comment.createdAt), "MMM d, h:mm a")}
                          </span>
                        </div>
                        {/* Edit/Delete — only shown for own comments (delete also shown via canManage check on server) */}
                        {isOwn && !isEditing && (
                          <div className="flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => { setEditingCommentId(comment._id); setEditingCommentText(comment.text); }}
                              className="text-gray-400 hover:text-amber-500 dark:text-neutral-600 dark:hover:text-amber-400"
                              title="Edit comment"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment._id)}
                              className="text-gray-400 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400"
                              title="Delete comment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                        {/* Admins/managers can delete others' comments too */}
                        {!isOwn && !isEditing && canModerate && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment._id)}
                            className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400"
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="mt-1 flex gap-1.5">
                          <input
                            type="text"
                            className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none"
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); handleEditComment(comment._id); }
                              if (e.key === "Escape") { setEditingCommentId(null); }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleEditComment(comment._id)}
                            className="rounded bg-amber-400 px-2 py-1 text-xs font-medium text-zinc-950 hover:bg-amber-300"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-neutral-400"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="mt-0.5 text-xs text-gray-600 dark:text-neutral-300">
                            {comment.text}
                          </p>

                          {/* Reply button */}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingToCommentId(replyingToCommentId === comment._id ? null : comment._id);
                              setReplyText("");
                            }}
                            className="mt-1 flex items-center gap-1 text-[10px] text-gray-400 hover:text-amber-500 dark:text-neutral-500 dark:hover:text-amber-400"
                          >
                            <CornerDownRight size={10} />
                            {replyingToCommentId === comment._id ? "Cancel" : "Reply"}
                          </button>

                          {/* Inline reply input */}
                          {replyingToCommentId === comment._id && (
                            <div className="mt-2 flex gap-1.5">
                              <input
                                type="text"
                                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none"
                                placeholder={`Reply to ${comment.author.name}…`}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleAddReply(comment._id); }
                                  if (e.key === "Escape") { setReplyingToCommentId(null); }
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleAddReply(comment._id)}
                                disabled={!replyText.trim()}
                                className="rounded bg-amber-400 px-2 py-1 text-xs font-medium text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Post
                              </button>
                            </div>
                          )}

                          {/* Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-2 space-y-2 border-l-2 border-gray-100 pl-3 dark:border-stroke-dark">
                              {comment.replies.map((reply) => {
                                const isOwnReply = reply.author._id === currentUser?._id;
                                return (
                                  <div key={reply._id} className="group flex gap-2">
                                    {reply.author.avatarUrl ? (
                                      <Image
                                        src={reply.author.avatarUrl}
                                        alt={reply.author.name}
                                        width={20}
                                        height={20}
                                        className="h-5 w-5 flex-shrink-0 rounded-full object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                                        <UserIcon size={10} className="text-gray-400" />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <div className="flex items-baseline justify-between">
                                        <div className="flex items-baseline gap-1.5">
                                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                            {isOwnReply ? "You" : reply.author.name}
                                          </span>
                                          <span className="text-[10px] text-gray-400 dark:text-neutral-500">
                                            {format(new Date(reply.createdAt), "MMM d, h:mm a")}
                                          </span>
                                        </div>
                                        {(isOwnReply || canModerate) && (
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteReply(comment._id, reply._id)}
                                            className="opacity-0 transition-opacity group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400"
                                            title="Delete reply"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        )}
                                      </div>
                                      <p className="mt-0.5 text-xs text-gray-600 dark:text-neutral-300">
                                        {reply.text}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          ) : (
            <p className="mb-4 text-xs text-gray-400 dark:text-neutral-500">No comments yet.</p>
          )}

          {/* Add comment */}
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none"
              placeholder="Write a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddComment(); }
              }}
            />
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!commentText.trim() || isCommenting}
              className="rounded bg-amber-400 px-3 py-1.5 text-xs font-medium text-zinc-950 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCommenting ? "..." : "Post"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ModalEditTask;
