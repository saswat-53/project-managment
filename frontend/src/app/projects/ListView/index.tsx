import Header from "@/components/Header";
import TaskCard from "@/components/TaskCard";
import { Task, useGetTasksQuery } from "@/state/api";
import React from "react";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  canManage?: boolean;
  currentUserId?: string;
};

const ListView = ({ id, setIsModalNewTaskOpen, canManage, currentUserId }: Props) => {
  const { data: tasks } = useGetTasksQuery({ projectId: id });

  return (
    <div className="h-full overflow-y-auto px-4 pb-8 xl:px-6">
      <div className="pt-5">
        <Header
          name="List"
          buttonComponent={
            <button
              className="flex items-center rounded bg-amber-400 px-3 py-2 text-zinc-950 hover:bg-amber-300"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              Add Task
            </button>
          }
          isSmallText
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {tasks?.map((task: Task) => (
          <TaskCard
            key={task._id}
            task={task}
            canManage={canManage}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
};

export default ListView;
