// - `entity` = loại đối tượng mà cửa hàng trưởng (CHT) muốn thao tác: product, category, topping, order, payment.
export const REQUEST_ENTITIES = ["product", "category", "topping", "order", "payment"];

//  - `action` = hành động cụ thể mà CHT muốn thực hiện lên entity đó.
export const VALID_ACTIONS_BY_ENTITY = {
    product: ["create", "update", "delete"],
    category: ["create", "update", "delete"],
    topping: ["create", "update", "delete"],
    order: ["cancel_order", "refund_full", "refund_partial", "price_adjustment", "reassign_store"],
    payment: ["enable_method", "disable_method", "update_credentials", "update_settlement", "update_fee"],
};