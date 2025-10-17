import Request from "../../models/Request.model.js";
import {
    createRequestSchema,
    cancelRequestSchema,
} from "../../validators/request.validator.js";
import { productPayloadJoi } from "../../validators/product.payload.schema.js";
import { validateBody } from "../../utils/validateBody.js";
import Store from "../../models/Store.model.js";

const VALID_ACTIONS_BY_TYPE = {
    product: ["create", "update", "delete"],
    category: ["create", "update", "delete"],
    topping: ["create", "update", "delete"],
};

//! Kiểm tra CHT có quản lý cửa hàng hay không
async function assertManagerOwnsStore(userId, storeId) {
    const sId = asObjectId(storeId);
    const uId = asObjectId(userId);
    if (!sId || !uId) {
        const err = new Error("storeId hoặc userId không hợp lệ");
        err.status = 400;
        throw err;
    }

    const ok = await Store.exists({ _id: sId, manager: uId });
    if (!ok) {
        const err = new Error("Bạn không có quyền thao tác trên cửa hàng này");
        err.status = 403;
        throw err;
    }
}

//! Kiểm tra targetId có thuộc store không (theo entity)?
async function assertTargetBelongsToStore(storeId, entity, targetId) {
    const sId = asObjectId(storeId);
    const tId = asObjectId(targetId);
    if (!sId || !tId) {
        const err = new Error("storeId hoặc targetId không hợp lệ");
        err.status = 400;
        throw err;
    }

    const pathMap = {
        product: "products.productId",
        category: "categories.categoryId",
        topping: "toppings.toppingId",
    };
    const path = pathMap[entity];
    if (!path) {
        const err = new Error(`entity "${entity}" không hỗ trợ kiểm tra thuộc store`);
        err.status = 400;
        throw err;
    }

    const ok = await Store.exists({ _id: sId, [path]: tId });
    if (!ok) {
        const err = new Error(`Đối tượng ${entity} id=${targetId} không thuộc store ${storeId}`);
        err.status = 404;
        throw err;
    }
}

//! Hàm tiện ích kiểm tra action có hợp lệ với entity/type không
function assertActionAllowed(entityOrType, action) {
    const allowed = VALID_ACTIONS_BY_TYPE[entityOrType] || [];
    if (!allowed.includes(action)) {
        const err = new Error(`Action "${action}" không hợp lệ với type "${entityOrType}"`);
        err.status = 400;
        throw err;
    }
}

//! Hàm tiện ích kiểm tra không có request 'pending' trùng lặp (tránh spam)
async function ensureNoDuplicatePending({ storeId, entity, action, targetId }) {
    if (!targetId) return;
    const dup = await Request.findOne({
        storeId,
        entity,
        action,
        targetId,
        status: "pending",
    }).lean();
    if (dup) {
        const err = new Error("Đã tồn tại yêu cầu 'pending' cho đối tượng này.");
        err.status = 409;
        throw err;
    }
}

//! Hàm tiện ích so sánh payload để preview diff
function computeDiff(original = {}, payload = {}) {
    const keys = new Set([...Object.keys(original || {}), ...Object.keys(payload || {})]);
    const diff = [];
    for (const k of keys) {
        const a = original?.[k];
        const b = payload?.[k];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
            diff.push({ field: k, from: a ?? null, to: b ?? null });
        }
    }
    return diff;
}

//! Hàm tiện ích lấy entity từ request (hỗ trợ cả :type và :entity) 
function getEntityFromReq(req) {
    // hỗ trợ cả 2 kiểu: lấy từ URL params hoặc từ body
    return req.params?.type || req.params?.entity || req.body?.entity;
}

//! Tạo yêu cầu CREATE (Request) để Admin duyệt, không thao tác trực tiếp lên Product/Category/Topping.
export async function submitCreateRequest(req, res, next) {
    try {
        const entity = getEntityFromReq(req);
        const action = "create";
        assertActionAllowed(entity, action);

        // ép action + entity vào body trước khi validate
        const body = validateBody(createRequestSchema, { ...req.body, entity, action });

        // nếu entity là product, validate kỹ payload hơn
        if (entity === "product") {
            // validate chi tiết payload theo Product model
            const { error, value } = productPayloadJoi.validate(body.payload, {
                abortEarly: false,
                stripUnknown: true
            });
            if (error) {
                const e = new Error(error.details.map(d => d.message).join("; "));
                e.status = 400;
                throw e;
            }

            // optional: nếu bạn muốn auto-base price = min(sizeOptions)
            if (value.sizeOptions?.length) {
                const minSizePrice = Math.min(...value.sizeOptions.map(s => s.price));
                // nếu FE không set price hoặc set sai, tự chỉnh cho chuẩn
                if (typeof value.price !== "number" || value.price < minSizePrice) {
                    value.price = minSizePrice;
                }
            }

            body.payload = value; // gán lại payload đã chuẩn hoá
        }

        const userId = req.user?.userId; // từ checkRole middleware của bạn
        await ensureNoDuplicatePending({
            storeId: body.storeId,
            entity,
            action,
            targetId: body.targetId,
        });

        const original = body.original || {};
        const payload = body.payload || {};
        const diff = computeDiff(original, payload);

        const request = await Request.create({
            storeId: body.storeId,
            userId,
            entity,
            action,
            targetId: null,
            payload,
            original,
            diff,
            reason: body.reason || "",
            attachments: body.attachments || [],
            tags: body.tags || [],
            status: "pending",
            timeline: [{ action: "submit", by: userId }],
        });

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        if (err?.code === 11000) {
            err.status = 409;
            err.message = "Đã tồn tại yêu cầu 'pending' cho đối tượng này.";
        }
        next(err);
    }
}

//! Tạo yêu cầu UPDATE (Request) để Admin duyệt, không thao tác trực tiếp lên Product/Category/Topping.
export async function submitUpdateRequest(req, res, next) {
    try {
        const entity = getEntityFromReq(req);
        const action = "update";

        // Kiểm tra action có hợp lệ với entity/type không
        assertActionAllowed(entity, action);

        const targetId = req.params.targetId;
        if (!targetId) throw new Error("Thiếu targetId cho update");

        // Ép action + entity + targetId vào body trước khi validate
        const body = validateBody(createRequestSchema, { ...req.body, entity, action, targetId });
        const userId = req.user?.userId;

        // Kiểm tra CHT có quản lý cửa hàng không
        await assertManagerOwnsStore(userId, body.storeId);

        // Kiểm tra targetId có thuộc store không (theo entity)
        await assertTargetBelongsToStore(body.storeId, entity, targetId);

        // Kiểm tra không có request 'pending' trùng lặp
        await ensureNoDuplicatePending({ storeId: body.storeId, entity, action, targetId });

        const { original = {}, payload = {} } = body;
        const diff = computeDiff(original, payload);

        const request = await Request.create({
            storeId: body.storeId,
            userId,
            entity,
            action,
            targetId,
            payload,
            original,
            diff,
            reason: body.reason || "",
            attachments: body.attachments || [],
            tags: body.tags || [],
            status: "pending",
            timeline: [{ action: "submit", by: userId }]
        });

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
}

//! Tạo yêu cầu DELETE (Request) để Admin duyệt, không thao tác trực tiếp lên Product/Category/Topping.
export async function submitDeleteRequest(req, res, next) {
    try {
        const entity = getEntityFromReq(req);
        const action = "delete";
        // Kiểm tra action có hợp lệ với entity/type không
        assertActionAllowed(entity, action);

        const targetId = req.params?.targetId || req.body?.targetId;
        if (!targetId) throw new Error("Thiếu targetId cho delete");

        const body = validateBody(createRequestSchema, {
            ...req.body,
            entity,
            action,
            targetId,
            payload: {}
        });

        const userId = req.user?.userId;

        // Kiểm tra CHT có quản lý cửa hàng không
        await assertManagerOwnsStore(userId, body.storeId);

        // Kiểm tra targetId có thuộc store không (theo entity)
        await assertTargetBelongsToStore(body.storeId, entity, targetId);

        // Kiểm tra không có request 'pending' trùng lặp
        await ensureNoDuplicatePending({ storeId: body.storeId, entity, action, targetId });

        const request = await Request.create({
            storeId: body.storeId,
            userId,
            entity,
            action,
            targetId,
            payload: {},
            original: {},
            diff: [],
            reason: body.reason || "",
            attachments: body.attachments || [],
            tags: body.tags || [],
            status: "pending",
            timeline: [{ action: "submit", by: userId }]
        });

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
}

//! Lấy danh sách request của chính mình (CHT)
export async function getMyRequests(req, res, next) {
    try {
        const userId = req.user?.userId;
        const { status, entity, action, storeId, targetId, page = 1, limit = 10 } = req.query;

        const filter = { userId };
        if (status) filter.status = status;
        if (entity) filter.entity = entity;
        if (action) filter.action = action;
        if (storeId) filter.storeId = storeId;
        if (targetId) filter.targetId = targetId;

        const skip = (Number(page) - 1) * Number(limit);
        const [items, total] = await Promise.all([
            Request.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
            Request.countDocuments(filter)
        ]);

        res.json({ success: true, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit), items });
    } catch (err) {
        next(err);
    }
}

//! Lấy chi tiết 1 request của chính mình (CHT)
export async function getMyRequestById(req, res, next) {
    try {
        const userId = req.user?.userId;
        const request = await Request.findOne({ _id: req.params.id, userId });
        if (!request) {
            const err = new Error("Không tìm thấy request hoặc không có quyền truy cập");
            err.status = 404;
            throw err;
        }
        res.json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
}

//! CHT cập nhật request PENDING của chính mình
export async function updateMyRequest(req, res, next) {
    try {
        const userId = req.user?.userId;
        const request = await Request.findOne({ _id: req.params.id, userId, status: "pending" });
        if (!request) {
            const err = new Error("Chỉ có thể cập nhật request đang ở trạng thái 'pending'");
            err.status = 400;
            throw err;
        }

        const allowed = ["payload", "original", "reason", "attachments", "tags"];
        for (const key of allowed) {
            if (req.body[key] !== undefined) request[key] = req.body[key];
        }
        request.diff = computeDiff(request.original, request.payload);
        request.timeline.push({ action: "update", by: userId });

        await request.save();
        res.json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
}

//! CHT hủy request PENDING của chính mình
export async function cancelMyRequest(req, res, next) {
    try {
        const userId = req.user?.userId;
        const body = validateBody(cancelRequestSchema, req.body);
        const request = await Request.findOneAndUpdate(
            { _id: req.params.id, userId, status: "pending" },
            { status: "cancelled", $push: { timeline: { action: "cancel", note: body.note || "", by: userId } } },
            { new: true }
        );
        if (!request) {
            const err = new Error("Không thể hủy request (không tồn tại hoặc không ở trạng thái pending)");
            err.status = 404;
            throw err;
        }
        res.json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
}

//! Thể hiện so sánh payload để preview diff giữa dữ liệu gốc và dữ liệu đề xuất (CHT)
export async function previewDiff(req, res, next) {
    try {
        const { original = {}, payload = {} } = req.body;
        const diff = computeDiff(original, payload);
        res.json({ success: true, data: { original, payload, diff } });
    } catch (err) {
        next(err);
    }
}