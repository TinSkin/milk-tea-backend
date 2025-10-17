import mongoose from "mongoose";
import Request from "../../models/Request.model.js";
import Store from "../../models/Store.model.js";
import Product from "../../models/Product.model.js";
import Category from "../../models/Category.model.js";
import Topping from "../../models/Topping.model.js";
import { approveRequestSchema, rejectRequestSchema } from "../../validators/request.validator.js";
import { validateBody } from "../../validators/request.validator.js";

// Import các hàm xử lý hiệu lực thay đổi thực tế
import { adminProductApprove, adminProductReject } from "./effects/product.js";
import { adminCategoryApprove, adminCategoryReject } from "./effects/category.js";
import { adminToppingApprove, adminToppingReject } from "./effects/topping.js";

//! Lấy tất cả Request (dành cho Admin)
export async function getAllRequests(req, res, next) {
    try {
        // Phân trang
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        // Lọc
        const {
            search = "",               // tìm trong reason, tags
            status = "all",            // pending|approved|rejected|cancelled|all
            entity = "all",            // product|category|topping|order|payment|all
            action = "all",            // create|update|delete|...|all
            storeId,                   // ObjectId string
            userId,                    // requester
            approverId,                // admin duyệt
            from,                      // ISO date string
            to,                        // ISO date string
            sortBy = "createdAt",      // createdAt|updatedAt|status|entity|action
            sortOrder = "desc",        // asc|desc
        } = req.query;

        const filter = {};

        // Lọc đơn giản theo trường chuẩn
        if (status !== "all") filter.status = status;
        if (entity !== "all") filter.entity = entity;
        if (action !== "all") filter.action = action;
        if (storeId) filter.storeId = storeId;
        if (userId) filter.userId = userId;
        if (approverId) filter.approverId = approverId;

        // Tìm kiếm full-text đơn giản (reason + tags)
        if (search && search.trim()) {
            const kw = search.trim();
            filter.$or = [
                { reason: { $regex: kw, $options: "i" } },
                { tags: { $elemMatch: { $regex: kw, $options: "i" } } },
            ];
        }

        // Khoảng thời gian
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }

        // Sắp xếp
        const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        // Query DB
        const [totalRequests, requests] = await Promise.all([
            Request.countDocuments(filter),
            Request.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate("userId", "userName email role")
                .populate("approverId", "userName email role")
                .populate("storeId", "storeName address.city")
                .lean()
        ]);

        // Tính toán phân trang
        const totalPages = Math.ceil(totalRequests / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;

        res.status(200).json({
            success: true,
            requests,
            pagination: {
                currentPage: page,
                totalPages,
                totalRequests,
                limit,
                hasNextPage,
                hasPrevPage
            }
        });

    } catch (error) {
        console.error("Error in getAllRequests:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

//! Lấy chi tiết Request theo ID (dành cho Admin)
export async function getRequestById(req, res, next) {
    try {
        const { id } = req.params;

        // Tìm request theo ID và populate các trường liên quan
        const request = await Request.findById(id)
            .populate("userId", "userName email role")
            .populate("approverId", "userName email role")
            .populate("storeId", "storeName address.city")
            .lean();

        if (!request) {
            return res.status(404).json({ response: false, message: "Không tìm thấy request" });
        }

        res.status(200).json({ success: true, data: request });

    } catch (error) {
        console.error("Error in getAllRequests:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }

}

//! Admin duyệt (approve) Request
export async function approveRequest(req, res, next) {
    // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
    const session = await mongoose.startSession();

    // Bắt đầu transaction
    session.startTransaction();

    try {
        const { id } = req.params;
        const adminId = req.userId; // từ verifyToken middleware
        const { note } = validateBody(approveRequestSchema, req.body);

        // Tìm request
        const request = await Request.findById(id).session(session);
        if (!request) {
            return res.status(404).json({ success: false, message: "Không tìm thấy request" });
        }

        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Chỉ có thể duyệt request đang ở trạng thái 'pending'" });
        }

        // Áp dụng hiệu lực thay đổi thực tế (CRUD thật vào DB)
        await applyRequestChanges(request, { session });

        // Cập nhật trạng thái request
        request.status = "approved";
        request.approverId = adminId;
        request.timeline.push({ action: "approved", by: adminId, note: note || "" });
        await request.save({ session });

        // Transaction bắt đầu check rằng tất cả các thao tác đều thành công
        await session.commitTransaction();

        // Kết thúc session
        session.endSession();

        res.status(200).json({ success: true, message: "Duyệt request thành công", data: request });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error in approveRequest:", error);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
}

//! Admin từ chối (reject) Request
export async function rejectRequest(req, res, next) {
    try {
        const { id } = req.params;
        const adminId = req.userId; // từ verifyToken middleware (giống approveRequest)
        const { note } = validateBody(rejectRequestSchema, req.body || {});

        // Tìm request
        const request = await Request.findById(id);
        if (!request) {
            return res.status(404).json({ success: false, message: "Không tìm thấy request" });
        }
        if (request.status !== "pending") {
            return res.status(400).json({ success: false, message: "Chỉ có thể từ chối request đang ở trạng thái 'pending'" });
        }

        // Cập nhật trạng thái request
        request.status = "rejected";
        request.approverId = adminId;
        request.timeline.push({ action: "rejected", by: adminId, note: note || "" });
        await request.save();

        res.status(200).json({ success: true, message: "Từ chối request thành công", data: request });

    } catch (error) {
        console.error("Error in rejectRequest:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

//! Áp dụng hiệu lực thay đổi thực tế (CRUD thật vào DB) dựa trên Request đã được duyệt
async function applyRequestChanges(request, { session }) {
    const { entity, action, storeId } = request;

    // Đảm bảo store tồn tại
    const store = await Store.findById(storeId).session(session);
    if (!store) {
        const e = new Error("Store không tồn tại");
        e.status = 404;
        throw e;
    }

    // Chọn hàm xử lý dựa trên entity
    switch (entity) {
        case "product": 
            return await adminProductApprove(request, { session, store });
        
        case "category": 
            return await adminCategoryApprove(request, { session, store });
        
        case "topping": 
            return await adminToppingApprove(request, { session, store });
        
        default: {
            const e = new Error(`Entity "${entity}" chưa được hỗ trợ`);
            e.status = 400;
            throw e;
        }
    }
}
