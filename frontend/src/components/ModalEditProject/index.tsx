"use client";

import Modal from "@/components/Modal";
import { useUpdateProjectMutation, Project } from "@/state/api";
import React, { useState, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
};

const ModalEditProject = ({ isOpen, onClose, project }: Props) => {
  const [updateProject, { isLoading }] = useUpdateProjectMutation();

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<"backlog" | "in-progress" | "completed">(project.status);
  const [repoUrl, setRepoUrl] = useState(project.repoUrl ?? "");
  const [githubToken, setGithubToken] = useState("");
  const [showTokenField, setShowTokenField] = useState(false);
  const [error, setError] = useState("");

  // Sync form if project prop changes (e.g. cache update)
  useEffect(() => {
    setName(project.name);
    setDescription(project.description ?? "");
    setStatus(project.status);
    setRepoUrl(project.repoUrl ?? "");
    setGithubToken("");
    setShowTokenField(false);
    setError("");
  }, [project._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await updateProject({
        projectId: project._id,
        name: name.trim(),
        description: description || undefined,
        status,
        repoUrl: repoUrl || undefined,
        githubToken: githubToken || undefined,
      }).unwrap();
      onClose();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to update project.");
    }
  };

  const inputStyles =
    "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  const selectStyles =
    "w-full rounded border border-gray-300 px-3 py-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} name="Edit Project">
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Project Name
          </label>
          <input
            type="text"
            className={inputStyles}
            placeholder="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Description
          </label>
          <textarea
            className={inputStyles}
            placeholder="Description (optional)"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            Status
          </label>
          <select
            className={selectStyles}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="backlog">Backlog</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            GitHub Repo URL
          </label>
          <input
            type="url"
            className={inputStyles}
            placeholder="https://github.com/org/repo (optional)"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              if (!e.target.value) {
                setShowTokenField(false);
                setGithubToken("");
              }
            }}
          />
        </div>

        {repoUrl && (
          <div>
            <button
              type="button"
              onClick={() => setShowTokenField((v) => !v)}
              className="mb-2 text-xs text-amber-600 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
            >
              {showTokenField ? "Hide" : "+ Update"} GitHub token (required for private repos)
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

        {error && (
          <div className="border border-red-800 bg-red-950/40 px-4 py-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || isLoading}
          className={`mt-2 flex w-full justify-center rounded-md border border-transparent bg-amber-400 px-4 py-2 text-base font-medium text-zinc-950 shadow-sm hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
            !name.trim() || isLoading ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </Modal>
  );
};

export default ModalEditProject;
