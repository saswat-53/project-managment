# Frontend — CLAUDE.md

This document is the authoritative reference for the frontend codebase. Read it fully before making any changes.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Dev Commands](#dev-commands)
3. [Environment Variables](#environment-variables)
4. [Directory Structure](#directory-structure)
5. [Route Architecture](#route-architecture)
6. [State Management](#state-management)
7. [Auth Flow](#auth-flow)
8. [RTK Query Patterns](#rtk-query-patterns)
9. [Key Files by Function](#key-files-by-function)
10. [Important Patterns to Follow](#important-patterns-to-follow)
11. [Component Patterns](#component-patterns)
12. [Dark Mode Implementation](#dark-mode-implementation)
13. [Styling Conventions](#styling-conventions)
14. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
15. [Known Bugs and Incomplete Features](#known-bugs-and-incomplete-features)

---

## Project Overview

**Framework**: Next.js 14 with App Router
**Language**: TypeScript
**State**: Redux Toolkit + RTK Query + redux-persist
**Styling**: Tailwind CSS (class-based dark mode) + MUI (DataGrid only)
**Auth**: HTTP-only cookies set by the backend, read via `credentials: "include"`
**Port**: 3000

The app is called **ProjectFlow**. It is a multi-workspace project management tool. Users log in, select a workspace, and then manage projects and tasks within that workspace. Tasks have three statuses: `todo`, `in-progress`, and `done`. Projects have three statuses: `backlog`, `in-progress`, `completed`.

---

## Dev Commands

All commands must be run from `D:\STUDY\self-project\project-managment\frontend\`.

```bash
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build
npm run start     # Serve the production build
npm run lint      # Run ESLint
```

The backend must be running on port 5000 (or whatever `NEXT_PUBLIC_API_BASE_URL` points to) for the frontend to function.

---

## Environment Variables

Create a `.env.local` file in the frontend root. The only required variable is:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

The `.env.example` file ships with `http://localhost:8000` — this is wrong for the current backend port. The correct value is `http://localhost:5000/api`.

All RTK Query endpoints are relative to this base URL (e.g., `"auth/login"` becomes `http://localhost:5000/api/auth/login`).

---

## Directory Structure

```
frontend/
  src/
    app/
      layout.tsx                   # Root layout — wraps everything in StoreProvider
      page.tsx                     # Public landing page (no auth required)
      dashboardWrapper.tsx         # AuthProvider + Sidebar + Navbar shell
      authProvider.tsx             # JWT auth guard component
      redux.tsx                    # Redux store, persist config, typed hooks
      (auth)/
        login/page.tsx             # Login form
        register/page.tsx          # Register form
        forgot-password/page.tsx   # Forgot password form
        reset-password/[token]/    # Reset password with token
      (dashboard)/
        layout.tsx                 # Wraps children in DashboardWrapper
        settings/page.tsx          # User settings + change password
        users/page.tsx             # Workspace members (MUI DataGrid)
      workspaces/page.tsx          # Workspace selection (standalone, no DashboardWrapper)
      dashboard/page.tsx           # Redirects to home page, wrapped in DashboardWrapper
      home/page.tsx                # Dashboard charts and stats component
      projects/
        [id]/page.tsx              # Project detail: Board/List/Timeline/Table views
        ProjectHeader.tsx          # Tab navigation for project views
        ModalNewProject/           # Create project modal
        BoardView/                 # Kanban board (react-dnd)
        ListView/                  # Card grid view
        TimelineView/              # Gantt chart (gantt-task-react)
        TableView/                 # MUI DataGrid
      timeline/page.tsx            # Workspace-level projects timeline (stub data)
      search/page.tsx              # Stub: "coming soon"
      priority/
        backlog|high|low|medium|urgent/page.tsx  # Stubs: "coming soon"
        reusablePriorityPage/      # Shared priority stub component
      teams/page.tsx               # (exists but content unknown)
    components/
      Header/                      # Page-level heading with optional button
      Modal/                       # Portal-based modal wrapper
      Navbar/                      # Top bar (dark mode toggle, user info, sign out)
      Sidebar/                     # Left navigation (projects list, workspace name)
      TaskCard/                    # Task card for ListView
      ProjectCard/                 # Simple project card (minimal, rarely used)
      UserCard/                    # User card (minimal)
      ModalNewTask/                # Create task modal
      ModalEditTask/               # Edit task modal
      ModalAddMember/              # Add workspace members to a project modal
    state/
      api.ts                       # All RTK Query endpoints + TypeScript interfaces
      index.ts                     # global Redux slice
    lib/
      utils.ts                     # dataGridClassNames + dataGridSxStyles helpers
      axios.ts                     # Axios instance (credentials: true) — rarely used
  tailwind.config.ts               # Custom colors, dark mode = "class"
  next.config.mjs                  # Next.js config (image remote patterns)
  package.json
```

---

## Route Architecture

### Route Groups

Next.js App Router route groups (folders wrapped in parentheses) are used to control layout inheritance.

#### `(auth)` group — No sidebar/navbar

Pages inside `(auth)/` render standalone with no dashboard chrome. These pages use the amber/zinc design language (dark background, amber accents, monospace font).

- `/login` — `(auth)/login/page.tsx`
- `/register` — `(auth)/register/page.tsx`
- `/forgot-password` — `(auth)/forgot-password/page.tsx`
- `/reset-password/[token]` — `(auth)/reset-password/[token]/page.tsx`

#### `(dashboard)` group — Auto-wrapped in DashboardWrapper

Pages inside `(dashboard)/` are automatically wrapped by `(dashboard)/layout.tsx`, which renders `DashboardWrapper`. This gives them the Sidebar + Navbar + auth guard.

- `/settings` — `(dashboard)/settings/page.tsx`
- `/users` — `(dashboard)/users/page.tsx`

#### Explicit DashboardWrapper (not inside a group)

Some pages are outside any route group but still need the dashboard shell. They explicitly wrap their content in `DashboardWrapper` themselves:

- `/dashboard` — `dashboard/page.tsx` (wraps `DashboardWrapper`)
- `/projects/[id]` — `projects/[id]/page.tsx` (wraps `DashboardWrapper`)

#### Standalone pages (no dashboard, no auth group)

- `/` — `page.tsx` — Public marketing landing page. No auth required. No sidebar.
- `/workspaces` — `workspaces/page.tsx` — Workspace selector. No sidebar/navbar (custom header). Accessible when authenticated but before workspace selection.

### Route Summary Table

| URL | File | Layout |
|-----|------|--------|
| `/` | `app/page.tsx` | None (public landing) |
| `/login` | `(auth)/login/page.tsx` | None (auth group) |
| `/register` | `(auth)/register/page.tsx` | None (auth group) |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | None (auth group) |
| `/reset-password/[token]` | `(auth)/reset-password/[token]/page.tsx` | None (auth group) |
| `/workspaces` | `workspaces/page.tsx` | Custom standalone |
| `/dashboard` | `dashboard/page.tsx` | Explicit DashboardWrapper |
| `/settings` | `(dashboard)/settings/page.tsx` | Via group layout |
| `/users` | `(dashboard)/users/page.tsx` | Via group layout |
| `/projects/[id]` | `projects/[id]/page.tsx` | Explicit DashboardWrapper |
| `/timeline` | `timeline/page.tsx` | ??? (check if it wraps DashboardWrapper) |
| `/search` | `search/page.tsx` | ??? |

**Important**: `/dashboard` and `/projects/[id]` wrap `DashboardWrapper` manually because they are not inside the `(dashboard)` group. Do not add them to the `(dashboard)` group, as they need to remain outside it for routing reasons.

---

## State Management

### Redux Store Setup

File: `src/app/redux.tsx`

The store is set up with `redux-persist` and is provided to the whole app via `StoreProvider` in `app/layout.tsx`.

```tsx
// Key config:
const persistConfig = {
  key: "root",
  storage,           // localStorage (SSR-safe with noop fallback)
  whitelist: ["global"],  // ONLY the global slice is persisted
};

// The api slice is NOT persisted — RTK Query cache is always fresh on reload
const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});
```

`StoreProvider` uses `useRef` to ensure the store is created only once (Next.js App Router safe pattern). `setupListeners` is called for RTK Query refetchOnFocus/refetchOnReconnect behavior.

A `persistor` instance is exported via `getPersistor()`. Call `getPersistor().purge()` on logout to clear persisted state.

### Typed Hooks

Always use the typed hooks, never raw `useDispatch`/`useSelector`:

```tsx
import { useAppDispatch, useAppSelector } from "@/app/redux";

const dispatch = useAppDispatch();
const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
```

### Global Slice

File: `src/state/index.ts`

The global slice manages three pieces of UI state:

```typescript
interface initialStateTypes {
  isSidebarCollapsed: boolean;  // whether sidebar is hidden
  isDarkMode: boolean;           // dark mode toggle
  activeWorkspaceId: string | null;  // currently selected workspace
}
```

**Actions:**

```tsx
import { setIsSidebarCollapsed, setIsDarkMode, setActiveWorkspaceId } from "@/state";

dispatch(setIsSidebarCollapsed(true));
dispatch(setIsDarkMode(true));
dispatch(setActiveWorkspaceId("workspace-id-here"));
dispatch(setActiveWorkspaceId(null));  // clears workspace (used on logout)
```

`activeWorkspaceId` is the most critical piece of state. It is:
- Set when a user selects a workspace on `/workspaces`
- Cleared to `null` on logout
- Checked by `AuthProvider` to decide whether to redirect to `/workspaces`
- Persisted to localStorage so the user stays in their workspace on refresh

### What Is Persisted

Only the `global` slice is persisted (isSidebarCollapsed, isDarkMode, activeWorkspaceId). The RTK Query cache (`api` slice) is never persisted — it always fetches fresh from the server on load.

---

## Auth Flow

### Overview

```
User visits any dashboard page
    → AuthProvider calls GET /auth/me (via useGetCurrentUserQuery)
        → 401 or no user → redirect to /login
        → user OK, no activeWorkspaceId in Redux → redirect to /workspaces
        → user OK, workspace selected → render children (the page)
```

### AuthProvider Details

File: `src/app/authProvider.tsx`

```tsx
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const activeWorkspaceId = useAppSelector((state) => state.global.activeWorkspaceId);
  const { data: currentUser, isLoading, isError } = useGetCurrentUserQuery();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !currentUser) {
      router.push("/login");
      return;
    }
    if (!activeWorkspaceId) {
      router.push("/workspaces");
    }
  }, [isLoading, isError, currentUser, activeWorkspaceId, router]);

  if (isLoading) return <Spinner />;
  if (isError || !currentUser || !activeWorkspaceId) return null;

  return <>{children}</>;
};
```

Key behaviors:
- Shows a spinner while the `GET /auth/me` request is in flight
- Returns `null` (blank screen) while redirecting — this prevents a flash of content
- The JWT access token is an HTTP-only cookie; the frontend never sees it directly
- The `getCurrentUser` query uses the `CurrentUser` RTK tag, which is invalidated on login and logout

### Login Flow

1. User submits form → `useLoginMutation()` fires `POST /auth/login`
2. Backend sets HTTP-only cookies (access token + refresh token)
3. On success, dispatch `setActiveWorkspaceId(null)` to reset workspace selection
4. Navigate to `/workspaces`
5. User clicks a workspace → dispatch `setActiveWorkspaceId(workspace._id)` → navigate to `/dashboard`

```tsx
// login/page.tsx pattern
const [login, { isLoading }] = useLoginMutation();
const dispatch = useAppDispatch();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    await login({ email, password }).unwrap();
    dispatch(setActiveWorkspaceId(null));
    router.push("/workspaces");
  } catch (err: any) {
    setError(err?.data?.message || "Invalid credentials.");
  }
};
```

### Logout Flow

The full logout sequence clears three things:
1. Server-side session (HTTP-only cookies) via `POST /auth/logout`
2. Redux state (`activeWorkspaceId` → null, api state reset)
3. Persisted localStorage via `persistor.purge()`

```tsx
// Navbar.tsx — the canonical logout implementation
const handleSignOut = async () => {
  try {
    await logout().unwrap();
  } catch {}
  dispatch(setActiveWorkspaceId(null));
  dispatch(api.util.resetApiState());
  await getPersistor().purge();
  router.push("/login");
};
```

The Sidebar also has a logout button (mobile only) but does a simpler version — only clears `activeWorkspaceId`. For full cleanup, follow the Navbar pattern.

---

## RTK Query Patterns

### API Configuration

File: `src/state/api.ts`

```typescript
export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    credentials: "include",  // CRITICAL — sends cookies with every request
  }),
  reducerPath: "api",
  tagTypes: ["Projects", "Tasks", "Users", "Workspaces", "CurrentUser"],
  endpoints: (build) => ({ ... }),
});
```

`credentials: "include"` must never be removed. All backend authentication depends on cookies.

### Tag Types

The five declared tag types and their usage:

| Tag | Provided by | Invalidated by |
|-----|-------------|----------------|
| `CurrentUser` | `getCurrentUser` | `login`, `logout` |
| `Workspaces` | `getWorkspaces` | `createWorkspace` |
| `Users` | `getWorkspaceMembers` | (nothing currently) |
| `Projects` | `getProjects`, `getProjectById` | `createProject`, `updateProject`, `createTask`, `updateTask`, `updateTaskStatus` |
| `Tasks` | `getTasks` (per-task IDs) | `createTask`, `updateTask`, `updateTaskStatus` |

### Per-entity Tag Invalidation (Tasks)

The `getTasks` query uses per-task ID tags for fine-grained cache invalidation:

```typescript
providesTags: (result) =>
  result
    ? result.map(({ _id }) => ({ type: "Tasks" as const, id: _id }))
    : [{ type: "Tasks" as const }],
```

Update mutations invalidate only the specific task:

```typescript
invalidatesTags: (_result, _error, { taskId }) => [
  { type: "Tasks", id: taskId },
  "Projects",  // also re-fetch projects since task status affects project status
],
```

### All Endpoints Reference

```typescript
// Auth
useLoginMutation()                 // POST /auth/login
useRegisterMutation()              // POST /auth/register
useLogoutMutation()                // POST /auth/logout
useGetCurrentUserQuery()           // GET  /auth/me
useChangePasswordMutation()        // POST /auth/change-password
useForgotPasswordMutation()        // POST /auth/forgot-password
useResetPasswordMutation()         // POST /auth/reset-password/:token

// Workspaces
useGetWorkspacesQuery()            // GET  /workspace/workspaces
useCreateWorkspaceMutation()       // POST /workspace/workspaces
useGetWorkspaceMembersQuery(id)    // GET  /workspace/:workspaceId/members

// Projects
useGetProjectsQuery(workspaceId)   // GET  /project/workspace/:workspaceId
useGetProjectByIdQuery(projectId)  // GET  /project/:projectId
useCreateProjectMutation()         // POST /project/projects
useUpdateProjectMutation()         // PUT  /project/:projectId (adds members)

// Tasks
useGetTasksQuery({ projectId })    // GET  /task/project/:projectId
useCreateTaskMutation()            // POST /task/tasks
useUpdateTaskStatusMutation()      // PUT  /task/:taskId (status only)
useUpdateTaskMutation()            // PUT  /task/:taskId (full update)
```

### `transformResponse` Pattern

Several queries use `transformResponse` to unwrap the backend's envelope. Always check if a query uses this — the hook's `data` is the transformed value, not the raw response.

```typescript
getWorkspaces: build.query<Workspace[], void>({
  query: () => "workspace/workspaces",
  transformResponse: (res: { workspaces: Workspace[] }) => res.workspaces,
  //                ^^ raw API response              ^^ what `data` contains
  providesTags: ["Workspaces"],
}),
```

Queries with `transformResponse`:
- `getCurrentUser` — unwraps `{ user: User }` → returns `User`
- `getWorkspaces` — unwraps `{ workspaces: [] }` → returns `Workspace[]`
- `getWorkspaceMembers` — unwraps `{ success, data: [] }` → returns `User[]`
- `getProjectById` — unwraps `{ project: Project }` → returns `Project`
- `getProjects` — unwraps `{ projects: [] }` → returns `Project[]`
- `getTasks` — unwraps `{ tasks: [] }` → returns `Task[]`

### Adding a New RTK Query Endpoint

1. Add the endpoint inside `endpoints: (build) => ({...})` in `src/state/api.ts`
2. Export the generated hook at the bottom of the file

```typescript
// Query example (GET)
getThingById: build.query<Thing, string>({
  query: (thingId) => `thing/${thingId}`,
  transformResponse: (res: { thing: Thing }) => res.thing,
  providesTags: (result, error, id) => [{ type: "Things", id }],
}),

// Mutation example (POST/PUT)
createThing: build.mutation<
  { message: string; thing: Thing },
  { name: string; workspaceId: string }
>({
  query: (body) => ({ url: "thing/things", method: "POST", body }),
  invalidatesTags: ["Things"],
}),
```

3. Add `"Things"` to `tagTypes` if it is a new resource type.

4. Export the hook:
```typescript
export const {
  // ... existing hooks
  useGetThingByIdQuery,
  useCreateThingMutation,
} = api;
```

### Consuming RTK Query Hooks

**Query hook pattern:**

```tsx
const { data: projects, isLoading, isError } = useGetProjectsQuery(
  activeWorkspaceId ?? "",
  { skip: !activeWorkspaceId },  // skip if the arg isn't ready
);

if (isLoading) return <div>Loading...</div>;
if (isError || !projects) return <div>Error loading projects.</div>;

// Now `projects` is `Project[]`
```

**Mutation hook pattern:**

```tsx
const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();

const handleSubmit = async () => {
  try {
    await createProject({ name, workspaceId }).unwrap();
    // .unwrap() re-throws RTK Query errors as plain JS errors
    onClose();
  } catch (err: any) {
    setError(err?.data?.message || "Something went wrong.");
  }
};
```

Always use `.unwrap()` when you need to catch errors from a mutation. Without `.unwrap()`, the promise always resolves (errors appear in `isError`/`error` return values).

### Skipping Queries

Use the `skip` option when a required argument is not yet available:

```tsx
// Skip until workspaceId is known
const { data: members } = useGetWorkspaceMembersQuery(
  activeWorkspaceId ?? "",
  { skip: !activeWorkspaceId },
);

// Skip until projectId is known
const { data: project } = useGetProjectByIdQuery(id ?? "", { skip: !id });
```

---

## Key Files by Function

| Purpose | File |
|---------|------|
| All API types and RTK endpoints | `src/state/api.ts` |
| Redux global slice (sidebar, dark mode, workspace) | `src/state/index.ts` |
| Redux store, persist config, typed hooks | `src/app/redux.tsx` |
| Auth guard component | `src/app/authProvider.tsx` |
| Dashboard shell (sidebar + navbar + auth) | `src/app/dashboardWrapper.tsx` |
| Root layout (StoreProvider) | `src/app/layout.tsx` |
| Sidebar navigation | `src/components/Sidebar/index.tsx` |
| Top navbar | `src/components/Navbar/index.tsx` |
| Reusable modal wrapper (portal) | `src/components/Modal/index.tsx` |
| Page heading component | `src/components/Header/index.tsx` |
| MUI DataGrid dark mode helpers | `src/lib/utils.ts` |
| Tailwind custom colors | `tailwind.config.ts` |
| Next.js image config | `next.config.mjs` |

---

## Important Patterns to Follow

### 1. Accessing activeWorkspaceId

Any component that needs the active workspace reads it from Redux — never from props or URL params:

```tsx
import { useAppSelector } from "@/app/redux";

const activeWorkspaceId = useAppSelector(
  (state) => state.global.activeWorkspaceId,
);
```

### 2. Dispatching Redux Actions

```tsx
import { useAppDispatch } from "@/app/redux";
import { setActiveWorkspaceId, setIsDarkMode, setIsSidebarCollapsed } from "@/state";

const dispatch = useAppDispatch();
dispatch(setActiveWorkspaceId("workspace123"));
```

### 3. Loading and Error States in Pages

The pattern used across the codebase is early returns for loading and error:

```tsx
if (isLoading) return <div>Loading...</div>;
if (isError || !members) return <div>Error fetching members</div>;
// rest of component
```

For inline loading inside a larger layout (not a whole page), show inline states:

```tsx
{isLoading && <div className="flex h-64 items-center justify-center text-gray-500">Loading...</div>}
{taskError && (
  <div className="flex h-64 flex-col items-center justify-center gap-3">
    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">{taskError.title}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400">{taskError.message}</p>
  </div>
)}
{!isLoading && !taskError && <>{/* actual content */}</>}
```

### 4. Mutation Error Handling

Use a local `error` string state, not RTK Query's `error` return value, so the error message is user-friendly:

```tsx
const [error, setError] = useState("");
const [login, { isLoading }] = useLoginMutation();

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  try {
    await login({ email, password }).unwrap();
    // success path
  } catch (err: any) {
    setError(err?.data?.message || "Fallback error message.");
  }
};
```

Render the error below the form:

```tsx
{error && (
  <div className="border border-red-800 bg-red-950/40 px-4 py-3">
    <p className="text-xs text-red-400">{error}</p>
  </div>
)}
```

### 5. Dark Mode Tailwind Classes

Always pair light and dark variants when styling:

```tsx
// Background
className="bg-white dark:bg-dark-secondary"
className="bg-gray-50 dark:bg-black"

// Text
className="text-gray-800 dark:text-white"
className="text-gray-500 dark:text-gray-400"

// Borders
className="border-gray-200 dark:border-stroke-dark"
```

Custom dark mode Tailwind colors (from `tailwind.config.ts`):
- `dark-bg`: `#101214` — page background
- `dark-secondary`: `#1d1f21` — card / sidebar / modal backgrounds
- `dark-tertiary`: `#3b3d40` — input backgrounds in dark mode
- `stroke-dark`: `#2d3135` — border color in dark mode
- `blue-primary`: `#0275ff` — primary action button color

### 6. Using MUI DataGrid

Import the shared style helpers from `src/lib/utils.ts`:

```tsx
import { dataGridClassNames, dataGridSxStyles } from "@/lib/utils";
const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

<DataGrid
  rows={data}
  columns={columns}
  getRowId={(row) => row._id}   // IMPORTANT: MongoDB uses _id not id
  className={dataGridClassNames}
  sx={dataGridSxStyles(isDarkMode)}
/>
```

Always use `getRowId={(row) => row._id}` because backend data uses `_id` (MongoDB), not `id`.

### 7. Next.js Image Component

All user avatars must use `next/image` with `unoptimized`:

```tsx
import Image from "next/image";

<Image
  src={user.avatarUrl}
  alt={user.name}
  width={36}
  height={36}
  className="h-full w-full rounded-full object-cover"
  unoptimized  // required — avatars are external URLs
/>
```

The `unoptimized` prop is needed because avatar URLs from `api.dicebear.com` (and user-provided URLs) are not on a fixed hostname list that Next.js Image Optimization supports. Only `api.dicebear.com` is whitelisted in `next.config.mjs` — if avatars from other domains are added, update the config.

### 8. Using the `skip` Option Correctly

Never pass `undefined` or empty string to a query that requires an argument — always pair with `skip`:

```tsx
// Correct
const { data } = useGetProjectsQuery(activeWorkspaceId ?? "", {
  skip: !activeWorkspaceId,
});

// Wrong — will fire a request to /project/workspace/
const { data } = useGetProjectsQuery(activeWorkspaceId || "");
```

### 9. React.use() for Dynamic Route Params

In Next.js 14 App Router, `params` in page components is a Promise. Use `React.use()` to unwrap it:

```tsx
type Props = {
  params: Promise<{ id: string }>;
};

const Project = ({ params }: Props) => {
  const { id } = React.use(params);
  // ...
};
```

---

## Component Patterns

### DashboardWrapper

`dashboardWrapper.tsx` composes `AuthProvider` + `DashboardLayout` (Sidebar + Navbar). Any page that needs the full dashboard shell must be wrapped in it.

```tsx
// Pattern for pages outside the (dashboard) route group:
export default function SomePage() {
  return (
    <DashboardWrapper>
      <YourContent />
    </DashboardWrapper>
  );
}
```

### Modal Pattern

Use the shared `Modal` component from `src/components/Modal` for all modals. It renders via `ReactDOM.createPortal` into `document.body`, so it appears above all other content.

```tsx
import Modal from "@/components/Modal";

<Modal isOpen={isOpen} onClose={onClose} name="Modal Title">
  {/* form or content here */}
</Modal>
```

The `Modal` component renders `null` when `isOpen` is false (no need to conditionally render it at the call site).

### Header Component

Use `Header` from `src/components/Header` for page-level headings:

```tsx
import Header from "@/components/Header";

// Basic
<Header name="Settings" />

// With action button
<Header
  name="List"
  buttonComponent={
    <button onClick={handleClick} className="...">Add Task</button>
  }
  isSmallText  // smaller font, used inside tabs/modals
/>
```

### Sidebar Queries

The Sidebar automatically fetches projects for the active workspace:

```tsx
const { data: projects } = useGetProjectsQuery(activeWorkspaceId ?? "", {
  skip: !activeWorkspaceId,
});
```

Projects appear in the sidebar as links to `/projects/:id`. When a project is created (via `createProject` mutation), the `["Projects"]` tag is invalidated and the sidebar updates automatically.

### Form Input Shared Styles

Modals use shared style constants for consistency:

```tsx
const inputStyles =
  "w-full rounded border border-gray-300 p-2 shadow-sm dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";

const selectStyles =
  "mb-4 block w-full rounded border border-gray-300 px-3 py-2 dark:border-dark-tertiary dark:bg-dark-tertiary dark:text-white dark:focus:outline-none";
```

### Submit Button Disabled State

```tsx
<button
  type="submit"
  disabled={!isFormValid() || isLoading}
  className={`... ${!isFormValid() || isLoading ? "cursor-not-allowed opacity-50" : ""}`}
>
  {isLoading ? "Creating..." : "Create"}
</button>
```

### "Done" Task Edit Restriction

Tasks with status `"done"` cannot be edited. This is enforced in the UI:

```tsx
<button
  className={task.status === "done"
    ? "cursor-not-allowed text-gray-300"
    : "text-gray-500 hover:text-blue-500"}
  onClick={() => task.status !== "done" && setIsEditOpen(true)}
  title={task.status === "done" ? "Cannot edit a completed task" : "Edit task"}
>
```

Follow this pattern in any new view that exposes task editing.

---

## Dark Mode Implementation

Dark mode uses Tailwind's `class` strategy — the `dark` class is added to `<html>` based on Redux state.

### How It Works

1. `isDarkMode` is stored in Redux global slice (persisted to localStorage)
2. `DashboardWrapper`'s inner `DashboardLayout` applies the class on every render:

```tsx
// dashboardWrapper.tsx
useEffect(() => {
  if (isDarkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}, [isDarkMode]);
```

3. The user toggles dark mode from the Navbar:

```tsx
<button onClick={() => dispatch(setIsDarkMode(!isDarkMode))}>
  {isDarkMode ? <Sun /> : <Moon />}
</button>
```

### Dark Mode on Auth Pages and Public Pages

Auth pages (`/login`, `/register`, etc.) and the landing page (`/`) have hardcoded dark backgrounds (`bg-zinc-950`). They do not respond to the Redux `isDarkMode` toggle because they are outside `DashboardWrapper`. This is by design — auth pages are always dark-themed.

### Dark Mode in MUI DataGrid

MUI components do not respond to Tailwind's `dark:` classes. Instead, pass `dataGridSxStyles(isDarkMode)` as the `sx` prop:

```tsx
const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

<DataGrid sx={dataGridSxStyles(isDarkMode)} className={dataGridClassNames} />
```

---

## Styling Conventions

### Two Design Languages

The codebase has two distinct visual styles:

1. **Auth / Public pages** (landing, login, register, workspaces, forgot-password): Dark zinc/amber aesthetic. Font: monospace. Colors: zinc-950 background, amber-400 accents, zinc borders. Uppercase tracking-widest labels.

2. **Dashboard pages** (settings, users, project views): Light-first with dark mode support. Font: Inter (default). Colors: `blue-primary` (#0275ff) for actions, `dark-secondary` for dark cards, standard gray palette.

Do not mix these two styles. New dashboard pages should follow style #2. New auth pages should follow style #1.

### Tailwind Class Order

Tailwind classes follow the order enforced by `prettier-plugin-tailwindcss` (installed as a dev dependency). Run `npm run lint` or the Prettier formatter to auto-sort.

### `tailwind-merge` (tw)

`tailwind-merge` is installed but there is no `cn()` utility function currently defined. If you need to merge conditional Tailwind classes, use template literals or install/create a `cn` helper using `tailwind-merge` + `clsx`.

---

## Common Pitfalls to Avoid

### 1. Forgetting `credentials: "include"`

The `fetchBaseQuery` already has `credentials: "include"`. Do not use the `axios` instance from `src/lib/axios.ts` for RTK Query endpoints — it is a separate instance. The axios instance also has `withCredentials: true`, but RTK Query is the primary HTTP client. Only use axios if you need something RTK Query cannot handle.

### 2. Not Clearing activeWorkspaceId on Logout

Always dispatch `setActiveWorkspaceId(null)` when logging out. If you forget, after logout the user can navigate directly to `/dashboard` and the `AuthProvider` might not redirect them (if they are re-authenticated via a still-valid cookie).

### 3. Mutating Redux State Outside of Slice Reducers

Never use `useAppSelector` to get state and then mutate it directly. Use `useAppDispatch` + action creators.

### 4. Missing `"use client"` Directive

Most components that use hooks (`useState`, `useEffect`, `useAppSelector`, `useRouter`, RTK Query hooks) require the `"use client"` directive at the top of the file. Next.js App Router defaults to Server Components — forgetting this directive causes runtime errors.

Add `"use client"` to:
- Any file using React hooks
- Any file using Redux hooks
- Any file using `useRouter` from `next/navigation`

### 5. Using `id` Instead of `_id` with MUI DataGrid

MongoDB documents use `_id`. MUI DataGrid defaults to `id`. Always provide:

```tsx
getRowId={(row) => row._id}
```

### 6. React.use() vs Direct `params` Access

In Next.js 14 App Router, `params` in page components is asynchronous (a Promise). Do not access `params.id` directly — use `React.use(params)`:

```tsx
// Correct
const { id } = React.use(params);

// Wrong — TypeScript error in strict mode, runtime error in future Next.js
const { id } = params;
```

### 7. Adding New Images from External Domains

`next/image` requires external domains to be allowlisted in `next.config.mjs`. Currently only `api.dicebear.com` is allowed. If avatars come from other sources, add the hostname:

```js
// next.config.mjs
images: {
  remotePatterns: [
    { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
    { protocol: "https", hostname: "your-new-domain.com", pathname: "/**" },
  ],
},
```

Alternatively, use `unoptimized` on the `<Image>` component to bypass optimization entirely.

### 8. Not Using `skip` with Conditional Queries

A query will fire immediately with whatever argument it receives, even an empty string. Always guard with `skip`:

```tsx
// This fires GET /workspace//members — BAD
useGetWorkspaceMembersQuery(activeWorkspaceId || "");

// Correct
useGetWorkspaceMembersQuery(activeWorkspaceId ?? "", {
  skip: !activeWorkspaceId,
});
```

### 9. Redundant Loading State in View Components

Views like `BoardView`, `ListView`, `TableView`, and `TimelineView` do not check `isLoading` or `isError` themselves — the parent `projects/[id]/page.tsx` handles those states and only renders the active view when data is ready. Do not add loading/error checks inside these view components.

### 10. `suppressHydrationWarning` on `<body>`

The root layout has `suppressHydrationWarning` on `<body>`. This suppresses the hydration mismatch warning caused by `redux-persist` rehydrating state on the client. Do not remove it.

---

## Known Bugs and Incomplete Features

### Disabled Features (Stubs)

These routes exist but show "coming soon" messages:

- `/search` — no backend search endpoint
- `/timeline` — workspace-level project Gantt chart; uses `start: new Date(), end: new Date()` for all projects (zero-width bars, renders but is not useful)
- `/priority/*` — all 5 priority pages (backlog, high, low, medium, urgent) are stubs
- `/teams` — exists in the file system but content is unknown

### Known Quirks

**Task priority field**: The `Task` interface has no `priority` field. The backend does not support it. The priority pages are stubs for this reason.

**Email verification**: `User` has an `isEmailVerified` field shown on the settings page, but no email verification flow exists in the frontend or backend (no verification email is sent on register).

**Forgot/reset password**: These pages exist but whether the backend email sending actually works depends on backend email configuration. The frontend flow is complete.

**Workspace-level timeline start/end dates**: In `/timeline/page.tsx`, all Gantt tasks get `start: new Date()` and `end: new Date()`, creating zero-width bars. The project model has no `startDate`/`endDate` fields currently.

**DashboardLayout `useEffect` missing dependency array**: In `dashboardWrapper.tsx`, the effect that toggles the `dark` class runs without a dependency array (every render). This is a minor performance issue but not a correctness bug.

**Sidebar logout vs Navbar logout**: The Sidebar has a sign-out button visible only on mobile (`md:hidden`) that does not call `api.util.resetApiState()` or `persistor.purge()`. The Navbar logout is the complete implementation. If cleaning up the Sidebar logout, use the Navbar pattern.

**`UserCard` component is unused**: `src/components/UserCard/index.tsx` exists but is not imported anywhere in the app.

**`ProjectCard` component is unused**: `src/components/ProjectCard/index.tsx` exists but is not imported anywhere in the app.

**`lib/axios.ts` is rarely used**: An Axios instance is configured but RTK Query is used for all API calls. The axios instance is a leftover and could be removed.

**Error status check pattern**: In `projects/[id]/page.tsx`, the error from RTK Query is checked for status 403 like this:

```tsx
const is403 = "status" in error && error.status === 403;
```

This pattern (checking `"status" in error`) is the correct way to narrow RTK Query's `FetchBaseQueryError | SerializedError` union type. Use this pattern in other places that need to distinguish HTTP status codes.
