import { useGetTasksQuery, useUpdateTaskStatusMutation, useDeleteTaskMutation } from "@/state/api";
import { useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Task as TaskType } from "@/state/api";
import { Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import Image from "next/image";
import ModalEditTask from "@/components/ModalEditTask";

type BoardProps = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  canManage?: boolean;
  currentUserId?: string;
};

const taskStatus = [
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const BoardView = ({ id, setIsModalNewTaskOpen, canManage, currentUserId }: BoardProps) => {
  const { data: tasks } = useGetTasksQuery({ projectId: id });
  const [updateTaskStatus] = useUpdateTaskStatusMutation();

  const moveTask = (taskId: string, toStatus: string) => {
    updateTaskStatus({ taskId, status: toStatus, projectId: id });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full gap-4 overflow-x-auto p-4 pb-6">
        {taskStatus.map(({ key, label }) => (
          <TaskColumn
            key={key}
            statusKey={key}
            statusLabel={label}
            tasks={tasks || []}
            moveTask={moveTask}
            setIsModalNewTaskOpen={setIsModalNewTaskOpen}
            canManage={canManage}
            currentUserId={currentUserId}
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
  canManage?: boolean;
  currentUserId?: string;
};

const TaskColumn = ({
  statusKey,
  statusLabel,
  tasks,
  moveTask,
  setIsModalNewTaskOpen,
  canManage,
  currentUserId,
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
      className={`flex min-w-64 flex-1 flex-col rounded-lg py-2 xl:px-2 ${isOver ? "bg-blue-100 dark:bg-neutral-950" : ""}`}
      style={{ maxHeight: "calc(100vh - 220px)" }}
    >
      <div className="mb-3 flex w-full flex-shrink-0">
        <div
          className="w-2 rounded-s-lg"
          style={{ backgroundColor: statusColor[statusKey] }}
        />
        <div className="flex w-full items-center justify-between rounded-e-lg bg-white px-5 py-4 border border-l-0 border-gray-200 dark:border-stroke-dark dark:bg-dark-secondary">
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

      <div
        ref={(instance) => { drop(instance); }}
        className="flex-1 overflow-y-auto"
      >
        {tasks
          .filter((task) => task.status === statusKey)
          .map((task) => (
            <Task key={task._id} task={task} canManage={canManage} currentUserId={currentUserId} />
          ))}
      </div>
    </div>
  );
};

type TaskProps = {
  task: TaskType;
  canManage?: boolean;
  currentUserId?: string;
};

const Task = ({ task, canManage, currentUserId }: TaskProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();
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

  const isCreator = task.createdBy?._id === currentUserId || task.createdBy?._id?.toString() === currentUserId;
  const isAssignee = task.assignedTo?._id === currentUserId || task.assignedTo?._id?.toString() === currentUserId;
  const canEditThisTask = canManage || isCreator || isAssignee;

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
        ref={(instance) => { drag(instance); }}
        onClick={() => !isDragging && task.status !== "done" && setIsEditOpen(true)}
        className={`mb-4 rounded-md bg-white border border-gray-200 shadow-sm dark:border-stroke-dark dark:bg-dark-secondary ${
          isDragging ? "opacity-50" : "opacity-100"
        } ${task.status !== "done" ? "cursor-pointer" : ""}`}
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

          {/* Assignee avatar + actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex -space-x-[6px] overflow-hidden">
              {task.assignedTo?.avatarUrl && (
                <Image
                  key={`assignee-${task.assignedTo._id}`}
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
                  key={`creator-${task.createdBy._id}`}
                  src={task.createdBy.avatarUrl}
                  alt={task.createdBy.name}
                  width={30}
                  height={30}
                  className="h-8 w-8 rounded-full border-2 border-white object-cover dark:border-dark-secondary"
                  unoptimized
                />
              )}
            </div>
            {isDeleteConfirming ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteTask(task._id)}
                  disabled={isDeleting}
                  className="rounded px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? "..." : "Delete"}
                </button>
                <button
                  onClick={() => setIsDeleteConfirming(false)}
                  disabled={isDeleting}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-neutral-400"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {canEditThisTask && (
                  <button
                    className="text-gray-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); setIsDeleteConfirming(true); }}
                    title="Delete task"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default BoardView;
