import Store from "../models/Store.model.js";
import User from "../models/User.model.js";
import Product from "../models/Product.model.js";
import Order from "../models/Order.model.js";

//! Lấy danh sách thành phố có cửa hàng hoạt động
export const getCities = async (req, res) => {
    try {
        // Lấy danh sách unique cities từ stores đang hoạt động
        const cities = await Store.distinct('address.city', { status: 'active' });
        
        // Lọc bỏ null/undefined và sort A-Z
        const filteredCities = cities.filter(city => city).sort();

        res.status(200).json({
            success: true,
            message: "Lấy danh sách thành phố thành công",
            data: filteredCities
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách thành phố:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách thành phố",
            error: error.message
        });
    }
};

//! Lấy danh sách cửa hàng theo thành phố (dành cho user)
export const getStoresByCity = async (req, res) => {
    try {
        const { city } = req.query;
        
        if (!city) {
            return res.status(400).json({
                success: false,
                message: "Tham số thành phố là bắt buộc"
            });
        }

        // Tìm stores theo thành phố, chỉ lấy thông tin cần thiết cho user
        const stores = await Store.find({
            'address.city': { $regex: city, $options: 'i' },
            status: 'active'
        })
        .select('storeName storeCode address phone openTime closeTime deliveryRadius status')
        .sort({ storeName: 1 });

        res.status(200).json({
            success: true,
            message: `Lấy danh sách cửa hàng tại ${city} thành công`,
            data: {
                city: city,
                stores: stores,
                total: stores.length
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cửa hàng theo thành phố:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh sách cửa hàng",
            error: error.message
        });
    }
};

//! Lấy danh sách sản phẩm của cửa hàng (dành cho user)
export const getStoreProducts = async (req, res) => {
    try {
        const { storeId } = req.params;
        
        // Lấy tham số phân trang
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const skip = (page - 1) * limit;

        // Lấy tham số lọc và sắp xếp
        const search = req.query.search || '';
        const category = req.query.category || 'all';
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        
        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: "Store ID là bắt buộc"
            });
        }

        // Kiểm tra store có tồn tại và đang hoạt động không
        const store = await Store.findOne({ _id: storeId, status: 'active' })
            .select('storeName storeCode address products');
        
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng hoặc cửa hàng không hoạt động"
            });
        }

        // Tạo điều kiện lọc cho sản phẩm
        let filter = {};
        
        // Chỉ lấy sản phẩm thuộc cửa hàng này và có trạng thái available
        filter._id = { $in: store.products };
        filter.status = 'available';
        
        // Tìm kiếm theo tên hoặc mô tả
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Lọc theo danh mục
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Tạo đối tượng sắp xếp
        const sort = {};
        sort[sortBy] = sortOrder;

        // Đếm tổng số sản phẩm và lấy danh sách sản phẩm với phân trang
        const totalProducts = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .populate('toppings', 'name extraPrice')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('name price category images description status sizeOptions toppings createdAt');

        // Tính toán thông tin phân trang
        const totalPages = Math.ceil(totalProducts / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        // Trả về kết quả với thông tin phân trang
        res.status(200).json({
            success: true,
            message: "Lấy danh sách sản phẩm của cửa hàng thành công",
            data: {
                store: {
                    _id: store._id,
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address
                },
                products: products,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalProducts,
                    limit,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm của cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy sản phẩm của cửa hàng",
            error: error.message
        });
    }
};

//! Lấy danh sách categories có sẵn tại cửa hàng cụ thể (cho sidebar filtering)
export const getStoreCategories = async (req, res) => {
    try {
        const { storeId } = req.params;
        
        if (!storeId) {
            return res.status(400).json({
                success: false,
                message: "Store ID là bắt buộc"
            });
        }

        // Lấy store với categories populated
        const store = await Store.findOne({ _id: storeId, status: 'active' })
            .populate({
                path: 'categories',
                select: 'name slug description status'
            })
            .select('storeName categories');
        
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng hoặc cửa hàng không hoạt động"
            });
        }

        res.status(200).json({
            success: true,
            message: "Lấy danh sách danh mục của cửa hàng thành công",
            data: {
                storeId: store._id,
                storeName: store.storeName,
                categories: store.categories || [],
                total: store.categories?.length || 0
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh mục của cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy danh mục của cửa hàng",
            error: error.message
        });
    }
};

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

//! Lấy tất cả sản phẩm của cửa hàng mình quản lý
export const getMyStoreProducts = async (req, res) => {
    try {
        const managerId = req.user.userId;
        
        // Tìm cửa hàng và populate sản phẩm
        const store = await Store.findOne({ manager: managerId })
            .populate({
                path: 'products',
                populate: {
                    path: 'category',
                    select: 'name'
                }
            });
            
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        res.status(200).json({
            success: true,
            message: "Lấy danh sách sản phẩm cửa hàng thành công",
            data: {
                storeInfo: {
                    storeName: store.storeName,
                    storeCode: store.storeCode,
                    address: store.address
                },
                products: store.products
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy sản phẩm cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi lấy sản phẩm cửa hàng",
            error: error.message
        });
    }
};

//! Cập nhật danh sách sản phẩm cho cửa hàng (thêm/xóa sản phẩm)
export const updateMyStoreProducts = async (req, res) => {
    try {
        const managerId = req.user.userId;
        const { productIds, action } = req.body; // action: 'add' hoặc 'remove'
        
        // Kiểm tra đầu vào
        if (!productIds || !Array.isArray(productIds) || !action) {
            return res.status(400).json({
                success: false,
                message: "Đầu vào không hợp lệ. Cung cấp mảng productIds và action."
            });
        }

        // Tìm cửa hàng
        const store = await Store.findOne({ manager: managerId });
        if (!store) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy cửa hàng cho manager này"
            });
        }

        // Kiểm tra sản phẩm có tồn tại không
        const validProducts = await Product.find({ _id: { $in: productIds } });
        if (validProducts.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: "Một số sản phẩm không tồn tại"
            });
        }

        let updatedStore;
        if (action === 'add') {
            // Thêm sản phẩm (không trùng lặp)
            updatedStore = await Store.findByIdAndUpdate(
                store._id,
                { $addToSet: { products: { $each: productIds } } },
                { new: true }
            ).populate('products', 'name price category image status');
        } else if (action === 'remove') {
            // Xóa sản phẩm
            updatedStore = await Store.findByIdAndUpdate(
                store._id,
                { $pull: { products: { $in: productIds } } },
                { new: true }
            ).populate('products', 'name price category image status');
        } else {
            return res.status(400).json({
                success: false,
                message: "Hành động không hợp lệ. Sử dụng 'add' hoặc 'remove'."
            });
        }

        res.status(200).json({
            success: true,
            message: `${action === 'add' ? 'Thêm' : 'Xóa'} sản phẩm thành công`,
            data: {
                storeId: updatedStore._id,
                storeName: updatedStore.storeName,
                products: updatedStore.products
            }
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật sản phẩm cửa hàng:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server khi cập nhật sản phẩm cửa hàng",
            error: error.message
        });
    }
};

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
