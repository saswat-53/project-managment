"use client";

import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import ModalEditTask from "@/components/ModalEditTask";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { Task, useGetTasksQuery } from "@/state/api";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Pencil } from "lucide-react";
import React, { useState } from "react";

type Props = {
  id: string;
  setIsModalNewTaskOpen: (isOpen: boolean) => void;
};

const TableView = ({ id, setIsModalNewTaskOpen }: Props) => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: tasks } = useGetTasksQuery({ projectId: id });
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
      width: 60,
      sortable: false,
      renderCell: (params) => {
        const isDone = params.row.status === "done";
        return (
          <button
            className={isDone ? "cursor-not-allowed text-gray-300 dark:text-neutral-700" : "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"}
            onClick={() => !isDone && setEditingTask(params.row as Task)}
            title={isDone ? "Cannot edit a completed task" : "Edit task"}
          >
            <Pencil size={16} />
          </button>
        );
      },
    },
  ];

  return (
    <div className="h-[600px] w-full px-4 pb-8 xl:px-6">
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
      <DataGrid
        rows={tasks || []}
        columns={columns}
        getRowId={(row) => row._id}
        className={dataGridClassNames}
        sx={dataGridSxStyles(isDarkMode)}
      />
    </div>
  );
};

export default TableView;
