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
  owner: string | { _id: string; name: string; email: string };
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
    deleteWorkspace: build.mutation<{ message: string }, string>({
      query: (workspaceId) => ({
        url: `workspace/${workspaceId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Workspaces"],
    }),
    getWorkspaceMembers: build.query<User[], string>({
      query: (workspaceId) => `workspace/${workspaceId}/members`,
      transformResponse: (res: { success: boolean; data: User[] }) => res.data,
      providesTags: ["Users"],
    }),
    removeWorkspaceMember: build.mutation<
      { message: string },
      { workspaceId: string; memberId: string }
    >({
      query: ({ workspaceId, memberId }) => ({
        url: `workspace/${workspaceId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users", "Workspaces"],
    }),

    // Projects
    getProjectById: build.query<Project & { members: User[] }, string>({
      query: (projectId) => `project/${projectId}`,
      transformResponse: (res: { project: Project & { members: User[] } }) => res.project,
      providesTags: ["Projects"],
    }),
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
    updateProject: build.mutation<
      { message: string; project: Project },
      { projectId: string; members: string[] }
    >({
      query: ({ projectId, ...body }) => ({
        url: `project/${projectId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteProject: build.mutation<{ message: string }, string>({
      query: (projectId) => ({
        url: `project/${projectId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects"],
    }),
    removeProjectMember: build.mutation<
      { message: string },
      { projectId: string; memberId: string }
    >({
      query: ({ projectId, memberId }) => ({
        url: `project/${projectId}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects"],
    }),
    deleteTask: build.mutation<{ message: string }, string>({
      query: (taskId) => ({
        url: `task/${taskId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, taskId) => [
        { type: "Tasks", id: taskId },
        "Projects",
      ],
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
        projectId: string;
        assignedTo?: string;
      }
    >({
      query: (body) => ({ url: "task/tasks", method: "POST", body }),
      invalidatesTags: ["Tasks", "Projects"],
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
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
        "Projects",
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
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
        "Projects",
      ],
    }),
    changePassword: build.mutation<
      { message: string },
      { oldPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: "auth/change-password", method: "POST", body }),
    }),
    forgotPassword: build.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: "auth/forgot-password", method: "POST", body }),
    }),
    resetPassword: build.mutation<
      { message: string },
      { token: string; newPassword: string }
    >({
      query: ({ token, newPassword }) => ({
        url: `auth/reset-password/${token}`,
        method: "POST",
        body: { newPassword },
      }),
    }),
    sendVerificationEmail: build.mutation<{ message: string; verifyUrl?: string }, void>({
      query: () => ({ url: "auth/send-verification-email", method: "POST" }),
    }),
    verifyEmail: build.mutation<{ message: string }, string>({
      query: (token) => ({ url: `auth/verify-email/${token}`, method: "GET" }),
      invalidatesTags: ["CurrentUser"],
    }),

    // Workspace invites
    inviteToWorkspace: build.mutation<
      { message: string; inviteUrl: string; recipientExists: boolean },
      { workspaceId: string; email: string }
    >({
      query: ({ workspaceId, email }) => ({
        url: `workspace/${workspaceId}/invite`,
        method: "POST",
        body: { email },
      }),
    }),
    joinWorkspace: build.mutation<
      { message: string; workspace: Workspace },
      string
    >({
      query: (token) => ({ url: `workspace/join/${token}`, method: "POST" }),
      invalidatesTags: ["Workspaces"],
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
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useDeleteTaskMutation,
  useDeleteWorkspaceMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSendVerificationEmailMutation,
  useVerifyEmailMutation,
  useInviteToWorkspaceMutation,
  useJoinWorkspaceMutation,
  useRemoveWorkspaceMemberMutation,
  useRemoveProjectMemberMutation,
} = api;
