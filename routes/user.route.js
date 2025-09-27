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

//! User profile routes (commented out)
// router.get("/profile", getUserProfile);
// router.put("/profile", updateUserProfile);

//! Admin only routes
router.get("/", checkAdminRole, getAllUsers);
router.post("/:userId/soft-delete", checkAdminRole, softDeleteUser);
router.patch("/:userId/role", checkAdminRole, updateUserRole);

export default router;