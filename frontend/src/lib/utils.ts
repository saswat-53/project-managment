import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const dataGridClassNames =
  "border border-gray-200 bg-white shadow dark:border-stroke-dark dark:bg-dark-secondary dark:text-gray-200";

export const dataGridSxStyles = (isDarkMode: boolean) => {
  const border = isDarkMode ? "#2d3135" : "#e5e7eb";
  return {
    "--DataGrid-rowBorderColor": border,
    "--rowBorderColor": border,
    "& .MuiDataGrid-columnHeaders": {
      color: `${isDarkMode ? "#e5e7eb" : ""}`,
      borderBottom: `1px solid ${border}`,
      '& [role="row"] > *': {
        backgroundColor: `${isDarkMode ? "#1d1f21" : "white"}`,
        borderColor: border,
      },
    },
    "& .MuiDataGrid-columnSeparator": {
      color: border,
    },
    "& .MuiIconbutton-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiTablePagination-root": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
      borderTop: `1px solid ${border}`,
    },
    "& .MuiTablePagination-selectIcon": {
      color: `${isDarkMode ? "#a3a3a3" : ""}`,
    },
    "& .MuiDataGrid-cell": {
      border: "none",
    },
    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${border}`,
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: `${isDarkMode ? "#2d3135" : "#f9fafb"}`,
    },
    "& .MuiDataGrid-row.Mui-selected": {
      backgroundColor: `${isDarkMode ? "#2d3135" : "#eff6ff"}`,
    },
    "& .MuiDataGrid-row.Mui-selected:hover": {
      backgroundColor: `${isDarkMode ? "#363b3f" : "#dbeafe"}`,
    },
    "& .MuiDataGrid-withBorderColor": {
      borderColor: border,
    },
    "& .MuiDataGrid-filler": {
      backgroundColor: `${isDarkMode ? "#1d1f21" : "white"}`,
      border: "none",
    },
    "& .MuiDataGrid-virtualScroller": {
      backgroundColor: `${isDarkMode ? "#1d1f21" : "white"}`,
    },
    "& .MuiDataGrid-overlayWrapper": {
      backgroundColor: `${isDarkMode ? "#1d1f21" : "white"}`,
    },
  };
};
