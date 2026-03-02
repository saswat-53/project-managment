import Modal from "@/components/Modal";
import { useCreateTaskMutation, useGetWorkspaceMembersQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  id?: string | null;
};

const ModalNewTask = ({ isOpen, onClose, id = null }: Props) => {
  const [createTask, { isLoading }] = useCreateTaskMutation();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const { data: members } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId },
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"todo" | "in-progress" | "done">("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [projectId, setProjectId] = useState("");

  const handleSubmit = async () => {
    const project = id !== null ? id : projectId;
    if (!title || !project || !activeWorkspaceId) return;

    await createTask({
      title,
      description,
      status,
      dueDate: dueDate || undefined,
      project,
      workspace: activeWorkspaceId,
      assignedTo: assignedTo || undefined,
    });

    setTitle("");
    setDescription("");
    setStatus("todo");
    setDueDate("");
    setAssignedTo("");
    setProjectId("");
    onClose();
  };

  const isFormValid = () => {
    return title && (id !== null || projectId) && activeWorkspaceId;
  };

  const selectStyles =
    "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Task">
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
          <option value="">Assign to... (optional)</option>
          {members?.map((member) => (
            <option key={member._id} value={member._id}>
              {member.name} ({member.role})
            </option>
          ))}
        </select>

        {id === null && (
          <input
            type="text"
            className={inputStyles}
            placeholder="Project ID"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          />
        )}

        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-blue-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewTask;
