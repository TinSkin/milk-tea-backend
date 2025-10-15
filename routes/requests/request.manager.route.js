import express from "express";
import { verifyToken } from "../../middlewares/verifyToken.js";
import { checkStoreManagerRole } from "../../middlewares/checkRole.js";
import {
    submitCreateRequest,
    submitUpdateRequest,
    submitDeleteRequest,
    getMyRequests,
    getMyRequestById,
    updateMyRequest,
    cancelMyRequest,
    previewDiff,
} from "../../controllers/requests/request.manager.controller.js";

const router = express.Router();

//! Các route dành cho Store Manager - quản lý request của chính mình (ĐẶT TRƯỚC /:entity) */
router.get("/", verifyToken, checkStoreManagerRole, getMyRequests);               // Danh sách request của CHT
router.get("/:id", verifyToken, checkStoreManagerRole, getMyRequestById);       // Chi tiết 1 request
router.patch("/:id", verifyToken, checkStoreManagerRole, updateMyRequest);      // Cập nhật request PENDING
router.patch("/:id/cancel", verifyToken, checkStoreManagerRole, cancelMyRequest); // Hủy request PENDING

//! Tiện ích (preview diff trước khi submit) */
router.post("/preview-diff", verifyToken, checkStoreManagerRole, previewDiff);

//! Các route submit CRUD theo type (ĐẶT SAU / để tránh conflict) */
// Lưu ý: đây là "tạo yêu cầu" (Request) để Admin duyệt, không thao tác trực tiếp lên Product/Category/Topping.
router.post("/:type/create", verifyToken, checkStoreManagerRole, submitCreateRequest);                 // Tạo mới (request)
router.post("/:type/:targetId/update", verifyToken, checkStoreManagerRole, submitUpdateRequest);      // Cập nhật (request)
router.post("/:type/:targetId/delete", verifyToken, checkStoreManagerRole, submitDeleteRequest);      // Xóa (request)

export default router;