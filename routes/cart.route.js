import express from "express";
import {
  getCart,
  addToCart,
  updateQuantity,
  updateCartItem,
  mergeDuplicateItems,
  removeFromCart,
  clearCart,
} from "../controllers/cart.controller.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const router = express.Router();

// Lấy giỏ hàng người dùng
router.get("/", verifyToken, getCart);

// Thêm sản phẩm hoặc tăng số lượng
router.post("/add", verifyToken, addToCart);

// Cập nhật số lượng thủ công
router.put("/quantity", verifyToken, updateQuantity);

// Cập nhật cấu hình item (topping, size, v.v.)
router.put("/update", verifyToken, updateCartItem);

// Gom sản phẩm trùng cấu hình
router.put("/merge", verifyToken, mergeDuplicateItems);

// Xóa 1 sản phẩm khỏi giỏ
router.delete("/item", verifyToken, removeFromCart);

// Làm trống giỏ hàng
router.delete("/clear", verifyToken, clearCart);

export default router;
