import { Task } from "@/state/api";
import { format } from "date-fns";
import Image from "next/image";
import React from "react";

type Props = {
  task: Task;
};

const TaskCard = ({ task }: Props) => {
  return (
    <div className="mb-3 rounded bg-white p-4 shadow dark:bg-dark-secondary dark:text-white">
      <p>
        <strong>Title:</strong> {task.title}
      </p>
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
          />
        </div>
      )}
    </div>
  );
};

export default TaskCard;
