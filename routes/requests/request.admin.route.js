import express from "express";
import { verifyToken } from "../../middlewares/verifyToken.js";
import { checkAdminRole } from "../../middlewares/checkRole.js";
import {
    getAllRequests,
    getRequestById,
    approveRequest,
    rejectRequest,
} from "../../controllers/requests/request.admin.controller.js";

const router = express.Router();

//! Các route dành cho Admin - quản lý tất cả Request trong hệ thống
router.get("/", verifyToken, checkAdminRole, getAllRequests);            // GET    /api/admin/requests
router.get("/:id", verifyToken, checkAdminRole, getRequestById);         // GET    /api/admin/requests/:id
router.post("/:id/approve", verifyToken, checkAdminRole, approveRequest); // POST  /api/admin/requests/:id/approve
router.post("/:id/reject", verifyToken, checkAdminRole, rejectRequest);   // POST  /api/admin/requests/:id/reject

export default router;