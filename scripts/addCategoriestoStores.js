import mongoose from "mongoose";
import Store from "../models/Store.model.js";
import Product from "../models/Product.model.js";
import Category from "../models/Category.model.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

//! Script để thêm categories vào các store documents hiện có
const addCategoriesToStores = async () => {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB successfully");

        // Lấy tất cả stores
        const stores = await Store.find({}).populate('products');
        console.log(`📦 Found ${stores.length} stores to update`);

        for (const store of stores) {
            console.log(`\n🏪 Processing store: ${store.storeName} (${store.storeCode})`);
            
            // Lấy tất cả category IDs từ products của store này
            const productIds = store.products || [];
            console.log(`   📱 Store has ${productIds.length} products`);

            if (productIds.length === 0) {
                console.log(`   ⚠️  Store has no products, skipping...`);
                continue;
            }

            // Lấy products và extract unique category IDs
            const products = await Product.find({ _id: { $in: productIds } }).populate('category');
            const uniqueCategoryIds = [...new Set(
                products
                    .map(product => product.category?._id?.toString())
                    .filter(categoryId => categoryId) // Remove null/undefined
            )];

            console.log(`   🏷️  Found ${uniqueCategoryIds.length} unique categories:`, 
                products.map(p => p.category?.name).filter(Boolean).join(', ')
            );

            // Update store với categories array
            if (uniqueCategoryIds.length > 0) {
                await Store.findByIdAndUpdate(
                    store._id,
                    { $set: { categories: uniqueCategoryIds.map(id => new mongoose.Types.ObjectId(id)) } },
                    { new: true }
                );
                console.log(`   ✅ Updated store with ${uniqueCategoryIds.length} categories`);
            } else {
                console.log(`   ⚠️  No valid categories found for this store`);
            }
        }

        console.log("\n🎉 Migration completed successfully!");
        
        // Verify results
        const updatedStores = await Store.find({}).populate('categories');
        console.log("\n📊 Verification Results:");
        for (const store of updatedStores) {
            console.log(`   ${store.storeName}: ${store.categories?.length || 0} categories`);
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
    }
};

//! Chạy migration
addCategoriesToStores();