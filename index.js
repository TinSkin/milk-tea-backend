import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

// Connect Database
import { connectDB } from './db/connectDB.js'

// Import routes
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import categoryRoutes from "./routes/category.route.js";
import toppingRoutes from "./routes/topping.route.js";
import userRoutes from "./routes/user.route.js";

dotenv.config()

const app = express();
const PORT = process.env.PORT || 5000; // PORT from .env or fallback to default PORT 5000

//! CORS 
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
app.use(cookieParser()); // allows us to parse incoming cookies

//! All routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/toppings", toppingRoutes);
app.use("/api/users", userRoutes);

app.listen(PORT, () => {
    //! Connect to MongoDB function
    connectDB();

    //! Console log to check server's running and run on which PORT 
    console.log(`Server is running on port: ${PORT}`);
})
