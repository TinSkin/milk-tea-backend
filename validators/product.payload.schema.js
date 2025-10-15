import Joi from "joi";

//! Định nghĩa Joi schema cho từng phần trong payload
const sizeOptionJoi = Joi.object({
    size: Joi.string().valid("S", "M", "L").required(),
    price: Joi.number().min(0).required()
});

//! Schema cho payload của Product (dùng trong create/update request)
export const productPayloadJoi = Joi.object({
    name: Joi.string().trim().max(100).required(),
    description: Joi.string().trim().max(500).required(),
    category: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), // ObjectId
    images: Joi.array().items(Joi.string().uri()).default([]),
    sizeOptions: Joi.array().items(sizeOptionJoi).default([]),
    status: Joi.string().valid("available", "paused", "unavailable", "out_of_stock").default("available"),
    currency: Joi.string().default("VNĐ"),
    price: Joi.number().min(0).required(),
    toppings: Joi.array().items(Joi.string().regex(/^[0-9a-fA-F]{24}$/)).default([]),

    // SEO optional
    metaTitle: Joi.string().max(60).allow("", null),
    metaDescription: Joi.string().max(160).allow("", null),
}).required();