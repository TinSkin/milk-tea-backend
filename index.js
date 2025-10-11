import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';

// Kết nối cơ sở dữ liệu
import { connectDB } from './db/connectDB.js'

// Import các route
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import categoryRoutes from "./routes/category.route.js";
import toppingRoutes from "./routes/topping.route.js";
import userRoutes from "./routes/user.route.js";
import storeRoutes from "./routes/store.route.js";
import cartRoutes from "./routes/cart.route.js";
import orderRoutes from "./routes/order.route.js";
import paymentRoutes from "./routes/payment.route.js";
import addressRoutes from "./routes/logistic/address.route.js";
import geocodeRoutes from "./routes/logistic/geocode.route.js";
import autocompleteRoutes from "./routes/logistic/autocomplete.route.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000; // PORT từ .env hoặc fallback về PORT mặc định 5000

//! Cấu hình CORS 
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: [
        "Retry-After",
        "RateLimit-Reset",
        "RateLimit-Remaining",
        "RateLimit-Limit",
        "X-Debug-VerifyToken"
    ]
}));

app.use(express.json());
app.use(cookieParser()); // cho phép chúng ta parse incoming cookies

//! Health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

//! Tất cả các route
// Auth routes
app.use("/api/auth", authRoutes);
// Main routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/toppings", toppingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/cart", cartRoutes)
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
// Logistic routes
app.use("/api", addressRoutes);
app.use("/api", geocodeRoutes);
app.use("/api", autocompleteRoutes);

app.listen(PORT, () => {
    //! Hàm kết nối MongoDB
    connectDB();

    //! Console log để kiểm tra server đang chạy và chạy trên PORT nào 
    console.log(`Server is running on port: ${PORT}`);
})
