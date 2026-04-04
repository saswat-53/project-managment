"use client";
import { useEffect } from "react";
import { useAppDispatch } from "@/app/redux";
import { api, Task } from "@/state/api";
import { getSocket } from "@/lib/socket";

export const useProjectSocket = (projectId: string) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();
    socket.emit("join:project", projectId);

    // Re-join room after server restarts (Render spins down on free tier)
    const handleReconnect = () => socket.emit("join:project", projectId);
    socket.on("connect", handleReconnect);

    const handleTaskCreated = ({ task }: { task: Task }) => {
      dispatch(api.util.updateQueryData("getTasks", { projectId }, (draft) => {
        const exists = draft.some((t) => t._id === task._id);
        if (!exists) draft.push(task);
      }));
    };

    const handleTaskUpdated = ({ task }: { task: Task }) => {
      dispatch(api.util.updateQueryData("getTasks", { projectId }, (draft) => {
        const index = draft.findIndex((t) => t._id === task._id);
        if (index !== -1) draft[index] = task;
      }));
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      dispatch(api.util.updateQueryData("getTasks", { projectId }, (draft) => {
        const index = draft.findIndex((t) => t._id === taskId);
        if (index !== -1) draft.splice(index, 1);
      }));
    };

    socket.on("task:created", handleTaskCreated);
    socket.on("task:updated", handleTaskUpdated);
    socket.on("task:deleted", handleTaskDeleted);

    return () => {
      socket.emit("leave:project", projectId);
      socket.off("connect", handleReconnect);
      socket.off("task:created", handleTaskCreated);
      socket.off("task:updated", handleTaskUpdated);
      socket.off("task:deleted", handleTaskDeleted);
    };
  }, [projectId, dispatch]);
};
