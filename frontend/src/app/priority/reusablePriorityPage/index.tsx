"use client";

import Header from "@/components/Header";
import React, { useEffect } from "react";
import { useGetTasksQuery } from "@/state/api";
import TaskCard from "@/components/TaskCard";
import { useGetCurrentUserQuery } from "@/state/api";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  priority: string;
};

const ReusablePriorityPage = ({ priority }: Props) => {
  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: tasksData, isLoading, refetch } = useGetTasksQuery(
    { projectId: "" }, // We need all tasks across projects for this user
    { skip: true } // We'll implement a new endpoint or filter client-side
  );

  // TODO: Implement proper API endpoint for priority-filtered tasks
  // For now, we'll show a message about the feature
  const priorityColors = {
    backlog: "bg-gray-100 border-gray-300",
    low: "bg-blue-50 border-blue-200",
    medium: "bg-yellow-50 border-yellow-200",
    high: "bg-orange-50 border-orange-300",
    urgent: "bg-red-50 border-red-300",
  };

  const priorityLabels = {
    backlog: "Backlog",
    low: "Low",
    medium: "Medium",
    high: "High",
    urgent: "Urgent",
  };

  return (
    <div className="m-5 p-4">
      <Header name={`Priority: ${priorityLabels[priority as keyof typeof priorityLabels] || priority}`} />
      
      <div className={`mt-4 rounded-lg border p-4 ${priorityColors[priority as keyof typeof priorityColors] || "bg-gray-50"}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {priorityLabels[priority as keyof typeof priorityLabels] || priority} Priority Tasks
            </h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">
              Tasks filtered by {priority} priority level
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            priority === "urgent" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
            priority === "high" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" :
            priority === "medium" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" :
            priority === "low" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
          }`}>
            {priorityLabels[priority as keyof typeof priorityLabels] || priority}
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
            <p className="mb-2">Priority-based task filtering is coming soon.</p>
            <p className="text-sm">The backend needs to be updated to support priority filtering.</p>
          </div>
          
          {/* TODO: Replace with actual task cards when API is ready */}
          {/* {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-lg" />
              ))}
            </div>
          ) : tasksData && tasksData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasksData
                .filter(task => task.priority === priority)
                .map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    currentUserId={currentUser?._id}
                    canManage={true}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-neutral-400">
              No tasks found with {priority} priority.
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default ReusablePriorityPage;