import Joi from "joi";

//! Schema cho API tạo request mới (CHT gửi yêu cầu)
export const createRequestSchema = Joi.object({
    storeId: Joi.string().required().messages({
        "any.required": "Thiếu trường storeId",
        "string.base": "storeId phải là chuỗi",
    }),
    entity: Joi.string()
        .valid("product", "category", "topping", "order", "payment")
        .required()
        .messages({
            "any.required": "Thiếu trường entity",
            "any.only": "Entity không hợp lệ",
        }),
    action: Joi.string().required().messages({
        "any.required": "Thiếu trường action",
    }),
    targetId: Joi.string().allow(null, "").optional(),
    payload: Joi.object().required().messages({
        "any.required": "Thiếu payload (dữ liệu đề xuất)",
    }),
    reason: Joi.string().allow("").default(""),
    attachments: Joi.array().items(Joi.string()).default([]),
    tags: Joi.array().items(Joi.string()).default([]),
});

//! Schema cho API admin approve
export const approveRequestSchema = Joi.object({
    note: Joi.string().allow("").optional(),
});

//! Schema cho API admin reject
export const rejectRequestSchema = Joi.object({
    note: Joi.string().allow("").optional(),
});

//! Schema cho API CHT hủy request
export const cancelRequestSchema = Joi.object({
    note: Joi.string().allow("").optional(),
});

//! Hàm tiện ích validate chung
export function validateBody(schema, body) {
    const { error, value } = schema.validate(body, {
        abortEarly: false, // báo tất cả lỗi thay vì dừng ở lỗi đầu tiên
        stripUnknown: true, // loại bỏ field không nằm trong schema
    });

    if (error) {
        // Gộp tất cả thông báo lỗi thành 1 chuỗi
        const message = error.details.map((d) => d.message).join("; ");
        const err = new Error(message);
        err.status = 400;
        throw err;
    }

    return value;
}