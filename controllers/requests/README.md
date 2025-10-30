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

# request.admin.controller.js

Controller dành cho **Admin** để **quản lý tất cả Yêu cầu (Request)** thực hiện CRUD trên `product | category | topping`.
Các Request tạo ra sẽ ở trạng thái `pending` và **chỉ có hiệu lực khi Admin duyệt**.

## Admin duyệt Request

- Chỉ Admin mới có quyền duyệt (approve) Request.
- Khi duyệt, hệ thống sẽ thực hiện hành động tương ứng (create/update/delete) trên đối tượng mục tiêu (product/category/topping).
- Sau khi thực hiện hành động, trạng thái của Request sẽ được cập nhật thành `approved`.
- Nếu không thể thực hiện hành động (ví dụ: đối tượng mục tiêu không tồn tại), trạng thái của Request sẽ được cập nhật thành `rejected` và ghi chú lý do từ chối.

Để đảm bảo tính toàn vẹn dữ liệu, các thao tác duyệt Request sẽ được thực hiện trong một transaction của MongoDB. Ví dụ:

```js
const session = await mongoose.startSession();
session.startTransaction();
```

- Nếu không có transaction:
  - Tạo Request `create` cho `product` mới → `Product.create(...)` → thất bại (ví dụ: lỗi unique) → Request vẫn ở trạng thái `pending` → không thể retry.
  - Giả sử khi Admin duyệt một Request “create product” bạn làm 2 bước:
    - Tạo Product mới trong Product collection.
    - Thêm productId đó vào Store.products.
  - Nếu lỗi xảy ra giữa chừng(ví dụ bước 1 thành công nhưng bước 2 lỗi cú pháp):
    - Product vẫn được tạo.
    - Nhưng store không chứa sản phẩm đó → database bị lệch(inconsistent).

## Transaction trong MongoDB & Mongoose

### 1. Tổng quan

- Transaction (giao dịch) trong MongoDB giúp đảm bảo **tính toàn vẹn dữ liệu** khi nhiều thao tác database diễn ra cùng lúc.
  > Nếu **một thao tác lỗi**, thì **toàn bộ các thao tác khác cũng bị huỷ bỏ (rollback)**.
- Điều này rất quan trọng khi làm các hành động phức tạp như:
  > Admin duyệt request → tạo sản phẩm mới → thêm sản phẩm đó vào store → cập nhật trạng thái request.
- Nếu một bước lỗi, transaction đảm bảo không có dữ liệu “nửa chừng”.
- Mongoose hỗ trợ transaction thông qua `session`.

### 2. Các bước cơ bản trong Mongoose Transaction

#### `mongoose.startSession()`

- Tạo một **session** — đây là “phiên làm việc” để gom các thao tác vào một giao dịch.

```js
const session = await mongoose.startSession();
```

#### `session.startTransaction()`

- Bắt đầu một transaction trong session.

```js
session.startTransaction();
```

#### `applyRequestEffect(request, { session })`

- Thực hiện các thao tác database cần thiết (tạo/sửa/xoá) trong transaction.
- Mọi thao tác phải **sử dụng session** để đảm bảo chúng thuộc về transaction này.

```js
await Product.create([{ ...payload }], { session });
await Store.updateOne(
  { _id: storeId },
  { $push: { products: { productId } } },
  { session }
);
```

#### `session.commitTransaction()`

- Nếu tất cả thao tác thành công, gọi hàm này để **lưu các thay đổi** vào database.

```js
await session.commitTransaction();
```

#### `session.abortTransaction()`

- Nếu có lỗi xảy ra, gọi hàm này để **huỷ bỏ tất cả các thay đổi** đã thực hiện trong transaction.

```js
await session.abortTransaction();
```

#### `session.endSession()`

- Kết thúc session khi đã hoàn tất (dù thành công hay lỗi).

```js
session.endSession();
```

### 3. Notes

- Transaction chỉ hoạt động trên **MongoDB replica set** (bao gồm cả single-node replica set).
- MongoDB phải chạy trong replica set hoặc sharded cluster để transaction hoạt động đầy đủ.
  → Khi test local, transaction vẫn chạy được nhưng rollback có thể bị giới hạn.
- Nên luôn có try...catch...finally để:

 commit khi thành công

 abort khi lỗi

🔚 endSession sau cùng.


