import Store from "../../models/Store.model.js";

//! Lấy thông tin chi tiết cửa hàng mà manager đang quản lý
export const getMyStore = async (req, res) => {
    try {
        const managerId = req.user.userId;

        // Tìm store theo managerId và populate các trường liên quan
        const store = await Store.findOne({ manager: managerId })
            .populate('manager', 'userName email phoneNumber')
            .populate('staff', 'userName email phoneNumber role')
            .populate('products', 'name price category image status');

        // Nếu không tìm thấy store
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        res.status(200).json({
            success: true,
            message: "Lấy thông tin cửa hàng thành công",
            data: store
        });
    } catch (error) {
        console.error("Lỗi khi lấy thông tin cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy thông tin cửa hàng",
            error: error.message
        });
    }
};












