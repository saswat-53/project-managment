# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A comprehensive Project Management System built with Node.js/Express backend and MongoDB. The system implements a hierarchical structure: Users → Workspaces → Projects → Tasks with full CRUD operations, authentication, and bidirectional relationship management.

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
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)
- `CORS_ORIGIN` - Allowed CORS origins (comma-separated)
- `ACCESS_TOKEN_SECRET` - JWT access token secret
- `REFRESH_TOKEN_SECRET` - JWT refresh token secret
- `ACCESS_TOKEN_EXPIRY` - Access token expiry (e.g., "15m")
- `REFRESH_TOKEN_EXPIRY` - Refresh token expiry (e.g., "7d")

## Architecture Overview

### Core Hierarchical Structure

```
User (authentication)
  ↓
Workspace (team container, has owner + members)
  ↓
Project (has members, subset of workspace members)
  ↓
Task (has assignedTo, createdBy - must be project members)
```

### Critical Design Principles

1. **Bidirectional Relationships**: All parent-child relationships maintain references on BOTH sides (e.g., User.workspaces ↔ Workspace.members). When creating/deleting entities, BOTH sides must be updated.

2. **Cascade Deletion with Transactions**:
   - Deleting workspace → deletes all projects → deletes all tasks
   - Uses MongoDB transactions in production (via `utils/transaction.utils.ts`)
   - Falls back to non-transactional in development
   - See `models/workspace.model.ts` and `models/project.model.ts` for implementation

3. **Automatic Stale Member Cleanup**:
   - Pre-update hooks in `models/project.model.ts` automatically remove members no longer in workspace
   - Unassigns removed members from all tasks in the project
   - Runs on every project update without manual intervention

4. **Member Validation Hierarchy**:
   - Workspace members must exist in User collection
   - Project members must be workspace members
   - Task assignedTo must be project members (inherently workspace members)

5. **Authorization Pattern**:
   - Workspace operations: Only members can access, only owner can delete
   - Project operations: Only workspace members can access
   - Task operations: Only project members can access (NOT just workspace members)

### Key Files by Function

**Authentication & Authorization:**
- `middlewares/auth.ts` - JWT verification (`verifyJWT`), role authorization (`authorizeRoles`)
- `controllers/auth.controller.ts` - Registration, login, email verification, password reset
- `models/user.model.ts` - Password hashing, token generation, avatar generation

**Database Models:**
- `models/user.model.ts` - User schema with workspaces array, email verification fields
- `models/workspace.model.ts` - Workspace with owner, members, projects, cascade delete hooks
- `models/project.model.ts` - Project with workspace, members, tasks, stale member cleanup hook
- `models/task.model.ts` - Task with project, workspace, assignedTo, createdBy

**Controllers:**
- `controllers/workspace.controller.ts` - CRUD + bidirectional User↔Workspace sync
- `controllers/project.controller.ts` - CRUD + Workspace↔Project sync + member validation
- `controllers/task.controller.ts` - CRUD + Project↔Task sync + project member authorization

**Validators:**
- All use Zod schemas in `validators/` directory
- Pattern: `{entity}.validator.ts` exports schemas for create, update, param validation

**Utilities:**
- `utils/transaction.utils.ts` - MongoDB transaction wrapper (production-aware)
- `utils/generateTokens.ts` - JWT token generation
- `utils/jwt.ts` - JWT utilities

### Database Indexes

Performance-critical indexes already implemented:
- `workspace: 1` on Project model
- `project: 1`, `workspace: 1` on Task model
- Unique indexes on `email` (User), `inviteCode` (Workspace)

## Important Patterns to Follow

### When Creating Entities with Relationships

**Always update BOTH sides of bidirectional relationships:**

```typescript
// ✅ CORRECT: Creating workspace
workspace = await Workspace.create({ /* ... */ });
// Update User.workspaces array
await User.updateMany(
  { _id: { $in: members } },
  { $addToSet: { workspaces: workspace._id } }
);
```

### When Deleting Entities

**Cascade deletes must clean up all references:**

```typescript
// ✅ CORRECT: Deleting workspace
// 1. Find all projects
const projects = await Project.find({ workspace: workspace._id });
const projectIds = projects.map(p => p._id);
// 2. Delete all tasks in projects
await Task.deleteMany({ project: { $in: projectIds } });
// 3. Delete all projects
await Project.deleteMany({ workspace: workspace._id });
// 4. Update user references
await User.updateMany(
  { _id: { $in: workspace.members } },
  { $pull: { workspaces: workspace._id } }
);
// 5. Delete workspace
await workspace.deleteOne();
```

**Use transactions in production** (see `models/workspace.model.ts` for pattern).

### Authorization Checks

**Always verify project membership for task operations:**

```typescript
// ✅ CORRECT: Task authorization
const task = await Task.findById(taskId).populate("project");
const project = task.project as any;

// Check project membership (NOT just workspace membership)
const isProjectMember = project.members.some(
  (memberId: any) => memberId.toString() === userId.toString()
);

if (!isProjectMember) {
  return res.status(403).json({
    message: "You must be a project member to access tasks"
  });
}
```

## Common Pitfalls to Avoid

1. **❌ Forgetting to update both sides of relationships** - Always update parent and child
2. **❌ Not using transactions for multi-document operations** - Use `withTransaction` utility
3. **❌ Checking only workspace membership for tasks** - Must check project membership
4. **❌ Not cleaning up files/references on delete** - Cascade deletes must be thorough
5. **❌ Not validating member existence** - Always verify IDs exist in parent collections

## API Documentation

Swagger/OpenAPI documentation available at: `http://localhost:5000/api-docs` when server is running.

Configuration in `backend/config/swagger.ts`.

## Testing Workflow

When testing relationship operations:
1. Test bidirectional sync (both sides updated)
2. Test cascade deletes (no orphaned records)
3. Test member validation (invalid IDs rejected)
4. Test authorization (correct access control)
5. Test stale member cleanup (automatic removal from projects)

## Data Consistency Guarantees

The system guarantees:
- ✅ No orphaned projects/tasks after workspace deletion
- ✅ Bidirectional User↔Workspace relationship sync
- ✅ Automatic stale member cleanup from projects
- ✅ Transaction support for cascade operations (production)
- ✅ All ObjectId references point to existing documents
- ✅ Email verification required for workspace operations

## Key Documentation Files

- `backend/MODEL_RELATIONSHIPS.md` - Comprehensive relationship documentation (35KB, authoritative)
- `backend/BUGS_AND_FIXES.md` - Known issues and implemented fixes
- `backend/Future Enhancements.md` - Implementation guides for future features
- `backend/REFACTORING_SUGGESTIONS.md` - Code improvement suggestions
- `DATA_PIPELINE_FLOWCHART.md` - Visual system architecture

## MongoDB Operators Used

**Adding references:**
- `$addToSet` - Atomic array append (prevents duplicates)
- `push()` - Array append after Set deduplication

**Removing references:**
- `$pull` - Remove from array
- `filter()` - Remove specific items
- `$unset` - Remove field

**Cascade operations:**
- `deleteMany()` - Bulk delete
- `updateMany()` - Bulk update

## Recent Major Fixes (Important Context)

1. **Cascade deletion** - Added proper cascade from workspace → projects → tasks (see `models/workspace.model.ts` lines 67-153)
2. **Transaction support** - Production uses MongoDB transactions for atomicity (see `utils/transaction.utils.ts`)
3. **Stale member cleanup** - Automatic removal via pre-update hooks (see `models/project.model.ts` lines 25-63)
4. **Task authorization** - Now checks project membership, not just workspace membership

## Code Style Conventions

- Use TypeScript strict mode
- Zod for validation schemas
- Async/await for all database operations
- Populate relationships when needed for access checks
- Use `lean()` for read-only queries (performance)
- Error responses: `res.status(code).json({ message: "..." })`
- Success responses: `res.status(code).json({ message: "...", data })`
