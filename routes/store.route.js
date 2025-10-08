import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkRole, checkAdminRole, checkStoreManagerRole } from "../middlewares/checkRole.js";
import {
    getMyStore,
    getMyStoreProducts,
    getMyStoreStaff,
    getMyStoreCategories,
    getMyStoreToppings,
    updateMyStoreProducts,
    getMyStoreStats,
    getMyStoreOrders,
    getAllStores,
    getStoreById,
    createStore,
    updateStore,
    deleteStore,
    getCities,
    getStoresByCity,
    getStoreProducts,
    getStoreCategories
} from "../controllers/store.controller.js";

const router = express.Router();

//! Các route công khai (không cần xác thực) - dành cho user chọn cửa hàng
router.get("/cities", getCities); // Lấy danh sách tất cả thành phố có cửa hàng hoạt động
router.get("/city", getStoresByCity); // Lấy danh sách cửa hàng theo thành phố cụ thể - ?city=Hà Nội

//! Các route dành cho Store Manager - quản lý cửa hàng của chính mình (ĐẶT TRƯỚC /:storeId)
router.get("/my-store", verifyToken, checkStoreManagerRole, getMyStore); // Lấy thông tin cửa hàng mà manager đang quản lý
router.get("/my-store/products", verifyToken, checkStoreManagerRole, getMyStoreProducts); // Lấy danh sách sản phẩm có trong cửa hàng
router.get("/my-store/staff", verifyToken, checkStoreManagerRole, getMyStoreStaff); // Lấy danh sách nhân viên (staff + customer) của cửa hàng
router.get("/my-store/categories", verifyToken, checkStoreManagerRole, getMyStoreCategories); // Lấy danh sách categories có trong cửa hàng
router.get("/my-store/toppings", verifyToken, checkStoreManagerRole, getMyStoreToppings); // Lấy danh sách toppings có trong cửa hàng
router.put("/my-store/products", verifyToken, checkStoreManagerRole, updateMyStoreProducts); // Cập nhật sản phẩm trong cửa hàng (thêm/xóa)
router.get("/my-store/stats", verifyToken, checkStoreManagerRole, getMyStoreStats); // Lấy thống kê doanh thu, đơn hàng của cửa hàng
router.get("/my-store/orders", verifyToken, checkStoreManagerRole, getMyStoreOrders); // Lấy danh sách đơn hàng của cửa hàng

// Route ordering: Express router xử lý routes theo thứ tự được định nghĩa
// Pattern matching: /:storeId match với bất kỳ string nào, bao gồm "my-store"
// Conflict: Khi gọi /stores/my-store, nó match với /:storeId thay vì /my-store

//! Các routes với :storeId parameter (ĐẶT SAU my-store routes)
router.get("/:storeId/products", getStoreProducts); // Lấy danh sách sản phẩm của cửa hàng cụ thể
router.get("/:storeId/categories", getStoreCategories); // Lấy danh sách categories có sẵn tại cửa hàng - cho sidebar

//! Các route cho Store Manager - quản lý trạng thái sản phẩm riêng tại store
// router.put("/my-store/:storeId/products/:productId/status", verifyToken, checkRole(['admin', 'store_manager']), updateStoreProductStatus); // Cập nhật trạng thái một sản phẩm
// router.put("/my-store/:storeId/products/bulk-status", verifyToken, checkRole(['admin', 'store_manager']), bulkUpdateStoreProductStatus); // Cập nhật trạng thái nhiều sản phẩm

//! Các route dành cho Admin - quản lý tất cả cửa hàng trong hệ thống
router.get("/", verifyToken, checkAdminRole, getAllStores); // Lấy danh sách tất cả cửa hàng với phân trang và filter
router.get("/:storeId", verifyToken, checkAdminRole, getStoreById); // Lấy thông tin chi tiết một cửa hàng theo ID
router.post("/", verifyToken, checkAdminRole, createStore); // Tạo cửa hàng mới với thông tin đầy đủ
router.put("/:storeId", verifyToken, checkAdminRole, updateStore); // Cập nhật thông tin cửa hàng (tên, địa chỉ, manager, etc.)
router.delete("/:storeId", verifyToken, checkAdminRole, deleteStore); // Xóa cửa hàng khỏi hệ thống

export default router;