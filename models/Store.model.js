import mongoose, { Schema } from "mongoose";

const storeSchema = new Schema({
    storeName: {
        type: String,
        required: true,
        trim: true
    },
    storeCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    address: {
        street: { type: String, required: true },   // Địa chỉ đường phố
        district: { type: String, required: true }, // Quận
        city: { type: String, required: true },     // Thành phố
        zipCode: { type: String }                   // Mã bưu điện
    },
    phone: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },

    // Quản lý nhân sự cửa hàng
    manager: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    staff: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Menu và sản phẩm có sẵn tại cửa hàng với trạng thái riêng
    products: [{
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        // Trạng thái riêng của sản phẩm tại cửa hàng này
        storeStatus: {
            type: String,
            enum: ['available', 'paused', 'unavailable', 'out_of_stock'],
            default: 'available'
        },
        // Ngày thêm sản phẩm vào cửa hàng
        addedAt: {
            type: Date,
            default: Date.now
        },
        // Ngày cập nhật trạng thái cuối cùng
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],

    // Danh mục sản phẩm có sẵn tại cửa hàng - dành cho sidebar filtering
    categories: [{
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true
        },
        // Trạng thái riêng của danh mục tại cửa hàng này
        storeStatus: {
            type: String,
            enum: ['available', 'paused', 'unavailable', 'out_of_stock'],
            default: 'available'
        },
        // Ngày thêm danh mục vào cửa hàng
        addedAt: {
            type: Date,
            default: Date.now
        },
        // Ngày cập nhật trạng thái cuối cùng
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],

    // Topping có sẵn tại cửa hàng này với trạng thái riêng
    toppings: [{
        toppingId: {
            type: Schema.Types.ObjectId,
            ref: 'Topping',
            required: true
        },
        // Trạng thái riêng của topping tại cửa hàng này
        storeStatus: {
            type: String,
            enum: ['available', 'paused', 'unavailable', 'out_of_stock'],
            default: 'available'
        },
        // Ngày thêm topping vào cửa hàng
        addedAt: {
            type: Date,
            default: Date.now
        },
        // Ngày cập nhật trạng thái cuối cùng
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],

    // Đơn hàng được xử lý tại cửa hàng này
    orders: [{
        orderId: {
            type: Schema.Types.ObjectId,
            ref: 'Order',
            required: true
        },
        // Trạng thái riêng của đơn hàng tại cửa hàng này
        storeStatus: {
            type: String,
            enum: ['available', 'paused', 'unavailable', 'out_of_stock'],
            default: 'available'
        },
        // Ngày thêm sản phẩm vào cửa hàng
        addedAt: {
            type: Date,
            default: Date.now
        },
        // Ngày cập nhật trạng thái cuối cùng
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],

    // Phương thức thanh toán được hỗ trợ tại cửa hàng này
    payments: [{
        paymentId: {
            type: Schema.Types.ObjectId,
            ref: 'Payment',
            required: true
        },
        // Trạng thái riêng của đơn hàng tại cửa hàng này
        storeStatus: {
            type: String,
            enum: ['available', 'paused', 'unavailable', 'out_of_stock'],
            default: 'available'
        },
        // Ngày thêm sản phẩm vào cửa hàng
        addedAt: {
            type: Date,
            default: Date.now
        },
        // Ngày cập nhật trạng thái cuối cùng
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],

    // Trạng thái hoạt động của cửa hàng
    status: {
        type: String,
        enum: ['active', 'inactive', 'closed'],
        default: 'active'
    },

    // Giờ hoạt động của cửa hàng
    operatingHours: {
        monday: { open: String, close: String },      // Thứ 2
        tuesday: { open: String, close: String },     // Thứ 3
        wednesday: { open: String, close: String },   // Thứ 4
        thursday: { open: String, close: String },    // Thứ 5
        friday: { open: String, close: String },      // Thứ 6
        saturday: { open: String, close: String },    // Thứ 7
        sunday: { open: String, close: String }       // Chủ nhật
    },

    // Thông số kinh doanh
    capacity: {
        type: Number,
        default: 50 // Số lượng khách hàng có thể phục vụ
    },

    monthlyTarget: {
        type: Number,
        default: 0 // Mục tiêu doanh số hàng tháng
    }
}, {
    timestamps: true
});

const Store = mongoose.model('Store', storeSchema);
export default Store;