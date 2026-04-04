/**
 * Authentication Controller
 *
 * This controller handles all authentication-related operations including:
 * - User registration and login
 * - Token management (access & refresh tokens)
 * - Password operations (change, reset, forgot)
 * - Email verification
 *
 * Security Features:
 * - JWT-based authentication with refresh token rotation
 * - HTTP-only cookies for XSS protection
 * - Secure password hashing (handled in User model)
 * - Token hashing for email verification and password reset
 * - Environment-aware cookie security settings
 * - Zod validation for all inputs
 *
 * @module controllers/auth.controller
 */

import { Request, Response, CookieOptions } from "express";
import { IUser, User } from "../models/user.model";
import jwt, { JwtPayload } from "jsonwebtoken";
import crypto from "crypto";
import { generateAccessAndRefreshTokens } from "../utils/generateTokens";
import {
  sendPasswordResetEmail,
  sendVerificationEmail as sendVerificationEmailUtil,
} from "../utils/email.service";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  tokenParamSchema,
} from "../validators/auth.validator";

/**
 * Centralized cookie configuration
 * - httpOnly: Prevents JavaScript access (XSS protection)
 * - secure: HTTPS only in production, HTTP allowed in development
 * - sameSite: CSRF protection
 */
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

/**
 * Extended Request type for authenticated routes
 * Contains user information attached by auth middleware
 */
interface AuthenticatedRequest extends Request {
  user?: {
    _id: string;
  };
  body: any;
}


/**
 * Refresh Access Token
 *
 * Generates a new access token using a valid refresh token.
 * Implements refresh token rotation for enhanced security.
 *
 * @route POST /api/auth/refresh-token
 * @access Public (requires valid refresh token in cookies)
 *
 * @param {Request} req - Express request object (expects refreshToken cookie)
 * @param {Response} res - Express response object
 *
 * @returns {200} - Token refreshed successfully with new tokens in cookies
 * @returns {401} - No refresh token provided
 * @returns {403} - Invalid or expired refresh token
 * @returns {500} - Internal server error
 *
 * @security
 * - Verifies refresh token against database
 * - Validates JWT signature and expiry
 * - Rotates refresh token on each use (prevents token reuse attacks)
 */
export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken)
      return res.status(401).json({ message: "No refresh token" });

    // Find user with matching refresh token
    const user = await User.findOne({ refreshToken: incomingRefreshToken }) as IUser;
    if (!user)
      return res.status(403).json({ message: "Invalid refresh token" });

    // Verify refresh token signature and expiry
    try {
      const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET!
      ) as JwtPayload;

      if (!decoded || !decoded._id)
        return res.status(403).json({ message: "Invalid refresh token" });
    } catch (jwtError) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate new tokens (implements token rotation)
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user);

    // Set new tokens in HTTP-only cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({ message: "Token refreshed successfully" });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Register New User
 *
 * Creates a new user account and returns authentication tokens.
 *
 * @route POST /api/auth/register
 * @access Public
 *
 * Request Body:
 * - name: string (required)
 * - email: string (required, valid email format)
 * - password: string (required, min 8 characters)
 *
 * Response:
 * - 201: User registered successfully, tokens set in cookies
 * - 400: Validation error or email already exists
 * - 500: Internal server error
 *
 * @example
 * // Request body
 * { "name": "John Doe", "email": "john@example.com", "password": "securepass123" }
 *
 * // Success response
 * { "message": "User registered successfully", "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" } }
 */
export const registerUser = async (req: Request, res: Response) => {
  try {
    // Validate request body using Zod schema
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { name, email, password , avatarUrl } = validation.data;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    // Create new user (password is hashed in User model pre-save hook)
    const user = await User.create({ name, email, password, avatarUrl });


    // Generate JWT tokens
    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user as IUser);

    // Set tokens in HTTP-only cookies for security
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Login User
 *
 * Authenticates user credentials and returns tokens.
 * Uses generic error message to prevent user enumeration attacks.
 *
 * @route POST /api/auth/login
 * @access Public
 *
 * Request Body:
 * - email: string (required, valid email)
 * - password: string (required)
 *
 * Response:
 * - 200: Login successful with user data and tokens in cookies
 * - 400: Invalid credentials or validation error
 * - 500: Internal server error
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email }) as IUser;
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const isValid = await user.isPasswordCorrect(password);
    if (!isValid)
      return res.status(400).json({ message: "Invalid credentials" });

    const { accessToken, refreshToken } =
      await generateAccessAndRefreshTokens(user);

    // Cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Logout User
 *
 * Clears refresh token from database and removes cookies.
 *
 * @route POST /api/auth/logout
 * @access Private (requires authentication)
 *
 * Response:
 * - 200: Logged out successfully
 * - 400: User not authenticated
 * - 500: Internal server error
 */
export const logoutUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    await User.findByIdAndUpdate(userId, { refreshToken: "" });

    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Get Current User
 *
 * Retrieves the currently authenticated user's profile.
 * Excludes sensitive fields like password and tokens.
 *
 * @route GET /api/auth/me
 * @access Private (requires authentication)
 *
 * Response:
 * - 200: User data without sensitive fields
 * - 401: Not authenticated
 * - 500: Internal server error
 */
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(userId)
      .select("-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry");

    res.status(200).json({ user });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Send Verification Email
 *
 * Generates a verification token and URL for email verification.
 * Token is hashed before storing in database.
 *
 * @route POST /api/auth/send-verification-email
 * @access Private (requires authentication)
 *
 * Response:
 * - 200: Verification URL generated (in production, send via email)
 * - 400: Email already verified
 * - 404: User not found
 * - 500: Internal server error
 *
 * @note In production, send verifyUrl via email instead of returning it
 */
export const sendVerificationEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isEmailVerified)
      return res.status(400).json({ message: "Email already verified" });

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = new Date(tokenExpiry);

    await user.save({ validateBeforeSave: false });

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${unHashedToken}`;

    await sendVerificationEmailUtil(user.email, verifyUrl);

    return res.status(200).json({
      message: "Verification email sent",
      // DEV ONLY: returned for manual testing — removed in production
      ...(process.env.NODE_ENV !== "production" && { verifyUrl }),
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Verify Email
 *
 * Verifies user's email using the token from verification link.
 * Hashes token and checks against database.
 *
 * @route GET /api/auth/verify-email/:token
 * @access Public
 *
 * URL Parameters:
 * - token: string (verification token from email link)
 *
 * Response:
 * - 200: Email verified successfully
 * - 400: Invalid or expired token
 * - 500: Internal server error
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const validation = tokenParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { token } = validation.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.isEmailVerified = true;
    user.emailVerificationToken = "";
    user.emailVerificationExpiry = undefined;

    await user.save({ validateBeforeSave: false });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Forgot Password
 *
 * Initiates password reset process by generating reset token.
 * Always returns success to prevent user enumeration.
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 *
 * Request Body:
 * - email: string (required, valid email)
 *
 * Response:
 * - 200: Always returns success message (whether user exists or not)
 * - 400: Validation error
 * - 500: Internal server error
 *
 * @security Returns generic message regardless of whether user exists (prevents user enumeration)
 * @note In production, send resetUrl via email instead of returning it
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const { email } = validation.data;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(200).json({
        message: "If account exists, password reset sent.",
      });

    const { unHashedToken, hashedToken, tokenExpiry } =
      user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = new Date(tokenExpiry);

    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${unHashedToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return res.status(200).json({
      message: "If account exists, password reset sent.",
      // DEV ONLY: returned for manual testing — removed in production
      ...(process.env.NODE_ENV !== "production" && { resetUrl }),
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Reset Password
 *
 * Resets user password using token from forgot password email.
 * Validates token, updates password, and clears reset token.
 *
 * @route POST /api/auth/reset-password/:token
 * @access Public
 *
 * URL Parameters:
 * - token: string (reset token from email link)
 *
 * Request Body:
 * - newPassword: string (required, min 8 characters)
 *
 * Response:
 * - 200: Password reset successful
 * - 400: Invalid/expired token or validation error
 * - 500: Internal server error
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const paramValidation = tokenParamSchema.safeParse(req.params);
    const bodyValidation = resetPasswordSchema.safeParse(req.body);

    if (!paramValidation.success) {
      return res.status(400).json({
        message: paramValidation.error.issues[0].message,
      });
    }

    if (!bodyValidation.success) {
      return res.status(400).json({
        message: bodyValidation.error.issues[0].message,
      });
    }

    const { token } = paramValidation.data;
    const { newPassword } = bodyValidation.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpiry: { $gt: new Date() },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.password = newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordExpiry = undefined;

    await user.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Change Password
 *
 * Allows authenticated user to change their password.
 * Requires old password for verification.
 *
 * @route POST /api/auth/change-password
 * @access Private (requires authentication)
 *
 * Request Body:
 * - oldPassword: string (required, current password)
 * - newPassword: string (required, min 8 characters)
 *
 * Response:
 * - 200: Password updated successfully
 * - 400: Invalid old password or validation error
 * - 404: User not found
 * - 500: Internal server error
 */
export const changePassword = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        message: validation.error.issues[0].message,
      });
    }

    const userId = req.user?._id;
    const { oldPassword, newPassword } = validation.data;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValid = await user.isPasswordCorrect(oldPassword);
    if (!isValid)
      return res.status(400).json({ message: "Old password is incorrect" });

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update User Detail
 *
 * Allows the authenticated user to update their name, email, avatarUrl, and position.
 *
 * @route PATCH /api/auth/update-user-detail
 * @access Private (requires authentication)
 */
export const updateUserDetail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { name, email, avatarUrl, position } = req.body;

    if (email) {
      const currentUser = await User.findById(userId).select("email");
      if (currentUser?.email === email) {
        return res.status(400).json({ message: "That is already your current email" });
      }
      const existing = await User.findOne({ email, _id: { $ne: userId } });
      if (existing) return res.status(400).json({ message: "Email already in use" });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (position !== undefined) updateData.position = position;

    let emailChanged = false;
    if (email !== undefined) {
      updateData.email = email;
      updateData.isEmailVerified = false;
      emailChanged = true;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("-password -refreshToken -forgotPasswordToken -forgotPasswordExpiry");

    if (emailChanged && user) {
      const fullUser = await User.findById(userId);
      if (fullUser) {
        const { unHashedToken, hashedToken, tokenExpiry } = fullUser.generateTemporaryToken();
        fullUser.emailVerificationToken = hashedToken;
        fullUser.emailVerificationExpiry = new Date(tokenExpiry);
        await fullUser.save({ validateBeforeSave: false });

        const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${unHashedToken}`;
        await sendVerificationEmailUtil(email, verifyUrl);
      }
    }

    return res.status(200).json({
      message: emailChanged
        ? "Profile updated. A verification email has been sent to your new address."
        : "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user detail error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Resend Verification Email
 *
 * Wrapper function that calls sendVerificationEmail.
 * Allows users to request a new verification email.
 *
 * @route POST /api/auth/resend-verification-email
 * @access Private (requires authentication)
 *
 * Response: Same as sendVerificationEmail
 */
export const resendVerificationEmail = async (req: AuthenticatedRequest, res: Response) => {
  return sendVerificationEmail(req, res);
};

