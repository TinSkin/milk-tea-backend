# request.manager.controller.js

Controller dành cho **Cửa hàng trưởng (Store Manager)** để **gửi Yêu cầu (Request)** thực hiện CRUD trên `product | category | topping`.  
Các Request tạo ra sẽ ở trạng thái `pending` và **chỉ có hiệu lực khi Admin duyệt**.

> Controller **không dùng service**, chỉ dùng:
>
> - `models/Request.model.js` (Mongoose)
> - `validators/request.validator.js` (Joi schema: `createRequestSchema`, …)
> - `utils/validateBody.js` (`validateBody(schema, body)`)

---

## 1) Phân quyền & Auth

- Tất cả endpoint yêu cầu: `verifyToken` + `checkStoreManagerRole`.
- Middleware role của bạn đặt `req.user = { userId, ... }` → **luôn dùng `req.user.userId`**.

---

## 2) Endpoints (định nghĩa trong `routes/request.manager.route.js`)

> Mount gợi ý:
>
> ```js
> app.use("/api/requests", requestManagerRoutes);
> ```

### 2.1 Submit CREATE Request

**POST** `/api/requests/:type/create`  
`:type ∈ { product | category | topping }`  
Body tối thiểu:

```json
{
  "storeId": "6565f...e81",
  "payload": {
    "name": "Trà sữa Oolong",
    "price": 45000,
    "categoryId": "6565f...001"
  },
  "reason": "Thêm món mới",
  "attachments": [],
  "tags": []
}
```

### 2.2 Gửi UPDATE

POST /api/requests/:type/:targetId/update
Body mẫu

```json
{
  "storeId": "6565f...e81",
  "payload": { "price": 48000 },
  "original": { "price": 45000 },
  "reason": "Điều chỉnh giá"
}
```

### 2.3 Gửi DELETE

POST /api/requests/:type/:targetId/delete
Body mẫu

```json
{
  "storeId": "6565f...e81",
  "reason": "Ngừng kinh doanh món này"
}
```

### 2.4 Danh sách của chính CHT

GET /api/requests/mine?status=&entity=&action=&storeId=&targetId=&page=&limit=
→ Trả { items, total, page, limit, pages } (sort createdAt desc).

### 2.5 Chi tiết của chính CHT

GET /api/requests/mine/:id

### 2.6 Cập nhật draft (pending)

PATCH /api/requests/mine/:id
Cho phép sửa: payload, original, reason, attachments, tags (server tự tính lại diff).
Không cho đổi: entity, action, storeId, targetId.

### 2.7 Hủy draft (pending)

PATCH /api/requests/mine/:id/cancel
→ Đổi status → "cancelled" và ghi timeline.

### 2.8 Xem trước diff (không lưu DB)

POST /api/requests/preview-diff
Body

{ "original": {...}, "payload": {...} }

→ Trả { original, payload, diff[] }.

## 3) Validate & Quy tắc nghiệp vụ (nằm trong controller)

### 3.1 validateBody(createRequestSchema, preparedBody)

Trước khi validate, controller ép thêm:

entity (lấy từ URL :type hoặc từ req.body.entity)

action (tương ứng create/update/delete theo endpoint)

targetId (bắt buộc với update/delete)

Với delete: ép payload: {} để schema không báo thiếu.

validateBody dùng options:

abortEarly: false → gom mọi lỗi một lần trả

stripUnknown: true → loại field lạ

Sai input ⇒ ném Error { status=400, message:"<chuỗi lỗi gộp>" }.

### 3.2 Helpers nghiệp vụ (được controller sử dụng)

getEntityFromReq(req)
Trả về entity từ req.params.type|entity hoặc req.body.entity.
⇒ Cho phép dùng nhiều style route mà không đổi code.

assertActionAllowed(entity, action)
Ràng buộc policy:
entity ∈ { product, category, topping } × action ∈ { create, update, delete }.

ensureNoDuplicatePending({ storeId, entity, action, targetId })
Chặn tạo Request trùng đang pending với cùng (storeId, entity, action, targetId).

computeDiff(original, payload)
Tính diff shallow { field, from, to } để Admin review nhanh.

## 4) Luồng xử lý chuẩn (ví dụ: UPDATE)

entity = getEntityFromReq(req)

assertActionAllowed(entity, "update")

Lấy targetId từ URL/body; thiếu ⇒ 400

body = validateBody(createRequestSchema, { ...req.body, entity, action:"update", targetId })

ensureNoDuplicatePending({ storeId: body.storeId, entity, action:"update", targetId })

diff = computeDiff(body.original || {}, body.payload || {})

Request.create({ storeId: body.storeId, userId: req.user.userId, entity, action:"update", targetId, payload: body.payload, original: body.original, diff, status:"pending", timeline:[{ action:"submit", by:req.user.userId }] })

Trả 201: { success: true, data: <Request> }

## 5) Mã lỗi & Thông điệp

Trường hợp || HTTP || Thông điệp
Input không hợp lệ (Joi) || 400 || Chuỗi lỗi gộp từ Joi
entity–action không hợp lệ || 400 || Action "X" không hợp lệ với type "Y"
Thiếu targetId (update/delete) || 400 || Thiếu targetId cho update/delete
Trùng request pending || 409 || Đã tồn tại yêu cầu 'pending' cho đối tượng này.
Không tìm thấy/không có quyền (mine) || 404 || Không tìm thấy request hoặc không có quyền ...
Thành công (submit) || 201 || { success: true, data: ... }
