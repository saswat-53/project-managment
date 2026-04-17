import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ─── TypeScript Interfaces ────────────────────────────────────────────────────

export type WorkspaceRole = "admin" | "manager" | "member";

export interface User {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "manager" | "member";
  position?: string;
  isEmailVerified?: boolean;
}

/** User with their per-workspace role — returned by getWorkspaceMembers */
export interface WorkspaceMember extends User {
  workspaceRole: WorkspaceRole;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: string | { _id: string; name: string; email: string };
  members: string[];
  inviteCode: string;
  /** Current user's role in this workspace — included in getWorkspaces response */
  myRole?: WorkspaceRole;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: "backlog" | "in-progress" | "completed";
  repoUrl?: string;
  workspace: string;
  members: string[];
}

export interface Reply {
  _id: string;
  text: string;
  author: User;
  createdAt: string;
}

export interface Comment {
  _id: string;
  text: string;
  author: User;
  createdAt: string;
  replies: Reply[];
}

export interface Attachment {
  _id: string;
  key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  url: string;
  uploadedBy: User;
  createdAt: string;
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
  comments?: Comment[];
  attachments?: Attachment[];
  planMarkdown?: string;
  planGeneratedAt?: string;
  planDuration?: number;
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
    getWorkspaceMembers: build.query<WorkspaceMember[], string>({
      query: (workspaceId) => `workspace/${workspaceId}/members`,
      transformResponse: (res: { success: boolean; data: WorkspaceMember[] }) => res.data,
      providesTags: ["Users"],
    }),
    updateMemberRole: build.mutation<
      { message: string },
      { workspaceId: string; userId: string; role: WorkspaceRole }
    >({
      query: ({ workspaceId, userId, role }) => ({
        url: `workspace/${workspaceId}/members/${userId}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["Users"],
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
      { name: string; description?: string; repoUrl?: string; githubToken?: string; workspaceId: string }
    >({
      query: (body) => ({ url: "project/projects", method: "POST", body }),
      invalidatesTags: ["Projects"],
    }),
    updateProject: build.mutation<
      { message: string; project: Project },
      {
        projectId: string;
        name?: string;
        description?: string;
        status?: "backlog" | "in-progress" | "completed";
        repoUrl?: string;
        githubToken?: string;
        members?: string[];
      }
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
      { taskId: string; status: string; projectId: string }
    >({
      query: ({ taskId, status }) => ({
        url: `task/${taskId}`,
        method: "PUT",
        body: { status },
      }),
      async onQueryStarted({ taskId, status, projectId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          api.util.updateQueryData("getTasks", { projectId }, (draft) => {
            const task = draft.find((t) => t._id === taskId);
            if (task) task.status = status as Task["status"];
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
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
    addTaskComment: build.mutation<
      { message: string; task: Task },
      { taskId: string; text: string }
    >({
      query: ({ taskId, text }) => ({
        url: `task/${taskId}/comments`,
        method: "POST",
        body: { text },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    editTaskComment: build.mutation<
      { message: string; task: Task },
      { taskId: string; commentId: string; text: string }
    >({
      query: ({ taskId, commentId, text }) => ({
        url: `task/${taskId}/comments/${commentId}`,
        method: "PUT",
        body: { text },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    deleteTaskComment: build.mutation<
      { message: string; task: Task },
      { taskId: string; commentId: string }
    >({
      query: ({ taskId, commentId }) => ({
        url: `task/${taskId}/comments/${commentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    addTaskReply: build.mutation<
      { message: string; task: Task },
      { taskId: string; commentId: string; text: string }
    >({
      query: ({ taskId, commentId, text }) => ({
        url: `task/${taskId}/comments/${commentId}/replies`,
        method: "POST",
        body: { text },
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    deleteTaskReply: build.mutation<
      { message: string; task: Task },
      { taskId: string; commentId: string; replyId: string }
    >({
      query: ({ taskId, commentId, replyId }) => ({
        url: `task/${taskId}/comments/${commentId}/replies/${replyId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    updateUserDetail: build.mutation<
      { message: string; user: User },
      { name?: string; email?: string; avatarUrl?: string; position?: string }
    >({
      query: (body) => ({ url: "auth/update-user-detail", method: "PATCH", body }),
      invalidatesTags: ["CurrentUser"],
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

    // Attachments
    getPresignedUploadUrl: build.mutation<
      { uploadUrl: string; key: string },
      { taskId: string; fileName: string; fileType: string; fileSize: number }
    >({
      query: ({ taskId, ...body }) => ({
        url: `task/${taskId}/attachments/presign`,
        method: "POST",
        body,
      }),
    }),
    confirmAttachmentUpload: build.mutation<
      { message: string; attachment: Attachment; task: Task },
      { taskId: string; key: string; fileName: string; fileType: string; fileSize: number }
    >({
      query: ({ taskId, ...body }) => ({
        url: `task/${taskId}/attachments/confirm`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),
    deleteTaskAttachment: build.mutation<
      { message: string; task: Task },
      { taskId: string; attachmentId: string }
    >({
      query: ({ taskId, attachmentId }) => ({
        url: `task/${taskId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
      ],
    }),

    // AI Plan generation
    generateTaskPlan: build.mutation<
      { message: string; task: Task },
      { taskId: string }
    >({
      query: ({ taskId }) => ({
        url: `task/${taskId}/generate-plan`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, { taskId }) => [
        { type: "Tasks", id: taskId },
        "Projects",
      ],
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
  useUpdateMemberRoleMutation,
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
  useUpdateUserDetailMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSendVerificationEmailMutation,
  useVerifyEmailMutation,
  useInviteToWorkspaceMutation,
  useJoinWorkspaceMutation,
  useRemoveWorkspaceMemberMutation,
  useRemoveProjectMemberMutation,
  useAddTaskCommentMutation,
  useEditTaskCommentMutation,
  useDeleteTaskCommentMutation,
  useAddTaskReplyMutation,
  useDeleteTaskReplyMutation,
  useGetPresignedUploadUrlMutation,
  useConfirmAttachmentUploadMutation,
  useDeleteTaskAttachmentMutation,
  useGenerateTaskPlanMutation,
} = api;
