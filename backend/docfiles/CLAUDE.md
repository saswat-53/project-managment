# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A comprehensive Project Management System built with Node.js/Express backend and MongoDB. The system implements a hierarchical structure: Users → Workspaces → Projects → Tasks with full CRUD operations, authentication, authorization, and bidirectional relationship management.

## Development Commands

### Backend (from `/backend` directory)

```bash
# Development (with hot reload)
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

### Environment Setup

Required environment variables in `backend/.env`:

**Core Configuration:**
- `MONGO_URI` - MongoDB connection string (required)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment: "development" or "production" (affects transactions, cookie security)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated, e.g., "http://localhost:5173,http://localhost:3000")

**JWT Configuration:**
- `ACCESS_TOKEN_SECRET` - JWT access token secret (strong random string)
- `REFRESH_TOKEN_SECRET` - JWT refresh token secret (different from access secret)
- `ACCESS_TOKEN_EXPIRY` - Access token expiry (e.g., "15m", "1h")
- `REFRESH_TOKEN_EXPIRY` - Refresh token expiry (e.g., "7d", "30d")

**MongoDB Transactions:**
- `MONGODB_REPLICA_SET` - Set to "true" if using MongoDB replica set (enables transactions in production)

**Frontend Integration:**
- `FRONTEND_URL` - Frontend URL for email verification and password reset links (e.g., "http://localhost:5173")

**Note:** In development without replica set, transactions are disabled and operations run sequentially.

## Architecture Overview

### Core Hierarchical Structure

```
User (authentication, role-based access)
  ↓
Workspace (team container, has owner + members, invite code)
  ↓
Project (has members - subset of workspace members)
  ↓
Task (has assignedTo + createdBy - must be project members)
```

### Critical Design Principles

1. **Bidirectional Relationships**: All parent-child relationships maintain references on BOTH sides (e.g., User.workspaces ↔ Workspace.members). When creating/deleting entities, BOTH sides must be updated.

2. **Cascade Deletion with Transactions**:
   - Deleting workspace → deletes all projects → deletes all tasks
   - Uses MongoDB transactions in production (via `utils/transaction.utils.ts`)
   - Falls back to non-transactional sequential operations in development
   - Implemented via Mongoose hooks (`pre('deleteOne')` and `pre('findOneAndDelete')`)
   - See `models/workspace.model.ts:67-153` and `models/project.model.ts:89-191` for implementation

3. **Automatic Stale Member Cleanup**:
   - Pre-update hooks in `models/project.model.ts:172-226` automatically remove members no longer in workspace
   - Unassigns removed members from all tasks in the project
   - Runs on every project update without manual intervention
   - Uses `findOneAndUpdate` pre-hook to intercept updates before execution
   - Merges cleanup operations with existing update operations

4. **Member Validation Hierarchy**:
   - Workspace members must exist in User collection
   - Project members must be workspace members
   - Task assignedTo must be project members (inherently workspace members)
   - All validated before save operations

5. **Authorization Pattern**:
   - Workspace operations: Only members can access, only owner can delete
   - Project operations: Only workspace members can access
   - Task operations: Only project members can access (NOT just workspace members)
   - Uses middleware: `verifyJWT` → populate → check membership arrays

### Data Models - Complete Field Reference

#### User Model (`models/user.model.ts`)

```typescript
{
  name: string (required, trimmed)
  email: string (required, unique, lowercase, validated)
  password: string (required, min 6 chars, hashed with bcrypt)
  role: "admin" | "manager" | "member" (default: "member")
  position: string (optional, user's job title/position)
  avatarUrl: string (auto-generated via DiceBear API if not provided)
  workspaces: ObjectId[] (references to Workspace documents)
  refreshToken: string (optional, stored for token rotation)
  isEmailVerified: boolean (default: false)
  emailVerificationToken: string (optional, hashed)
  emailVerificationExpiry: Date (optional)
  passwordResetToken: string (optional, hashed)
  passwordResetExpiry: Date (optional, 20 minutes)
  createdAt: Date (auto-generated)
  updatedAt: Date (auto-generated)
}
```

**User Methods:**
- `matchPassword(enteredPassword: string): Promise<boolean>` - Bcrypt compare
- `generateAccessToken(): string` - JWT with ACCESS_TOKEN_SECRET
- `generateRefreshToken(): string` - JWT with REFRESH_TOKEN_SECRET

**Avatar Generation:**
- Uses DiceBear API: `https://api.dicebear.com/6.x/thumbs/svg?seed=${email}`
- Automatically generated in pre-save hook if avatarUrl not provided

#### Workspace Model (`models/workspace.model.ts`)

```typescript
{
  name: string (required, trimmed, min 2, max 100 chars)
  description: string (optional, max 500 chars)
  owner: ObjectId (required, reference to User, cannot be changed)
  members: ObjectId[] (references to User, includes owner)
  projects: ObjectId[] (references to Project documents)
  inviteCode: string (required, unique, auto-generated 20-char hex)
  createdAt: Date
  updatedAt: Date
}
```

**Invite Code Generation:**
- `crypto.randomBytes(10).toString("hex")` - 20-character unique hex string
- Generated in pre-save hook if not provided
- Note: Invite code feature exists but no API routes currently use it

**Cascade Delete Hooks:**
- Deletes all projects in workspace
- Deletes all tasks in those projects
- Removes workspace reference from all members' `workspaces` arrays
- Uses transactions in production

#### Project Model (`models/project.model.ts`)

```typescript
{
  name: string (required, trimmed, min 2, max 100 chars)
  description: string (optional, max 500 chars)
  workspace: ObjectId (required, reference to Workspace)
  members: ObjectId[] (required, subset of workspace.members, validated)
  tasks: ObjectId[] (references to Task documents)
  status: "backlog" | "in-progress" | "completed" (default: "backlog")
  startDate: Date (optional)
  endDate: Date (optional)
  createdAt: Date
  updatedAt: Date
}
```

**Stale Member Cleanup Hook (`findOneAndUpdate` pre-hook):**
1. Fetches current project and its workspace
2. Compares project.members with workspace.members
3. Identifies stale members (in project but not in workspace)
4. Removes stale members from project.members
5. Unassigns stale members from all tasks in project
6. Merges cleanup with any existing update operations

**Cascade Delete Hooks:**
- Deletes all tasks in project
- Removes project reference from workspace.projects array
- Uses transactions in production

#### Task Model (`models/task.model.ts`)

```typescript
{
  title: string (required, trimmed, min 2, max 200 chars)
  description: string (optional, max 1000 chars)
  project: ObjectId (required, reference to Project)
  workspace: ObjectId (required, reference to Workspace, denormalized for queries)
  assignedTo: ObjectId (optional, single user reference, must be project member)
  createdBy: ObjectId (required, reference to User, must be project member)
  status: "todo" | "in-progress" | "done" (default: "todo")
  priority: "low" | "medium" | "high" (default: "medium")
  dueDate: Date (optional)
  createdAt: Date
  updatedAt: Date
}
```

**Important Notes:**
- `assignedTo` is a SINGLE ObjectId, not an array (one assignee per task)
- `workspace` is denormalized for efficient querying (populated from project.workspace)
- Status values differ from some documentation: use these exact enum values

**Cascade Delete Hook:**
- Removes task reference from project.tasks array

### Key Files by Function

#### **Authentication & Authorization:**
- `middlewares/auth.ts` - JWT verification and authorization
  - `verifyJWT(req, res, next)` - Verifies JWT from Bearer token OR cookies, populates `req.user`
  - `isAuthenticated(req, res, next)` - Secondary check ensuring user exists on request
  - `authorizeRoles(...roles)` - Role-based access control (admin, manager, member)
  - Supports dual token sources: `Authorization: Bearer <token>` header OR `accessToken` cookie

- `controllers/auth.controller.ts` - Complete authentication flows
  - Registration with email verification
  - Login with JWT token generation (access + refresh)
  - Logout (clears refresh token from DB and cookies)
  - Email verification: send, verify, resend
  - Password reset: forgot password, reset with token, change password
  - Token refresh endpoint (refresh token rotation)

- `models/user.model.ts` - User schema with security features
  - Password hashing (bcrypt, 10 rounds) in pre-save hook
  - Token generation methods (access + refresh)
  - Avatar auto-generation via DiceBear API
  - Email and password reset token hashing before storage

#### **Database Models:**
- `models/user.model.ts` - User with workspaces array, email verification, role enum
- `models/workspace.model.ts` - Workspace with owner, members, projects, cascade delete hooks, invite code
- `models/project.model.ts` - Project with workspace, members, tasks, stale member cleanup hook, cascade delete
- `models/task.model.ts` - Task with project, workspace (denormalized), assignedTo (single), createdBy, cascade delete

#### **Controllers (All with comprehensive JSDoc):**
- `controllers/auth.controller.ts` - Registration, login, logout, email verification, password reset, token refresh
- `controllers/workspace.controller.ts` - CRUD + bidirectional User↔Workspace sync + owner authorization
- `controllers/project.controller.ts` - CRUD + Workspace↔Project sync + member validation + stale cleanup
- `controllers/task.controller.ts` - CRUD + Project↔Task sync + project member authorization

#### **Routes:**
- `routes/auth.route.ts` - Auth endpoints: /register, /login, /logout, /verify-email, /forgot-password, etc.
- `routes/workspace.route.ts` - Workspace CRUD: /api/workspace/workspaces
- `routes/project.route.ts` - Project CRUD: /api/project/projects
- `routes/task.route.ts` - Task CRUD: /api/task/tasks

**Route Naming Pattern:**
- Base: `/api/{entity}/{pluralEntity}`
- Example: `POST /api/workspace/workspaces`, `GET /api/project/projects/:id`

#### **Validators (Zod Schemas):**
- All in `validators/` directory
- Pattern: `{entity}.validator.ts` exports schemas for create, update, param validation
- Files: `auth.validator.ts`, `workspace.validator.ts`, `project.validator.ts`, `task.validator.ts`
- Validation: `zodSchema.safeParse(data)` → returns first error message if invalid

#### **Utilities:**
- `utils/transaction.utils.ts` - MongoDB transaction wrapper
  - `useTransactions()` - Returns true if NODE_ENV=production AND MONGODB_REPLICA_SET=true
  - `withTransaction(callback)` - Wraps operations in transaction (or null session in dev)

- `utils/generateTokens.ts` - JWT token generation utilities
  - `generateAccessToken(userId)` - Creates access token
  - `generateRefreshToken(userId)` - Creates refresh token

- `utils/jwt.ts` - JWT utility (UNUSED - leftover code, consider removing)

#### **Configuration:**
- `config/db.ts` - MongoDB connection setup with retry logic
- `config/swagger.ts` - Swagger/OpenAPI 3.0.0 configuration
  - Defines all schemas (User, Workspace, Project, Task)
  - Security schemes: Bearer auth + cookie auth
  - Custom CSS to hide Swagger UI top bar
  - **Known Issue:** Swagger schemas don't match actual models (see Bugs section)

- `server.ts` - Express app setup, middleware, routes, error handling

### Database Indexes

Performance-critical indexes already implemented:
- `workspace: 1` on Project model (index #75)
- `project: 1` on Task model (index #89)
- `workspace: 1` on Task model (index #90, denormalized query optimization)
- Unique indexes: `email` (User), `inviteCode` (Workspace)

## Important Patterns to Follow

### 1. When Creating Entities with Relationships

**Always update BOTH sides of bidirectional relationships:**

```typescript
// ✅ CORRECT: Creating workspace
const workspace = await Workspace.create({
  name,
  description,
  owner: userId,
  members: memberIds, // includes owner
  inviteCode // auto-generated if not provided
});

// Update User.workspaces array for all members
await User.updateMany(
  { _id: { $in: workspace.members } },
  { $addToSet: { workspaces: workspace._id } }
);
```

**Creating project:**
```typescript
// ✅ CORRECT: Creating project
const project = await Project.create({
  name,
  description,
  workspace: workspaceId,
  members: memberIds, // must be subset of workspace.members
  status: "backlog"
});

// Update Workspace.projects array
await Workspace.findByIdAndUpdate(
  workspaceId,
  { $addToSet: { projects: project._id } }
);
```

**Creating task:**
```typescript
// ✅ CORRECT: Creating task
const task = await Task.create({
  title,
  description,
  project: projectId,
  workspace: project.workspace, // denormalized from project
  assignedTo: userId, // SINGLE user, not array
  createdBy: req.user._id,
  status: "todo",
  priority: "medium"
});

// Update Project.tasks array
await Project.findByIdAndUpdate(
  projectId,
  { $addToSet: { tasks: task._id } }
);
```

### 2. When Deleting Entities

**Cascade deletes are handled by Mongoose hooks, but understanding is important:**

```typescript
// ✅ CORRECT: Deleting workspace
// This triggers hooks that:
// 1. Find all projects in workspace
// 2. Delete all tasks in those projects
// 3. Delete all projects
// 4. Remove workspace from all members' workspaces arrays
// 5. Delete workspace
await workspace.deleteOne();

// Hooks handle all cascade operations with transactions in production
```

**Manual cascade (if not using hooks):**
```typescript
// ⚠️ Only if you need manual control (not recommended)
await withTransaction(async (session) => {
  const projects = await Project.find({ workspace: workspace._id }).session(session);
  const projectIds = projects.map(p => p._id);

  // Delete all tasks
  await Task.deleteMany({ project: { $in: projectIds } }).session(session);

  // Delete all projects
  await Project.deleteMany({ workspace: workspace._id }).session(session);

  // Update user references
  await User.updateMany(
    { _id: { $in: workspace.members } },
    { $pull: { workspaces: workspace._id } }
  ).session(session);

  // Delete workspace
  await workspace.deleteOne({ session });
});
```

### 3. Authorization Checks

**Always verify project membership for task operations:**

```typescript
// ✅ CORRECT: Task authorization
const task = await Task.findById(taskId).populate("project");
if (!task) {
  return res.status(404).json({ message: "Task not found" });
}

const project = task.project as any;

// Check project membership (NOT just workspace membership)
const isProjectMember = project.members.some(
  (memberId: any) => memberId.toString() === req.user._id.toString()
);

if (!isProjectMember) {
  return res.status(403).json({
    message: "You must be a project member to access this task"
  });
}
```

**Workspace authorization:**
```typescript
// ✅ CORRECT: Workspace authorization
const workspace = await Workspace.findById(workspaceId);
if (!workspace) {
  return res.status(404).json({ message: "Workspace not found" });
}

// Check membership
const isMember = workspace.members.some(
  (memberId) => memberId.toString() === req.user._id.toString()
);

if (!isMember) {
  return res.status(403).json({
    message: "You must be a workspace member"
  });
}

// For delete operations, also check ownership
if (req.user._id.toString() !== workspace.owner.toString()) {
  return res.status(403).json({
    message: "Only workspace owner can delete"
  });
}
```

### 4. Member Update Pattern (Additive)

**Use Set to combine existing + new members:**

```typescript
// ✅ CORRECT: Updating workspace members
const workspace = await Workspace.findById(workspaceId);

// Combine existing + new (deduplicates)
const memberSet = new Set([
  ...workspace.members.map(m => m.toString()),
  ...newMemberIds
]);

workspace.members = Array.from(memberSet).map(
  id => new mongoose.Types.ObjectId(id)
);

await workspace.save();

// Update User.workspaces for new members
await User.updateMany(
  { _id: { $in: newMemberIds } },
  { $addToSet: { workspaces: workspace._id } }
);
```

**Note:** Project member updates trigger automatic stale cleanup via hooks.

### 5. Validation Pattern

**All validators follow same pattern:**

```typescript
// ✅ CORRECT: Zod validation
import { createTaskSchema } from "../validators/task.validator";

export const createTask = async (req: Request, res: Response) => {
  const validation = createTaskSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message: validation.error.issues[0].message // First error only
    });
  }

  const { title, description, projectId, assignedTo } = validation.data;
  // ... proceed with validated data
};
```

**Why only first error?**
- Simplified error response for API consumers
- First error usually most critical
- Can change to return all errors if needed: `validation.error.issues`

### 6. Population Pattern for Authorization

**Populate relationships when needed for access checks:**

```typescript
// ✅ CORRECT: Populate for authorization
const task = await Task.findById(taskId)
  .populate("project") // Need project.members for check
  .populate("assignedTo", "name email avatarUrl") // Populate user details
  .populate("createdBy", "name email avatarUrl");

// Now can check: (task.project as any).members
```

**Performance consideration:**
- Populating creates additional queries (N+1 problem potential)
- Only populate when necessary for authorization or response data
- Consider using `lean()` for read-only operations where you don't need full Mongoose documents

### 7. ObjectId Conversion Pattern

**When to convert string to ObjectId:**

```typescript
// Mongoose auto-converts in queries:
await User.findById(userId); // userId can be string, auto-converts

// Manual conversion needed for:
// 1. Array operations
const memberIds = members.map(id => new mongoose.Types.ObjectId(id));

// 2. Direct ObjectId comparisons
if (userId.toString() === workspace.owner.toString()) { ... }

// 3. Setting fields directly
workspace.members = memberIds.map(id => new mongoose.Types.ObjectId(id));
```

## Common Pitfalls to Avoid

1. **❌ Forgetting to update both sides of relationships**
   - Always update parent and child references
   - Example: Creating project → update workspace.projects AND project.workspace

2. **❌ Not using transactions for multi-document operations**
   - Use `withTransaction` utility for cascade operations
   - Ensures atomicity (all-or-nothing) in production

3. **❌ Checking only workspace membership for tasks**
   - Tasks require PROJECT membership, not just workspace membership
   - A user can be in workspace but not in specific project

4. **❌ Not cleaning up files/references on delete**
   - Cascade deletes must be thorough
   - Hooks handle this, but manual operations need care

5. **❌ Not validating member existence**
   - Always verify user IDs exist before adding to workspace/project
   - Example: Check `await User.findById(userId)` before adding to members

6. **❌ Using wrong status enum values**
   - Task status: `["todo", "in-progress", "done"]` (NOT "in_progress" or "completed")
   - Project status: `["backlog", "in-progress", "completed"]` (NOT "active" or "archived")

7. **❌ Treating task.assignedTo as array**
   - It's a SINGLE ObjectId, not an array
   - Assign one user at a time, or set to null for unassigned

8. **❌ Not handling email verification requirement**
   - Some operations require verified email
   - Check `req.user.isEmailVerified` where required

9. **❌ Hardcoding frontend URLs**
   - Use `process.env.FRONTEND_URL` for email links
   - Don't mix localhost and production URLs

10. **❌ Exposing sensitive fields in responses**
    - Never send `password`, `refreshToken`, `passwordResetToken` in API responses
    - Use `.select("-password -refreshToken")` or explicitly choose fields

## Known Bugs & Inconsistencies

### 🐛 Critical Issues (Require Immediate Fix)

1. **Cookie Security Logic Reversed**
   - **Location:** `controllers/auth.controller.ts:43`
   - **Current Code:** `secure: process.env.NODE_ENV !== "production"`
   - **Issue:** Sends cookies over HTTP in production, HTTPS in development (backwards!)
   - **Fix:** Change to `secure: process.env.NODE_ENV === "production"`

2. **CORS Origin Typo**
   - **Location:** `server.ts:15`
   - **Current Code:** `origin: process.env.CORS_ORIGIN?.split(",") || "http://locahost:5173"`
   - **Issue:** `locahost` typo should be `localhost`
   - **Fix:** Change to `"http://localhost:5173"`

3. **Task Status Enum Mismatch**
   - **Model:** `["todo", "in-progress", "done"]` (task.model.ts:30-33)
   - **Swagger:** `["todo", "in_progress", "in_review", "completed"]` (swagger.ts:207)
   - **Impact:** Swagger docs don't match API implementation
   - **Fix:** Update swagger.ts to use model's enum values

4. **Project Status Enum Mismatch**
   - **Model:** `["backlog", "in-progress", "completed"]` (project.model.ts:26-28)
   - **Swagger:** `["active", "archived", "completed"]` (swagger.ts:158)
   - **Impact:** Swagger docs don't match API implementation
   - **Fix:** Update swagger.ts to use model's enum values

5. **Task assignedTo Type Mismatch**
   - **Model:** Single ObjectId field (task.model.ts:47-49)
   - **Swagger:** Array of strings (swagger.ts:199-203)
   - **Impact:** Swagger shows array but API expects single user
   - **Fix:** Update swagger.ts to show single user, not array

### ⚠️ Minor Issues (Lower Priority)

6. **Unused JWT Utility File**
   - **Location:** `utils/jwt.ts`
   - **Issue:** File exports `generateToken()` but is never imported or used anywhere
   - **Fix:** Remove file or document its purpose

7. **Workspace Invite Code Unused**
   - **Location:** workspace.model.ts (inviteCode field auto-generated)
   - **Issue:** No API routes use invite code for joining workspaces
   - **Fix:** Implement invite-by-code endpoint or remove feature

## API Documentation

**Swagger/OpenAPI Documentation:**
- URL: `http://localhost:5000/api-docs` (when server running)
- Version: OpenAPI 3.0.0
- Configuration: `backend/config/swagger.ts`
- Features:
  - Bearer token authentication
  - Cookie authentication (accessToken, refreshToken)
  - Complete schema definitions for all entities
  - Request/response examples
  - Custom CSS (hides Swagger UI top bar)

**Known Issue:** Swagger schemas have mismatches with actual models (see Bugs section above).

## Authentication & Authorization Flows

### Registration & Email Verification

1. **POST /api/auth/register**
   - Validates input (email format, password min 6 chars)
   - Checks if user already exists
   - Hashes password (bcrypt, 10 rounds)
   - Generates avatar via DiceBear API if not provided
   - Creates user with `isEmailVerified: false`
   - Sends verification email (optional)
   - Returns user data (no tokens until email verified)

2. **POST /api/auth/send-verification-email**
   - Generates verification token (crypto.randomBytes)
   - Hashes token before storing
   - Sets expiry (configurable, default 24 hours)
   - Sends email with link: `${FRONTEND_URL}/verify-email?token=${token}`
   - Returns success message

3. **POST /api/auth/verify-email**
   - Receives token from email link
   - Hashes incoming token and compares with stored hash
   - Checks expiry
   - Sets `isEmailVerified: true`
   - Clears verification token and expiry
   - Returns success message

4. **POST /api/auth/resend-verification-email**
   - Re-sends verification email if user hasn't verified
   - Generates new token (invalidates old one)

### Login & Token Management

1. **POST /api/auth/login**
   - Validates credentials
   - Checks email verification status
   - Compares password (bcrypt)
   - Generates access + refresh tokens
   - Stores refresh token in database (for rotation)
   - Sets HTTP-only cookies: `accessToken`, `refreshToken`
   - Returns user data + tokens

2. **POST /api/auth/refresh-token**
   - Receives refresh token from cookie or body
   - Validates refresh token
   - Checks if token matches database (rotation security)
   - Generates new access + refresh tokens
   - Updates refresh token in database
   - Returns new tokens

3. **POST /api/auth/logout**
   - Clears refresh token from database
   - Clears `accessToken` and `refreshToken` cookies
   - Returns success message

### Password Reset

1. **POST /api/auth/forgot-password**
   - Receives email address
   - Generates password reset token
   - Hashes token before storing
   - Sets expiry (20 minutes)
   - Sends email with link: `${FRONTEND_URL}/reset-password?token=${token}`
   - Returns success message (even if email doesn't exist, for security)

2. **POST /api/auth/reset-password**
   - Receives token + new password
   - Validates token and expiry
   - Hashes new password
   - Updates user password
   - Clears reset token and expiry
   - Returns success message

3. **POST /api/auth/change-password** (Authenticated)
   - Requires current password + new password
   - Validates current password
   - Updates to new password
   - Returns success message

### Middleware Flow

**Protected Route Pattern:**
```
Request → verifyJWT → (populate user) → isAuthenticated → authorizeRoles → Controller
```

1. `verifyJWT`: Extracts token from header or cookie, verifies, attaches user to request
2. `isAuthenticated`: Secondary check ensuring user exists
3. `authorizeRoles`: Checks if user has required role (admin, manager, member)
4. Controller: Implements business logic with authorization checks

## Testing Workflow

When testing relationship operations, verify:

1. **Bidirectional Sync**
   - Create workspace → check User.workspaces updated
   - Delete workspace → check User.workspaces cleared
   - Add project → check Workspace.projects updated

2. **Cascade Deletes**
   - Delete workspace → verify all projects deleted
   - Delete workspace → verify all tasks in projects deleted
   - Delete project → verify all tasks deleted
   - Check no orphaned records in database

3. **Member Validation**
   - Add invalid user ID to workspace → should fail
   - Add workspace non-member to project → should fail
   - Assign non-project-member to task → should fail

4. **Authorization**
   - Non-member tries to access workspace → should get 403
   - Non-owner tries to delete workspace → should get 403
   - Non-project-member tries to access task → should get 403

5. **Stale Member Cleanup**
   - Remove user from workspace
   - Update any project in workspace
   - Verify user removed from project.members
   - Verify user unassigned from all tasks in project

6. **Email Verification**
   - Try operations requiring verified email without verification → should fail
   - Verify email with expired token → should fail
   - Verify email with valid token → should succeed

7. **Token Refresh**
   - Use refresh token to get new access token → should succeed
   - Use same refresh token again → should fail (rotation)
   - Logout then try refresh → should fail (cleared from DB)

## Data Consistency Guarantees

The system guarantees:
- ✅ No orphaned projects/tasks after workspace deletion
- ✅ Bidirectional User↔Workspace relationship sync
- ✅ Automatic stale member cleanup from projects
- ✅ Transaction support for cascade operations (production with replica set)
- ✅ All ObjectId references point to existing documents
- ✅ Email verification required for workspace operations
- ✅ Refresh token rotation prevents token replay attacks
- ✅ Password and token hashing before database storage
- ✅ Automatic avatar generation for new users

## Key Documentation Files

- `backend/docfiles/CLAUDE.md` - This file (comprehensive system guide)
- `backend/docfiles/MODEL_RELATIONSHIPS.md` - Detailed relationship documentation (35KB, authoritative)
- `backend/docfiles/BUGS_AND_FIXES.md` - Known issues and implemented fixes
- `backend/docfiles/Future Enhancements.md` - Implementation guides for future features
- `backend/docfiles/REFACTORING_SUGGESTIONS.md` - Code improvement suggestions
- `backend/docfiles/DATA_PIPELINE_FLOWCHART.md` - Visual system architecture

## MongoDB Operators Reference

**Adding references (prevent duplicates):**
- `$addToSet` - Atomic array append, prevents duplicates
- Combined with `Set` in code for pre-deduplication

**Removing references:**
- `$pull` - Remove specific value from array
- `filter()` - Remove multiple items based on condition
- `$unset` - Remove field entirely

**Cascade operations:**
- `deleteMany({ filter })` - Bulk delete matching documents
- `updateMany({ filter }, { update })` - Bulk update matching documents
- `$in` - Match any value in array (e.g., `{ _id: { $in: projectIds } }`)

**Transaction operations:**
- `.session(session)` - Attach session to operation for transaction
- `startSession()` → `startTransaction()` → `commitTransaction()` → `endSession()`

## Code Style Conventions

- **TypeScript:** Strict mode enabled
- **Validation:** Zod schemas for all input validation
- **Async/Await:** All database operations use async/await (no callbacks)
- **Population:** Populate relationships when needed for access checks or response data
- **Lean Queries:** Use `lean()` for read-only queries (not currently widely used, but recommended)
- **Error Responses:** `res.status(code).json({ message: "error message" })`
- **Success Responses:** `res.status(code).json({ message: "success message", data: {...} })`
- **JSDoc:** All controllers have comprehensive JSDoc comments
- **Naming:** camelCase for variables/functions, PascalCase for models/types
- **Imports:** ES6 imports (import/export), not CommonJS (require)

**Type Casting Pattern:**
```typescript
// Common pattern for req.user (populated by middleware)
const userId = (req as any).user._id;

// Or with interface:
interface AuthenticatedRequest extends Request {
  user?: {
    _id: mongoose.Types.ObjectId;
    email: string;
    role: string;
  };
}
```

## Environment-Specific Behavior

**Development (NODE_ENV !== "production"):**
- Transactions disabled (falls back to sequential operations)
- Cookies sent over HTTP (currently buggy, see Bugs section)
- Detailed error logging

**Production (NODE_ENV === "production" + MONGODB_REPLICA_SET === "true"):**
- Transactions enabled (requires MongoDB replica set)
- Cookies sent over HTTPS only (currently buggy, see Bugs section)
- Error logging sanitized

## Recent Major Fixes & Changes

Based on recent commits (from git log):

1. **Cascade Deletion Implementation** (Commit: 0d1f382)
   - Added Mongoose hooks for automatic cascade delete
   - Workspace → Projects → Tasks cascade working
   - Transaction support in production

2. **Automatic Stale Member Cleanup** (Commit: d947e69)
   - Pre-update hooks remove members no longer in workspace
   - Unassigns removed members from tasks
   - Runs automatically on project updates

3. **ObjectId Handling Improvements** (Commit: 5949733)
   - Proper ObjectId conversion in controllers
   - Fixed member validation across workspace/project hierarchy

4. **Swagger Integration** (Commit: 0d1f382)
   - Complete OpenAPI 3.0.0 documentation
   - Available at /api-docs endpoint
   - Schema definitions for all entities

5. **Authorization Fixes** (Commit: e9c6834)
   - Task operations now check project membership (not just workspace)
   - Workspace deletion restricted to owner only
   - Member validation improved

## Performance Considerations

**Current Optimizations:**
- Database indexes on frequently queried fields (workspace, project, email)
- Denormalized `workspace` field on Task model for efficient filtering
- `$addToSet` for atomic array operations (prevents race conditions)

**Known Performance Issues:**
- Population creates N+1 queries (consider using aggregation pipelines for complex queries)
- No pagination implemented (all list endpoints return full arrays)
- Stale member cleanup runs on every project update (could batch)

**Recommendations:**
- Add pagination to list endpoints (especially for tasks, projects)
- Consider using aggregation pipelines for complex queries with multiple populates
- Implement caching for frequently accessed data (Redis)
- Add rate limiting to auth endpoints

## Security Best Practices Implemented

✅ Password hashing (bcrypt, 10 rounds)
✅ JWT token expiry (short-lived access, long-lived refresh)
✅ Refresh token rotation (prevents replay attacks)
✅ HTTP-only cookies (prevents XSS access to tokens)
✅ Token hashing before database storage (email verification, password reset)
✅ Email verification requirement for sensitive operations
✅ CORS configuration (environment-based)
✅ Input validation (Zod schemas on all endpoints)
✅ Authorization checks (workspace/project/task membership)

⚠️ **Security Issues to Address:**
- Cookie `secure` flag logic reversed (see Bugs section)
- No rate limiting on auth endpoints (vulnerable to brute force)
- No CSRF protection (consider if using cookies)
- No input sanitization for XSS (rely on frontend escaping)

## Future Enhancement Ideas

See `backend/docfiles/Future Enhancements.md` for detailed implementation guides.

Quick list:
- Real-time notifications (Socket.io)
- File attachments for tasks
- Task comments/activity log
- Search and filtering
- Analytics dashboard
- Team roles and permissions (beyond admin/manager/member)
- Audit logging
- Rate limiting
- Pagination
- Invite-by-code implementation (infrastructure exists)

## Troubleshooting Common Issues

**1. Transactions Failing**
- Check MongoDB is running as replica set
- Verify `MONGODB_REPLICA_SET=true` in .env
- In development, transactions auto-disable (this is normal)

**2. Email Verification Not Working**
- Check `FRONTEND_URL` is set correctly
- Verify email service configuration (if implemented)
- Check token hasn't expired (24 hours default)

**3. Authorization Failing**
- Verify JWT secret environment variables are set
- Check token hasn't expired
- Ensure user is member of workspace/project
- For tasks, check PROJECT membership, not just workspace

**4. Cascade Delete Not Working**
- Verify hooks are triggering (check console logs)
- In development without replica set, operations are sequential (no rollback)
- Check no manual `findByIdAndDelete` bypassing hooks (use `deleteOne()` on document)

**5. Stale Member Cleanup Not Running**
- Cleanup only runs on project UPDATE, not on workspace member removal
- Trigger by any project update (e.g., update description)
- Check console logs for "Cleanup triggered" messages

---

**Last Updated:** 2026-01-27 (based on codebase scan and git commits)
**Codebase Version:** Main branch, commit 0d1f382
**Known Issues:** See "Known Bugs & Inconsistencies" section above

For questions or issues, refer to other documentation files in `backend/docfiles/` directory.
