"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import ProjectHeader from "@/app/projects/ProjectHeader";
import Board from "../BoardView";
import List from "../ListView";
import Timeline from "../TimelineView";
import Table from "../TableView";
import ModalNewTask from "@/components/ModalNewTask";
import ModalAddMember from "@/components/ModalAddMember";
import DashboardWrapper from "@/app/dashboardWrapper";
import { useGetTasksQuery, useGetCurrentUserQuery, useGetWorkspaceMembersQuery, useGetProjectByIdQuery } from "@/state/api";
import { useAppSelector } from "@/app/redux";
import { useProjectSocket } from "@/hooks/useProjectSocket";

const Project = () => {
  const { id } = useParams() as { id: string };
  useProjectSocket(id);
  const [activeTab, setActiveTab] = useState("Board");
  const [isModalNewTaskOpen, setIsModalNewTaskOpen] = useState(false);
  const [isModalAddMemberOpen, setIsModalAddMemberOpen] = useState(false);

  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);
  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: workspaceMembers } = useGetWorkspaceMembersQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId }
  );

  const myWorkspaceRole = workspaceMembers?.find(m => m._id === currentUser?._id)?.workspaceRole;
  const canManage = myWorkspaceRole === "admin" || myWorkspaceRole === "manager";

  const { data: project } = useGetProjectByIdQuery(id, { skip: !id });
  const { isLoading, error } = useGetTasksQuery({ projectId: id });

  const taskError = (() => {
    if (!error) return null;
    const is403 = "status" in error && error.status === 403;
    return {
      title: is403 ? "Access Restricted" : "Failed to Load Tasks",
      message: is403
        ? "You don't have access to this project's tasks. Ask a project admin to add you."
        : "Something went wrong while loading tasks. Please try again.",
    };
  })();

  return (
    <DashboardWrapper>
      <ModalNewTask
        isOpen={isModalNewTaskOpen}
        onClose={() => setIsModalNewTaskOpen(false)}
        id={id}
      />
      <ModalAddMember
        isOpen={isModalAddMemberOpen}
        onClose={() => setIsModalAddMemberOpen(false)}
        projectId={id}
        canManage={canManage}
      />

      {/* Fixed-height shell: header pinned, view area scrolls internally */}
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex-shrink-0">
          <ProjectHeader
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAddMember={canManage ? () => setIsModalAddMemberOpen(true) : undefined}
            projectId={id}
            canManage={canManage}
            project={project}
          />
        </div>

        <div className="flex-1 overflow-hidden">
          {isLoading && (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              Loading...
            </div>
          )}

          {taskError && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {taskError.title}
              </p>
              <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
                {taskError.message}
              </p>
            </div>
          )}

          {!isLoading && !taskError && (
            <>
              {activeTab === "Board" && (
                <Board
                  id={id}
                  setIsModalNewTaskOpen={setIsModalNewTaskOpen}
                  canManage={canManage}
                  currentUserId={currentUser?._id}
                />
              )}
              {activeTab === "List" && (
                <List
                  id={id}
                  setIsModalNewTaskOpen={setIsModalNewTaskOpen}
                  canManage={canManage}
                  currentUserId={currentUser?._id}
                />
              )}
              {activeTab === "Timeline" && (
                <Timeline id={id} setIsModalNewTaskOpen={setIsModalNewTaskOpen} />
              )}
              {activeTab === "Table" && (
                <Table
                  id={id}
                  setIsModalNewTaskOpen={setIsModalNewTaskOpen}
                  canManage={canManage}
                  currentUserId={currentUser?._id}
                />
              )}
            </>
          )}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default Project;
