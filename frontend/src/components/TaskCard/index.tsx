"use client";

import { Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React, { useState } from "react";
import { Pencil } from "lucide-react";
import ModalEditTask from "@/components/ModalEditTask";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      {isEditOpen && (
        <ModalEditTask
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          task={task}
        />
      )}
      <div className="mb-3 rounded bg-white p-4 shadow dark:bg-dark-secondary dark:text-white">
        <div className="flex items-start justify-between">
          <p className="font-bold">{task.title}</p>
          <button
            className={`ml-2 ${task.status === "done" ? "cursor-not-allowed text-gray-300 dark:text-neutral-700" : "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"}`}
            onClick={() => task.status !== "done" && setIsEditOpen(true)}
            title={task.status === "done" ? "Cannot edit a completed task" : "Edit task"}
          >
            <Pencil size={15} />
          </button>
        </div>
        <p>
          <strong>Description:</strong>{" "}
          {task.description || "No description provided"}
        </p>
        <p>
          <strong>Status:</strong> {task.status}
        </p>
        <p>
          <strong>Due Date:</strong>{" "}
          {task.dueDate ? format(new Date(task.dueDate), "P") : "Not set"}
        </p>
        <p>
          <strong>Created By:</strong>{" "}
          {task.createdBy ? task.createdBy.name : "Unknown"}
        </p>
        <p>
          <strong>Assigned To:</strong>{" "}
          {task.assignedTo ? task.assignedTo.name : "Unassigned"}
        </p>
        {task.assignedTo?.avatarUrl && (
          <div className="mt-2">
            <Image
              src={task.assignedTo.avatarUrl}
              alt={task.assignedTo.name}
              width={32}
              height={32}
              className="rounded-full"
              unoptimized
            />
          </div>
        )}
      </div>
    </>
  );
};

export default TaskCard;
