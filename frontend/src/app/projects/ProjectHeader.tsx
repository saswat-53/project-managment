import Header from "@/components/Header";
import {
  Clock,
  Filter,
  Grid3x3,
  List,
  PlusSquare,
  Share2,
  Table,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import ModalNewProject from "./ModalNewProject";
import { useDeleteProjectMutation } from "@/state/api";

type Props = {
  activeTab: string;
  setActiveTab: (tabName: string) => void;
  onAddMember?: () => void;
  projectId?: string;
};

const ProjectHeader = ({ activeTab, setActiveTab, onAddMember, projectId }: Props) => {
  const router = useRouter();
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteProject, { isLoading: isDeleting }] = useDeleteProjectMutation();

  const handleDelete = async () => {
    if (!projectId) return;
    setDeleteError("");
    try {
      await deleteProject(projectId).unwrap();
      router.push("/home");
    } catch (err: any) {
      setDeleteError(err?.data?.message || "Failed to delete project.");
      setIsConfirmingDelete(false);
    }
  };

  return (
    <div className="px-4 xl:px-6">
      <ModalNewProject
        isOpen={isModalNewProjectOpen}
        onClose={() => setIsModalNewProjectOpen(false)}
      />
      <div className="pb-6 pt-6 lg:pb-4 lg:pt-8">
        <Header
          name="Product Design Development"
          buttonComponent={
            <div className="flex items-center gap-2">
              {deleteError && (
                <span className="text-xs text-red-500">{deleteError}</span>
              )}
              {projectId && (
                isConfirmingDelete ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Delete project?</span>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded-md bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? "Deleting..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => { setIsConfirmingDelete(false); setDeleteError(""); }}
                      disabled={isDeleting}
                      className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:border-stroke-dark dark:text-gray-400 dark:hover:bg-dark-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center rounded-md border border-gray-300 px-3 py-2 text-gray-600 hover:border-red-400 hover:text-red-500 dark:border-stroke-dark dark:text-neutral-400 dark:hover:border-red-500 dark:hover:text-red-400"
                    title="Delete project"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )
              )}
              <button
                className="flex items-center rounded-md bg-amber-400 px-3 py-2 text-zinc-950 hover:bg-amber-300"
                onClick={() => setIsModalNewProjectOpen(true)}
              >
                <PlusSquare className="mr-2 h-5 w-5" /> Create Project
              </button>
            </div>
          }
        />
      </div>

      {/* TABS */}
      <div className="flex flex-wrap-reverse gap-2 border-y border-gray-200 pb-[8px] pt-2 dark:border-stroke-dark md:items-center">
        <div className="flex flex-1 items-center gap-2 md:gap-4">
          <TabButton
            name="Board"
            icon={<Grid3x3 className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="List"
            icon={<List className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Timeline"
            icon={<Clock className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
          <TabButton
            name="Table"
            icon={<Table className="h-5 w-5" />}
            setActiveTab={setActiveTab}
            activeTab={activeTab}
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300">
            <Filter className="h-5 w-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-gray-300">
            <Share2 className="h-5 w-5" />
          </button>
          {onAddMember && (
            <button
              onClick={onAddMember}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-amber-400 hover:text-amber-500 dark:border-stroke-dark dark:text-neutral-400 dark:hover:border-amber-400 dark:hover:text-amber-400"
              title="Add member to project"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search Task"
              className="rounded-md border py-1 pl-10 pr-4 focus:outline-none dark:border-dark-secondary dark:bg-dark-secondary dark:text-white"
            />
            <Grid3x3 className="absolute left-3 top-2 h-4 w-4 text-gray-400 dark:text-neutral-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

type TabButtonProps = {
  name: string;
  icon: React.ReactNode;
  setActiveTab: (tabName: string) => void;
  activeTab: string;
};

const TabButton = ({ name, icon, setActiveTab, activeTab }: TabButtonProps) => {
  const isActive = activeTab === name;

  return (
    <button
      className={`relative flex items-center gap-2 px-1 py-2 text-gray-500 after:absolute after:-bottom-[9px] after:left-0 after:h-[1px] after:w-full hover:text-amber-500 dark:text-neutral-500 dark:hover:text-white sm:px-2 lg:px-4 ${
        isActive ? "text-amber-500 after:bg-amber-400 dark:text-white" : ""
      }`}
      onClick={() => setActiveTab(name)}
    >
      {icon}
      {name}
    </button>
  );
};

export default ProjectHeader;
