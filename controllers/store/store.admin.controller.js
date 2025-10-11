import Store from "../../models/Store.model.js";
import User from "../../models/User.model.js";

//! Lấy tất cả cửa hàng (dành cho admin)
export const getAllStores = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, city } = req.query;

        // Tạo truy vấn tìm kiếm
        const query = {};
        if (search) {
            query.$or = [
                { storeName: { $regex: search, $options: 'i' } },
                { storeCode: { $regex: search, $options: 'i' } }
            ];
        }
        if (city) {
            query['address.city'] = { $regex: city, $options: 'i' };
        }

        const skip = (page - 1) * limit;

        const stores = await Store.find(query)
            .populate('manager', 'userName email')
            .populate('staff', 'userName email role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalStores = await Store.countDocuments(query);

        res.status(200).json({
            success: true,
            message: "Lấy danh sách cửa hàng thành công",
            data: {
                stores,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalStores / limit),
                    totalStores,
                    hasNext: skip + stores.length < totalStores,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách cửa hàng",
            error: error.message
        });
    }
};

//! Lấy thông tin cửa hàng theo ID
export const getStoreById = async (req, res) => {
    try {
        const { storeId } = req.params;

        const store = await Store.findById(storeId)
            .populate('manager', 'userName email phoneNumber')
            .populate('staff', 'userName email phoneNumber role')
            .populate('products', 'name price category image status');

        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng"
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

//! Tạo cửa hàng mới
export const createStore = async (req, res) => {
    try {
        const { storeName, storeCode, address, phone, email, managerId, staff, products } = req.body;

        // Kiểm tra manager tồn tại và có quyền đúng
        const manager = await User.findById(managerId);
        if (!manager || manager.role !== 'storeManager') {
            return res.status(400).json({
                success: false,
                message: "Manager không hợp lệ. User phải có role 'storeManager'."
            });
        }

        // Kiểm tra mã cửa hàng đã tồn tại chưa
        const existingStore = await Store.findOne({ storeCode });
        if (existingStore) {
            return res.status(400).json({
                success: false,
                message: "Mã cửa hàng đã tồn tại"
            });
        }

        const newStore = new Store({
            storeName,
            storeCode,
            address,
            phone,
            email,
            manager: managerId,
            staff: staff || [],
            products: products || []
        });

        await newStore.save();

        const populatedStore = await Store.findById(newStore._id)
            .populate('manager', 'userName email')
            .populate('staff', 'userName email role')
            .populate('products', 'name price');

        res.status(201).json({
            success: true,
            message: "Tạo cửa hàng thành công",
            data: populatedStore
        });
    } catch (error) {
        console.error("Lỗi khi tạo cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi tạo cửa hàng",
            error: error.message
        });
    }
};

//! Cập nhật thông tin cửa hàng
export const updateStore = async (req, res) => {
    try {
        const { storeId } = req.params;
        const updateData = req.body;

        // Nếu cập nhật manager, kiểm tra manager mới
        if (updateData.manager) {
            const manager = await User.findById(updateData.manager);
            if (!manager || manager.role !== 'storeManager') {
                return res.status(400).json({
                    success: false,
                    message: "Invalid manager. User must have 'storeManager' role."
                });
            }
        }

        const updatedStore = await Store.findByIdAndUpdate(
            storeId,
            updateData,
            { new: true, runValidators: true }
        )
            .populate('manager', 'userName email')
            .populate('staff', 'userName email role')
            .populate('products', 'name price');

        if (!updatedStore) {
            return res.status(404).json({
                success: false,
                message: "Store not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Store updated successfully",
            data: updatedStore
        });
    } catch (error) {
        console.error("Error in updateStore:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

//! Xóa cửa hàng
export const deleteStore = async (req, res) => {
    try {
        const { storeId } = req.params;

        const deletedStore = await Store.findByIdAndDelete(storeId);

        if (!deletedStore) {
            return res.status(404).json({
                success: false,
                message: "Store not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Store deleted successfully",
            data: deletedStore
        });
    } catch (error) {
        console.error("Error in deleteStore:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
