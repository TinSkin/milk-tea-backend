import Store from "../../models/Store.model.js";
import Product from "../../models/Product.model.js";

//! Lấy danh sách sản phẩm của cửa hàng do manager quản lý (có phân trang)
export const getMyStoreProducts = async (req, res) => {
    try {
        const managerId = req.user.userId;
        
        // Parse query parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";
        const status = req.query.status || "all";
        const category = req.query.category || "";
        const sortBy = req.query.sortBy || "createdAt";
        const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

        // Tìm cửa hàng theo manager
        const store = await Store.findOne({ manager: managerId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này",
            });
        }

        // Lấy danh sách productId từ store
        const storeProducts = store.products;
        const productIds = storeProducts.map(p => p.productId);

        // Tạo query filter cho products
        let productQuery = { _id: { $in: productIds } };
        
        // Filter by search
        if (search) {
            productQuery.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ];
        }
        
        // Filter by system status
        if (status !== "all") {
            productQuery.status = status;
        }
        
        // Filter by category
        if (category && category !== "all") {
            productQuery.category = category;
        }

        // Calculate pagination
        const skip = (page - 1) * limit;
        
        // Get total count
        const totalProducts = await Product.countDocuments(productQuery);
        const totalPages = Math.ceil(totalProducts / limit);
        
        // Get products with pagination
        const products = await Product.find(productQuery)
            .populate("category", "name")
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        // Merge products với storeStatus từ store
        const productsWithStoreStatus = products.map(product => {
            const storeProduct = storeProducts.find(sp => sp.productId.toString() === product._id.toString());
            return {
                ...product.toObject(),
                storeStatus: storeProduct ? storeProduct.storeStatus : 'unavailable',
                addedAt: storeProduct ? storeProduct.addedAt : null,
                lastUpdated: storeProduct ? storeProduct.lastUpdated : null
            };
        });

        // Pagination info
        const pagination = {
            currentPage: page,
            totalPages,
            totalProducts,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        };

        res.status(200).json({
            success: true,
            message: "Lấy danh sách sản phẩm cửa hàng thành công",
            data: {
                storeInfo: {
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address,
                },
                products: productsWithStoreStatus,
                pagination,
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

//! Cập nhật trạng thái sản phẩm trong cửa hàng (storeStatus) - CHỈ cho manager
export const updateMyStoreProductStatus = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { productId } = req.params;
        const { storeStatus } = req.body;

        // Validate input
        if (!storeStatus || !["available", "paused", "unavailable", "out_of_stock"].includes(storeStatus)) {
            return res.status(400).json({
                success: false,
                message: "storeStatus phải là 'available', 'paused', 'unavailable', hoặc 'out_of_stock'",
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

        // Kiểm tra sản phẩm có trong cửa hàng không
        const productIndex = store.products.findIndex(p => p.productId.toString() === productId);
        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Sản phẩm không có trong cửa hàng này",
            });
        }

        // Lấy thông tin sản phẩm từ Product collection để validate system status
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy sản phẩm",
            });
        }

        // BUSINESS RULES: System status hierarchy validation
        if (storeStatus === "available") {
            if (product.status === "unavailable") {
                return res.status(400).json({
                    success: false,
                    message: "Không thể BẬT sản phẩm tại cửa hàng khi sản phẩm đã bị Admin TẮT toàn hệ thống. Vui lòng liên hệ Admin để kích hoạt lại.",
                    code: "SYSTEM_STATUS_UNAVAILABLE"
                });
            }
            
            if (product.status === "paused") {
                return res.status(400).json({
                    success: false,
                    message: "Không thể BẬT sản phẩm tại cửa hàng khi sản phẩm đang bị Admin TẠM DỪNG. Vui lòng liên hệ Admin để biết thêm thông tin.",
                    code: "SYSTEM_STATUS_PAUSED"
                });
            }

            if (product.status === "out_of_stock") {
                return res.status(400).json({
                    success: false,
                    message: "Không thể BẬT sản phẩm tại cửa hàng khi sản phẩm HẾT HÀNG toàn hệ thống. Vui lòng chờ Admin nhập thêm hàng.",
                    code: "SYSTEM_STATUS_OUT_OF_STOCK"
                });
            }
        }

        // Cập nhật storeStatus và lastUpdated
        store.products[productIndex].storeStatus = storeStatus;
        store.products[productIndex].lastUpdated = new Date();
        
        await store.save();

        // Populate product để trả về đầy đủ thông tin
        await product.populate("category", "name");
        
        const responseProduct = {
            ...product.toObject(),
            storeStatus: store.products[productIndex].storeStatus,
            addedAt: store.products[productIndex].addedAt,
            lastUpdated: store.products[productIndex].lastUpdated
        };

        // Helper function để tạo status message
        const getStatusMessage = (storeStatus) => {
            const messages = {
                "available": "BẬT",
                "unavailable": "TẮT", 
                "paused": "TẠM DỪNG",
                "out_of_stock": "HẾT HÀNG"
            };
            return messages[storeStatus] || "thay đổi trạng thái";
        };

        res.status(200).json({
            success: true,
            message: `Đã ${getStatusMessage(storeStatus)} sản phẩm tại cửa hàng`,
            data: responseProduct,
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật trạng thái sản phẩm cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật trạng thái sản phẩm",
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