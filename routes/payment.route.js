import express from 'express';
import { verifyToken } from '../middlewares/verifyToken.js';
import {
    getPayments,
    getPaymentById,
    updatePaymentStatus,
} from '../controllers/payment.controller.js';

const router = express.Router();

// Middleware kiểm tra quyền admin
const checkAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Chỉ admin mới có quyền truy cập'
        });
    }
    next();
};

// Tất cả route payment đều yêu cầu đăng nhập và quyền admin
router.use(verifyToken);
router.use(checkAdmin);

// Lấy danh sách payments (lọc + phân trang)
router.get('/', getPayments);


// Lấy chi tiết payment theo ID
router.get('/:id', getPaymentById);

// Cập nhật trạng thái payment (manual update)
router.put('/:id/status', updatePaymentStatus);

export default router;
