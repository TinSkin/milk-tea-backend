import Store from "../../../models/Store.model.js";
import Product from "../../../models/Product.model.js";

//! Xử lý khi Admin phê duyệt request liên quan đến product
export async function adminProductApprove(request, { session, store }) {
    const { action, payload = {}, targetId, storeId } = request;

    // Store đã được validate ở applyRequestChanges

    switch (action) {
        case "create": {
            const [productDoc] = await Product.create([{ ...payload }], { session });
            const productId = productDoc._id;

            store.products.push({
                productId,
                storeStatus: payload.status || "available",
                addedAt: new Date(),
                lastUpdated: new Date(),
            });
            await store.save({ session });

            // trace id mới để audit/debug
            request.payload.productId = productId;
            return;
        }

        case "update": {
            if (!targetId) {
                const e = new Error("Thiếu targetId cho UPDATE product");
                e.status = 400;
                throw e;
            }
            const updated = await Product.findByIdAndUpdate(
                targetId,
                { $set: payload },
                { new: true, session }
            );
            if (!updated) {
                const e = new Error("Product không tồn tại để cập nhật");
                e.status = 404;
                throw e;
            }

            await Store.updateOne(
                { _id: storeId, "products.productId": targetId },
                { $set: { "products.$.lastUpdated": new Date() } },
                { session }
            );
            return;
        }

        case "delete": {
            if (!targetId) {
                const e = new Error("Thiếu targetId cho DELETE product");
                e.status = 400;
                throw e;
            }
            await Store.updateOne(
                { _id: storeId },
                { $pull: { products: { productId: targetId } } },
                { session }
            );
            await Product.updateOne(
                { _id: targetId },
                { $set: { status: "unavailable" } },
                { session }
            );
            return;
        }

        default: {
            const e = new Error(`Action "${action}" chưa hỗ trợ cho entity "product"`);
            e.status = 400;
            throw e;
        }
    }
}

//! Xử lý khi Admin từ chối request liên quan đến product
export async function adminProductReject(request, { session }) {
    return;
}