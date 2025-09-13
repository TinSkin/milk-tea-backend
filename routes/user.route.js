import express from "express";
import {
    getAllUsers,
    // getUserProfile,
    // updateUserProfile,
    softDeleteUser,
    updateUserRole,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkAdminRole } from "../middlewares/checkRole.js";

const router = express.Router();

//! All routes require authentication
router.use(verifyToken);

//! User profile routes
// router.get("/profile", getUserProfile);
// router.put("/profile", updateUserProfile);

//! Admin only routes
router.get("/", checkAdminRole, getAllUsers); // GET /api/users
router.post("/:userId/soft-delete", checkAdminRole, softDeleteUser); // POST /api/users/:userId/soft-delete
router.patch("/:userId/role", checkAdminRole, updateUserRole); // PATCH /api/users/:userId/role

export default router;