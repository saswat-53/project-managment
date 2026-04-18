"use client";

import { useAppSelector } from "@/app/redux";
import { useGetTasksQuery } from "@/state/api";
import { DisplayOption, Gantt, ViewMode } from "gantt-task-react";
import React, { useMemo, useState } from "react";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

type TaskTypeItems = "task" | "milestone" | "project";

const STATUS_COLORS: Record<string, { bg: string; selected: string }> = {
  "todo": { bg: "#6366f1", selected: "#4f46e5" },
  "in-progress": { bg: "#f59e0b", selected: "#d97706" },
  "done": { bg: "#10b981", selected: "#059669" },
};

const DEFAULT_COLOR = { bg: "#6366f1", selected: "#4f46e5" };

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const Timeline = ({ id, setIsModalNewTaskOpen }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: tasks } = useGetTasksQuery({ projectId: id });

  const [displayOptions, setDisplayOptions] = useState<DisplayOption>({
    viewMode: ViewMode.Month,
    locale: "en-US",
  });

  const ganttTasks = useMemo(() => {
    if (!tasks?.length) return [];

    return tasks.map((task) => {
      const colors = STATUS_COLORS[task.status ?? ""] ?? DEFAULT_COLOR;

      let end: Date;
      let start: Date;

      if (task.dueDate) {
        end = new Date(task.dueDate);
        // Give a 1-day duration so the bar is always visible
        start = addDays(end, -1);
      } else {
        // No date at all — float it starting from today for 3 days
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = addDays(start, 3);
      }

      return {
        start,
        end,
        name: task.title,
        id: `task-${task._id}`,
        type: "task" as TaskTypeItems,
        progress: task.status === "done" ? 100 : task.status === "in-progress" ? 50 : 0,
        isDisabled: false,
        styles: {
          backgroundColor: colors.bg,
          backgroundSelectedColor: colors.selected,
          progressColor: isDarkMode ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)",
          progressSelectedColor: isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
        },
      };
    });
  }, [tasks, isDarkMode]);

  const handleViewModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setDisplayOptions((prev) => ({
      ...prev,
      viewMode: event.target.value as ViewMode,
    }));
  };

  return (
    <div className="h-full overflow-y-auto px-4 xl:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-5">
        <div>
          <h1 className="text-lg font-bold dark:text-white">Timeline</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {(tasks ?? []).length} task{(tasks ?? []).length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden items-center gap-3 sm:flex">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: color.bg }}
                />
                {status}
              </span>
            ))}
          </div>

          {/* View mode selector */}
          <select
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-dark-secondary dark:text-white"
            value={displayOptions.viewMode}
            onChange={handleViewModeChange}
          >
            <option value={ViewMode.Day}>Day</option>
            <option value={ViewMode.Week}>Week</option>
            <option value={ViewMode.Month}>Month</option>
          </select>
        </div>
      </div>

      {ganttTasks.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-gray-400 dark:text-gray-500">No tasks to display</p>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() => setIsModalNewTaskOpen(true)}
          >
            Add your first task
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-dark-secondary">
          <div className="timeline overflow-x-auto">
            <Gantt
              tasks={ganttTasks}
              {...displayOptions}
              columnWidth={
                displayOptions.viewMode === ViewMode.Month
                  ? 160
                  : displayOptions.viewMode === ViewMode.Week
                  ? 120
                  : 60
              }
              listCellWidth="150px"
              rowHeight={56}
              headerHeight={60}
              barCornerRadius={4}
              barFill={72}
              fontSize="13px"
              todayColor={isDarkMode ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)"}
            />
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Bar width = 1 day minimum — add a start date for full range display
            </p>
            <button
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              + Add Task
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
