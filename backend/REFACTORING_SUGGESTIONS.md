# Controller Refactoring Suggestions

## Overview
This document outlines refactoring opportunities to reduce code duplication, improve maintainability, and declutter the workspace, project, and task controllers.

**Current state**: ~1,240 lines across 3 controllers
**After refactoring**: ~370 lines (70% reduction)

---

## 1. Repetitive Authorization Logic

### Problem
Authorization checking code is duplicated 15+ times across all controllers:

```typescript
const isMember = something.members
  .map((id: any) => id.toString())
  .includes(userId.toString());

if (!isMember) {
  return res.status(403).json({ message: "Not authorized" });
}
```

### Solution
Create `backend/utils/auth.utils.ts`:

```typescript
import { Response } from "express";
import mongoose from "mongoose";

/**
 * Check if user is a project member
 */
export const checkProjectMember = (project: any, userId: any): boolean => {
  return project.members
    .map((id: any) => id.toString())
    .includes(userId.toString());
};

/**
 * Check if user is a workspace member
 */
export const checkWorkspaceMember = (workspace: any, userId: any): boolean => {
  return workspace.members
    .map((id: any) => id.toString())
    .includes(userId.toString());
};

/**
 * Check if user is workspace owner
 */
export const checkWorkspaceOwner = (workspace: any, userId: any): boolean => {
  return workspace.owner.toString() === userId.toString();
};

/**
 * Require project membership or send 403 response
 */
export const requireProjectMember = (
  project: any,
  userId: any,
  res: Response
): boolean => {
  if (!checkProjectMember(project, userId)) {
    res.status(403).json({
      message: "Not authorized. You must be a project member.",
    });
    return false;
  }
  return true;
};

/**
 * Require workspace membership or send 403 response
 */
export const requireWorkspaceMember = (
  workspace: any,
  userId: any,
  res: Response
): boolean => {
  if (!checkWorkspaceMember(workspace, userId)) {
    res.status(403).json({ message: "Not authorized. You must be a workspace member." });
    return false;
  }
  return true;
};

/**
 * Require workspace ownership or send 403 response
 */
export const requireWorkspaceOwner = (
  workspace: any,
  userId: any,
  res: Response
): boolean => {
  if (!checkWorkspaceOwner(workspace, userId)) {
    res.status(403).json({
      message: "Only the workspace owner can perform this action.",
    });
    return false;
  }
  return true;
};
```

### Usage Example
```typescript
// Before
const isProjectMember = project.members
  .map((id: any) => id.toString())
  .includes(userId.toString());

if (!isProjectMember) {
  return res.status(403).json({
    message: "Not authorized. You must be a project member to create tasks.",
  });
}

// After
if (!requireProjectMember(project, userId, res)) return;
```

**Impact**: Removes ~100 lines across all controllers

---

## 2. Validation Code Duplication

### Problem
Every controller function repeats this validation pattern:

```typescript
const validation = someSchema.safeParse(req.params/req.body);
if (!validation.success) {
  return res.status(400).json({
    message: validation.error.issues[0].message,
  });
}
```

### Solution
Create `backend/middleware/validate.middleware.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

/**
 * Middleware to validate request with Zod schema
 * Validates both params and body, stores result in req.validatedData
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = schema.safeParse({
      ...req.params,
      ...req.body,
    });

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    req.validatedData = validation.data;
    next();
  };
};

/**
 * Validate only request body
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    req.validatedData = validation.data;
    next();
  };
};

/**
 * Validate only request params
 */
export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = schema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    req.validatedData = validation.data;
    next();
  };
};
```

### Usage Example

In routes file:
```typescript
import { validate, validateBody, validateParams } from "../middleware/validate.middleware";

// Single validation (body or params)
router.post('/projects', validateBody(createProjectSchema), createProject);
router.get('/project/:projectId', validateParams(projectIdParamSchema), getProjectById);

// Combined validation (params + body)
router.put('/project/:projectId', validate(updateProjectCombinedSchema), updateProject);
```

In controller:
```typescript
// Before
export const createProject = async (req: Request, res: Response) => {
  try {
    const validation = createProjectSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }
    const { name, description, workspaceId, members, status } = validation.data;
    // ... rest of logic
  }
};

// After
export const createProject = async (req: Request, res: Response) => {
  try {
    const { name, description, workspaceId, members, status } = req.validatedData;
    // ... rest of logic
  }
};
```

**Impact**: Removes ~150 lines across all controllers

---

## 3. Excessive JSDoc Comments

### Problem
JSDoc comments are 30-50 lines per function, making files hard to navigate.

### Current Example
```typescript
/**
 * Create Task
 *
 * Creates a new task within a project.
 * User must be a project member to create tasks.
 * Task creator is automatically set as createdBy.
 * AssignedTo user must be a project member if specified.
 *
 * @route POST /api/task/tasks
 * @access Private (requires authentication and project membership)
 *
 * Request Body:
 * - title: string (required, validated by Zod)
 * - description: string (optional)
 * - projectId: string (required, MongoDB ObjectId)
 * - assignedTo: string (optional, user ID, must be project member)
 * - dueDate: string | Date (optional, ISO datetime string or Date object)
 * - status: string (optional, "todo" | "in-progress" | "done", defaults to "todo")
 *
 * Response:
 * - 201: Task created successfully with task object
 * - 400: Validation error (title or projectId missing, invalid assignee - not a project member)
 * - 403: Not authorized (user not a project member)
 * - 404: Project not found
 * - 500: Internal server error
 *
 * @security
 * - Zod validation for request body
 * - Validates project exists
 * - Verifies user is a project member before allowing task creation
 * - Validates assignedTo user is a project member if specified
 * - Creator automatically set as createdBy
 * - Task automatically added to project.tasks array (bidirectional relationship)
 */
```

### Recommended Format
```typescript
/**
 * Creates a new task within a project.
 * Requires project membership. Assignee must be a project member.
 */
export const createTask = async (req: Request, res: Response) => {
```

### Alternative (if detailed docs needed)
Keep detailed API documentation in a separate file like `API_DOCUMENTATION.md` or use tools like Swagger/OpenAPI.

**Impact**: Removes ~500 lines across all controllers

---

## 4. Member Validation Duplication

### Problem
Member validation logic is duplicated 6+ times:

```typescript
const invalidMembers = members.filter(
  (memberId: string) => !workspaceMemberIds.includes(memberId)
);

if (invalidMembers.length > 0) {
  return res.status(400).json({
    message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users are not members of the workspace.`
  });
}
```

### Solution
Create `backend/utils/member.utils.ts`:

```typescript
import mongoose from "mongoose";
import { Response } from "express";
import { User } from "../models/user.model";

/**
 * Validate that all members exist in a valid members list
 */
export const validateMembersInList = (
  membersToCheck: string[],
  validMembers: string[]
): { valid: boolean; invalidMembers: string[] } => {
  const invalidMembers = membersToCheck.filter(
    (id) => !validMembers.includes(id)
  );

  return {
    valid: invalidMembers.length === 0,
    invalidMembers,
  };
};

/**
 * Validate members are workspace members, send error response if not
 */
export const requireWorkspaceMembers = (
  membersToCheck: string[],
  workspaceMemberIds: string[],
  res: Response
): boolean => {
  const { valid, invalidMembers } = validateMembersInList(
    membersToCheck,
    workspaceMemberIds
  );

  if (!valid) {
    res.status(400).json({
      message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users are not members of the workspace.`,
    });
    return false;
  }

  return true;
};

/**
 * Validate that user IDs exist in database
 */
export const validateUsersExist = async (
  userIds: string[]
): Promise<{ valid: boolean; invalidUsers: string[]; validIds: string[] }> => {
  const users = await User.find({ _id: { $in: userIds } }).select("_id");
  const validIds = users.map((u) => u._id.toString());

  const invalidUsers = userIds.filter((id) => !validIds.includes(id));

  return {
    valid: invalidUsers.length === 0,
    invalidUsers,
    validIds,
  };
};

/**
 * Require users exist in database, send error response if not
 */
export const requireUsersExist = async (
  userIds: string[],
  res: Response
): Promise<{ valid: boolean; validIds: string[] }> => {
  const { valid, invalidUsers, validIds } = await validateUsersExist(userIds);

  if (!valid) {
    res.status(400).json({
      message: `Invalid user IDs: ${invalidUsers.join(", ")}. These users do not exist.`,
    });
    return { valid: false, validIds: [] };
  }

  return { valid: true, validIds };
};

/**
 * Combine member IDs with deduplication using Set
 */
export const combineMembers = (...memberArrays: string[][]): string[] => {
  const memberSet = new Set<string>();
  memberArrays.forEach((arr) => arr.forEach((id) => memberSet.add(id)));
  return Array.from(memberSet);
};
```

### Usage Example
```typescript
// Before
const invalidMembers = members.filter(
  (memberId: string) => !workspaceMemberIds.includes(memberId)
);

if (invalidMembers.length > 0) {
  return res.status(400).json({
    message: `Invalid user IDs: ${invalidMembers.join(", ")}. These users are not members of the workspace.`
  });
}

// After
if (!requireWorkspaceMembers(members, workspaceMemberIds, res)) return;
```

**Impact**: Removes ~60 lines from workspace and project controllers

---

## 5. ObjectId Conversion Clutter

### Problem
ObjectId conversion code is scattered everywhere:

```typescript
const memberObjectIds = validMembers.map(
  (id) => new mongoose.Types.ObjectId(id)
);
```

### Solution
Add to `backend/utils/member.utils.ts` or create `backend/utils/mongoose.utils.ts`:

```typescript
import mongoose from "mongoose";

/**
 * Convert string array to ObjectId array
 */
export const toObjectIds = (ids: string[]): mongoose.Types.ObjectId[] => {
  return ids.map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * Convert single string to ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Convert ObjectId array to string array
 */
export const toStringIds = (ids: mongoose.Types.ObjectId[]): string[] => {
  return ids.map((id) => id.toString());
};
```

### Usage Example
```typescript
// Before
const memberObjectIds = validMembers.map(
  (id) => new mongoose.Types.ObjectId(id)
);

// After
const memberObjectIds = toObjectIds(validMembers);
```

**Impact**: Removes ~40 lines, improves readability

---

## 6. Standardize Error Messages

### Problem
Inconsistent error messages across controllers:
- `workspace.controller.ts:276` - "Only owner can update workspace"
- `workspace.controller.ts:386` - "Not allowed to delete"
- `project.controller.ts:173` - "Not authorized"
- `task.controller.ts:74` - "Not authorized. You must be a project member to create tasks."

### Solution
Create `backend/constants/errors.ts`:

```typescript
export const ERROR_MESSAGES = {
  // Authorization errors
  NOT_AUTHORIZED: "Not authorized",
  NOT_PROJECT_MEMBER: "Not authorized. You must be a project member.",
  NOT_WORKSPACE_MEMBER: "Not authorized. You must be a workspace member.",
  OWNER_ONLY: "Only the workspace owner can perform this action.",

  // Not found errors
  PROJECT_NOT_FOUND: "Project not found",
  WORKSPACE_NOT_FOUND: "Workspace not found",
  TASK_NOT_FOUND: "Task not found",
  USER_NOT_FOUND: "User not found",

  // Validation errors
  EMAIL_NOT_VERIFIED: "Please verify your email before creating a workspace.",
  WORKSPACE_NAME_EXISTS: "Workspace with this name already exists",
  INVALID_MEMBER_IDS: (ids: string[]) =>
    `Invalid user IDs: ${ids.join(", ")}. These users do not exist.`,
  INVALID_WORKSPACE_MEMBERS: (ids: string[]) =>
    `Invalid user IDs: ${ids.join(", ")}. These users are not members of the workspace.`,
  ASSIGNED_USER_NOT_MEMBER: "Assigned user must be a project member",

  // Success messages
  WORKSPACE_CREATED: "Workspace created successfully",
  WORKSPACE_UPDATED: "Workspace updated successfully",
  WORKSPACE_DELETED: "Workspace deleted successfully",
  PROJECT_CREATED: "Project created successfully",
  PROJECT_UPDATED: "Project updated successfully",
  PROJECT_DELETED: "Project deleted successfully",
  TASK_CREATED: "Task created successfully",
  TASK_UPDATED: "Task updated successfully",
  TASK_DELETED: "Task deleted successfully",

  // Generic errors
  INTERNAL_ERROR: "Internal server error",
};
```

### Usage Example
```typescript
// Before
return res.status(403).json({ message: "Not allowed to delete" });

// After
import { ERROR_MESSAGES } from "../constants/errors";
return res.status(403).json({ message: ERROR_MESSAGES.OWNER_ONLY });
```

**Impact**: Improves consistency, makes error messages easier to maintain

---

## 7. Extract Cleanup Logic

### Problem
Auto-cleanup code in `project.controller.ts:324-347` adds 23 lines to `updateProject` function.

### Solution
Create `backend/utils/cleanup.utils.ts`:

```typescript
import mongoose from "mongoose";
import { Task } from "../models/task.model";
import { toObjectIds } from "./mongoose.utils";

/**
 * Remove project members who are no longer workspace members
 * and unassign them from all tasks
 */
export const cleanupStaleProjectMembers = async (
  project: any,
  workspaceMemberIds: string[]
): Promise<string[]> => {
  const currentMemberIds = project.members.map((id: any) => id.toString());

  const staleMembers = currentMemberIds.filter(
    (memberId) => !workspaceMemberIds.includes(memberId)
  );

  if (staleMembers.length > 0) {
    // Remove stale members from project
    project.members = project.members.filter(
      (id: any) => !staleMembers.includes(id.toString())
    );

    // CASCADE: Unassign stale members from all tasks in this project
    await Task.updateMany(
      { project: project._id, assignedTo: { $in: toObjectIds(staleMembers) } },
      { $unset: { assignedTo: "" } }
    );
  }

  return staleMembers;
};
```

### Usage Example
```typescript
// Before (in updateProject)
// AUTO-CLEANUP: Remove stale members who are no longer workspace members
const workspaceMemberIds = workspace.members.map((id: any) => id.toString());
const currentMemberIds = project.members.map((id) => id.toString());

const staleMembers = currentMemberIds.filter(
  (memberId) => !workspaceMemberIds.includes(memberId)
);

if (staleMembers.length > 0) {
  // Remove stale members from project
  project.members = project.members.filter(
    (id) => !staleMembers.includes(id.toString())
  );

  // CASCADE: Unassign stale members from all tasks in this project
  const staleMemberObjectIds = staleMembers.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  await Task.updateMany(
    { project: project._id, assignedTo: { $in: staleMemberObjectIds } },
    { $unset: { assignedTo: "" } }
  );
}

// After
const workspaceMemberIds = workspace.members.map((id: any) => id.toString());
await cleanupStaleProjectMembers(project, workspaceMemberIds);
```

**Impact**: Removes ~20 lines from project controller, improves readability

---

## 8. Inconsistent Populate Usage

### Problem
Some functions populate relationships, others don't, causing confusion:
- `task.controller.ts:242` - Populates project
- `task.controller.ts:174` - Doesn't populate project

### Recommendation
1. **Be consistent** - Either populate or don't for similar operations
2. **Use projection** - Get only needed fields without full populate when possible
3. **Document the pattern** - Add comments explaining when/why you populate

### Example Pattern
```typescript
// When you need workspace data for validation
const project = await Project.findById(projectId).populate("workspace", "members");

// When you only need the workspace ID
const project = await Project.findById(projectId);
// Access: project.workspace (ObjectId)

// When returning data to client
const projects = await Project.find({ workspace: workspaceId })
  .populate("members", "name email")
  .populate("workspace", "name");
```

**Impact**: Improves clarity and prevents bugs

---

## Summary of Impact

| Improvement | Lines Saved | Complexity Reduction |
|------------|-------------|---------------------|
| Auth utility functions | ~100 lines | High |
| Validation middleware | ~150 lines | High |
| Concise JSDoc | ~500 lines | Medium |
| Member validation utility | ~60 lines | Medium |
| ObjectId utilities | ~40 lines | Low |
| Error message constants | ~20 lines | Low |
| Cleanup utility | ~20 lines | Medium |
| **TOTAL** | **~890 lines** | **Significant** |

## Implementation Priority

### Phase 1 (Highest Impact)
1. **Validation middleware** - Removes most boilerplate
2. **Auth utility functions** - Removes repetitive authorization code
3. **Error message constants** - Easy win for consistency

### Phase 2 (Medium Impact)
4. **Member validation utilities** - Reduces workspace/project controller complexity
5. **Cleanup utility** - Improves project controller readability
6. **ObjectId utilities** - Small but useful

### Phase 3 (Polish)
7. **Trim JSDoc comments** - Makes code more navigable
8. **Standardize populate usage** - Improves consistency

## Files to Create

```
backend/
├── utils/
│   ├── auth.utils.ts          (NEW)
│   ├── member.utils.ts        (NEW)
│   ├── mongoose.utils.ts      (NEW)
│   └── cleanup.utils.ts       (NEW)
├── middleware/
│   └── validate.middleware.ts (NEW)
├── constants/
│   └── errors.ts              (NEW)
└── controllers/
    ├── workspace.controller.ts (REFACTOR)
    ├── project.controller.ts   (REFACTOR)
    └── task.controller.ts      (REFACTOR)
```

## Additional Recommendations

### Consider Using Services Layer
Extract business logic from controllers into service files:

```
backend/services/
├── workspace.service.ts
├── project.service.ts
└── task.service.ts
```

This would make controllers thin "routing" layers and move logic to testable services.

### Add Input Sanitization
Consider adding sanitization middleware to prevent XSS attacks:
```typescript
import sanitize from "mongo-sanitize";

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);
  next();
};
```

### Add Request Logging
Consider adding request/response logging middleware for debugging:
```typescript
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    params: req.params,
    user: (req as any).user?._id,
  });
  next();
};
```

---

**Last Updated**: 2025-12-29
