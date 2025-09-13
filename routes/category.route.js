import express from "express";
import {
    getAllCategories,
    createCategory,
    updateCategory,
    softDeleteCategory,
    deleteCategory,
    syncCategoriesWithProducts
} from "../controllers/category.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkAdminRole } from "../middlewares/checkRole.js";

const router = express.Router();

//! Public routes (authenticated users)
router.get("/", getAllCategories);

//! Admin only routes
router.post("/", verifyToken, checkAdminRole, createCategory);
router.put("/:id", verifyToken, checkAdminRole, updateCategory);
router.post("/:id/soft-delete", verifyToken, checkAdminRole, softDeleteCategory);
router.delete("/:id", verifyToken, checkAdminRole, deleteCategory);
router.post("/sync-products", verifyToken, checkAdminRole, syncCategoriesWithProducts);

export default router;
