"use client";

import { Task, useDeleteTaskMutation } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React, { useState } from "react";
import { CalendarDays, Trash2, User } from "lucide-react";
import ModalEditTask from "@/components/ModalEditTask";
import { cn } from "@/lib/utils";

type Props = {
  task: Task;
  canManage?: boolean;
  currentUserId?: string;
};

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  "todo":        { label: "To Do",       dot: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400" },
  "in-progress": { label: "In Progress", dot: "bg-blue-500",   badge: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400"   },
  "done":        { label: "Done",        dot: "bg-green-500",  badge: "bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-400" },
};

const TaskCard = ({ task, canManage, currentUserId }: Props) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const status = STATUS_CONFIG[task.status ?? "todo"] ?? STATUS_CONFIG["todo"];
  const isDone = task.status === "done";
  const isCreator = task.createdBy?._id === currentUserId;
  const isAssignee = task.assignedTo?._id === currentUserId;
  const canEditThisTask = canManage || isCreator || isAssignee;

  return (
    <>
      {isEditOpen && (
        <ModalEditTask isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} task={task} />
      )}

      <div
        onClick={() => task.status !== "done" && setIsEditOpen(true)}
        className={`group flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-stroke-dark dark:bg-dark-secondary ${task.status !== "done" ? "cursor-pointer" : ""}`}
      >

        {/* Body */}
        <div className="flex flex-1 flex-col gap-3 p-5">

          {/* Status badge + actions row */}
          <div className="flex items-center justify-between">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", status.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
              {status.label}
            </span>

            {isDeleteConfirming ? (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => deleteTask(task._id)}
                  disabled={isDeleting}
                  className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? "…" : "Delete"}
                </button>
                <button
                  onClick={() => setIsDeleteConfirming(false)}
                  disabled={isDeleting}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                {canEditThisTask && (
                  <button
                    onClick={() => setIsDeleteConfirming(true)}
                    title="Delete task"
                    className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <h4 className={cn(
            "text-base font-semibold leading-snug dark:text-white",
            isDone ? "text-gray-400 line-through dark:text-neutral-500" : "text-gray-900",
          )}>
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-stroke-dark">
          {/* Due date */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays size={14} />
            <span>{task.dueDate ? format(new Date(task.dueDate), "MMM d, yyyy") : "No due date"}</span>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-2">
            {task.assignedTo?.avatarUrl ? (
              <Image
                src={task.assignedTo.avatarUrl}
                alt={task.assignedTo.name}
                width={26}
                height={26}
                className="rounded-full object-cover ring-2 ring-white dark:ring-dark-secondary"
                unoptimized
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-tertiary">
                <User size={13} className="text-muted-foreground" />
              </div>
            )}
            <span className="max-w-[90px] truncate text-sm text-muted-foreground">
              {task.assignedTo?.name ?? "Unassigned"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskCard;
