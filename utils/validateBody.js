//! Hàm dùng chung để validate dữ liệu bằng Joi - Import và gọi trong controller cùng với schema tương ứng.
export function validateBody(schema, body) {
    const { error, value } = schema.validate(body, {
        abortEarly: false, // Báo tất cả lỗi thay vì dừng ở lỗi đầu tiên
        stripUnknown: true, // Loại bỏ field không nằm trong schema
    });

    if (error) {
        // Gộp tất cả lỗi lại thành một chuỗi dễ đọc
        const message = error.details.map((d) => d.message).join("; ");
        const err = new Error(message);
        err.status = 400;
        throw err;
    }

    return value;
}