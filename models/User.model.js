import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        default: '',
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        default: '',
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    role: {
        type: String,
        enum: ['customer', 'staff', 'storeManager', 'admin'],
        default: 'customer'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'banned', 'suspended'],
        default: 'active'
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true // Cho phép giá trị null nhưng đảm bảo tính duy nhất khi có giá trị
    },
    avatar: {
        type: String,
        default: null
    },
    provider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },

    // Các trường quản lý cửa hàng/vị trí
    assignedStoreId: {
        type: Schema.Types.ObjectId,
        ref: 'Store',
        default: null
    },

    managedStores: [{
        type: Schema.Types.ObjectId,
        ref: 'Store'
    }], // Dành cho admin có thể quản lý nhiều cửa hàng

    permissions: {
        canManageProducts: { type: Boolean, default: false },
        canManageOrders: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canManageStores: { type: Boolean, default: false }
    },

    // Token đặt lại mật khẩu
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

    // Xác thực bằng link email
    verificationToken: String,
    verificationTokenExpiresAt: Date,

    // Xác thực bằng OTP
    verificationCode: String,
    verificationCodeExpiresAt: Date
}, {
    timestamps: true
});

const User = mongoose.model('User', userSchema);

export default User;