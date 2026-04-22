# ProjectFlow — Project Management App

A full-stack project management application with real-time updates, role-based access control, multi-workspace support, and email notifications. Built with **Next.js 14**, **Node.js/Express**, and **MongoDB**.

---

## Features

### Core
- **Multi-Workspace Support** — Create and switch between workspaces; each workspace is fully isolated
- **Role-Based Access Control (RBAC)** — Three roles per workspace: `admin`, `manager`, `member` with enforced permissions
- **Projects & Tasks** — Full CRUD with status tracking, priority levels, due dates, and assignees
- **4 Project Views** — Kanban board (drag-and-drop), List, Timeline (Gantt), and Table
- **Real-Time Updates** — Live task/project changes via Socket.IO
- **Email Notifications** — Workspace invites, project assignments, role changes, removals, and daily task digest (cron)
- **Authentication** — JWT with HTTP-only cookies, email verification, and password reset flow
- **Dark Mode** — System-wide dark mode toggle, persisted across sessions
- **Task Comments & Replies** — Threaded 2-level comment system with inline edit, reply toggle, and permission-based delete
- **File Attachments (Cloudflare R2)** — Upload files directly to R2 via presigned URLs; attachments stored per-task with metadata
- **AI Task Plan Generation** — DeepSeek-powered two-pass LLM that reads your linked GitHub repo, selects relevant files, and generates a structured `plan.md` per task; cached on the task and re-generatable on demand
- **AI Agent Executor** — Autonomous agent that reads the generated plan, fetches relevant files from your GitHub repo, rewrites each file via DeepSeek, commits the changes to a feature branch, and opens a pull request — all from a single "Execute Plan" button; humans review the PR before anything merges

### Project Views
| View | Description |
|------|-------------|
| **Board** | Kanban columns (`Todo`, `In Progress`, `Done`) with drag-and-drop |
| **List** | Card grid layout sorted by status |
| **Timeline** | Gantt chart showing project schedule |
| **Table** | Sortable MUI DataGrid with all task fields |

### RBAC Permission Matrix
| Action | Admin | Manager | Member |
|--------|-------|---------|--------|
| Manage workspace settings | ✓ | — | — |
| Invite / remove members | ✓ | ✓ | — |
| Assign member roles | ✓ | — | — |
| Create / delete projects | ✓ | ✓ | — |
| Create / update tasks | ✓ | ✓ | ✓ |
| View workspace content | ✓ | ✓ | ✓ |

---

## Tech Stack

### Backend
| Tech | Version | Purpose |
|------|---------|---------|
| Node.js + Express | v5 | REST API server |
| TypeScript | 5.x | Type safety |
| MongoDB + Mongoose | 9.x | Database + ODM |
| Socket.IO | 4.x | Real-time events |
| JSON Web Tokens | — | Auth (HTTP-only cookies) |
| node-cron | 4.x | Daily task digest job |
| Resend | — | Transactional emails |
| Zod | 4.x | Request validation |
| Swagger UI | — | API documentation |
| AWS SDK (S3 Client) | 3.x | Cloudflare R2 file uploads via presigned URLs |

### Frontend
| Tech | Version | Purpose |
|------|---------|---------|
| Next.js (App Router) | 14+ | React framework |
| TypeScript | 5.x | Type safety |
| Redux Toolkit + RTK Query | 2.x | State + data fetching |
| redux-persist | — | Persist workspace/auth state |
| Tailwind CSS | 3.x | Styling (dark mode: class strategy) |
| MUI + MUI DataGrid | 6.x | Table views and UI components |
| react-dnd | 16.x | Drag-and-drop Kanban |
| gantt-task-react | — | Gantt / Timeline view |
| Socket.IO Client | 4.x | Real-time updates |

---

## Project Structure

```
project-managment/
├── backend/
│   ├── config/          # DB connection, Swagger setup
│   ├── controllers/     # Route handlers (auth, workspace, project, task, attachment, comment)
│   ├── models/          # Mongoose schemas (User, Workspace, Project, Task, WorkspaceMember, InviteToken)
│   ├── routes/          # Express routers
│   ├── middlewares/     # JWT auth middleware
│   ├── utils/           # Email service, JWT helpers, workspace role helper, R2 client, agentExecutor
│   ├── validators/      # Zod validation schemas
│   ├── jobs/            # node-cron background jobs (daily task digest)
│   ├── socket.ts        # Socket.IO event setup
│   └── server.ts        # Entry point
│
└── frontend/
    └── src/
        ├── app/
        │   ├── (auth)/       # Login, register, forgot/reset password, email verify
        │   ├── (dashboard)/  # Protected dashboard layout group
        │   ├── projects/     # Project detail page (4 views)
        │   ├── workspaces/   # Workspace selector
        │   ├── users/        # Workspace members management
        │   ├── settings/     # User account settings
        │   └── timeline/     # Workspace-level Gantt
        ├── components/      # Reusable components (Navbar, Sidebar, Modals, etc.)
        ├── state/
        │   ├── api.ts        # All RTK Query endpoints + TypeScript types
        │   └── index.ts      # Redux global slice (darkMode, activeWorkspaceId, sidebar)
        ├── hooks/            # Custom React hooks
        └── lib/              # Utilities
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB instance (local or Atlas)
- [Resend](https://resend.com) API key (for emails)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd project-managment
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projectflow
CORS_ORIGIN=http://localhost:3000

JWT_ACCESS_SECRET=your_access_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=onboarding@resend.dev

FRONTEND_URL=http://localhost:3000

# Cloudflare R2 (file attachments)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_r2_bucket_name
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# AI Plan Generation (DeepSeek + GitHub)
DEEPSEEK_API_KEY=your_deepseek_api_key
GITHUB_TOKEN=your_github_pat_with_repo_scope
ENCRYPTION_KEY=64_hex_chars_run_node_e_console_log_crypto_randomBytes_32_toString_hex
```

Start the backend:

```bash
npm run dev
```

Backend runs on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on **http://localhost:3000**

---

## API Reference

Full API documentation is available via **Swagger UI** at:

```
http://localhost:5000/api-docs
```

### Quick Reference

| Module | Base Path | Endpoints |
|--------|-----------|-----------|
| Auth | `/api/auth` | register, login, logout, refresh, verify-email, forgot/reset password, update profile |
| Workspaces | `/api/workspace` | CRUD, members, roles, invite, join |
| Projects | `/api/project` | CRUD, member management |
| Tasks | `/api/task` | CRUD, status/priority updates |
| Attachments | `/api/task/:id/attachments` | Get presigned upload URL, delete attachment |
| Comments | `/api/task/:id/comments` | Add/edit/delete comment, add/delete reply |
| AI Plan | `/api/task/:id/generate-plan` | Generate / regenerate DeepSeek plan for a task |
| AI Agent | `/api/task/:id/execute-plan` | Execute the plan autonomously and open a GitHub PR |
| Health | `/health` | Server + DB liveness check |

**Auth**: All protected routes use HTTP-only cookie-based JWT. Include `credentials: "include"` in all API requests.

---

## Email Notifications

Emails are sent via the [Resend](https://resend.com) API for:

- **Account verification** — on registration
- **Password reset** — via time-bound token link
- **Workspace invite** — when admin/manager invites a user
- **Role changed** — when a member's workspace role is updated
- **Removed from workspace** — when a member is kicked from a workspace
- **Project assignment / removal** — when added to or removed from a project
- **Project deleted** — notifies all project members (excluding the requester)
- **Task assigned** — when a task is created or reassigned to you
- **Daily task digest** — runs at 00:00 UTC via cron; summarizes overdue and due-soon tasks per user

---

## Environment Variables Summary

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No (default: 5000) | Server port |
| `MONGODB_URI` | Yes | MongoDB connection string |
| `CORS_ORIGIN` | Yes | Frontend URL for CORS |
| `JWT_ACCESS_SECRET` | Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `RESEND_API_KEY` | Yes | Resend email API key |
| `EMAIL_FROM` | Yes | Sender email address |
| `FRONTEND_URL` | Yes | Frontend URL (used in email links) |
| `R2_ACCOUNT_ID` | Yes* | Cloudflare account ID for R2 endpoint |
| `R2_ACCESS_KEY_ID` | Yes* | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | Yes* | R2 API token secret |
| `R2_BUCKET_NAME` | Yes* | R2 bucket name |
| `R2_PUBLIC_URL` | Yes* | Public R2 domain (e.g. `https://pub-xxxx.r2.dev`) |
| `DEEPSEEK_API_KEY` | Yes** | DeepSeek API key for AI plan generation and agent execution |
| `GITHUB_TOKEN` | Yes** | GitHub PAT with `repo` scope (server-level fallback; per-project tokens take priority) |
| `ENCRYPTION_KEY` | Yes** | 64 hex chars (32 bytes) — encrypts per-project GitHub PATs at rest |

*Required only if using file attachments. Omit to disable the feature.
**Required only if using AI plan generation or agent execution. Omit to disable the feature. The agent executor reuses the same `DEEPSEEK_API_KEY` and `GITHUB_TOKEN`/per-project PAT — no additional env vars needed.

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Backend API base URL |

---

## Key Design Decisions

**HTTP-only Cookies for Auth** — Access and refresh tokens are stored in HTTP-only cookies (not localStorage) to prevent XSS attacks. The frontend RTK Query base uses `credentials: "include"` on all requests.

**RTK Query as Single Source of Truth** — All API calls and TypeScript types live in `frontend/src/state/api.ts`. This keeps the data layer centralized and avoids scattered `fetch`/`axios` calls.

**Per-Workspace RBAC** — Roles are stored in a dedicated `WorkspaceMember` model (`{ user, workspace, role }`), not on the User model. This allows a user to have different roles in different workspaces (e.g., `admin` in one, `member` in another).

**`activeWorkspaceId` in Redux** — The currently selected workspace ID is persisted in Redux (via `redux-persist`). All workspace-scoped queries automatically `skip` if no workspace is active, preventing unauthorized requests on login.

**Presigned Upload Pattern (R2)** — File uploads bypass the Node.js server entirely. The backend generates a short-lived presigned PUT URL (5 min), the browser uploads directly to Cloudflare R2, and only the metadata (`key`, `fileName`, `fileSize`, `url`) is saved to MongoDB. This keeps the API server stateless and avoids large payload handling.

**Embedded Comments Subdocument** — Task comments are stored as an embedded array inside the Task document (not a separate collection). This keeps reads fast (no joins) and works well given the bounded size of comment threads per task.

**Two-Pass AI Plan Generation** — Plan generation runs two sequential DeepSeek calls: the first selects only the relevant files from the repo tree (avoiding token limits), the second generates the structured `plan.md` using just those files' contents. The result is cached on the Task document (`planMarkdown`, `planGeneratedAt`) so re-opening the plan tab is instant. An in-memory rate limiter (10 requests/hr/user) protects the DeepSeek API quota without requiring Redis.

**AI Agent Executor (202 Non-Blocking Pattern)** — When "Execute Plan" is clicked, the backend immediately responds with `202 Accepted` (setting `executionStatus: "running"`) and runs the agent asynchronously. The agent: parses file paths from the plan's "Files to change" table, fetches each file from GitHub, rewrites each one individually via DeepSeek (`temperature: 0.1`, up to 8192 tokens), clones the repo to a temp directory, writes the changes, commits to a branch named `agent/<title-slug>-<taskId>`, pushes, and opens a GitHub PR. The frontend learns of completion via the existing Socket.IO `task:updated` event — no polling needed. The temp directory is always cleaned up in a `finally` block even on failure. A 409 guard prevents double-execution if the agent is already running.

---

## Roadmap / In Progress

- [ ] Task priority UI (backend support exists, frontend stubs in place)
- [ ] Global task search (`/search`)
- [ ] Teams management (`/teams`)
- [ ] Priority-filtered task views (`/priority/*`)

---

## License

MIT
