"use client";

import { Task, useGetProjectsQuery, useGetTasksQuery, useGetWorkspacesQuery } from "@/state/api";
import { useEffect, useCallback, useState } from "react";
import { useAppSelector } from "../redux";
import { DataGrid } from "@mui/x-data-grid";
import Header from "@/components/Header";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import ModalNewProject from "@/app/projects/ModalNewProject";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, Layers, PlusSquare } from "lucide-react";

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

const TASK_STATUS_CONFIG = [
  {
    key: "todo" as const,
    label: "To Do",
    icon: Circle,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
    bar: "bg-amber-400",
  },
  {
    key: "in-progress" as const,
    label: "In Progress",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-500/20",
    bar: "bg-blue-400",
  },
  {
    key: "done" as const,
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-500/20",
    bar: "bg-emerald-400",
  },
];

const HomePage = () => {
  const [tasksByProject, setTasksByProject] = useState<Record<string, Task[]>>({});
  const [isModalNewProjectOpen, setIsModalNewProjectOpen] = useState(false);

  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const { data: workspaces } = useGetWorkspacesQuery();
  const activeWorkspace = workspaces?.find((w) => w._id === activeWorkspaceId);
  const canManage = activeWorkspace?.myRole === "admin" || activeWorkspace?.myRole === "manager";

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
    <div className="h-full w-full p-6 space-y-6">
      {projects.map((project) => (
        <ProjectTaskLoader
          key={project._id}
          projectId={project._id}
          onTasksLoaded={handleTasksLoaded}
        />
      ))}

      <Header name="Dashboard" />

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TASK_STATUS_CONFIG.map(({ key, label, icon: Icon, color, bg, border, bar }) => (
          <div
            key={key}
            className={cn(
              "relative overflow-hidden rounded-xl border p-5 shadow-sm",
              bg,
              border,
            )}
          >
            <div className={cn("absolute left-0 top-0 h-full w-1 rounded-r-full", bar)} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1.5 text-3xl font-bold text-foreground">
                  {taskStatusCount[key] ?? 0}
                </p>
              </div>
              <div className={cn("rounded-lg p-2", bg)}>
                <Icon className={cn("h-5 w-5", color)} />
              </div>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-slate-400" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Tasks</p>
              <p className="mt-1.5 text-3xl font-bold text-foreground">{allTasks.length}</p>
            </div>
            <div className="rounded-lg bg-muted p-2">
              <Layers className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* PROJECTS TABLE */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="text-sm font-semibold text-foreground">
            Projects
            <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {projects.length}
            </span>
          </h3>
          {projects.length > 0 && canManage && (
            <button
              onClick={() => setIsModalNewProjectOpen(true)}
              className="flex items-center gap-1.5 rounded-md bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 transition-colors"
            >
              <PlusSquare className="h-3.5 w-3.5" />
              New Project
            </button>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <p className="text-sm text-muted-foreground">
              {canManage
                ? "No projects yet. Create your first project to get started."
                : "No projects yet. Ask an admin or manager to create one."}
            </p>
            {canManage && (
              <button
                onClick={() => setIsModalNewProjectOpen(true)}
                className="flex items-center gap-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 transition-colors"
              >
                <PlusSquare className="h-4 w-4" />
                Create First Project
              </button>
            )}
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

      <ModalNewProject
        isOpen={isModalNewProjectOpen}
        onClose={() => setIsModalNewProjectOpen(false)}
      />
    </div>
  );
};

export default HomePage;
