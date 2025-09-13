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
} from "../controllers/auth.controller.js";
import { verifyToken, verifyEmail } from "../middlewares/verifyToken.js";
import { rateLimitResendEmail } from "../middlewares/rateLimitResend.js"

const router = express.Router();

//! Middleware to verify token for protected routes
router.get("/check-auth", verifyToken, checkAuth);

//! Register & Login routes
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

//! Email verification routes - DUAL Flow
{/* //* Email Link Flow */}
router.post("/verify-email", checkEmailLink);
router.post("/resend-verification-email", rateLimitResendEmail, resendVerificationEmail);

{/* //* Email OTP Flow */}
router.post("/verify-otp", verifyToken, checkOTP);
router.post("/resend-otp", rateLimitResendEmail, resendVerificationOTP);

//! Password reset routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
