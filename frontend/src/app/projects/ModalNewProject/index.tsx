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
  const [repoUrl, setRepoUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);

  const handleSubmit = async () => {
    if (!projectName || !activeWorkspaceId) return;
    await createProject({
      name: projectName,
      description,
      repoUrl: repoUrl || undefined,
      githubToken: githubToken || undefined,
      workspaceId: activeWorkspaceId,
    });
    setProjectName("");
    setDescription("");
    setRepoUrl("");
    setGithubToken("");
    setShowTokenField(false);
    onClose();
  };

  const isFormValid = () => projectName && activeWorkspaceId;

  const inputStyles =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring";

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
        <input
          type="url"
          className={inputStyles}
          placeholder="GitHub repo URL (optional, e.g. https://github.com/org/repo)"
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            if (!e.target.value) {
              setShowTokenField(false);
              setGithubToken("");
            }
          }}
        />
        {repoUrl && (
          <div>
            <button
              type="button"
              onClick={() => setShowTokenField((v) => !v)}
              className="mb-2 text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              {showTokenField ? "Hide" : "+ Add"} GitHub token (required for private repos)
            </button>
            {showTokenField && (
              <input
                type="password"
                className={inputStyles}
                placeholder="GitHub PAT (ghp_…)"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                autoComplete="off"
              />
            )}
          </div>
        )}
        <button
          type="submit"
          className={`mt-4 flex w-full justify-center rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
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
