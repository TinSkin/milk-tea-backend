import express from 'express';
import {
    getAllToppings,
    createTopping,
    updateTopping,
    softDeleteTopping,
} from '../controllers/topping.controller.js';
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkAdminRole } from "../middlewares/checkRole.js";

const router = express.Router();

//! Get all toppings with sorting & pagination route
router.get('/', getAllToppings);

//! Admin only routes
router.post("/", verifyToken, checkAdminRole, createTopping);
router.put("/:id", verifyToken, checkAdminRole, updateTopping);
router.post("/:id/soft-delete", verifyToken, checkAdminRole, softDeleteTopping);

export default router;
