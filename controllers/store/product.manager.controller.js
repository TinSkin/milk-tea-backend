import Store from "../../models/Store.model.js";
import Product from "../../models/Product.model.js";

//! Lấy danh sách sản phẩm của cửa hàng do manager quản lý
export const getMyStoreProducts = async (req, res) => {
    try {
        const managerId = req.user.userId;

        // Tìm cửa hàng theo manager và populate sản phẩm + category
        const store = await Store.findOne({ manager: managerId }).populate({
            path: "products",
            populate: {
                path: "category",
                select: "name",
            },
        });

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này",
            });
        }

        res.status(200).json({
            success: true,
            message: "Lấy danh sách sản phẩm cửa hàng thành công",
            data: {
                storeInfo: {
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address,
                },
                products: store.products,
            },
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy sản phẩm cửa hàng",
            error: error.message,
        });
    }
};

//! Cập nhật trạng thái sản phẩm trong cửa hàng do manager quản lý
export const updateMyStoreProducts = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { productIds, action } = req.body; // action: 'add' hoặc 'remove'

        // Validate input
        if (!productIds || !Array.isArray(productIds) || !action) {
            return res.status(400).json({
                success: false,
                message: "Đầu vào không hợp lệ. Cung cấp mảng productIds và action.",
            });
        }

        // Tìm cửa hàng của manager
        const store = await Store.findOne({ manager: managerId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này",
            });
        }

        // Kiểm tra sản phẩm tồn tại
        const validProducts = await Product.find({ _id: { $in: productIds } });
        if (validProducts.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: "Một số sản phẩm không tồn tại",
            });
        }

        let updatedStore;
        if (action === "add") {
            // Thêm sản phẩm, tránh trùng lặp
            updatedStore = await Store.findByIdAndUpdate(
                store._id,
                { $addToSet: { products: { $each: productIds } } },
                { new: true }
            ).populate("products", "name price category image status");
        } else if (action === "remove") {
            // Xóa sản phẩm
            updatedStore = await Store.findByIdAndUpdate(
                store._id,
                { $pull: { products: { $in: productIds } } },
                { new: true }
            ).populate("products", "name price category image status");
        } else {
            return res.status(400).json({
                success: false,
                message: "Hành động không hợp lệ. Sử dụng 'add' hoặc 'remove'.",
            });
        }

        res.status(200).json({
            success: true,
            message: `${action === "add" ? "Thêm" : "Xóa"} sản phẩm thành công`,
            data: {
                storeId: updatedStore._id,
                storeName: updatedStore.storeName,
                products: updatedStore.products,
            },
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật sản phẩm cửa hàng",
            error: error.message,
        });
    }
};