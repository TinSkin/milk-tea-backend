import express from "express";
import { autocompletePlace } from "../../controllers/logistic/autocomplete.controller.js";

const router = express.Router();

//! Public routes (không cần đăng nhập)
router.get("/autocomplete-place", autocompletePlace); // Gợi ý địa điểm theo text người dùng nhập (OpenMaps API)

export default router;
