import express from "express";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  softDeleteProduct,
  getProductFormData
} from "../controllers/product.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkAdminRole } from "../middlewares/checkRole.js";

const router = express.Router();

//! Public routes 
router.get("/", getAllProducts);
router.get("/form-data", getProductFormData); 

//! Admin only routes
router.post("/", verifyToken, checkAdminRole, createProduct);
router.put("/:id", verifyToken, checkAdminRole, updateProduct);
router.post("/:id/soft-delete", verifyToken, checkAdminRole, softDeleteProduct);

export default router;