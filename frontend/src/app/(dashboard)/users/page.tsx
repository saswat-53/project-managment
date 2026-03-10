"use client";

import {
  useGetWorkspaceMembersQuery,
  useGetWorkspacesQuery,
  useGetCurrentUserQuery,
  useRemoveWorkspaceMemberMutation,
} from "@/state/api";
import React, { useState } from "react";
import { useAppSelector } from "@/app/redux";
import Header from "@/components/Header";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import Image from "next/image";
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
import { Trash2 } from "lucide-react";

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const Members = () => {
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const { data: currentUser } = useGetCurrentUserQuery();
  const { data: workspaces } = useGetWorkspacesQuery();
  const {
    data: members,
    isLoading,
    isError,
  } = useGetWorkspaceMembersQuery(activeWorkspaceId ?? "", {
    skip: !activeWorkspaceId,
  });
  const [removeWorkspaceMember] = useRemoveWorkspaceMemberMutation();

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState("");

  const activeWorkspace = workspaces?.find((ws) => ws._id === activeWorkspaceId);
  const ownerId =
    activeWorkspace &&
    (typeof activeWorkspace.owner === "string"
      ? activeWorkspace.owner
      : activeWorkspace.owner._id);
  const isOwner = !!currentUser && !!ownerId && currentUser._id === ownerId;

  const handleRemove = async (memberId: string) => {
    if (!activeWorkspaceId) return;
    setRemoveError("");
    setRemovingId(memberId);
    try {
      await removeWorkspaceMember({ workspaceId: activeWorkspaceId, memberId }).unwrap();
    } catch (err: any) {
      setRemoveError(err?.data?.message || "Failed to remove member.");
    } finally {
      setRemovingId(null);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "avatarUrl",
      headerName: "Avatar",
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-9 w-9">
            {params.value ? (
              <Image
                src={params.value}
                alt={params.row.name}
                width={36}
                height={36}
                className="h-full w-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500 dark:bg-dark-tertiary dark:text-gray-400">
                {params.row.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
      ),
    },
    { field: "name", headerName: "Name", width: 180 },
    { field: "email", headerName: "Email", width: 260 },
    { field: "role", headerName: "Role", width: 130 },
    ...(isOwner
      ? [
          {
            field: "actions",
            headerName: "",
            width: 80,
            sortable: false,
            renderCell: (params: any) => {
              const isThisOwner = params.row._id === ownerId;
              if (isThisOwner) return null;
              const isRemoving = removingId === params.row._id;
              return (
                <div className="flex h-full items-center">
                  <button
                    onClick={() => handleRemove(params.row._id)}
                    disabled={isRemoving}
                    title="Remove from workspace"
                    className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            },
          } as GridColDef,
        ]
      : []),
  ];

  if (!activeWorkspaceId) return <div className="p-8">No workspace selected.</div>;
  if (isLoading) return <div>Loading...</div>;
  if (isError || !members) return <div>Error fetching members</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Members" />
      {removeError && (
        <div className="mb-4 border border-red-800 bg-red-950/30 px-4 py-3">
          <p className="text-sm text-red-400">{removeError}</p>
        </div>
      )}
      <div style={{ height: 650, width: "100%" }}>
        <DataGrid
          rows={members}
          columns={columns}
          getRowId={(row) => row._id}
          pagination
          slots={{
            toolbar: CustomToolbar,
          }}
          className={dataGridClassNames}
          sx={dataGridSxStyles(isDarkMode)}
        />
      </div>
    </div>
  );
};

export default Members;
