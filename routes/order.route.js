import express from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  getCustomerOrders,
  cancelOrder,
  getOrderStats
} from '../controllers/order.controller.js';
import { verifyToken } from "../middlewares/verifyToken.js";
// import { verifyAdmin } from '../middleware/verifyAdmin.js'; // Nếu bạn muốn dùng middleware riêng cho admin

const router = express.Router();

/**
 * =========================
 * CUSTOMER ROUTES
 * =========================
 */
// Tạo đơn hàng mới (Customer)
// router.post('/', verifyToken, createOrder);
router.post('/', createOrder);

// Lấy danh sách đơn hàng của Customer
// router.get('/my-orders', verifyToken, getCustomerOrders);
router.post('/', createOrder);

// Hủy đơn hàng (Customer only)
// router.post('/:id/cancel', verifyToken, cancelOrder);
router.post('/:id/cancel', cancelOrder);

/**
 * =========================
 * SHARED ROUTES
 * - Customer xem chi tiết đơn hàng của mình
 * - Admin xem chi tiết tất cả đơn hàng
 * =========================
 */
router.get('/:id', verifyToken, getOrderById);

/**
 * =========================
 * ADMIN ROUTES
 * - Bạn có thể thêm verifyAdmin middleware để chỉ admin truy cập
 * =========================
 */
// Lấy tất cả đơn hàng (Admin)
router.get('/', verifyToken, /* verifyAdmin, */ getOrders);

// Cập nhật trạng thái đơn hàng (Admin)
router.put('/:id/status', verifyToken, /* verifyAdmin, */ updateOrderStatus);

// Cập nhật trạng thái thanh toán (Admin)
router.put('/:id/payment', verifyToken, /* verifyAdmin, */ updatePaymentStatus);

// Thống kê đơn hàng (Admin)
router.get('/admin/stats', verifyToken, /* verifyAdmin, */ getOrderStats);

export default router;
