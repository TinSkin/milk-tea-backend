//! Xử lí khi Admin phê duyệt request liên quan đến product
if (entity === "product") {
    if (action === "create") {
        // 1) Tạo Product thật
        const [productDoc] = await Product.create([{ ...payload }], { session });
        const productId = productDoc._id;

        // 2) Gắn vào store.products
        store.products.push({
            productId,
            storeStatus: payload.status || "available",
            addedAt: new Date(),
            lastUpdated: new Date(),
        });
        await store.save({ session });

        // 3) Trace id mới vào request
        request.payload.productId = productId;
        return;
    }

    if (action === "update") {
        if (!targetId) fail("Thiếu targetId cho UPDATE product", 400);
        const updated = await Product.findByIdAndUpdate(
            targetId,
            { $set: payload },
            { new: true, session }
        );
        if (!updated) fail("Product không tồn tại để cập nhật", 404);

        await Store.updateOne(
            { _id: storeId, "products.productId": targetId },
            { $set: { "products.$.lastUpdated": new Date() } },
            { session }
        );
        return;
    }

    if (action === "delete") {
        if (!targetId) fail("Thiếu targetId cho DELETE product", 400);
        // Chính sách demo: gỡ khỏi store + set status product = 'unavailable'
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
}

//! Xử lí khi Admin phê duyệt request liên quan đến category
if (entity === "category") {
    if (action === "create") {
        // Nếu có sẵn categoryId → chỉ gắn vào store
        // Nếu chưa có → tạo Category mới từ payload
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

    if (action === "update") {
        if (!targetId) fail("Thiếu targetId cho UPDATE category", 400);

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
            if (!updatedCat) fail("Category không tồn tại để cập nhật", 404);
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

    if (action === "delete") {
        if (!targetId) fail("Thiếu targetId cho DELETE category", 400);
        await Store.updateOne(
            { _id: storeId },
            { $pull: { categories: { categoryId: targetId } } },
            { session }
        );
        // Optional: vô hiệu hoá global
        // await Category.updateOne({ _id: targetId }, { $set: { status: "unavailable" } }, { session });
        return;
    }
}

//! Xử lí khi Admin phê duyệt request liên quan đến topping
if (entity === "topping") {
    if (action === "create") {
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

    if (action === "update") {
        if (!targetId) fail("Thiếu targetId cho UPDATE topping", 400);

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
            if (!updatedTop) fail("Topping không tồn tại để cập nhật", 404);
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

    if (action === "delete") {
        if (!targetId) fail("Thiếu targetId cho DELETE topping", 400);
        await Store.updateOne(
            { _id: storeId },
            { $pull: { toppings: { toppingId: targetId } } },
            { session }
        );
        // Optional: vô hiệu hoá global
        // await Topping.updateOne({ _id: targetId }, { $set: { status: "unavailable" } }, { session });
        return;
    }
}