import express from "express";
import {
    getCart,
    addToCart,
} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

//! Các route dành cho người dùng - người dùng có tài khoản 
router.get("/", verifyToken, getCart); // Lấy giỏ hàng của người dùng
router.post("/", verifyToken, addToCart); // Thêm sản phẩm vào giỏ hàng

export default router;