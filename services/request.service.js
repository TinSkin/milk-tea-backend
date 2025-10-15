import mongoose from "mongoose";
import Request from "../models/Request.model.js";
import { VALID_ACTIONS_BY_ENTITY } from "../config/request.constants.js";

//! Kiểm tra cặp entity–action có hợp lệ theo policy tĩnh hay không 
export function assertActionAllowed(entity, action) {
    const allowed = VALID_ACTIONS_BY_ENTITY[entity] || [];
    if (!allowed.includes(action)) {
        const err = new Error(`Action "${action}" không hợp lệ với entity "${entity}"`);
        err.status = 400;
        throw err;
    }
}

//! Tính diff đơn giản (shallow) giữa original và payload để hiển thị cho Admin 
function computeDiff(original = {}, payload = {}) {
    const keys = new Set([...Object.keys(original || {}), ...Object.keys(payload || {})]);
    const out = [];
    for (const k of keys) {
        const fromVal = original?.[k];
        const toVal = payload?.[k];
        if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
            out.push({ field: k, from: fromVal ?? null, to: toVal ?? null });
        }
    }
    return out;
}

//! Xây query chung cho list API */
function buildListQuery({ storeId, userId, status, entity, action, targetId }) {
    const q = {};
    if (storeId) q.storeId = storeId;
    if (userId) q.userId = userId;
    if (status) q.status = status;
    if (entity) q.entity = entity;
    if (action) q.action = action;
    if (targetId) q.targetId = targetId;
    return q;
}

/* ---------------------------------- Create ---------------------------------- */

//!  Tạo request (storeManager gửi).
//  -- input: { storeId, entity, action, targetId?, payload, reason?, attachments?, tags? , original? }
//  -- userId: _id người gửi (từ req.user._id)
export async function createRequestService(input, userId) {
    const {
        storeId,
        entity,
        action,
        targetId,
        payload,
        reason,
        attachments,
        tags,
        original, // optional: nếu phía controller đã snapshot trước
    } = input;

    // 1) Policy tĩnh
    assertActionAllowed(entity, action);

    // 2) Chống trùng request pending cùng target (nếu có targetId)
    if (targetId) {
        const dup = await Request.findOne({
            storeId,
            entity,
            action,
            targetId,
            status: "pending",
        }).lean();
        if (dup) {
            const err = new Error("Đã tồn tại yêu cầu 'pending' cho đối tượng này.");
            err.status = 409; // Conflict
            throw err;
        }
    }

    // 3) (Tuỳ chọn) nếu bạn muốn tự fetch original ở đây khi action=update/delete:
    //    - Cần import model domain tương ứng ở đầu file.
    // let snapshot = original || {};
    // if (!snapshot && (action === "update" || action === "delete") && targetId) {
    //   if (entity === "product") {
    //     const doc = await Product.findById(targetId).lean();
    //     if (doc) snapshot = { name: doc.name, price: doc.price, categoryId: doc.categoryId, isActive: doc.isActive };
    //   }
    //   // else if (entity === "category") { ... }
    //   // else if (entity === "topping")  { ... }
    // }

    const snapshot = original || {}; // giữ đơn giản: controller có thể truyền original vào

    // 4) Tính diff để Admin review
    const diff = computeDiff(snapshot, payload || {});

    // 5) Tạo document
    const doc = await Request.create({
        storeId,
        userId,
        entity,
        action,
        targetId: targetId || null,
        payload: payload || {},
        original: snapshot,
        diff,
        reason: reason || "",
        attachments: attachments || [],
        tags: tags || [],
        status: "pending",
        timeline: [{ action: "submit", by: userId }],
    });

    return doc;
}

/* --------------------------------- Approve ---------------------------------- */

//! Duyệt request (Admin) + thực thi hành động trong 1 transaction.
// -- opts.note: ghi chú của Admin khi duyệt (optional)
export async function approveRequestService(requestId, approverId, opts = {}) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const r = await Request.findById(requestId).session(session);
        if (!r) {
            const err = new Error("Không tìm thấy request");
            err.status = 404;
            throw err;
        }
        if (r.status !== "pending") {
            const err = new Error("Chỉ request ở trạng thái 'pending' mới được approve");
            err.status = 400;
            throw err;
        }

        // Policy tĩnh
        assertActionAllowed(r.entity, r.action);

        /* ================== THỰC THI NGHIỆP VỤ THEO ENTITY/ACTION ==================
         * Bạn mở các import Model ở đầu file và cắm logic tại đây.
         * Khuyến nghị: soft delete thay vì xóa cứng.
         */

        // if (r.entity === "product") {
        //   if (r.action === "create") {
        //     await Product.create([{ ...r.payload }], { session });
        //   } else if (r.action === "update") {
        //     await Product.findByIdAndUpdate(r.targetId, { $set: r.payload }, { session });
        //   } else if (r.action === "delete") {
        //     await Product.findByIdAndUpdate(r.targetId, { $set: { isActive: false } }, { session });
        //   }
        // } else if (r.entity === "category") {
        //   if (r.action === "create") {
        //     await Category.create([{ ...r.payload }], { session });
        //   } else if (r.action === "update") {
        //     await Category.findByIdAndUpdate(r.targetId, { $set: r.payload }, { session });
        //   } else if (r.action === "delete") {
        //     await Category.findByIdAndUpdate(r.targetId, { $set: { isActive: false } }, { session });
        //   }
        // } else if (r.entity === "topping") {
        //   if (r.action === "create") {
        //     await Topping.create([{ ...r.payload }], { session });
        //   } else if (r.action === "update") {
        //     await Topping.findByIdAndUpdate(r.targetId, { $set: r.payload }, { session });
        //   } else if (r.action === "delete") {
        //     await Topping.findByIdAndUpdate(r.targetId, { $set: { isActive: false } }, { session });
        //   }
        // } else if (r.entity === "order") {
        //   // TODO: refund_full / refund_partial / price_adjustment / reassign_store...
        //   // - Gọi cổng thanh toán (sandbox) nếu hoàn tiền.
        //   // - Ghi log giao dịch refund.
        //   // - Cập nhật trường refundedAmount / refunds[] của Order.
        // } else if (r.entity === "payment") {
        //   // TODO: enable_method / disable_method / update_credentials / update_settlement / update_fee...
        //   // - Cập nhật cấu hình thanh toán theo store (pivot hoặc mảng trong Store).
        //   // - Xoá/refresh cache cấu hình thanh toán nếu có.
        // }

        // 2) Cập nhật trạng thái request
        r.status = "approved";
        r.approverId = approverId;
        r.timeline.push({ action: "approve", by: approverId, note: opts.note || "" });
        await r.save({ session });

        await session.commitTransaction();
        return r;
    } catch (err) {
        await session.abortTransaction();
        throw err;
    } finally {
        session.endSession();
    }
}

/* ---------------------------------- Reject ---------------------------------- */

/** Từ chối request (Admin) */
export async function rejectRequestService(requestId, approverId, note = "") {
    const r = await Request.findById(requestId);
    if (!r) {
        const err = new Error("Không tìm thấy request");
        err.status = 404;
        throw err;
    }
    if (r.status !== "pending") {
        const err = new Error("Chỉ request ở trạng thái 'pending' mới được reject");
        err.status = 400;
        throw err;
    }

    r.status = "rejected";
    r.approverId = approverId;
    r.timeline.push({ action: "reject", by: approverId, note });
    await r.save();
    return r;
}

/* ---------------------------------- Cancel ---------------------------------- */

/** Hủy request (chỉ người tạo mới được hủy, khi còn pending) */
export async function cancelRequestService(requestId, userId) {
    const r = await Request.findOne({ _id: requestId, userId });
    if (!r) {
        const err = new Error("Không tìm thấy request hoặc không có quyền hủy");
        err.status = 404;
        throw err;
    }
    if (r.status !== "pending") {
        const err = new Error("Chỉ request ở trạng thái 'pending' mới được hủy");
        err.status = 400;
        throw err;
    }

    r.status = "cancelled";
    r.timeline.push({ action: "cancel", by: userId });
    await r.save();
    return r;
}

/* ----------------------------------- List ----------------------------------- */

/** Danh sách request của 1 user (CHT) với filter + phân trang */
export async function getMyRequestsService(userId, { page = 1, limit = 10, ...filters } = {}) {
    const q = buildListQuery({ ...filters, userId });
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const [items, total] = await Promise.all([
        Request.find(q).sort({ createdAt: -1 }).skip(skip).limit(Math.max(1, limit)).lean(),
        Request.countDocuments(q),
    ]);

    return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Math.max(1, limit)),
    };
}

/** Danh sách request cho Admin với filter + phân trang */
export async function getAllRequestsService({ page = 1, limit = 10, ...filters } = {}) {
    const q = buildListQuery(filters);
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

    const [items, total] = await Promise.all([
        Request.find(q).sort({ createdAt: -1 }).skip(skip).limit(Math.max(1, limit)).lean(),
        Request.countDocuments(q),
    ]);

    return {
        items,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Math.max(1, limit)),
    };
}