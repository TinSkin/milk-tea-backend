import Store from "../../../models/Store.model.js";
import Category from "../../../models/Category.model.js";

//! Xử lý khi Admin phê duyệt request liên quan đến category
export async function adminCategoryApprove(request, { session, store }) {
    const { action, payload = {}, targetId, storeId } = request;
    
    switch (action) {
        case "create": {
            // Nếu có categoryId sẵn -> chỉ gắn vào store; nếu không -> tạo Category mới
            let categoryId = payload.categoryId;
            if (!categoryId) {
                const [newCat] = await Category.create(
                    [{ name: payload.name, description: payload.description, status: payload.status }],
                    { session }
                );
                categoryId = newCat._id;
                request.payload.categoryId = categoryId; // trace
            }

            await Store.updateOne(
                { _id: storeId },
                {
                    $addToSet: {
                        categories: {
                            categoryId,
                            storeStatus: payload.storeStatus || "available",
                            addedAt: new Date(),
                            lastUpdated: new Date(),
                        },
                    },
                },
                { session }
            );
            return;
        }

        case "update": {
            if (!targetId) {
                const e = new Error("Thiếu targetId cho UPDATE category");
                e.status = 400;
                throw e;
            }

            const catUpdate = {};
            if (payload.name !== undefined) catUpdate.name = payload.name;
            if (payload.description !== undefined) catUpdate.description = payload.description;
            if (payload.status !== undefined) catUpdate.status = payload.status;

            if (Object.keys(catUpdate).length > 0) {
                const updatedCat = await Category.findByIdAndUpdate(
                    targetId,
                    { $set: catUpdate },
                    { new: true, session }
                );
                if (!updatedCat) {
                    const e = new Error("Category không tồn tại để cập nhật");
                    e.status = 404;
                    throw e;
                }
            }

            if (payload.storeStatus) {
                await Store.updateOne(
                    { _id: storeId, "categories.categoryId": targetId },
                    {
                        $set: {
                            "categories.$.storeStatus": payload.storeStatus,
                            "categories.$.lastUpdated": new Date(),
                        },
                    },
                    { session }
                );
            }
            return;
        }

        case "delete": {
            if (!targetId) {
                const e = new Error("Thiếu targetId cho DELETE category");
                e.status = 400;
                throw e;
            }
            await Store.updateOne(
                { _id: storeId },
                { $pull: { categories: { categoryId: targetId } } },
                { session }
            );
            // Optional: vô hiệu hoá toàn hệ thống
            // await Category.updateOne({ _id: targetId }, { $set: { status: "unavailable" } }, { session });
            return;
        }

        default: {
            const e = new Error(`Action "${action}" chưa hỗ trợ cho entity "category"`);
            e.status = 400;
            throw e;
        }
    }
}

//! Xử lý khi Admin từ chối request liên quan đến category
export async function adminCategoryReject(request, { session }) {
    return;
}
