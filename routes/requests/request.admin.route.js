import express from "express";
import { verifyToken } from "../../middlewares/verifyToken.js";
import { checkAdminRole } from "../../middlewares/checkRole.js";


const router = express.Router();



export default router;