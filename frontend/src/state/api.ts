import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "manager" | "member";
  position?: string;
  isEmailVerified?: boolean;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  members: string[];
  inviteCode: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: "backlog" | "in-progress" | "completed";
  workspace: string;
  members: string[];
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status?: "todo" | "in-progress" | "done";
  dueDate?: string;
  project: string;
  workspace: string;
  assignedTo?: User;
  createdBy?: User;
}

export interface AuthResponse {
  message: string;
  user: User;
}

// ─── RTK Query API ────────────────────────────────────────────────────────────

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    credentials: "include",
  }),
  reducerPath: "api",
  tagTypes: ["Projects", "Tasks", "Users", "Workspaces", "CurrentUser"],
  endpoints: (build) => ({
    // Auth
    login: build.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({ url: "auth/login", method: "POST", body }),
      invalidatesTags: ["CurrentUser"],
    }),
    register: build.mutation<
      { message: string },
      { name: string; email: string; password: string }
    >({
      query: (body) => ({ url: "auth/register", method: "POST", body }),
    }),
    logout: build.mutation<{ message: string }, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
      invalidatesTags: ["CurrentUser"],
    }),
    getCurrentUser: build.query<User, void>({
      query: () => "auth/me",
      transformResponse: (res: { user: User }) => res.user,
      providesTags: ["CurrentUser"],
    }),

    // Workspaces
    getWorkspaces: build.query<Workspace[], void>({
      query: () => "workspace/workspaces",
      transformResponse: (res: { workspaces: Workspace[] }) => res.workspaces,
      providesTags: ["Workspaces"],
    }),
    createWorkspace: build.mutation<
      { message: string; workspace: Workspace },
      { name: string; description?: string }
    >({
      query: (body) => ({ url: "workspace/workspaces", method: "POST", body }),
      invalidatesTags: ["Workspaces"],
    }),
    getWorkspaceMembers: build.query<User[], string>({
      query: (workspaceId) => `workspace/${workspaceId}/members`,
      transformResponse: (res: { success: boolean; data: User[] }) => res.data,
      providesTags: ["Users"],
    }),

    // Projects
    getProjects: build.query<Project[], string>({
      query: (workspaceId) => `project/workspace/${workspaceId}`,
      transformResponse: (res: { projects: Project[] }) => res.projects,
      providesTags: ["Projects"],
    }),
    createProject: build.mutation<
      { message: string; project: Project },
      { name: string; description?: string; workspaceId: string }
    >({
      query: (body) => ({ url: "project/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),

    // Tasks
    getTasks: build.query<Task[], { projectId: string }>({
      query: ({ projectId }) => `task/project/${projectId}`,
      transformResponse: (res: { tasks: Task[] }) => res.tasks,
      providesTags: (result) =>
        result
          ? result.map(({ _id }) => ({ type: "Tasks" as const, id: _id }))
          : [{ type: "Tasks" as const }],
    }),
    createTask: build.mutation<
      { message: string; task: Task },
      {
        title: string;
        description?: string;
        status?: string;
        dueDate?: string;
        project: string;
        workspace: string;
        assignedTo?: string;
      }
    >({
      query: (body) => ({ url: "task/tasks", method: "POST", body }),
      invalidatesTags: ["Tasks"],
    }),
    updateTaskStatus: build.mutation<
      { message: string; task: Task },
      { taskId: string; status: string }
    >({
      query: ({ taskId, status }) => ({
        url: `task/${taskId}`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    updateTask: build.mutation<
      { message: string; task: Task },
      {
        taskId: string;
        title?: string;
        description?: string;
        status?: string;
        dueDate?: string;
        assignedTo?: string | null;
      }
    >({
      query: ({ taskId, ...body }) => ({
        url: `task/${taskId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    changePassword: build.mutation<
      { message: string },
      { oldPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: "auth/change-password", method: "POST", body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetCurrentUserQuery,
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useGetWorkspaceMembersQuery,
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetTasksQuery,
  useCreateTaskMutation,
  useUpdateTaskStatusMutation,
  useUpdateTaskMutation,
  useChangePasswordMutation,
} = api;
