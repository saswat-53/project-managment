"use client";

import Modal from "@/components/Modal";
import { Task, useUpdateTaskMutation, useGetWorkspaceMembersQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
};

const ModalEditTask = ({ isOpen, onClose, task }: Props) => {
  const [updateTask, { isLoading }] = useUpdateTaskMutation();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const { data: members } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId },
  );

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done">(
    task.status ?? "todo",
  );
  const [dueDate, setDueDate] = useState(
    task.dueDate ? task.dueDate.slice(0, 10) : "",
  );
  const [assignedTo, setAssignedTo] = useState(task.assignedTo?._id ?? "");

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setStatus(task.status ?? "todo");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setAssignedTo(task.assignedTo?._id ?? "");
  }, [task]);

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
    <Modal isOpen={isOpen} onClose={onClose} name="Edit Task">
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
      </form>
    </Modal>
  );
};

export default ModalEditTask;
