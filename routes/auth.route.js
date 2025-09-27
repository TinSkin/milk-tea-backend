import express from "express";
import {
	register,
	checkOTP,
	checkEmailLink,
	resendVerificationOTP,
	resendVerificationEmail,
	login,
	logout,
	forgotPassword,
	resetPassword,
	checkAuth,
	googleAuth
} from "../controllers/auth.controller.js";
import { verifyToken, verifyEmail } from "../middlewares/verifyToken.js";
import { rateLimitResendEmail } from "../middlewares/rateLimitResend.js"

const router = express.Router();

//! Protected routes (authentication required)
router.get("/check-auth", verifyToken, checkAuth);

//! Public authentication routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

//! Email verification routes
router.post("/verify-email", checkEmailLink);
router.post("/resend-verification-email", rateLimitResendEmail, resendVerificationEmail);
router.post("/verify-otp", verifyToken, checkOTP);
router.post("/resend-otp", rateLimitResendEmail, resendVerificationOTP);

//! Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

//! OAuth routes
router.post("/google", googleAuth);

export default router;
