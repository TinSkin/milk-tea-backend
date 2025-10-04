import express from 'express';
import {
    getAllToppings,
    createTopping,
    updateTopping,
    softDeleteTopping,
    deleteTopping,
} from '../controllers/topping.controller.js';
import { verifyToken } from "../middlewares/verifyToken.js";
import { checkAdminRole } from "../middlewares/checkRole.js";

const router = express.Router();

//! Public routes (no authentication required)
router.get('/', getAllToppings);

//! Admin only routes
router.post("/", verifyToken, checkAdminRole, createTopping);
router.put("/:id", verifyToken, checkAdminRole, updateTopping);
router.post("/:id/soft-delete", verifyToken, checkAdminRole, softDeleteTopping);
router.delete("/:id", verifyToken, checkAdminRole, deleteTopping);

export default router;
