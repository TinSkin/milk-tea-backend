import express from "express";
import {
    getProvinces,
    getProvinceByCode,
    getDistrictByCode,
} from "../../controllers/logistic/address.controller.js";

const router = express.Router();

//! Public routes (không cần đăng nhập)
router.get("/provinces", getProvinces); // Lấy danh sách tỉnh/thành
router.get("/provinces/:code", getProvinceByCode); // Lấy chi tiết 1 tỉnh theo code (và danh sách huyện nếu depth >= 2)
router.get("/districts/:code", getDistrictByCode); // Lấy chi tiết 1 huyện theo code (và danh sách xã nếu depth >= 2)

export default router;
