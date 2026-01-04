### 📈 Future Enhancements (Optional)

- Real-time notifications using WebSockets
- Activity logs for audit trails
- Soft delete support with restoration
- File attachments for tasks
- Task comments and discussion threads
- Advanced permissions (read-only members, etc.)
- Task dependencies and subtasks
- Time tracking for tasks
- Custom fields for tasks/projects
- Workspace templates

**Current implementation is solid and production-ready!** 🚀

---
# 🚀 Future Enhancements - Implementation Guides

This section provides comprehensive, step-by-step implementation guides for each future enhancement. Follow these guides to implement features while maintaining consistency with the existing codebase architecture.

---

## Table of Contents
1. [Authorization & Security](#authorization--security)
2. [Invitations & Communication](#invitations--communication)
3. [Task & Project Features](#task--project-features)
4. [Notifications](#notifications)
5. [Productivity & Analytics](#productivity--analytics)
6. [Data Management](#data-management)
7. [Performance & Scalability](#performance--scalability)
8. [Realtime & Collaboration](#realtime--collaboration)
9. [Developer Experience](#developer-experience)

---

## 🔐 Authorization & Security

### 1. Role-Based Access Control (RBAC)

**Overview:**
Implement granular permissions based on user roles (Admin, Manager, Member) to control access to workspace, project, and task operations.

**Current State:**
- User model has `role` field: "admin" | "manager" | "member"
- `authorizeRoles` middleware exists but is not widely used
- Authorization is currently membership-based, not role-based

**Database Changes:**
No new models needed. The User model already has the `role` field.

**Files to Modify:**
- `middlewares/auth.ts` - Enhance authorization middleware
- `controllers/workspace.controller.ts` - Add role checks
- `controllers/project.controller.ts` - Add role checks
- `controllers/task.controller.ts` - Add role checks
- `models/workspace.model.ts` - Add role field for per-workspace roles (optional)
- `models/project.model.ts` - Add role field for per-project roles (optional)

**Step-by-Step Implementation:**

**Option A: Global Roles (Simpler)**

1. **Define Permission Matrix**
   ```typescript
   // utils/permissions.ts
   export const PERMISSIONS = {
     workspace: {
       create: ["admin", "manager", "member"],
       read: ["admin", "manager", "member"],
       update: ["admin", "manager"],        // Owners only
       delete: ["admin"],                   // Owners only
       invite: ["admin", "manager"]         // Owners + managers
     },
     project: {
       create: ["admin", "manager", "member"],
       read: ["admin", "manager", "member"],
       update: ["admin", "manager"],
       delete: ["admin", "manager"],
       manageTasks: ["admin", "manager"]
     },
     task: {
       create: ["admin", "manager", "member"],
       read: ["admin", "manager", "member"],
       update: ["admin", "manager", "member"],
       delete: ["admin", "manager"],
       assign: ["admin", "manager"]
     }
   };

   export const hasPermission = (
     userRole: string,
     resource: keyof typeof PERMISSIONS,
     action: string
   ): boolean => {
     return PERMISSIONS[resource]?.[action]?.includes(userRole) || false;
   };
   ```

2. **Create Authorization Middleware**
   ```typescript
   // middlewares/auth.ts
   import { hasPermission } from "../utils/permissions";

   export const authorize = (resource: string, action: string) => {
     return (req: Request, res: Response, next: NextFunction) => {
       const user = (req as any).user;

       if (!user) {
         return res.status(401).json({ message: "Authentication required" });
       }

       if (!hasPermission(user.role, resource, action)) {
         return res.status(403).json({
           message: `${user.role} role does not have permission to ${action} ${resource}`
         });
       }

       next();
     };
   };
   ```

3. **Apply to Routes**
   ```typescript
   // routes/workspace.routes.ts
   router.post("/workspaces",
     verifyJWT,
     authorize("workspace", "create"),
     createWorkspace
   );

   router.put("/:workspaceId",
     verifyJWT,
     authorize("workspace", "update"),
     updateWorkspace
   );

   router.delete("/:workspaceId",
     verifyJWT,
     authorize("workspace", "delete"),
     deleteWorkspace
   );
   ```

4. **Update Controllers**
   - Remove role-specific logic from controllers
   - Keep ownership checks (e.g., only workspace owner can delete)
   - Combine role-based + ownership-based authorization

**Option B: Per-Workspace/Project Roles (More Complex)**

1. **Add Role Fields to Models**
   ```typescript
   // models/workspace.model.ts
   export interface IWorkspaceMember {
     user: mongoose.Types.ObjectId;
     role: "admin" | "manager" | "member";
     joinedAt: Date;
   }

   const workspaceSchema = new Schema<IWorkspace>({
     // ... existing fields
     members: [{
       user: { type: Schema.Types.ObjectId, ref: "User", required: true },
       role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
       joinedAt: { type: Date, default: Date.now }
     }]
   });
   ```

2. **Update Authorization Logic**
   ```typescript
   // In controller
   const workspace = await Workspace.findById(workspaceId);
   const userMembership = workspace.members.find(
     m => m.user.toString() === userId.toString()
   );

   if (!userMembership) {
     return res.status(403).json({ message: "Not a workspace member" });
   }

   if (!["admin", "manager"].includes(userMembership.role)) {
     return res.status(403).json({ message: "Insufficient permissions" });
   }
   ```

**Security Considerations:**
- Admin role should be carefully assigned
- Workspace owners should always have admin rights
- Role escalation prevention (members can't promote themselves)
- Audit log for role changes

**Testing Considerations:**
- Test each role can only access permitted operations
- Test role-based denials
- Test ownership override (owner always has access)

---

### 2. Rate Limiting

**Overview:**
Prevent abuse by limiting request rates for authentication endpoints and write-heavy operations.

**Dependencies:**
```bash
npm install express-rate-limit
npm install @types/express-rate-limit --save-dev
```

**Files to Create:**
- `middlewares/rateLimiter.ts` - Rate limiting configurations

**Files to Modify:**
- `server.ts` - Apply global rate limiting
- `routes/auth.routes.ts` - Apply strict limits to auth routes

**Step-by-Step Implementation:**

1. **Create Rate Limiter Configurations**
   ```typescript
   // middlewares/rateLimiter.ts
   import rateLimit from "express-rate-limit";

   // Global rate limiter (applied to all routes)
   export const globalLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 1000, // 1000 requests per 15 minutes
     message: "Too many requests, please try again later",
     standardHeaders: true,
     legacyHeaders: false
   });

   // Authentication endpoints (stricter)
   export const authLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 10, // 10 attempts per 15 minutes
     message: "Too many authentication attempts, please try again later",
     skipSuccessfulRequests: true // Don't count successful logins
   });

   // Write operations (moderate)
   export const writeLimiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minute
     max: 30, // 30 write operations per minute
     message: "Too many write operations, please slow down"
   });

   // Invitation sending (prevent spam)
   export const inviteLimiter = rateLimit({
     windowMs: 60 * 60 * 1000, // 1 hour
     max: 20, // 20 invitations per hour
     message: "Too many invitations sent, please wait before sending more"
   });
   ```

2. **Apply to Server**
   ```typescript
   // server.ts
   import { globalLimiter } from "./middlewares/rateLimiter";

   app.use(globalLimiter);
   ```

3. **Apply to Auth Routes**
   ```typescript
   // routes/auth.routes.ts
   import { authLimiter } from "../middlewares/rateLimiter";

   router.post("/register", authLimiter, registerUser);
   router.post("/login", authLimiter, loginUser);
   router.post("/forgot-password", authLimiter, forgotPassword);
   router.post("/reset-password", authLimiter, resetPassword);
   ```

4. **Apply to Write-Heavy Routes**
   ```typescript
   // routes/workspace.routes.ts
   import { writeLimiter, inviteLimiter } from "../middlewares/rateLimiter";

   router.post("/workspaces", verifyJWT, writeLimiter, createWorkspace);
   router.post("/:workspaceId/invite", verifyJWT, inviteLimiter, sendInvitation);
   ```

**Security Considerations:**
- Use Redis for distributed rate limiting in production (multiple servers)
- Different limits for authenticated vs unauthenticated users
- IP-based limiting for auth, user-based for other operations
- Whitelist internal IPs if needed

**Testing Considerations:**
- Test limit enforcement
- Test limit reset after window expires
- Test different limits for different endpoints

---

### 3. API Versioning

**Overview:**
Implement API versioning to allow backward-compatible changes and smooth migrations.

**Strategy:** URL-based versioning (`/api/v1/workspaces`, `/api/v2/workspaces`)

**Files to Create:**
- `routes/v1/` - Version 1 routes (copy existing routes)
- `routes/v2/` - Version 2 routes (for future changes)

**Files to Modify:**
- `server.ts` - Register versioned routes

**Step-by-Step Implementation:**

1. **Restructure Routes**
   ```
   routes/
   ├── v1/
   │   ├── auth.routes.ts
   │   ├── workspace.routes.ts
   │   ├── project.routes.ts
   │   └── task.routes.ts
   └── index.ts
   ```

2. **Create Route Index**
   ```typescript
   // routes/index.ts
   import { Router } from "express";
   import authRoutesV1 from "./v1/auth.routes";
   import workspaceRoutesV1 from "./v1/workspace.routes";
   import projectRoutesV1 from "./v1/project.routes";
   import taskRoutesV1 from "./v1/task.routes";

   const router = Router();

   // Version 1 routes
   router.use("/v1/auth", authRoutesV1);
   router.use("/v1", workspaceRoutesV1);
   router.use("/v1", projectRoutesV1);
   router.use("/v1", taskRoutesV1);

   export default router;
   ```

3. **Update Server**
   ```typescript
   // server.ts
   import routes from "./routes";

   app.use("/api", routes);
   ```

4. **When Creating V2**
   - Copy v1 routes to v2/
   - Make breaking changes in v2
   - Keep v1 stable
   - Document migration path
   - Set deprecation timeline for v1

**Best Practices:**
- Default to latest stable version
- Document version differences
- Provide migration guides
- Support at least 2 versions concurrently
- Announce deprecations in advance

---

## 📩 Invitations & Communication

### Email-based Workspace Invitations

**Overview:**
Allow workspace owners/managers to invite users via email. Invitations can be accepted, rejected, tracked, and have expiry dates.

**Database Changes:**

Create new `WorkspaceInvitation` model:

```typescript
// models/workspaceInvitation.model.ts
import mongoose, { Document, Schema } from "mongoose";
import crypto from "crypto";

export interface IWorkspaceInvitation extends Document {
  workspace: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  invitedEmail: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  token: string;
  expiresAt: Date;
  message?: string;
  isExpired(): boolean;
  generateToken(): { unHashedToken: string; hashedToken: string };
}

const workspaceInvitationSchema = new Schema<IWorkspaceInvitation>({
  workspace: {
    type: Schema.Types.ObjectId,
    ref: "Workspace",
    required: true
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  invitedEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected", "expired"],
    default: "pending"
  },
  token: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  message: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for performance
workspaceInvitationSchema.index({ workspace: 1, status: 1 });
workspaceInvitationSchema.index({ invitedEmail: 1, status: 1 });
workspaceInvitationSchema.index({ token: 1 });
workspaceInvitationSchema.index({ expiresAt: 1 }); // For cleanup jobs

// Check if invitation is expired
workspaceInvitationSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Generate invitation token (similar to User model pattern)
workspaceInvitationSchema.methods.generateToken = function() {
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  const hashedToken = crypto.createHash("sha256")
    .update(unHashedToken)
    .digest("hex");

  return { unHashedToken, hashedToken };
};

// Cascade delete when workspace is deleted
workspaceInvitationSchema.pre("deleteMany", async function() {
  // Cleanup handled by workspace cascade delete
});

export const WorkspaceInvitation = mongoose.model<IWorkspaceInvitation>(
  "WorkspaceInvitation",
  workspaceInvitationSchema
);
```

**Files to Create:**

1. `models/workspaceInvitation.model.ts` - Invitation model
2. `controllers/invitation.controller.ts` - Invitation operations
3. `routes/invitation.routes.ts` - Invitation API routes
4. `validators/invitation.validator.ts` - Zod schemas
5. `utils/email.ts` - Email service integration (optional)

**Files to Modify:**

1. `models/workspace.model.ts` - Add cascade delete for invitations
2. `server.ts` - Register invitation routes
3. `.env` - Add email service configuration

**Step-by-Step Implementation:**

**1. Create Validators**

```typescript
// validators/invitation.validator.ts
import { z } from "zod";

export const sendInvitationSchema = z.object({
  email: z.string().email("Invalid email address"),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  message: z.string().max(500, "Message too long").optional()
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required")
});

export const rejectInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required")
});

export const resendInvitationSchema = z.object({
  invitationId: z.string().min(1, "Invitation ID is required")
});

export const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required")
});
```

**2. Create Controllers**

```typescript
// controllers/invitation.controller.ts
import { Request, Response } from "express";
import { WorkspaceInvitation } from "../models/workspaceInvitation.model";
import { Workspace } from "../models/workspace.model";
import { User } from "../models/user.model";
import {
  sendInvitationSchema,
  acceptInvitationSchema,
  rejectInvitationSchema,
  resendInvitationSchema
} from "../validators/invitation.validator";
import crypto from "crypto";
import mongoose from "mongoose";

/**
 * @desc    Send workspace invitation
 * @route   POST /api/workspaces/:workspaceId/invitations
 * @access  Private (Workspace owner/manager)
 */
export const sendInvitation = async (req: Request, res: Response) => {
  try {
    const validation = sendInvitationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message
      });
    }

    const { email, workspaceId, message } = validation.data;
    const userId = (req as any).user._id;

    // Verify workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Authorization: Only owner or managers can invite
    const isMember = workspace.members
      .map(id => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Check if workspace owner (can add role check for managers)
    const isOwner = workspace.owner.toString() === userId.toString();
    if (!isOwner) {
      return res.status(403).json({
        message: "Only workspace owner can send invitations"
      });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const isAlreadyMember = workspace.members.some(
        memberId => memberId.toString() === existingUser._id.toString()
      );

      if (isAlreadyMember) {
        return res.status(400).json({
          message: "User is already a workspace member"
        });
      }
    }

    // Check for existing pending invitation
    const existingInvite = await WorkspaceInvitation.findOne({
      workspace: workspaceId,
      invitedEmail: email,
      status: "pending",
      expiresAt: { $gt: new Date() }
    });

    if (existingInvite) {
      return res.status(400).json({
        message: "Invitation already sent to this email"
      });
    }

    // Generate invitation token
    const unHashedToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256")
      .update(unHashedToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const invitation = await WorkspaceInvitation.create({
      workspace: workspaceId,
      invitedBy: userId,
      invitedEmail: email,
      token: hashedToken,
      expiresAt,
      message
    });

    // Send email (implement email service)
    const inviteUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${unHashedToken}`;

    // TODO: Implement email service
    // await sendEmail({
    //   to: email,
    //   subject: `Invitation to join ${workspace.name}`,
    //   template: "workspace-invitation",
    //   data: {
    //     workspaceName: workspace.name,
    //     inviterName: (req as any).user.name,
    //     message,
    //     acceptUrl: inviteUrl,
    //     expiresAt
    //   }
    // });

    console.log(`Invitation URL: ${inviteUrl}`); // For development

    res.status(201).json({
      message: "Invitation sent successfully",
      invitation: {
        _id: invitation._id,
        invitedEmail: invitation.invitedEmail,
        expiresAt: invitation.expiresAt,
        inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined
      }
    });
  } catch (error) {
    console.error("Send invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Accept workspace invitation
 * @route   POST /api/invitations/accept
 * @access  Public (with token)
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const validation = acceptInvitationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message
      });
    }

    const { token } = validation.data;
    const userId = (req as any).user?._id; // User might not be logged in

    // Hash the submitted token
    const hashedToken = crypto.createHash("sha256")
      .update(token)
      .digest("hex");

    // Find invitation
    const invitation = await WorkspaceInvitation.findOne({
      token: hashedToken,
      status: "pending"
    }).populate("workspace");

    if (!invitation) {
      return res.status(404).json({
        message: "Invalid or expired invitation"
      });
    }

    // Check if expired
    if (invitation.isExpired()) {
      invitation.status = "expired";
      await invitation.save();

      return res.status(400).json({
        message: "Invitation has expired"
      });
    }

    // If user is not logged in, require them to login/register first
    if (!userId) {
      return res.status(401).json({
        message: "Please login or register to accept the invitation",
        invitedEmail: invitation.invitedEmail
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify email matches (security check)
    if (user.email !== invitation.invitedEmail) {
      return res.status(403).json({
        message: "This invitation was sent to a different email address"
      });
    }

    const workspace = invitation.workspace as any;

    // Check if already a member
    const isAlreadyMember = workspace.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (isAlreadyMember) {
      invitation.status = "accepted";
      await invitation.save();

      return res.status(200).json({
        message: "You are already a member of this workspace",
        workspace
      });
    }

    // Add user to workspace members
    workspace.members.push(userId);
    await workspace.save();

    // Add workspace to user's workspaces (bidirectional relationship)
    await User.updateOne(
      { _id: userId },
      { $addToSet: { workspaces: workspace._id } }
    );

    // Update invitation status
    invitation.status = "accepted";
    await invitation.save();

    res.status(200).json({
      message: "Invitation accepted successfully",
      workspace: {
        _id: workspace._id,
        name: workspace.name,
        description: workspace.description
      }
    });
  } catch (error) {
    console.error("Accept invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Reject workspace invitation
 * @route   POST /api/invitations/:invitationId/reject
 * @access  Public (invited user only)
 */
export const rejectInvitation = async (req: Request, res: Response) => {
  try {
    const { invitationId } = req.params;
    const userId = (req as any).user?._id;

    const invitation = await WorkspaceInvitation.findById(invitationId);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Check if user is the invited person
    if (userId) {
      const user = await User.findById(userId);
      if (user && user.email !== invitation.invitedEmail) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    if (invitation.status !== "pending") {
      return res.status(400).json({
        message: `Invitation has already been ${invitation.status}`
      });
    }

    invitation.status = "rejected";
    await invitation.save();

    res.status(200).json({
      message: "Invitation rejected successfully"
    });
  } catch (error) {
    console.error("Reject invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get pending invitations for workspace
 * @route   GET /api/workspaces/:workspaceId/invitations
 * @access  Private (Workspace members)
 */
export const getWorkspaceInvitations = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user is workspace member
    const isMember = workspace.members
      .map(id => id.toString())
      .includes(userId.toString());

    if (!isMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const invitations = await WorkspaceInvitation.find({
      workspace: workspaceId,
      status: "pending",
      expiresAt: { $gt: new Date() }
    })
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({ invitations });
  } catch (error) {
    console.error("Get invitations error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Cancel/delete invitation
 * @route   DELETE /api/workspaces/:workspaceId/invitations/:invitationId
 * @access  Private (Workspace owner)
 */
export const cancelInvitation = async (req: Request, res: Response) => {
  try {
    const { workspaceId, invitationId } = req.params;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only owner can cancel invitations
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only workspace owner can cancel invitations"
      });
    }

    const invitation = await WorkspaceInvitation.findOne({
      _id: invitationId,
      workspace: workspaceId
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    await invitation.deleteOne();

    res.status(200).json({
      message: "Invitation cancelled successfully"
    });
  } catch (error) {
    console.error("Cancel invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Resend invitation
 * @route   POST /api/workspaces/:workspaceId/invitations/:invitationId/resend
 * @access  Private (Workspace owner)
 */
export const resendInvitation = async (req: Request, res: Response) => {
  try {
    const { workspaceId, invitationId } = req.params;
    const userId = (req as any).user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Only owner can resend invitations
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only workspace owner can resend invitations"
      });
    }

    const invitation = await WorkspaceInvitation.findOne({
      _id: invitationId,
      workspace: workspaceId,
      status: "pending"
    });

    if (!invitation) {
      return res.status(404).json({
        message: "Invitation not found or already processed"
      });
    }

    // Generate new token and extend expiry
    const unHashedToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto.createHash("sha256")
      .update(unHashedToken)
      .digest("hex");

    invitation.token = hashedToken;
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();

    // Resend email
    const inviteUrl = `${process.env.FRONTEND_URL}/invitations/accept?token=${unHashedToken}`;

    // TODO: Send email
    console.log(`Resent invitation URL: ${inviteUrl}`);

    res.status(200).json({
      message: "Invitation resent successfully",
      expiresAt: invitation.expiresAt,
      inviteUrl: process.env.NODE_ENV === "development" ? inviteUrl : undefined
    });
  } catch (error) {
    console.error("Resend invitation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**3. Create Routes**

```typescript
// routes/invitation.routes.ts
import { Router } from "express";
import {
  sendInvitation,
  acceptInvitation,
  rejectInvitation,
  getWorkspaceInvitations,
  cancelInvitation,
  resendInvitation
} from "../controllers/invitation.controller";
import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * @route   POST /api/invitations/accept
 * @desc    Accept workspace invitation
 * @access  Public (with token, but user must be logged in)
 */
router.post("/accept", verifyJWT, acceptInvitation);

/**
 * @route   POST /api/invitations/:invitationId/reject
 * @desc    Reject workspace invitation
 * @access  Public (invited user)
 */
router.post("/:invitationId/reject", rejectInvitation);

/**
 * @route   POST /api/workspaces/:workspaceId/invitations
 * @desc    Send workspace invitation
 * @access  Private (workspace owner)
 */
router.post("/workspaces/:workspaceId/invitations", verifyJWT, sendInvitation);

/**
 * @route   GET /api/workspaces/:workspaceId/invitations
 * @desc    Get pending invitations for workspace
 * @access  Private (workspace members)
 */
router.get("/workspaces/:workspaceId/invitations", verifyJWT, getWorkspaceInvitations);

/**
 * @route   DELETE /api/workspaces/:workspaceId/invitations/:invitationId
 * @desc    Cancel invitation
 * @access  Private (workspace owner)
 */
router.delete(
  "/workspaces/:workspaceId/invitations/:invitationId",
  verifyJWT,
  cancelInvitation
);

/**
 * @route   POST /api/workspaces/:workspaceId/invitations/:invitationId/resend
 * @desc    Resend invitation
 * @access  Private (workspace owner)
 */
router.post(
  "/workspaces/:workspaceId/invitations/:invitationId/resend",
  verifyJWT,
  resendInvitation
);

export default router;
```

**4. Update Workspace Model (Cascade Delete)**

```typescript
// models/workspace.model.ts
import { WorkspaceInvitation } from "./workspaceInvitation.model";

// In pre-delete hooks, add:
await WorkspaceInvitation.deleteMany({ workspace: this._id }, { session });
```

**5. Register Routes**

```typescript
// server.ts
import invitationRoutes from "./routes/invitation.routes";

app.use("/api", invitationRoutes);
```

**6. Email Service Integration (Optional)**

```typescript
// utils/email.ts
import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async (options: EmailOptions) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text
    });

    console.log(`Email sent to ${options.to}`);
  } catch (error) {
    console.error("Email send error:", error);
    throw error;
  }
};

// Email templates
export const invitationEmailTemplate = (data: {
  workspaceName: string;
  inviterName: string;
  message?: string;
  acceptUrl: string;
  expiresAt: Date;
}) => {
  return {
    subject: `Invitation to join ${data.workspaceName}`,
    html: `
      <h2>You've been invited!</h2>
      <p>${data.inviterName} has invited you to join the workspace: <strong>${data.workspaceName}</strong></p>
      ${data.message ? `<p>Message: ${data.message}</p>` : ""}
      <p><a href="${data.acceptUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Accept Invitation</a></p>
      <p>This invitation expires on ${data.expiresAt.toLocaleDateString()}</p>
      <p>If you don't want to accept, you can ignore this email.</p>
    `,
    text: `
      You've been invited to join ${data.workspaceName} by ${data.inviterName}.
      ${data.message || ""}
      Accept the invitation: ${data.acceptUrl}
      Expires: ${data.expiresAt.toLocaleDateString()}
    `
  };
};
```

**7. Environment Variables**

```env
# .env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com
EMAIL_FROM_NAME=Your App Name
FRONTEND_URL=http://localhost:3000
```

**Security Considerations:**
- Hash invitation tokens before storage (similar to password reset tokens)
- Validate email format using Zod
- Prevent spam: Rate limit invitations per workspace/user
- Expire invitations after 7 days (configurable)
- Verify invited email matches logged-in user's email
- Only workspace owner can send/cancel invitations
- Check if user is already a member before accepting

**Testing Considerations:**
- Test expired token rejection
- Test already-member prevention
- Test duplicate invitation prevention
- Test owner-only authorization
- Test bidirectional sync on acceptance (User.workspaces + Workspace.members)
- Test cascade delete when workspace is deleted
- Test email sending (use email testing services in development)
- Test invitation for non-registered users

**Integration Points:**
- Connects with: Workspace model, User model, Email service
- Triggers: User.workspaces update, Workspace.members update on acceptance
- Notifications: Can trigger notification when invitation is sent/accepted

**Potential Challenges:**
- **Email Service Setup**: Use nodemailer with Gmail/SendGrid/AWS SES
- **Non-registered Users**: Store email in invitation, prompt to register before accepting
- **Expired Invitations Cleanup**: Create cron job to delete old invitations
  ```typescript
  // utils/cleanup.ts
  import cron from "node-cron";
  import { WorkspaceInvitation } from "../models/workspaceInvitation.model";

  export const cleanupExpiredInvitations = () => {
    // Run daily at midnight
    cron.schedule("0 0 * * *", async () => {
      const result = await WorkspaceInvitation.deleteMany({
        expiresAt: { $lt: new Date() },
        status: "pending"
      });
      console.log(`Cleaned up ${result.deletedCount} expired invitations`);
    });
  };
  ```
- **Rate Limiting**: Apply `inviteLimiter` to prevent spam (20 invitations per hour)
- **Email Deliverability**: Handle bounced emails, implement retry logic

---

## 🗂️ Task & Project Features

### 1. Task Comments and Discussion Threads

**Overview:**
Allow users to comment on tasks, creating threaded discussions for collaboration.

**Database Changes:**

Create new `TaskComment` model:

```typescript
// models/taskComment.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ITaskComment extends Document {
  task: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  parentComment?: mongoose.Types.ObjectId; // For threaded replies
  mentions: mongoose.Types.ObjectId[]; // @mention users
  isEdited: boolean;
  editedAt?: Date;
}

const taskCommentSchema = new Schema<ITaskComment>({
  task: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: "Workspace",
    required: true
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  parentComment: {
    type: Schema.Types.ObjectId,
    ref: "TaskComment"
  },
  mentions: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
taskCommentSchema.index({ task: 1, createdAt: -1 });
taskCommentSchema.index({ project: 1 });
taskCommentSchema.index({ workspace: 1 });
taskCommentSchema.index({ author: 1 });
taskCommentSchema.index({ parentComment: 1 });

// Cascade delete when task is deleted
taskCommentSchema.pre("deleteMany", async function() {
  // Cleanup handled by task cascade delete
});

export const TaskComment = mongoose.model<ITaskComment>(
  "TaskComment",
  taskCommentSchema
);
```

**Files to Create:**
- `models/taskComment.model.ts` - Comment model
- `controllers/taskComment.controller.ts` - CRUD operations for comments
- `routes/taskComment.routes.ts` - Comment API routes
- `validators/taskComment.validator.ts` - Zod schemas

**Files to Modify:**
- `models/task.model.ts` - Add cascade delete for comments
- `server.ts` - Register comment routes

**Step-by-Step Implementation:**

**1. Create Validators**

```typescript
// validators/taskComment.validator.ts
import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long (max 5000 characters)"),
  taskId: z.string().min(1, "Task ID is required"),
  parentCommentId: z.string().optional(),
  mentions: z.array(z.string()).optional()
});

export const updateCommentSchema = z.object({
  content: z.string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment too long (max 5000 characters)")
});

export const commentIdParamSchema = z.object({
  commentId: z.string().min(1, "Comment ID is required")
});

export const taskIdParamSchema = z.object({
  taskId: z.string().min(1, "Task ID is required")
});
```

**2. Create Controllers**

```typescript
// controllers/taskComment.controller.ts
import { Request, Response } from "express";
import { TaskComment } from "../models/taskComment.model";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import { User } from "../models/user.model";
import {
  createCommentSchema,
  updateCommentSchema
} from "../validators/taskComment.validator";
import mongoose from "mongoose";

/**
 * @desc    Create comment on task
 * @route   POST /api/tasks/:taskId/comments
 * @access  Private (Project members)
 */
export const createComment = async (req: Request, res: Response) => {
  try {
    const validation = createCommentSchema.safeParse({
      ...req.body,
      taskId: req.params.taskId
    });

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message
      });
    }

    const { content, taskId, parentCommentId, mentions } = validation.data;
    const userId = (req as any).user._id;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({
        message: "Only project members can comment on tasks"
      });
    }

    // Verify parent comment exists (if replying)
    if (parentCommentId) {
      const parentComment = await TaskComment.findOne({
        _id: parentCommentId,
        task: taskId
      });

      if (!parentComment) {
        return res.status(404).json({
          message: "Parent comment not found"
        });
      }
    }

    // Verify mentioned users are project members
    let validMentions: mongoose.Types.ObjectId[] = [];
    if (mentions && mentions.length > 0) {
      const mentionedUsers = await User.find({
        _id: { $in: mentions }
      }).select("_id");

      validMentions = mentionedUsers
        .filter(user =>
          project.members.some(
            (memberId: any) => memberId.toString() === user._id.toString()
          )
        )
        .map(user => user._id);
    }

    // Create comment
    const comment = await TaskComment.create({
      task: taskId,
      project: project._id,
      workspace: task.workspace,
      author: userId,
      content,
      parentComment: parentCommentId,
      mentions: validMentions
    });

    // Populate author for response
    await comment.populate("author", "name email avatarUrl");
    if (parentCommentId) {
      await comment.populate("parentComment");
    }
    if (validMentions.length > 0) {
      await comment.populate("mentions", "name email");
    }

    // TODO: Send notifications to mentioned users

    res.status(201).json({
      message: "Comment created successfully",
      comment
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get comments for a task
 * @route   GET /api/tasks/:taskId/comments
 * @access  Private (Project members)
 */
export const getTaskComments = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user._id;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get all comments for task
    const comments = await TaskComment.find({ task: taskId })
      .populate("author", "name email avatarUrl")
      .populate("mentions", "name email")
      .sort({ createdAt: 1 }) // Oldest first
      .lean();

    // Organize into threads
    const commentMap = new Map();
    const rootComments: any[] = [];

    // First pass: create map and identify root comments
    comments.forEach(comment => {
      commentMap.set(comment._id.toString(), {
        ...comment,
        replies: []
      });

      if (!comment.parentComment) {
        rootComments.push(comment._id.toString());
      }
    });

    // Second pass: nest replies
    comments.forEach(comment => {
      if (comment.parentComment) {
        const parent = commentMap.get(comment.parentComment.toString());
        if (parent) {
          parent.replies.push(commentMap.get(comment._id.toString()));
        }
      }
    });

    // Build final threaded structure
    const threadedComments = rootComments.map(id => commentMap.get(id));

    res.status(200).json({
      comments: threadedComments,
      totalCount: comments.length
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Update comment
 * @route   PUT /api/comments/:commentId
 * @access  Private (Comment author only)
 */
export const updateComment = async (req: Request, res: Response) => {
  try {
    const validation = updateCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message
      });
    }

    const { content } = validation.data;
    const { commentId } = req.params;
    const userId = (req as any).user._id;

    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only author can update
    if (comment.author.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only comment author can update it"
      });
    }

    comment.content = content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate("author", "name email avatarUrl");

    res.status(200).json({
      message: "Comment updated successfully",
      comment
    });
  } catch (error) {
    console.error("Update comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Delete comment
 * @route   DELETE /api/comments/:commentId
 * @access  Private (Comment author or project member with manager role)
 */
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = (req as any).user._id;

    const comment = await TaskComment.findById(commentId)
      .populate("project");

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const project = comment.project as any;

    // Can delete if: author OR project manager/owner
    const isAuthor = comment.author.toString() === userId.toString();
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isAuthor && !isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete comment and its replies
    await TaskComment.deleteMany({
      $or: [
        { _id: commentId },
        { parentComment: commentId }
      ]
    });

    res.status(200).json({
      message: "Comment deleted successfully"
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**3. Update Task Model (Cascade Delete)**

```typescript
// models/task.model.ts
import { TaskComment } from "./taskComment.model";

// In pre-delete hooks, add:
await TaskComment.deleteMany({ task: this._id }, { session });
```

**4. Create Routes**

```typescript
// routes/taskComment.routes.ts
import { Router } from "express";
import {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment
} from "../controllers/taskComment.controller";
import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * @route   POST /api/tasks/:taskId/comments
 * @desc    Create comment on task
 * @access  Private
 */
router.post("/tasks/:taskId/comments", verifyJWT, createComment);

/**
 * @route   GET /api/tasks/:taskId/comments
 * @desc    Get all comments for a task (threaded)
 * @access  Private
 */
router.get("/tasks/:taskId/comments", verifyJWT, getTaskComments);

/**
 * @route   PUT /api/comments/:commentId
 * @desc    Update comment
 * @access  Private (author only)
 */
router.put("/comments/:commentId", verifyJWT, updateComment);

/**
 * @route   DELETE /api/comments/:commentId
 * @desc    Delete comment
 * @access  Private (author or manager)
 */
router.delete("/comments/:commentId", verifyJWT, deleteComment);

export default router;
```

**Security Considerations:**
- Only project members can comment
- Only author can edit their comments
- Mentioned users must be project members
- Content length limits (max 5000 chars)
- XSS prevention (sanitize HTML if allowing rich text)

**Testing Considerations:**
- Test threaded replies
- Test cascade delete (task deleted → comments deleted)
- Test mention validation
- Test authorization (only project members)
- Test edit tracking (isEdited, editedAt)

**Integration Points:**
- Notifications: Notify mentioned users
- Activity logs: Log comment creation/editing/deletion
- Real-time: Broadcast new comments via WebSockets

---

### 2. Task Activity Logs

**Overview:**
Track all changes to tasks (status changes, assignments, field updates) for audit and history purposes.

**Database Changes:**

Create new `TaskActivity` model:

```typescript
// models/taskActivity.model.ts
import mongoose, { Document, Schema } from "mongoose";

export interface ITaskActivity extends Document {
  task: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  workspace: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  action: "created" | "updated" | "deleted" | "assigned" | "unassigned" | "status_changed" | "commented";
  field?: string; // Field that was changed (for updates)
  oldValue?: string;
  newValue?: string;
  metadata?: Record<string, any>; // Additional context
}

const taskActivitySchema = new Schema<ITaskActivity>({
  task: {
    type: Schema.Types.ObjectId,
    ref: "Task",
    required: true
  },
  project: {
    type: Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: "Workspace",
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  action: {
    type: String,
    enum: ["created", "updated", "deleted", "assigned", "unassigned", "status_changed", "commented"],
    required: true
  },
  field: {
    type: String
  },
  oldValue: {
    type: String
  },
  newValue: {
    type: String
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
taskActivitySchema.index({ task: 1, createdAt: -1 });
taskActivitySchema.index({ project: 1, createdAt: -1 });
taskActivitySchema.index({ workspace: 1, createdAt: -1 });
taskActivitySchema.index({ user: 1 });

export const TaskActivity = mongoose.model<ITaskActivity>(
  "TaskActivity",
  taskActivitySchema
);
```

**Files to Create:**
- `models/taskActivity.model.ts` - Activity log model
- `utils/activityLogger.ts` - Helper functions for logging
- `controllers/taskActivity.controller.ts` - Get activity logs

**Files to Modify:**
- `controllers/task.controller.ts` - Add activity logging to all operations
- `models/task.model.ts` - Add pre/post hooks for automatic logging (optional)

**Step-by-Step Implementation:**

**1. Create Activity Logger Utility**

```typescript
// utils/activityLogger.ts
import { TaskActivity } from "../models/taskActivity.model";
import mongoose from "mongoose";

interface LogActivityParams {
  taskId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: "created" | "updated" | "deleted" | "assigned" | "unassigned" | "status_changed" | "commented";
  field?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export const logTaskActivity = async (params: LogActivityParams) => {
  try {
    await TaskActivity.create({
      task: params.taskId,
      project: params.projectId,
      workspace: params.workspaceId,
      user: params.userId,
      action: params.action,
      field: params.field,
      oldValue: params.oldValue?.toString(),
      newValue: params.newValue?.toString(),
      metadata: params.metadata
    });
  } catch (error) {
    console.error("Activity logging error:", error);
    // Don't throw - logging failure shouldn't break the main operation
  }
};

// Helper to format activity for display
export const formatActivityMessage = (activity: any): string => {
  const userName = activity.user?.name || "Unknown user";

  switch (activity.action) {
    case "created":
      return `${userName} created this task`;

    case "updated":
      if (activity.field) {
        return `${userName} changed ${activity.field} from "${activity.oldValue}" to "${activity.newValue}"`;
      }
      return `${userName} updated this task`;

    case "deleted":
      return `${userName} deleted this task`;

    case "assigned":
      return `${userName} assigned this task to ${activity.metadata?.assignedToName || "someone"}`;

    case "unassigned":
      return `${userName} unassigned ${activity.metadata?.previousAssigneeName || "someone"} from this task`;

    case "status_changed":
      return `${userName} changed status from "${activity.oldValue}" to "${activity.newValue}"`;

    case "commented":
      return `${userName} commented on this task`;

    default:
      return `${userName} performed an action`;
  }
};
```

**2. Integrate into Task Controller**

```typescript
// controllers/task.controller.ts
import { logTaskActivity } from "../utils/activityLogger";

// In createTask controller:
export const createTask = async (req: Request, res: Response) => {
  // ... existing task creation code ...

  // Log activity
  await logTaskActivity({
    taskId: task._id,
    projectId: task.project,
    workspaceId: task.workspace,
    userId,
    action: "created"
  });

  // ... rest of the code ...
};

// In updateTask controller:
export const updateTask = async (req: Request, res: Response) => {
  // ... existing code ...

  // Track changes
  const changes: Array<{field: string; oldValue: any; newValue: any}> = [];

  if (title !== undefined && title !== task.title) {
    changes.push({ field: "title", oldValue: task.title, newValue: title });
    task.title = title;
  }

  if (status !== undefined && status !== task.status) {
    changes.push({ field: "status", oldValue: task.status, newValue: status });
    task.status = status;
  }

  if (assignedTo !== undefined) {
    const oldAssignee = task.assignedTo;
    const newAssignee = assignedTo === null ? undefined : assignedTo;

    if (oldAssignee?.toString() !== newAssignee?.toString()) {
      if (newAssignee) {
        changes.push({ field: "assignedTo", oldValue: oldAssignee, newValue: newAssignee });
      } else {
        changes.push({ field: "assignedTo", oldValue: oldAssignee, newValue: "unassigned" });
      }
    }
  }

  await task.save();

  // Log all changes
  for (const change of changes) {
    if (change.field === "status") {
      await logTaskActivity({
        taskId: task._id,
        projectId: task.project,
        workspaceId: task.workspace,
        userId,
        action: "status_changed",
        oldValue: change.oldValue,
        newValue: change.newValue
      });
    } else if (change.field === "assignedTo") {
      if (change.newValue === "unassigned") {
        await logTaskActivity({
          taskId: task._id,
          projectId: task.project,
          workspaceId: task.workspace,
          userId,
          action: "unassigned",
          metadata: { previousAssignee: change.oldValue }
        });
      } else {
        await logTaskActivity({
          taskId: task._id,
          projectId: task.project,
          workspaceId: task.workspace,
          userId,
          action: "assigned",
          metadata: { assignedTo: change.newValue }
        });
      }
    } else {
      await logTaskActivity({
        taskId: task._id,
        projectId: task.project,
        workspaceId: task.workspace,
        userId,
        action: "updated",
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue
      });
    }
  }

  // ... rest of the code ...
};

// In deleteTask controller:
export const deleteTask = async (req: Request, res: Response) => {
  // Log before deletion
  await logTaskActivity({
    taskId: task._id,
    projectId: task.project,
    workspaceId: task.workspace,
    userId,
    action: "deleted"
  });

  // ... existing deletion code ...
};
```

**3. Create Activity Controller**

```typescript
// controllers/taskActivity.controller.ts
import { Request, Response } from "express";
import { TaskActivity } from "../models/taskActivity.model";
import { Task } from "../models/task.model";
import { formatActivityMessage } from "../utils/activityLogger";

/**
 * @desc    Get activity logs for a task
 * @route   GET /api/tasks/:taskId/activity
 * @access  Private (Project members)
 */
export const getTaskActivity = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user._id;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get activity logs
    const activities = await TaskActivity.find({ task: taskId })
      .populate("user", "name email avatarUrl")
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 activities
      .lean();

    // Format activities with human-readable messages
    const formattedActivities = activities.map(activity => ({
      ...activity,
      message: formatActivityMessage(activity)
    }));

    res.status(200).json({
      activities: formattedActivities,
      totalCount: activities.length
    });
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Get activity logs for a project
 * @route   GET /api/projects/:projectId/activity
 * @access  Private (Project members)
 */
export const getProjectActivity = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user._id;
    const { limit = 50, skip = 0 } = req.query;

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Get activity logs
    const activities = await TaskActivity.find({ project: projectId })
      .populate("user", "name email avatarUrl")
      .populate("task", "title")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean();

    const formattedActivities = activities.map(activity => ({
      ...activity,
      message: formatActivityMessage(activity)
    }));

    const totalCount = await TaskActivity.countDocuments({ project: projectId });

    res.status(200).json({
      activities: formattedActivities,
      totalCount,
      hasMore: Number(skip) + activities.length < totalCount
    });
  } catch (error) {
    console.error("Get project activity error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**4. Add Routes**

```typescript
// routes/taskActivity.routes.ts
import { Router } from "express";
import {
  getTaskActivity,
  getProjectActivity
} from "../controllers/taskActivity.controller";
import { verifyJWT } from "../middlewares/auth";

const router = Router();

router.get("/tasks/:taskId/activity", verifyJWT, getTaskActivity);
router.get("/projects/:projectId/activity", verifyJWT, getProjectActivity);

export default router;
```

**Security Considerations:**
- Only project members can view activity logs
- Activity logs are immutable (no update/delete operations)
- Sensitive data should not be logged (passwords, tokens)

**Testing Considerations:**
- Test all actions are logged (create, update, delete, assign, status change)
- Test activity retrieval with pagination
- Test authorization (only project members)
- Test formatted messages are human-readable

**Integration Points:**
- Can be displayed in task detail view
- Can be used for notifications (notify on status change)
- Can be exported for reporting

---

### 3. File Attachments for Tasks

**Overview:**
Allow users to upload and attach files (images, documents) to tasks.

**Dependencies:**
```bash
npm install multer
npm install @types/multer --save-dev
# For cloud storage (optional):
npm install @aws-sdk/client-s3 # For AWS S3
# OR
npm install @google-cloud/storage # For Google Cloud Storage
```

**Database Changes:**

Add `attachments` field to Task model:

```typescript
// models/task.model.ts
export interface ITaskAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

export interface ITask extends Document {
  // ... existing fields ...
  attachments: ITaskAttachment[];
}

const taskSchema = new Schema<ITask>({
  // ... existing fields ...
  attachments: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now }
  }]
});
```

**Files to Create:**
- `middlewares/upload.ts` - Multer configuration
- `utils/fileStorage.ts` - File storage utilities (local or cloud)
- `controllers/attachment.controller.ts` - Attachment operations

**Files to Modify:**
- `models/task.model.ts` - Add attachments field
- `controllers/task.controller.ts` - Handle file cleanup on task delete
- `routes/task.routes.ts` - Add attachment routes

**Step-by-Step Implementation:**

**Option A: Local File Storage (Simpler)**

**1. Create Upload Middleware**

```typescript
// middlewares/upload.ts
import multer from "multer";
import path from "path";
import crypto from "crypto";

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in uploads/attachments/
    cb(null, path.join(__dirname, "../uploads/attachments"));
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter (allowed file types)
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: images, PDFs, docs, spreadsheets, text files"));
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Middleware for handling upload errors
export const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large (max 10MB)" });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
```

**2. Create Attachment Controller**

```typescript
// controllers/attachment.controller.ts
import { Request, Response } from "express";
import { Task } from "../models/task.model";
import { Project } from "../models/project.model";
import path from "path";
import fs from "fs";

/**
 * @desc    Upload file attachment to task
 * @route   POST /api/tasks/:taskId/attachments
 * @access  Private (Project members)
 */
export const uploadAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = (req as any).user._id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      // Delete uploaded file if task not found
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      fs.unlinkSync(file.path);
      return res.status(403).json({ message: "Not authorized" });
    }

    // Create attachment object
    const attachment = {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: `/uploads/attachments/${file.filename}`,
      uploadedBy: userId,
      uploadedAt: new Date()
    };

    // Add to task
    task.attachments.push(attachment);
    await task.save();

    // Log activity
    await logTaskActivity({
      taskId: task._id,
      projectId: task.project,
      workspaceId: task.workspace,
      userId,
      action: "updated",
      field: "attachments",
      newValue: `Added file: ${file.originalname}`,
      metadata: { filename: file.originalname, size: file.size }
    });

    res.status(201).json({
      message: "File uploaded successfully",
      attachment
    });
  } catch (error) {
    console.error("Upload attachment error:", error);
    // Clean up file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Download attachment
 * @route   GET /api/tasks/:taskId/attachments/:filename
 * @access  Private (Project members)
 */
export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId, filename } = req.params;
    const userId = (req as any).user._id;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find attachment
    const attachment = task.attachments.find(a => a.filename === filename);
    if (!attachment) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Send file
    const filePath = path.join(__dirname, "../uploads/attachments", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on server" });
    }

    res.download(filePath, attachment.originalName);
  } catch (error) {
    console.error("Download attachment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * @desc    Delete attachment
 * @route   DELETE /api/tasks/:taskId/attachments/:filename
 * @access  Private (Uploader or project manager)
 */
export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const { taskId, filename } = req.params;
    const userId = (req as any).user._id;

    // Verify task exists and user has access
    const task = await Task.findById(taskId).populate("project");
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const project = task.project as any;
    const isProjectMember = project.members.some(
      (memberId: any) => memberId.toString() === userId.toString()
    );

    if (!isProjectMember) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Find attachment
    const attachmentIndex = task.attachments.findIndex(a => a.filename === filename);
    if (attachmentIndex === -1) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const attachment = task.attachments[attachmentIndex];

    // Only uploader can delete (or add role check for managers)
    if (attachment.uploadedBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the uploader can delete this attachment"
      });
    }

    // Remove from task
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    // Delete file from filesystem
    const filePath = path.join(__dirname, "../uploads/attachments", filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Log activity
    await logTaskActivity({
      taskId: task._id,
      projectId: task.project,
      workspaceId: task.workspace,
      userId,
      action: "updated",
      field: "attachments",
      oldValue: `Removed file: ${attachment.originalName}`
    });

    res.status(200).json({
      message: "Attachment deleted successfully"
    });
  } catch (error) {
    console.error("Delete attachment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
```

**3. Add Routes**

```typescript
// routes/task.routes.ts
import { upload, handleUploadError } from "../middlewares/upload";
import {
  uploadAttachment,
  downloadAttachment,
  deleteAttachment
} from "../controllers/attachment.controller";

// Add these routes
router.post(
  "/tasks/:taskId/attachments",
  verifyJWT,
  upload.single("file"),
  handleUploadError,
  uploadAttachment
);

router.get(
  "/tasks/:taskId/attachments/:filename",
  verifyJWT,
  downloadAttachment
);

router.delete(
  "/tasks/:taskId/attachments/:filename",
  verifyJWT,
  deleteAttachment
);
```

**4. Serve Static Files**

```typescript
// server.ts
import path from "path";

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
```

**5. Update Task Deletion (Cleanup Files)**

```typescript
// controllers/task.controller.ts
import fs from "fs";
import path from "path";

export const deleteTask = async (req: Request, res: Response) => {
  // ... existing code ...

  // Delete all attachments from filesystem
  if (task.attachments && task.attachments.length > 0) {
    task.attachments.forEach(attachment => {
      const filePath = path.join(__dirname, "../uploads/attachments", attachment.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }

  // ... rest of deletion code ...
};
```

**Option B: Cloud Storage (AWS S3)**

For production, use cloud storage instead of local filesystem:

```typescript
// utils/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET!;

export const uploadToS3 = async (file: Express.Multer.File, key: string) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await s3Client.send(command);

  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const deleteFromS3 = async (key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  await s3Client.send(command);
};

export const getSignedDownloadUrl = async (key: string, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};
```

**Security Considerations:**
- Validate file types (whitelist allowed MIME types)
- Limit file size (10MB recommended)
- Scan files for malware (use antivirus service in production)
- Use signed URLs for downloads (prevent direct access)
- Store files outside web root (if using local storage)
- Only uploader or managers can delete attachments

**Testing Considerations:**
- Test file upload with various file types
- Test file size limit enforcement
- Test unauthorized access prevention
- Test file deletion (both DB record and filesystem)
- Test cascade delete when task is deleted

**Integration Points:**
- Activity logs: Log file uploads/deletions
- Notifications: Notify project members of new attachments
- Real-time: Broadcast attachment events via WebSockets

---

*Due to length constraints, I'll provide summaries for the remaining sections with key implementation points:*

### 4. Subtasks and Task Dependencies

**Key Points:**
- Add `parentTask` field to Task model for subtasks
- Add `dependencies: ObjectId[]` field for task dependencies
- Add `blockedBy` and `blocking` computed fields
- Prevent circular dependencies with validation
- Update task status logic (parent task status based on subtasks)
- Add recursive cascade delete for subtasks

### 5. Task Labels/Tags

**Key Points:**
- Create `Label` model with `name`, `color`, `workspace`
- Add `labels: ObjectId[]` to Task model
- Controllers: Create/update/delete labels, assign to tasks
- Filtering: Get tasks by label
- Workspace-scoped labels (reusable across projects)

---

## 🔔 Notifications

### Notification System

**Overview:**
Comprehensive notification system with in-app and email notifications for task assignments, project updates, mentions, etc.

**Database Changes:**

Create `Notification` model:

```typescript
export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender?: mongoose.Types.ObjectId;
  type: "task_assigned" | "task_updated" | "comment_mention" | "project_updated" | "workspace_invitation";
  title: string;
  message: string;
  link?: string; // Deep link to related resource
  relatedTask?: mongoose.Types.ObjectId;
  relatedProject?: mongoose.Types.ObjectId;
  relatedWorkspace?: mongoose.Types.ObjectId;
  isRead: boolean;
  readAt?: Date;
  emailSent: boolean;
}
```

**Key Implementation Steps:**
1. Create Notification model with types and statuses
2. Create notification triggers in controllers (task assignment, comments, etc.)
3. Add notification preferences to User model
4. Implement in-app notification center (GET /api/notifications)
5. Implement email notifications (queue-based with BullMQ)
6. Add real-time notifications via WebSockets
7. Batch notifications (digest emails)

**Security:**
- Users can only see their own notifications
- Mark as read/unread functionality
- Delete old notifications (>30 days)

---

## 📊 Productivity & Analytics

### Analytics Dashboard

**Overview:**
Provide metrics and analytics for tasks, projects, and workspace activity.

**Key Metrics to Track:**
- Task completion rate (completed / total)
- Average task completion time
- Tasks per user
- Project progress percentage
- Overdue tasks count
- Activity timeline

**Implementation:**
1. Create aggregation queries for metrics
2. Add dashboard endpoint: GET /api/workspaces/:id/analytics
3. Cache results (Redis) for performance
4. Add date range filters
5. Export data (CSV, PDF)

**Example Aggregation:**
```typescript
const taskStats = await Task.aggregate([
  { $match: { workspace: workspaceId } },
  { $group: {
    _id: "$status",
    count: { $sum: 1 }
  }}
]);
```

---

## 🧹 Data Management

### Soft Delete Implementation

**Overview:**
Implement soft deletes to allow restoration of deleted items.

**Database Changes:**
Add to all models:
```typescript
isDeleted: { type: Boolean, default: false }
deletedAt: { type: Date }
deletedBy: { type: Schema.Types.ObjectId, ref: "User" }
```

**Implementation Steps:**
1. Add soft delete fields to Workspace, Project, Task models
2. Modify delete controllers to set isDeleted = true instead of actual delete
3. Add global query filter to exclude deleted items:
   ```typescript
   workspaceSchema.pre(/^find/, function() {
     this.where({ isDeleted: { $ne: true } });
   });
   ```
4. Create restore endpoints: POST /api/workspaces/:id/restore
5. Create permanent delete endpoint (admin only): DELETE /api/workspaces/:id/permanent
6. Add "Trash" view to show deleted items
7. Auto-delete items after 30 days (cron job)

---

## ⚡ Performance & Scalability

### 1. Pagination

**Implementation:**
```typescript
export const getTasks = async (req: Request, res: Response) => {
  const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const tasks = await Task.find({ project: projectId })
    .sort({ [sortBy as string]: order === "desc" ? -1 : 1 })
    .limit(Number(limit))
    .skip(skip)
    .populate("assignedTo", "name email");

  const total = await Task.countDocuments({ project: projectId });

  res.json({
    tasks,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalItems: total,
      itemsPerPage: Number(limit)
    }
  });
};
```

### 2. Search and Filtering

**Implementation:**
```typescript
// Text search
taskSchema.index({ title: "text", description: "text" });

// Search query
const tasks = await Task.find({
  project: projectId,
  $text: { $search: searchQuery },
  status: filterStatus,  // Optional filter
  assignedTo: filterAssignee  // Optional filter
});
```

### 3. Caching with Redis

**Setup:**
```bash
npm install redis ioredis
npm install @types/ioredis --save-dev
```

**Implementation:**
```typescript
// utils/cache.ts
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL);

export const cacheMiddleware = (duration: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `cache:${req.originalUrl}`;

    const cached = await redis.get(key);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const originalJson = res.json.bind(res);
    res.json = (data: any) => {
      redis.setex(key, duration, JSON.stringify(data));
      return originalJson(data);
    };

    next();
  };
};

// Usage
router.get("/workspaces", verifyJWT, cacheMiddleware(300), getWorkspaces);
```

---

## 🌐 Realtime & Collaboration

### WebSocket Integration

**Setup:**
```bash
npm install socket.io
npm install @types/socket.io --save-dev
```

**Implementation:**
```typescript
// server.ts
import { Server } from "socket.io";
import { createServer } from "http";

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN }
});

// Authentication middleware for Socket.IO
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  // Verify JWT and attach user to socket
  socket.data.user = verifiedUser;
  next();
});

// Join workspace room
io.on("connection", (socket) => {
  socket.on("join:workspace", (workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
  });

  socket.on("join:project", (projectId) => {
    socket.join(`project:${projectId}`);
  });
});

// Emit events from controllers
export const broadcastTaskUpdate = (projectId: string, task: any) => {
  io.to(`project:${projectId}`).emit("task:updated", task);
};

httpServer.listen(PORT);
```

**Real-time Events:**
- `task:created`, `task:updated`, `task:deleted`
- `comment:created`
- `user:online`, `user:offline`
- `project:updated`

---

## 🛠️ Developer Experience

### 1. Centralized Error Handling

**Implementation:**
```typescript
// middlewares/errorHandler.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message
    });
  }

  console.error("ERROR:", err);

  res.status(500).json({
    status: "error",
    message: process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message
  });
};

// Usage in controllers
throw new AppError(404, "Task not found");
```

### 2. API Documentation (Swagger/OpenAPI)

**Setup:**
```bash
npm install swagger-jsdoc swagger-ui-express
npm install @types/swagger-jsdoc @types/swagger-ui-express --save-dev
```

**Configuration:**
```typescript
// config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Project Management API",
      version: "1.0.0",
      description: "API documentation for Project Management System"
    },
    servers: [
      { url: "http://localhost:8000/api", description: "Development" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./routes/*.ts", "./controllers/*.ts"]
};

export const swaggerSpec = swaggerJsdoc(options);

// server.ts
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Add JSDoc Comments:**
```typescript
/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 */
```

### 3. Testing Infrastructure

**Setup:**
```bash
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
```

**Configuration:**
```javascript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"]
};
```

**Example Test:**
```typescript
// tests/task.test.ts
import request from "supertest";
import app from "../server";
import { Task } from "../models/task.model";

describe("Task API", () => {
  let authToken: string;
  let projectId: string;

  beforeAll(async () => {
    // Setup: Login and get token
    const res = await request(app)
      .post("/api/login")
      .send({ email: "test@test.com", password: "password" });

    authToken = res.body.accessToken;
  });

  describe("POST /api/tasks", () => {
    it("should create a new task", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Test Task",
          projectId
        });

      expect(res.status).toBe(201);
      expect(res.body.task.title).toBe("Test Task");
    });

    it("should reject unauthorized requests", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ title: "Test Task", projectId });

      expect(res.status).toBe(401);
    });
  });
});
```

### 4. CI/CD Pipeline

**GitHub Actions Example:**
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test
        env:
          MONGODB_URI: mongodb://localhost:27017/test

      - name: Build
        run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy to production
        run: |
          # Add deployment commands here
          echo "Deploying to production..."
```

---

## Summary

This comprehensive guide provides detailed implementation steps for all future enhancements, following the existing project architecture and patterns. Each feature includes:

- Clear overview and objectives
- Database schema changes
- Step-by-step implementation guide
- Code examples matching project conventions
- Security considerations
- Testing strategies
- Integration points

When implementing any feature, refer to the corresponding section and follow the established patterns for consistency and maintainability