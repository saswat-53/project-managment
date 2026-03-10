"use client";

import { Task, useGetProjectsQuery, useGetTasksQuery } from "@/state/api";
import { useEffect, useCallback, useState } from "react";
import { useAppSelector } from "../redux";
import { DataGrid } from "@mui/x-data-grid";
import Header from "@/components/Header";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import ModalNewProject from "@/app/projects/ModalNewProject";
import { PlusSquare } from "lucide-react";

const ProjectTaskLoader = ({
  projectId,
  onTasksLoaded,
}: {
  projectId: string;
  onTasksLoaded: (projectId: string, tasks: Task[]) => void;
}) => {
  const { data: tasks } = useGetTasksQuery({ projectId });
  useEffect(() => {
    if (tasks) onTasksLoaded(projectId, tasks);
  }, [tasks, projectId, onTasksLoaded]);
  return null;
};

const TASK_STATUS_COLORS: Record<string, string> = {
  todo: "#FFBB28",
  "in-progress": "#0088FE",
  done: "#00C49F",
};

const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const HomePage = () => {
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);

  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const { data: projects, isLoading: isProjectsLoading } = useGetProjectsQuery(
    activeWorkspaceId ?? "",
    { skip: !activeWorkspaceId },
  );

  const handleTasksLoaded = useCallback((projectId: string, tasks: Task[]) => {
    setTasksByProject((prev) => ({ ...prev, [projectId]: tasks }));
  }, []);

  if (isProjectsLoading) return <div>Loading..</div>;
  if (!projects) return <div>No data available</div>;

  const allTasks = Object.values(tasksByProject).flat();

  const taskStatusCount = allTasks.reduce((acc: Record<string, number>, task) => {
    const status = task.status || "todo";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="h-full w-full bg-transparent p-8">
      {projects.map((project) => (
        <ProjectTaskLoader
          key={project._id}
          projectId={project._id}
          onTasksLoaded={handleTasksLoaded}
        />
      ))}

      <Header name="Project Management Dashboard" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        {/* Task Status Summary Cards */}
        {(["todo", "in-progress", "done"] as const).map((status) => (
          <div
            key={status}
            className="flex items-center gap-4 rounded-lg bg-white p-5 shadow dark:bg-dark-secondary"
          >
            <div
              className="h-12 w-1.5 rounded-full"
              style={{ backgroundColor: TASK_STATUS_COLORS[status] }}
            />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {STATUS_LABELS[status]}
              </p>
              <p className="text-3xl font-bold dark:text-white">
                {taskStatusCount[status] || 0}
              </p>
            </div>
          </div>
        ))}

        {/* Total Tasks Card */}
        <div className="flex items-center gap-4 rounded-lg bg-white p-5 shadow dark:bg-dark-secondary">
          <div className="h-12 w-1.5 rounded-full bg-gray-400 dark:bg-gray-500" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
            <p className="text-3xl font-bold dark:text-white">{allTasks.length}</p>
          </div>
        </div>

        {/* Projects Table */}
        <div className="rounded-lg bg-white p-4 shadow dark:bg-dark-secondary md:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold dark:text-white">
              Projects ({projects.length})
            </h3>
            {projects.length > 0 && (
              <button
                onClick={() => setIsModalNewProjectOpen(true)}
                className="flex items-center gap-1.5 rounded bg-amber-400 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-300"
              >
                <PlusSquare className="h-4 w-4" />
                New Project
              </button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-200 py-16 dark:border-stroke-dark">
              <p className="text-gray-400 dark:text-gray-500">
                No projects yet. Create your first project to get started.
              </p>
              <button
                onClick={() => setIsModalNewProjectOpen(true)}
                className="flex items-center gap-2 rounded bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-300"
              >
                <PlusSquare className="h-4 w-4" />
                Create First Project
              </button>
            </div>
          ) : (
            <div style={{ height: 400, width: "100%" }}>
              <DataGrid
                rows={projects}
                columns={[
                  { field: "name", headerName: "Name", width: 200 },
                  { field: "status", headerName: "Status", width: 150 },
                  { field: "description", headerName: "Description", width: 300 },
                ]}
                getRowId={(row) => row._id}
                loading={isProjectsLoading}
                getRowClassName={() => "data-grid-row"}
                getCellClassName={() => "data-grid-cell"}
                className={dataGridClassNames}
                sx={dataGridSxStyles(isDarkMode)}
              />
            </div>
          )}
        </div>
      </div>

      <ModalNewProject
        isOpen={isModalNewProjectOpen}
        onClose={() => setIsModalNewProjectOpen(false)}
      />
    </div>
  );
};

export default HomePage;
