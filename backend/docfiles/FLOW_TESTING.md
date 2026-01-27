# 🎯 FLOW TESTING - Complete Manual Testing Guide

## What to Test (Critical Flows Only)

This guide covers **EVERYTHING** you need to test manually in Postman.

---

## 📋 Pre-Setup

### 1. Start Your Backend
```bash
cd backend
npm run dev
```

### 2. Create 3 Test Users in Postman

You'll need 3 different users for proper testing:
- **User A** - Workspace Owner
- **User B** - Member
- **User C** - Outsider (not a member)

---

## 🔐 FLOW 1: User Authentication

### Test 1.1: Register User A
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "User A",
  "email": "usera@test.com",
  "password": "password123"
}
```
**Expected:** 201 Created, returns `token` in response

**Save:** Token as `TOKEN_A`

---

### Test 1.2: Register User B
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "User B",
  "email": "userb@test.com",
  "password": "password123"
}
```
**Expected:** 201 Created

**Save:** Token as `TOKEN_B`, User ID as `USER_B_ID`

---

### Test 1.3: Register User C
```
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "User C",
  "email": "userc@test.com",
  "password": "password123"
}
```
**Expected:** 201 Created

**Save:** Token as `TOKEN_C`

---

### Test 1.4: Login User A
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "usera@test.com",
  "password": "password123"
}
```
**Expected:** 200 OK, returns token

---

### Test 1.5: Login with Wrong Password
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "usera@test.com",
  "password": "wrongpassword"
}
```
**Expected:** 400 Bad Request, "Invalid credentials"

---

## 🏢 FLOW 2: Workspace Operations

### Test 2.1: Create Workspace (as User A)
```
POST http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Team Workspace",
  "description": "Main workspace for testing",
  "members": ["USER_B_ID"]
}
```
**Expected:**
- 201 Created
- User A (owner) automatically in members
- User B in members

**Save:** `WORKSPACE_ID`

---

### Test 2.2: Get All Workspaces (as User A)
```
GET http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- Returns array with "Team Workspace"

---

### Test 2.3: Get Workspace by ID (as User A)
```
GET http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- Returns workspace details

---

### Test 2.4: Get Workspace by ID (as User B - Member)
```
GET http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_B
```
**Expected:**
- 200 OK (User B is a member)

---

### Test 2.5: Get Workspace by ID (as User C - NON-Member) ⚠️
```
GET http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_C
```
**Expected:**
- **403 Forbidden** ✅
- "Not authorized"

**IF YOU GET 200:** Authorization bug! User C should NOT see workspace!

---

### Test 2.6: Update Workspace (as User A - Owner)
```
PUT http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Updated Workspace Name",
  "description": "Updated description"
}
```
**Expected:**
- 200 OK
- Name and description updated

---

### Test 2.7: Update Workspace (as User B - NOT Owner) ⚠️
```
PUT http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_B
Content-Type: application/json

{
  "name": "Hacked Name"
}
```
**Expected:**
- **403 Forbidden** ✅
- "Only owner can update workspace"

**IF YOU GET 200:** Critical bug! Non-owners can modify workspace!

---

### Test 2.8: Create Workspace with Duplicate Name
```
POST http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Team Workspace"
}
```
**Expected:**
- **400 Bad Request** ✅
- "Workspace with this name already exists"

---

### Test 2.9: Create Workspace with Invalid Member ID ⚠️
```
POST http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Test Workspace 2",
  "members": ["invalid-id-12345"]
}
```
**Expected:**
- **400 Bad Request** ✅
- Should NOT crash server

**IF SERVER CRASHES (500):** Critical bug - invalid ObjectId validation missing!

---

## 📁 FLOW 3: Project Operations

### Test 3.1: Create Project in Workspace (as User A)
```
POST http://localhost:5000/api/project/projects
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Website Redesign",
  "description": "Redesign company website",
  "workspaceId": "WORKSPACE_ID",
  "members": ["USER_B_ID"],
  "status": "in-progress"
}
```
**Expected:**
- 201 Created
- Project created with both User A and User B as members

**Save:** `PROJECT_ID`

---

### Test 3.2: Create Project with Non-Workspace Member ⚠️
```
POST http://localhost:5000/api/project/projects
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Test Project",
  "workspaceId": "WORKSPACE_ID",
  "members": ["507f1f77bcf86cd799439011"]
}
```
**Expected:**
- **400 Bad Request** ✅
- "Invalid user IDs. These users are not members of the workspace."

**IF YOU GET 201:** Critical bug! Non-workspace members can be added to project!

---

### Test 3.3: Get Projects by Workspace (as User A)
```
GET http://localhost:5000/api/project/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- Returns array with "Website Redesign"

---

### Test 3.4: Get Projects by Workspace (as User C - Non-Member) ⚠️
```
GET http://localhost:5000/api/project/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_C
```
**Expected:**
- **403 Forbidden** ✅

---

### Test 3.5: Get Project by ID
```
GET http://localhost:5000/api/project/PROJECT_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- Returns project details

---

### Test 3.6: Update Project
```
PUT http://localhost:5000/api/project/PROJECT_ID
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "Website Redesign v2",
  "status": "completed"
}
```
**Expected:**
- 200 OK
- Project updated

---

## ✅ FLOW 4: Task Operations

### Test 4.1: Create Task (as User A)
```
POST http://localhost:5000/api/task/tasks
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "title": "Design Homepage",
  "description": "Create mockup for homepage",
  "projectId": "PROJECT_ID",
  "assignedTo": "USER_B_ID",
  "status": "todo",
  "dueDate": "2025-12-31T23:59:59Z"
}
```
**Expected:**
- 201 Created
- Task assigned to User B

**Save:** `TASK_ID`

---

### Test 4.2: Create Task Assigned to Non-Project Member ⚠️
```
POST http://localhost:5000/api/task/tasks
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "title": "Test Task",
  "projectId": "PROJECT_ID",
  "assignedTo": "507f1f77bcf86cd799439011"
}
```
**Expected:**
- **400 Bad Request** ✅
- "Assigned user must be a project member"

**IF YOU GET 201:** Critical bug! Non-project members can be assigned tasks!

---

### Test 4.3: Create Task as Non-Project Member ⚠️
```
POST http://localhost:5000/api/task/tasks
Authorization: Bearer TOKEN_C
Content-Type: application/json

{
  "title": "Hacker Task",
  "projectId": "PROJECT_ID"
}
```
**Expected:**
- **403 Forbidden** ✅
- "Not authorized. You must be a project member to create tasks."

---

### Test 4.4: Get Tasks by Project (as User A)
```
GET http://localhost:5000/api/task/project/PROJECT_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- Returns array with "Design Homepage"

---

### Test 4.5: Get Tasks by Project (as User C - Non-Member) ⚠️
```
GET http://localhost:5000/api/task/project/PROJECT_ID
Authorization: Bearer TOKEN_C
```
**Expected:**
- **403 Forbidden** ✅

---

### Test 4.6: Update Task
```
PUT http://localhost:5000/api/task/TASK_ID
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "title": "Design Homepage - Updated",
  "status": "in-progress"
}
```
**Expected:**
- 200 OK
- Task updated

---

### Test 4.7: Unassign Task
```
PUT http://localhost:5000/api/task/TASK_ID
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "assignedTo": null
}
```
**Expected:**
- 200 OK
- Task unassigned (assignedTo = undefined)

---

## 🔥 FLOW 5: CASCADE DELETE TESTS (CRITICAL!)

### Test 5.1: Setup for Cascade Test
Create a complete hierarchy:

1. **Create Workspace** (save ID)
2. **Create Project in Workspace** (save ID)
3. **Create Task in Project** (save ID)
4. **Assign Task to User B**

---

### Test 5.2: Delete Task
```
DELETE http://localhost:5000/api/task/TASK_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- "Task deleted successfully"

---

### Test 5.3: Verify Task Deleted
```
GET http://localhost:5000/api/task/TASK_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- **404 Not Found** ✅

---

### Test 5.4: Create More Tasks for Cascade Test
Create 2-3 more tasks in the project.

---

### Test 5.5: Delete Project (Should Delete All Tasks) ⚠️
```
DELETE http://localhost:5000/api/project/PROJECT_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- "Project deleted successfully"

---

### Test 5.6: Verify Project Deleted
```
GET http://localhost:5000/api/project/PROJECT_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- **404 Not Found** ✅

---

### Test 5.7: Verify All Tasks in Project Deleted ⚠️

Try to get each task you created:
```
GET http://localhost:5000/api/task/TASK_ID_1
GET http://localhost:5000/api/task/TASK_ID_2
```
**Expected:**
- **All should return 404** ✅

**IF ANY TASK STILL EXISTS:** Critical bug! Cascade delete not working!

---

### Test 5.8: Setup Complete Workspace for Deletion

1. **Create new workspace**
2. **Create 2 projects in it**
3. **Create 3 tasks in each project**

---

### Test 5.9: Delete Workspace (Should Delete EVERYTHING) ⚠️
```
DELETE http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- "Workspace deleted successfully"

---

### Test 5.10: Verify Complete Cascade ⚠️

Check everything is deleted:

1. **Get workspace** → 404
2. **Get each project** → 404
3. **Get each task** → 404

**IF ANYTHING STILL EXISTS:** Critical cascade delete bug!

---

## 🚨 FLOW 6: MEMBER REMOVAL CASCADE (CRITICAL!)

### Test 6.1: Setup
1. **Create workspace with User A (owner) and User B (member)**
2. **Create project with both users**
3. **Create task assigned to User B**

**Save all IDs**

---

### Test 6.2: Remove User B from Workspace
```
PUT http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "members": ["USER_A_ID"]
}
```
**Expected:**
- 200 OK
- User B removed from workspace

---

### Test 6.3: Verify User B Removed from Project ⚠️
```
GET http://localhost:5000/api/project/PROJECT_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- **User B should NOT be in project.members array** ✅

**IF USER B STILL IN PROJECT:** Critical bug! Cascade member removal not working!

---

### Test 6.4: Verify Task Unassigned from User B ⚠️
```
GET http://localhost:5000/api/task/TASK_ID
Authorization: Bearer TOKEN_A
```
**Expected:**
- 200 OK
- **assignedTo should be null/undefined** ✅

**IF STILL ASSIGNED TO USER B:** Critical bug! Task not unassigned!

---

### Test 6.5: Verify User B Cannot Access Workspace ⚠️
```
GET http://localhost:5000/api/workspace/WORKSPACE_ID
Authorization: Bearer TOKEN_B
```
**Expected:**
- **403 Forbidden** ✅

---

## 🛡️ FLOW 7: SECURITY & VALIDATION TESTS

### Test 7.1: Invalid MongoDB ObjectId (Should NOT Crash) ⚠️
```
GET http://localhost:5000/api/workspace/invalid-id-12345
Authorization: Bearer TOKEN_A
```
**Expected:**
- **400 Bad Request** ✅
- NOT 500 Internal Server Error

**IF SERVER CRASHES:** Critical security bug! Add ObjectId validation!

---

### Test 7.2: XSS Attack in Workspace Name ⚠️
```
POST http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "<script>alert('XSS')</script>",
  "description": "XSS test"
}
```
**Expected:**
- 201 Created
- **Name should be sanitized** (no script tags)

**IF SCRIPT TAGS IN RESPONSE:** XSS vulnerability! Add input sanitization!

---

### Test 7.3: XSS in Project Name
```
POST http://localhost:5000/api/project/projects
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "<img src=x onerror=alert('XSS')>",
  "workspaceId": "WORKSPACE_ID"
}
```
**Expected:**
- Name should be sanitized

---

### Test 7.4: Empty Required Fields
```
POST http://localhost:5000/api/workspace/workspaces
Authorization: Bearer TOKEN_A
Content-Type: application/json

{
  "name": "",
  "description": "Should fail"
}
```
**Expected:**
- **400 Bad Request** ✅
- "Workspace name is required"

---

### Test 7.5: Missing Authorization Header ⚠️
```
GET http://localhost:5000/api/workspace/workspaces
```
**Expected:**
- **401 Unauthorized** ✅

---

### Test 7.6: Invalid/Expired Token ⚠️
```
GET http://localhost:5000/api/workspace/workspaces
Authorization: Bearer invalid.token.here
```
**Expected:**
- **401 Unauthorized** ✅

---

### Test 7.7: SQL Injection Attempt (MongoDB)
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@test.com' OR '1'='1",
  "password": "anything"
}
```
**Expected:**
- **400 Bad Request** ✅
- Should NOT bypass authentication

---

## 📊 TESTING CHECKLIST

### Authentication (7 tests)
- [ ] Register User A
- [ ] Register User B
- [ ] Register User C
- [ ] Login User A
- [ ] Login with wrong password
- [ ] Missing token returns 401
- [ ] Invalid token returns 401

### Workspace Operations (9 tests)
- [ ] Create workspace
- [ ] Get all workspaces
- [ ] Get workspace by ID (owner)
- [ ] Get workspace by ID (member)
- [ ] Get workspace by ID (non-member) → 403
- [ ] Update workspace (owner)
- [ ] Update workspace (non-owner) → 403
- [ ] Duplicate workspace name → 400
- [ ] Invalid member ID → 400

### Project Operations (6 tests)
- [ ] Create project
- [ ] Create project with non-workspace member → 400
- [ ] Get projects by workspace
- [ ] Get projects (non-member) → 403
- [ ] Get project by ID
- [ ] Update project

### Task Operations (7 tests)
- [ ] Create task
- [ ] Create task assigned to non-project member → 400
- [ ] Create task as non-project member → 403
- [ ] Get tasks by project
- [ ] Get tasks (non-member) → 403
- [ ] Update task
- [ ] Unassign task

### Cascade Deletes (10 tests)
- [ ] Delete task
- [ ] Verify task deleted (404)
- [ ] Delete project
- [ ] Verify project deleted (404)
- [ ] Verify all tasks deleted (404)
- [ ] Delete workspace
- [ ] Verify workspace deleted (404)
- [ ] Verify all projects deleted (404)
- [ ] Verify all tasks deleted (404)
- [ ] Full cascade test passed

### Member Removal Cascade (5 tests)
- [ ] Remove member from workspace
- [ ] Verify member removed from projects
- [ ] Verify tasks unassigned from member
- [ ] Verify member cannot access workspace (403)
- [ ] Member removal cascade passed

### Security & Validation (7 tests)
- [ ] Invalid ObjectId returns 400 (not crash)
- [ ] XSS in workspace name sanitized
- [ ] XSS in project name sanitized
- [ ] Empty required fields → 400
- [ ] Missing auth header → 401
- [ ] Invalid token → 401
- [ ] SQL injection attempt blocked

---

## 🎯 CRITICAL TESTS (Must Pass!)

These are the **MOST IMPORTANT** tests:

1. ✅ **Cascade Delete Workspace** - All projects and tasks deleted
2. ✅ **Member Removal Cascade** - Removed from projects, tasks unassigned
3. ✅ **Invalid ObjectId** - Returns 400, doesn't crash server
4. ✅ **Authorization** - Non-members get 403 Forbidden
5. ✅ **Non-workspace members** - Can't be added to projects
6. ✅ **Non-project members** - Can't be assigned to tasks

**If these fail, you have critical bugs!**

---

## 📝 How to Track Results

Create a spreadsheet or document:

| Test # | Test Name | Expected | Actual | Pass/Fail | Notes |
|--------|-----------|----------|--------|-----------|-------|
| 2.5 | Non-member access workspace | 403 | 403 | ✅ PASS | |
| 5.7 | Cascade delete tasks | 404 | 200 | ❌ FAIL | Tasks still exist! |

---

## 🚀 Quick Test Order

**Day 1: Basic Flow (30 mins)**
1. Register 3 users
2. Create workspace
3. Create project
4. Create task
5. Delete task → project → workspace

**Day 2: Authorization (20 mins)**
1. Non-member tries to access workspace
2. Non-owner tries to update workspace
3. Non-member tries to access project
4. Non-member tries to create task

**Day 3: Cascade Operations (45 mins)**
1. Full cascade delete test
2. Member removal cascade test
3. Verify everything deleted/updated

**Day 4: Security (30 mins)**
1. Invalid ObjectId tests
2. XSS tests
3. Authentication tests

---

**Total Time Needed: ~2-3 hours of manual testing**

**But this catches ALL critical bugs before production!** 🎯
