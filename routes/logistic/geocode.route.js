import express from "express";
import { testGeocode, geocodeAddress } from "../../controllers/logistic/geocode.controller.js";

const router = express.Router();

//! Public routes (không cần đăng nhập)
router.get("/test-geocode", testGeocode); // Test API geocode (ví dụ: /api/test-geocode?address=Hà%20Nội)
router.get("/geocode", geocodeAddress); // Lấy toạ độ theo địa chỉ (ví dụ: /api/geocode?address=Hà%20Nội)

export default router;
