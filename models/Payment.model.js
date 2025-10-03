import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'VND',
        enum: ['VND']
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['momo', 'cod']
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded'],
        default: 'pending'
    },
    refundAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    refundReason: {
        type: String,
        default: null
    },
    refundDate: {
        type: Date,
        default: null
    },
    paymentDetails: {
        momoTransactionId: {
            type: String, // nếu thanh toán qua momo thì lưu mã giao dịch
        }
    },
    description: {
        type: String,
        default: ''
    },
    metadata: {
        // Thông tin bổ sung
        ipAddress: String,
        userAgent: String,
        deviceInfo: Object
    },
    failureReason: {
        type: String,
        default: null
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function () {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: this.currency
    }).format(this.amount);
});

// Methods
paymentSchema.methods.canRefund = function () {
    return ['completed'].includes(this.status) &&
        this.refundAmount < this.amount;
};

paymentSchema.methods.processRefund = async function (refundAmount, reason) {
    if (!this.canRefund()) {
        throw new Error('Cannot refund this payment');
    }

    if (refundAmount > (this.amount - this.refundAmount)) {
        throw new Error('Refund amount exceeds available amount');
    }

    this.refundAmount += refundAmount;
    this.refundReason = reason;
    this.refundDate = new Date();

    if (this.refundAmount === this.amount) {
        this.status = 'refunded';
    } else {
        this.status = 'partially_refunded';
    }

    return this.save();
};

// Statics
paymentSchema.statics.generateTransactionId = function () {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `TXN${timestamp}${random}`;
};

paymentSchema.statics.getStatsByDateRange = async function (startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                },
                status: { $in: ['completed', 'partially_refunded'] }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$amount' },
                totalRefunded: { $sum: '$refundAmount' },
                netRevenue: { $sum: { $subtract: ['$amount', '$refundAmount'] } },
                totalTransactions: { $sum: 1 },
                avgTransactionValue: { $avg: '$amount' }
            }
        }
    ]);
};

paymentSchema.statics.getDailyRevenue = async function (days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate },
                status: { $in: ['completed', 'partially_refunded'] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    day: { $dayOfMonth: '$createdAt' }
                },
                revenue: { $sum: { $subtract: ['$amount', '$refundAmount'] } },
                transactions: { $sum: 1 }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
    ]);
};

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;