import Modal from "@/components/Modal";
import { useCreateProjectMutation } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import React, { useState } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

const ModalNewProject = ({ isOpen, onClose }: Props) => {
  const [createProject, { isLoading }] = useCreateProjectMutation();
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!projectName || !activeWorkspaceId) return;
    await createProject({
      name: projectName,
      description,
      workspaceId: activeWorkspaceId,
    });
    setProjectName("");
    setDescription("");
    onClose();
  };

  const isFormValid = () => projectName && activeWorkspaceId;

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Create New Project">
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
          placeholder="Project Name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        <textarea
          className={inputStyles}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className={`focus-offset-2 mt-4 flex w-full justify-center rounded-md border border-transparent bg-amber-400 px-4 py-2 text-base font-medium text-zinc-950 shadow-sm hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            !isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={!isFormValid() || isLoading}
        >
          {isLoading ? "Creating..." : "Create Project"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalNewProject;
