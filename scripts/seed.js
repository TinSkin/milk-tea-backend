import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import Category from '../models/Category.model.js';
import Topping from '../models/Topping.model.js';
import Product from '../models/Product.model.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//! Seed data for categories, toppings, and products
const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Đã kết nối MongoDB');

        // Read JSON files
        const categories = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/category.json')));
        const toppings = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/topping.json')));
        const products = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/product.json')));

        // Clear existing data
        await Category.deleteMany();
        await Topping.deleteMany();
        await Product.deleteMany();

        // Seed Category and Topping first
        const seededCategories = await Category.insertMany(categories);
        const seededToppings = await Topping.insertMany(toppings);

        // Create lookup maps for ObjectId conversion
        const categoryMap = {};
        seededCategories.forEach(cat => {
            categoryMap[cat.name] = cat._id;
        });

        console.log(`Đã seed ${seededCategories.length} categories`);

        const toppingMap = {};
        seededToppings.forEach(topping => {
            toppingMap[topping.name] = topping._id;
        });

        console.log(`Đã seed ${seededToppings.length} toppings`);

        // Convert products with proper ObjectId references
        const convertedProducts = products.map(product => ({
            ...product,
            category: categoryMap[product.category],
            toppings: product.toppings.map(toppingName => toppingMap[toppingName]).filter(Boolean)
        }));

        // Seed products
        const seededProducts = await Product.insertMany(convertedProducts);
        console.log(`Đã seed ${seededProducts.length} products`);

        console.log('Đã seed dữ liệu mẫu thành công!');
        process.exit(0);
    } catch (error) {
        console.error('Lỗi khi seed:', error);
        process.exit(1);
    }
};

seedData();
