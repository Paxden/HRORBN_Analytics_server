// routes/AuthRoutes.js
import express from "express";
import { signup, login, getProfile,  checkAuth } from "../controllers/AuthController.js";
import { protect } from "../middleware/AuthMiddleware.js";


const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", protect, getProfile);
router.get("/check-auth", protect, checkAuth);

export default router;