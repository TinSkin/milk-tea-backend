import Store from "../../models/Store.model.js";
import Order from "../../models/Order.model.js";

//! Thống kê cửa hàng
export const getMyStoreStats = async (req, res) => {
    try {
        const managerId = req.user.userId;

        // Tìm cửa hàng
        const store = await Store.findOne({ manager: managerId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        // Thống kê cơ bản
        const totalProducts = store.products.length;
        const totalStaff = store.staff.length;

        // Thống kê đơn hàng (nếu có Order model)
        const totalOrders = await Order.countDocuments({ storeId: store._id });
        const completedOrders = await Order.countDocuments({
            storeId: store._id,
            status: 'completed'
        });

        // Doanh thu tháng này (ví dụ)
        const currentMonth = new Date();
        currentMonth.setDate(1);
        const monthlyRevenue = await Order.aggregate([
            {
                $match: {
                    storeId: store._id,
                    status: 'completed',
                    createdAt: { $gte: currentMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$totalAmount' }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Lấy thống kê cửa hàng thành công",
            data: {
                storeInfo: {
                    storeName: store.storeName,
                    storeCode: store.storeCode
                },
                stats: {
                    totalProducts,
                    totalStaff,
                    totalOrders,
                    completedOrders,
                    monthlyRevenue: monthlyRevenue[0]?.total || 0
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy thống kê cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thống kê cửa hàng",
            error: error.message
        });
    }
};
