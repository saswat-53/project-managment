"use client";

import { useGetWorkspaceMembersQuery } from "@/state/api";
import React from "react";
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

const CustomToolbar = () => (
  <GridToolbarContainer className="toolbar flex gap-2">
    <GridToolbarFilterButton />
    <GridToolbarExport />
  </GridToolbarContainer>
);

const columns: GridColDef[] = [
  { field: "name", headerName: "Name", width: 180 },
  { field: "email", headerName: "Email", width: 260 },
  { field: "role", headerName: "Role", width: 130 },
  {
    field: "avatarUrl",
    headerName: "Avatar",
    width: 100,
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
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
              {params.row.name?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </div>
    ),
  },
];

const Members = () => {
  const activeWorkspaceId = useAppSelector(
    (state) => state.global.activeWorkspaceId,
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const {
    data: members,
    isLoading,
    isError,
  } = useGetWorkspaceMembersQuery(activeWorkspaceId ?? "", {
    skip: !activeWorkspaceId,
  });

  if (!activeWorkspaceId) return <div className="p-8">No workspace selected.</div>;
  if (isLoading) return <div>Loading...</div>;
  if (isError || !members) return <div>Error fetching members</div>;

  return (
    <div className="flex w-full flex-col p-8">
      <Header name="Members" />
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
