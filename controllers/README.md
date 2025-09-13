# $in:
- Chọn các document mà giá trị trường nằm trong một mảng.
- Ví dụ: { category: { $in: categoryIds } }
→ Chỉ lấy các sản phẩm có category nằm trong mảng categoryIds.

# $ne:
- Viết tắt của "not equal" (khác).
- Ví dụ: { status: { $ne: 'unavailable' } }
→ Chỉ lấy các sản phẩm mà status KHÔNG phải là 'unavailable'.

# $set:
- Dùng để cập nhật giá trị trường.
- Ví dụ: { $set: { status: 'unavailable' } }
→ Cập nhật trường status của các sản phẩm thành 'unavailable'.
