import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface initialStateTypes {
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  activeWorkspaceId: string | null;
}

const initialState: initialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: true,
  activeWorkspaceId: null,
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setActiveWorkspaceId: (state, action: PayloadAction<string | null>) => {
      state.activeWorkspaceId = action.payload;
    },
  },
});

export const { setIsSidebarCollapsed, setIsDarkMode, setActiveWorkspaceId } =
  globalSlice.actions;
export default globalSlice.reducer;
