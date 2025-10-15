# Request Constants

## Mục đích

File này định nghĩa các cấu hình tĩnh cho hệ thống Request, bao gồm:

- Danh sách các **đối tượng (entity)** mà người dùng có thể gửi yêu cầu lên admin để duyệt.
- Danh sách các **hành động (action)** hợp lệ cho từng loại đối tượng.

Mục tiêu là tập trung toàn bộ logic kiểm tra hợp lệ của cặp `entity–action` vào một nơi duy nhất.  
Điều này giúp tránh việc viết nhiều `if/else` rải rác trong controller và đảm bảo hệ thống hoạt động thống nhất.

---

## Entity

**Entity** là loại dữ liệu mà cửa hàng trưởng (Store Manager) có thể thao tác thông qua Request.  
Ví dụ: sản phẩm, danh mục, topping, đơn hàng, phương thức thanh toán, v.v.

Danh sách entity hiện được hỗ trợ:

- `product`
- `category`
- `topping`
- `order`
- `payment`

---

## Action

**Action** là hành động cụ thể mà cửa hàng trưởng muốn thực hiện với entity tương ứng.  
Ví dụ:

- `create`, `update`, `delete` dùng cho các thao tác CRUD cơ bản.
- `refund_full`, `refund_partial`, `price_adjustment` dùng cho đơn hàng.
- `enable_method`, `update_credentials` dùng cho phương thức thanh toán.

---

## Cấu trúc file

```js
// request.constants.js

export const REQUEST_ENTITIES = [
  "product",
  "category",
  "topping",
  "order",
  "payment",
];

export const VALID_ACTIONS_BY_ENTITY = {
  product: ["create", "update", "delete"],
  category: ["create", "update", "delete"],
  topping: ["create", "update", "delete"],
  order: [
    "cancel_order",
    "refund_full",
    "refund_partial",
    "price_adjustment",
    "reassign_store",
  ],
  payment: [
    "enable_method",
    "disable_method",
    "update_credentials",
    "update_settlement",
    "update_fee",
  ],
};
```

## Cách sử dụng

Các constant này được import vào controller hoặc service để kiểm tra dữ liệu đầu vào trước khi xử lý logic chính.

```js
import {
  REQUEST_ENTITIES,
  VALID_ACTIONS_BY_ENTITY,
} from "../config/request.constants.js";

if (!REQUEST_ENTITIES.includes(entity)) {
  throw new Error(`Entity không hợp lệ: ${entity}`);
}

if (!VALID_ACTIONS_BY_ENTITY[entity]?.includes(action)) {
  throw new Error(`Action "${action}" không hợp lệ với entity "${entity}"`);
}
```

## Mở rộng

Khi hệ thống có thêm loại dữ liệu mới (ví dụ promotion, storeSetting, …),
chỉ cần thêm key mới vào REQUEST_ENTITIES và khai báo hành động tương ứng trong VALID_ACTIONS_BY_ENTITY.

```js
export const REQUEST_ENTITIES = ["product", "category", "topping", "order", "payment", "promotion"];

export const VALID_ACTIONS_BY_ENTITY = {
...,
promotion: ["create", "update", "delete", "enable", "disable"]
};
```

