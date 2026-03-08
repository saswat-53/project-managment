import { useGetTasksQuery, useUpdateTaskStatusMutation } from "@/state/api";
import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task as TaskType } from "@/state/api";
import { MessageSquareMore, Plus } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import ModalEditTask from "@/components/ModalEditTask";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const taskStatus = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const BoardView = ({ id, setIsModalNewTaskOpen }: BoardProps) => {
  const { data: tasks } = useGetTasksQuery({ projectId: id });
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const moveTask = (taskId: string, toStatus: string) => {
    updateTaskStatus({ taskId, status: toStatus });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
        {taskStatus.map(({ key, label }) => (
          <TaskColumn
            key={key}
            statusKey={key}
            statusLabel={label}
            tasks={tasks || []}
            moveTask={moveTask}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
          />
        ))}
      </div>
    </DndProvider>
  );
};

type TaskColumnProps = {
  statusKey: string;
  statusLabel: string;
  tasks: TaskType[];
  moveTask: (taskId: string, toStatus: string) => void;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const TaskColumn = ({
  statusKey,
  statusLabel,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
}: TaskColumnProps) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: "task",
    drop: (item: { id: string }) => moveTask(item.id, statusKey),
    collect: (monitor: any) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const tasksCount = tasks.filter((task) => task.status === statusKey).length;

  const statusColor: Record<string, string> = {
    "todo": "#2563EB",
    "in-progress": "#059669",
    "done": "#000000",
  };

  return (
    <div
      ref={(instance) => {
        drop(instance);
      }}
      className={`sl:py-4 rounded-lg py-2 xl:px-2 ${isOver ? "bg-blue-100 dark:bg-neutral-950" : ""}`}
    >
      <div className="mb-3 flex w-full">
        <div
          className="w-2 rounded-s-lg"
          style={{ backgroundColor: statusColor[statusKey] }}
        />
        <div className="flex w-full items-center justify-between rounded-e-lg bg-white px-5 py-4 dark:bg-dark-secondary">
          <h3 className="flex items-center text-lg font-semibold dark:text-white">
            {statusLabel}{" "}
            <span
              className="ml-2 inline-block rounded-full bg-gray-200 p-1 text-center text-sm leading-none dark:bg-dark-tertiary"
              style={{ width: "1.5rem", height: "1.5rem" }}
            >
              {tasksCount}
            </span>
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="flex h-6 w-6 items-center justify-center rounded bg-gray-200 dark:bg-dark-tertiary dark:text-white"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      {tasks
        .filter((task) => task.status === statusKey)
        .map((task) => (
          <Task key={task._id} task={task} />
        ))}
    </div>
  );
};

type TaskProps = {
  task: TaskType;
};

const Task = ({ task }: TaskProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "task",
    item: { id: task._id },
    collect: (monitor: any) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const formattedDueDate = task.dueDate
    ? format(new Date(task.dueDate), "P")
    : "";

  return (
    <>
      {isEditOpen && (
        <ModalEditTask
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          task={task}
        />
      )}
      <div
        ref={(instance) => {
          drag(instance);
        }}
        className={`mb-4 rounded-md bg-white shadow dark:bg-dark-secondary ${
          isDragging ? "opacity-50" : "opacity-100"
        }`}
      >
        <div className="p-4 md:p-6">
          <div className="my-3 flex justify-between">
            <h4 className="text-md font-bold dark:text-white">{task.title}</h4>
          </div>

          {formattedDueDate && (
            <div className="text-xs text-gray-500 dark:text-neutral-500">
              Due: {formattedDueDate}
            </div>
          )}
          {task.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-500">
              {task.description}
            </p>
          )}
          <div className="mt-4 border-t border-gray-200 dark:border-stroke-dark" />

          {/* Assignee avatar + edit button */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-[6px] overflow-hidden">
              {task.assignedTo?.avatarUrl && (
                <Image
                  key={task.assignedTo._id}
                  src={task.assignedTo.avatarUrl}
                  alt={task.assignedTo.name}
                  width={30}
                  height={30}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
                  unoptimized
                />
              )}
              {task.createdBy?.avatarUrl && (
                <Image
                  key={task.createdBy._id}
                  src={task.createdBy.avatarUrl}
                  alt={task.createdBy.name}
                  width={30}
                  height={30}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
                  unoptimized
                />
              )}
            </div>
            <button
              className={`flex items-center ${task.status === "done" ? "cursor-not-allowed text-gray-300 dark:text-neutral-700" : "text-gray-500 hover:text-blue-500 dark:text-neutral-500 dark:hover:text-blue-400"}`}
              onClick={() => task.status !== "done" && setIsEditOpen(true)}
              title={task.status === "done" ? "Cannot edit a completed task" : "Edit task"}
            >
              <MessageSquareMore size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BoardView;
