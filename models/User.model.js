import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
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