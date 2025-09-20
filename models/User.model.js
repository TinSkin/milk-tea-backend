import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: function() {
            // Only required for local registration, not for Google OAuth
            return this.provider === 'local' || !this.provider;
        },
        default: '',
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: function() {
            // Only required for local registration, not for Google OAuth
            return this.provider === 'local' || !this.provider;
        },
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
        sparse: true // Allows null values but ensures uniqueness when present
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
    
    // Store/Location Management Fields
    assignedStoreId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: function() {
            // Required for staff and storeManager
            return ['staff', 'storeManager'].includes(this.role);
        },
        default: null
    },
    
    managedStores: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    }], // For admins who can manage multiple stores
    
    permissions: {
        canManageProducts: { type: Boolean, default: false },
        canManageOrders: { type: Boolean, default: false },
        canManageUsers: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canManageStores: { type: Boolean, default: false }
    },
    // Reset Password Token
    resetPasswordToken: String,
    resetPasswordExpiresAt: Date,

    // Email Link Verfication
    verificationToken: String,
    verificationTokenExpiresAt: Date,

    // OTP Verification  
    verificationCode: String,
    verificationCodeExpiresAt: Date
}, {
    timestamps: true
})

const User = mongoose.model('User', userSchema);

export default User; 