"use client";

import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import ModalEditTask from "@/components/ModalEditTask";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { Task, useGetTasksQuery, useDeleteTaskMutation } from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Pencil, Trash2 } from "lucide-react";
import React, { useState } from "react";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
  canManage?: boolean;
  currentUserId?: string;
};

const TableView = ({ id, setIsModalNewTaskOpen, canManage, currentUserId }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: tasks } = useGetTasksQuery({ projectId: id });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteTask, { isLoading: isDeleting }] = useDeleteTaskMutation();

  const columns: GridColDef[] = [
    { field: "title", headerName: "Title", width: 150 },
    { field: "description", headerName: "Description", width: 200 },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: (params) => (
        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
          {params.value}
        </span>
      ),
    },
    { field: "dueDate", headerName: "Due Date", width: 130 },
    {
      field: "createdBy",
      headerName: "Created By",
      width: 150,
      renderCell: (params) => params.value?.name || "Unknown",
    },
    {
      field: "assignedTo",
      headerName: "Assigned To",
      width: 150,
      renderCell: (params) => params.value?.name || "Unassigned",
    },
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      renderCell: (params) => {
        const isDone = params.row.status === "done";
        const taskId = params.row._id as string;
        const isConfirming = confirmDeleteId === taskId;
        const isCreator = params.row.createdBy?._id === currentUserId;
        const isAssignee = params.row.assignedTo?._id === currentUserId;
        const canEditThisTask = canManage || isCreator || isAssignee;
        if (!canEditThisTask) return null;
        return (
          <div className="flex h-full justify-center items-center gap-2">
            <button
              className={isDone ? "cursor-not-allowed text-gray-300 dark:text-neutral-700" : "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"}
              onClick={() => !isDone && setEditingTask(params.row as Task)}
              title={isDone ? "Cannot edit a completed task" : "Edit task"}
            >
              <Pencil size={16} />
            </button>
            {isConfirming ? (
              <>
                <button
                  onClick={() => { deleteTask(taskId); setConfirmDeleteId(null); }}
                  disabled={isDeleting}
                  className="text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                className="text-gray-400 hover:text-red-500 dark:text-neutral-500 dark:hover:text-red-400"
                onClick={() => setConfirmDeleteId(taskId)}
                title="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto px-4 pb-8 xl:px-6">
      {editingTask && (
        <ModalEditTask
          isOpen={!!editingTask}
          onClose={() => setEditingTask(null)}
          task={editingTask}
        />
      )}
      <div className="pt-5">
        <Header
          name="Table"
          buttonComponent={
            <button
              className="flex items-center rounded bg-blue-primary px-3 py-2 text-white hover:bg-blue-600"
              onClick={() => setIsModalNewTaskOpen(true)}
            >
              Add Task
            </button>
          }
          isSmallText
        />
      </div>
      <div className="flex-1 min-h-0">
        <DataGrid
          rows={tasks || []}
          columns={columns}
          getRowId={(row) => row._id}
          className={dataGridClassNames}
          sx={{ ...dataGridSxStyles(isDarkMode), height: "100%" }}
        />
      </div>
    </div>
  );
};

export default TableView;
