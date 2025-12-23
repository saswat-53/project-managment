# Authentication Controller Guide

## Overview

The authentication controller (`auth.controller.ts`) handles all authentication and authorization operations for the application. It implements industry-standard security practices and provides a complete authentication flow.

## Table of Contents

1. [Security Features](#security-features)
2. [API Endpoints](#api-endpoints)
3. [Authentication Flow](#authentication-flow)
4. [Code Structure](#code-structure)
5. [Usage Examples](#usage-examples)
6. [Best Practices](#best-practices)

---

## Security Features

### 1. **JWT with Refresh Token Rotation**
- Access tokens for short-lived authentication
- Refresh tokens for long-lived sessions
- Automatic token rotation on refresh (prevents token reuse attacks)

### 2. **HTTP-Only Cookies**
- Tokens stored in HTTP-only cookies
- Prevents XSS attacks (JavaScript cannot access tokens)
- Automatic cookie handling by browser

### 3. **Environment-Aware Security**
- `secure: true` in production (HTTPS only)
- `secure: false` in development (allows HTTP)
- `sameSite: 'lax'` for CSRF protection

### 4. **Password Security**
- Minimum 8 characters requirement
- Hashed using bcrypt (in User model)
- Never stored or transmitted in plain text

### 5. **Token Hashing**
- Verification and reset tokens are hashed with SHA-256
- Original tokens sent via email, hashed versions stored in DB
- Prevents token exposure if database is compromised

### 6. **Input Validation**
- Zod schemas for all inputs
- Type-safe validation with automatic TypeScript inference
- Centralized validation rules in `validators/auth.validator.ts`

### 7. **User Enumeration Prevention**
- Generic error messages on login failures
- Same response whether user exists or not in forgot password

---

## API Endpoints

### Public Endpoints (No Authentication Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Register a new user |
| `/api/auth/login` | POST | Login with credentials |
| `/api/auth/refresh-token` | POST | Refresh access token |
| `/api/auth/verify-email/:token` | GET | Verify email with token |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password/:token` | POST | Reset password with token |

### Private Endpoints (Requires Authentication)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/logout` | POST | Logout current user |
| `/api/auth/me` | GET | Get current user profile |
| `/api/auth/change-password` | POST | Change password |
| `/api/auth/send-verification-email` | POST | Send verification email |
| `/api/auth/resend-verification-email` | POST | Resend verification email |

---

## Authentication Flow

### Registration Flow
```
1. User submits registration form
2. Validate input (name, email, password)
3. Check if email already exists
4. Hash password (in User model)
5. Create user in database
6. Generate access + refresh tokens
7. Set tokens in HTTP-only cookies
8. Return user data (without password)
```

### Login Flow
```
1. User submits credentials
2. Validate input (email, password)
3. Find user by email
4. Verify password hash
5. Generate access + refresh tokens
6. Set tokens in HTTP-only cookies
7. Return user data
```

### Token Refresh Flow
```
1. Client sends request with refresh token cookie
2. Verify refresh token exists in DB
3. Validate JWT signature and expiry
4. Generate NEW access + refresh tokens
5. Update refresh token in DB (rotation)
6. Set new tokens in cookies
7. Old refresh token is now invalid
```

### Password Reset Flow
```
1. User requests password reset (forgot password)
2. Generate random token (unhashed)
3. Hash token with SHA-256
4. Store hashed token in DB with expiry
5. Send unhashed token via email
6. User clicks link with token
7. System hashes received token
8. Compare with stored hash
9. If valid, allow password change
10. Clear reset token from DB
```

---

## Code Structure

### File Organization
```
backend/
├── controllers/
│   └── auth.controller.ts       # Main authentication logic
├── validators/
│   └── auth.validator.ts        # Zod validation schemas
├── models/
│   └── user.model.ts            # User schema & methods
├── utils/
│   └── generateTokens.ts        # Token generation utility
└── middleware/
    └── auth.middleware.ts       # Authentication middleware
```

### Key Components

#### 1. Cookie Options
```typescript
const cookieOptions: CookieOptions = {
  httpOnly: true,                              // No JS access
  secure: process.env.NODE_ENV === "production", // HTTPS in prod
  sameSite: "lax",                             // CSRF protection
};
```

#### 2. Validation Schemas
Located in `validators/auth.validator.ts`:
- `registerSchema` - name, email, password
- `loginSchema` - email, password
- `forgotPasswordSchema` - email
- `resetPasswordSchema` - newPassword
- `changePasswordSchema` - oldPassword, newPassword
- `tokenParamSchema` - token param validation

#### 3. Request Types
```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
  };
}
```
Used for endpoints that require authentication.

---

## Usage Examples

### Frontend Integration

#### Register User
```typescript
const register = async (name: string, email: string, password: string) => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Important: Include cookies
    body: JSON.stringify({ name, email, password })
  });

  const data = await response.json();
  // Tokens are automatically set in cookies
  return data.user;
};
```

#### Login User
```typescript
const login = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password })
  });

  return await response.json();
};
```

#### Refresh Token
```typescript
const refreshToken = async () => {
  const response = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    credentials: 'include', // Sends refresh token cookie
  });

  return await response.json();
};
```

#### Protected Request Example
```typescript
const getUserProfile = async () => {
  const response = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include', // Sends access token cookie
  });

  if (response.status === 401) {
    // Token expired, try refreshing
    await refreshToken();
    // Retry original request
    return getUserProfile();
  }

  return await response.json();
};
```

### Testing with curl

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"securepass123"}' \
  -c cookies.txt
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"securepass123"}' \
  -c cookies.txt
```

#### Get Current User (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt
```

---

## Best Practices

### For Developers

1. **Always Use Zod Validation**
   - Never skip validation
   - Add schemas to `auth.validator.ts`
   - Use `safeParse()` for error handling

2. **Handle Errors Consistently**
   - Return appropriate HTTP status codes
   - Use generic messages for security (no user enumeration)
   - Log errors server-side, not in response

3. **Cookie Management**
   - Always use `cookieOptions` constant
   - Match options in `clearCookie()` with `cookie()`
   - Test in both development and production modes

4. **Token Security**
   - Never expose refresh tokens to client
   - Rotate refresh tokens on each use
   - Set appropriate expiry times (access: 15min, refresh: 7 days)

5. **Password Handling**
   - Never log passwords
   - Hash on User model, not in controller
   - Validate strength before hashing

### For Production

1. **Environment Variables Required**
   ```env
   NODE_ENV=production
   ACCESS_TOKEN_SECRET=your-secret-key
   REFRESH_TOKEN_SECRET=your-secret-key
   FRONTEND_URL=https://yourdomain.com
   ```

2. **HTTPS Required**
   - `secure: true` requires HTTPS
   - Set up SSL certificates
   - Use reverse proxy (nginx, cloudflare)

3. **Email Service**
   - Integrate email service (SendGrid, AWS SES, etc.)
   - Don't return reset/verification URLs in response
   - Use email templates

4. **Rate Limiting**
   - Add rate limiting middleware
   - Limit login attempts per IP
   - Limit password reset requests

5. **Monitoring**
   - Log authentication failures
   - Monitor suspicious activity
   - Set up alerts for unusual patterns

---

## Common Issues & Solutions

### Issue: Cookies not being set
**Solution:** Ensure `credentials: 'include'` in fetch requests and CORS is configured properly.

### Issue: 401 errors on protected routes
**Solution:** Check if access token is expired. Implement automatic refresh token flow.

### Issue: Cookies not working in development
**Solution:** Set `secure: false` in development or use HTTPS locally.

### Issue: CORS errors
**Solution:** Configure CORS to allow credentials:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## Additional Resources

- **Zod Documentation:** https://zod.dev
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725
- **OWASP Authentication:** https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

---

## Contributing

When modifying the authentication controller:
1. Update validation schemas if adding new fields
2. Add JSDoc comments for new functions
3. Update this guide with new endpoints
4. Test both authenticated and unauthenticated flows
5. Verify security implications of changes
