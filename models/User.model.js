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
        enum: ['user', 'admin', 'manager'],
        default: 'user'
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