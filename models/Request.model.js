import mongoose, { Schema } from "mongoose";

// Schema để lưu trữ các thay đổi (diff) trong request (để ghi log chi tiết giữa cũ và mới)
const diffSchema = new Schema(
    {
        field: { type: String, required: true },
        from: { type: Schema.Types.Mixed, default: null },
        to: { type: Schema.Types.Mixed, default: null },
    },
    { _id: false }
);

// Schema để lưu trữ trạng thái của từng item trong request (sản phẩm, topping, đơn hàng)
const timelineSchema = new Schema(
    {
        at: { type: Date, default: Date.now },
        by: { type: Schema.Types.ObjectId, ref: "User" }, // ai thực hiện: storeManager/admin
        action: { type: String }, // "submit" | "approve" | "reject" | "cancel"
        note: { type: String },
    },
    { _id: false }
);

const requestSchema = new Schema({
    storeId: {
        type: Schema.Types.ObjectId,
        ref: "Store",
        required: true,
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User", // người tạo request (storeManager)
        required: true,
        index: true,
    },
    approverId: {
        type: Schema.Types.ObjectId,
        ref: "User", // admin duyệt
        default: null,
    },
    // Đối tượng và hành động
    entity: {
        type: String,
        enum: ["product", "category", "topping", "order", "payment"],
        required: true,
        index: true,
    },
    action: {
        type: String,
        enum: [
            // CRUD cơ bản (áp cho product/category/topping)
            "create", "update", "delete",
            // Order flow
            "cancel_order", "refund_full", "refund_partial",
            "price_adjustment", "reassign_store",
            // Payment flow
            "enable_method", "disable_method",
            "update_credentials", "update_settlement", "update_fee"
        ],
        required: true,
        index: true,
    },
    targetId: { type: Schema.Types.ObjectId, default: null },   // Nếu là update/delete/refund... sẽ có targetId

    // Dữ liệu chi tiết
    payload: { type: Schema.Types.Mixed, default: {} },  // dữ liệu đề xuất (mới)
    original: { type: Schema.Types.Mixed, default: {} },  // snapshot cũ (để hiện diff)
    diff: { type: [diffSchema], default: [] },

    // Lý do & file đính kèm
    reason: { type: String, default: "" },
    attachments: [{ type: String }],

    // Trạng thái request
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled"],
        default: "pending",
        index: true,
    },

    // Lịch sử thao tác
    timeline: { type: [timelineSchema], default: [] },

    // Tag/nhãn tuỳ chọn
    tags: [{ type: String }],
},
    { timestamps: true }
);

// Index để filter nhanh
requestSchema.index({ storeId: 1, status: 1, entity: 1, action: 1, createdAt: -1 });

// Hỗ trợ truy vấn theo người tạo
requestSchema.index({ userId: 1, status: 1, createdAt: -1 });

// Tránh yêu cầu trùng khi pending cùng target
requestSchema.index(
    { storeId: 1, entity: 1, action: 1, targetId: 1, status: 1 },
    { partialFilterExpression: { status: "pending" } }
);

const Request = mongoose.model('Request', requestSchema);
export default Request;