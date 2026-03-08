"use client";

import { Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React, { useState } from "react";
import { CalendarDays, Pencil, User } from "lucide-react";
import ModalEditTask from "@/components/ModalEditTask";

type Props = {
  task: Task;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string }> = {
  "todo":        { label: "To Do",       color: "text-amber-600",  bg: "bg-amber-50",   darkBg: "dark:bg-amber-400/10" },
  "in-progress": { label: "In Progress", color: "text-blue-600",   bg: "bg-blue-50",    darkBg: "dark:bg-blue-400/10"  },
  "done":        { label: "Done",        color: "text-green-600",  bg: "bg-green-50",   darkBg: "dark:bg-green-400/10" },
};

const STATUS_BORDER: Record<string, string> = {
  "todo":        "border-l-amber-400",
  "in-progress": "border-l-blue-400",
  "done":        "border-l-green-500",
};

const TaskCard = ({ task }: Props) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG["todo"];
  const borderColor = STATUS_BORDER[task.status] ?? STATUS_BORDER["todo"];
  const isDone = task.status === "done";

  return (
    <>
      {isEditOpen && (
        <ModalEditTask
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          task={task}
        />
      )}
      <div
        className={`group relative flex flex-col rounded-lg border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-dark-secondary ${borderColor}`}
      >
        <div className="flex flex-1 flex-col p-4">
          {/* Top row — status badge + edit */}
          <div className="mb-3 flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color} ${status.bg} ${status.darkBg}`}
            >
              {status.label}
            </span>
            <button
              className={`opacity-0 transition-opacity group-hover:opacity-100 ${
                isDone
                  ? "cursor-not-allowed text-gray-300 dark:text-neutral-700"
                  : "text-gray-400 hover:text-amber-500 dark:text-neutral-500 dark:hover:text-amber-400"
              }`}
              onClick={() => !isDone && setIsEditOpen(true)}
              title={isDone ? "Cannot edit a completed task" : "Edit task"}
            >
              <Pencil size={14} />
            </button>
          </div>

          {/* Title */}
          <h4
            className={`mb-1 text-sm font-semibold leading-snug dark:text-white ${
              isDone ? "text-gray-400 line-through dark:text-neutral-500" : "text-gray-800"
            }`}
          >
            {task.title}
          </h4>

          {/* Description */}
          {task.description && (
            <p className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-neutral-400">
              {task.description}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-stroke-dark">
          {/* Due date */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500">
            <CalendarDays size={12} />
            <span>
              {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No due date"}
            </span>
          </div>

          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            {task.assignedTo?.avatarUrl ? (
              <Image
                src={task.assignedTo.avatarUrl}
                alt={task.assignedTo.name}
                width={22}
                height={22}
                className="rounded-full object-cover ring-2 ring-white dark:ring-dark-secondary"
                unoptimized
              />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 dark:bg-dark-tertiary">
                <User size={11} className="text-gray-400 dark:text-neutral-500" />
              </div>
            )}
            <span className="max-w-[80px] truncate text-xs text-gray-400 dark:text-neutral-500">
              {task.assignedTo?.name ?? "Unassigned"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskCard;
