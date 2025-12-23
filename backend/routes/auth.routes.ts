import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  changePassword,
  resendVerificationEmail,
} from "../controllers/auth.controller";

import { verifyJWT } from "../middlewares/auth";

const router = Router();

/**
 * PUBLIC AUTH ROUTES
 */
router.post("/register", registerUser); 
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/verify-email/:token", verifyEmail);

/**
 * PROTECTED AUTH ROUTES (requires login)
 */
router.post("/logout", verifyJWT, logoutUser);
router.get("/me", verifyJWT, getCurrentUser);

router.post("/send-verification-email", verifyJWT, sendVerificationEmail);
router.post("/resend-verification-email", verifyJWT, resendVerificationEmail);

router.post("/change-password", verifyJWT, changePassword);

export default router;
