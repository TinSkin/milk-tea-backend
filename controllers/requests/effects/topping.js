import Store from "../../../models/Store.model.js";
import Topping from "../../../models/Topping.model.js";

//! Xử lý khi Admin phê duyệt request liên quan đến topping
export async function adminToppingApprove(request, { session, store }) {
    const { action, payload = {}, targetId, storeId } = request;

    switch (action) {
        case "create": {
            let toppingId = payload.toppingId;
            if (!toppingId) {
                const [newTop] = await Topping.create(
                    [{ name: payload.name, extraPrice: payload.extraPrice, description: payload.description, status: payload.status }],
                    { session }
                );
                toppingId = newTop._id;
                request.payload.toppingId = toppingId; // trace
            }

            await Store.updateOne(
                { _id: storeId },
                {
                    $addToSet: {
                        toppings: {
                            toppingId,
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
                const e = new Error("Thiếu targetId cho UPDATE topping");
                e.status = 400;
                throw e;
            }

            const topUpdate = {};
            if (payload.name !== undefined) topUpdate.name = payload.name;
            if (payload.extraPrice !== undefined) topUpdate.extraPrice = payload.extraPrice;
            if (payload.description !== undefined) topUpdate.description = payload.description;
            if (payload.status !== undefined) topUpdate.status = payload.status;

            if (Object.keys(topUpdate).length > 0) {
                const updatedTop = await Topping.findByIdAndUpdate(
                    targetId,
                    { $set: topUpdate },
                    { new: true, session }
                );
                if (!updatedTop) {
                    const e = new Error("Topping không tồn tại để cập nhật");
                    e.status = 404;
                    throw e;
                }
            }

            if (payload.storeStatus) {
                await Store.updateOne(
                    { _id: storeId, "toppings.toppingId": targetId },
                    {
                        $set: {
                            "toppings.$.storeStatus": payload.storeStatus,
                            "toppings.$.lastUpdated": new Date(),
                        },
                    },
                    { session }
                );
            }
            return;
        }

        case "delete": {
            if (!targetId) {
                const e = new Error("Thiếu targetId cho DELETE topping");
                e.status = 400;
                throw e;
            }
            await Store.updateOne(
                { _id: storeId },
                { $pull: { toppings: { toppingId: targetId } } },
                { session }
            );
            // Optional: vô hiệu hoá toàn hệ thống
            // await Topping.updateOne({ _id: targetId }, { $set: { status: "unavailable" } }, { session });
            return;
        }

        default: {
            const e = new Error(`Action "${action}" chưa hỗ trợ cho entity "topping"`);
            e.status = 400;
            throw e;
        }
    }
}

//! Xử lý khi Admin từ chối request liên quan đến topping
export async function adminToppingReject(request, { session }) {
    return;
}
