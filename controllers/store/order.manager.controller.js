import Store from "../../models/Store.model.js";
import Order from "../../models/Order.model.js";

//! Lấy đơn hàng của cửa hàng
export const getMyStoreOrders = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { status, page = 1, limit = 10 } = req.query;

        // Tìm cửa hàng
        const store = await Store.findOne({ manager: managerId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        // Tạo truy vấn
        const query = { storeId: store._id };
        if (status) {
            query.status = status;
        }

        // Phân trang
        const skip = (page - 1) * limit;

        const orders = await Order.find(query)
            .populate('userId', 'userName email phoneNumber')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalOrders = await Order.countDocuments(query);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng cửa hàng thành công",
            data: {
                storeInfo: {
                    storeName: store.storeName,
                    storeCode: store.storeCode
                },
                orders,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalOrders / limit),
                    totalOrders,
                    hasNext: skip + orders.length < totalOrders,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy đơn hàng cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy đơn hàng cửa hàng",
            error: error.message
        });
    }
};
