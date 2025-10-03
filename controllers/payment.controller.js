import Payment from '../models/payment.model.js';
import Order from '../models/order.model.js';
// import User from '../models/user.model.js';

// Lấy danh sách tất cả payments
export const getPayments = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            status = '',
            paymentMethod = '',
            dateFrom = '',
            dateTo = '',
            sortBy = 'newest'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Filter
        let filter = {};
        if (search) {
            filter.$or = [
                { transactionId: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        if (status && status !== 'all') filter.status = status;
        if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filter.createdAt.$lte = new Date(dateTo + 'T23:59:59.999Z');
        }

        // Sort
        let sort = {};
        switch (sortBy) {
            case 'amount_asc': sort.amount = 1; break;
            case 'amount_desc': sort.amount = -1; break;
            case 'oldest': sort.createdAt = 1; break;
            default: sort.createdAt = -1;
        }

        const payments = await Payment
            .find(filter)
            .populate('userId', 'name email')
            .populate('orderId', 'orderNumber')
            .sort(sort)
            .skip(skip)
            .limit(limitNum);

        const totalPayments = await Payment.countDocuments(filter);
        const totalPages = Math.ceil(totalPayments / limitNum);

        res.json({
            success: true,
            payments,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalPayments,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1,
                limit: limitNum
            }
        });
    } catch (error) {
        console.error('Error getting payments:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách thanh toán',
            error: error.message
        });
    }
};

// Lấy chi tiết một payment
export const getPaymentById = async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment
            .findById(id)
            .populate('userId', 'name email')
            .populate({
                path: 'orderId',
                populate: {
                    path: 'items.productId',
                    select: 'productName price image'
                }
            });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy giao dịch thanh toán'
            });
        }

        res.json({ success: true, payment });
    } catch (error) {
        console.error('Error getting payment by ID:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể lấy thông tin thanh toán',
            error: error.message
        });
    }
};

// Hoàn tiền (chỉ momo)
export const processRefund = async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, reason } = req.body;

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
        }

        if (payment.paymentMethod === 'cod') {
            return res.status(400).json({ success: false, message: 'COD không hỗ trợ hoàn tiền' });
        }

        await payment.processRefund(refundAmount, reason);

        if (payment.status === 'refunded') {
            await Order.findByIdAndUpdate(payment.orderId, {
                status: 'refunded',
                paymentStatus: 'refunded'
            });
        }

        res.json({ success: true, message: 'Hoàn tiền thành công', payment });
    } catch (error) {
        console.error('Error processing refund:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Không thể xử lý hoàn tiền'
        });
    }
};

// Cập nhật trạng thái thanh toán (admin)
export const updatePaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, failureReason } = req.body;

        const validStatuses = ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });
        }

        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
        }

        payment.status = status;
        if (status === 'failed' && failureReason) payment.failureReason = failureReason;
        if (status === 'completed') payment.processedAt = new Date();

        await payment.save();

        await Order.findByIdAndUpdate(payment.orderId, {
            paymentStatus: status === 'completed' ? 'paid' : status
        });

        res.json({ success: true, message: 'Cập nhật trạng thái thành công', payment });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái', error: error.message });
    }
};
