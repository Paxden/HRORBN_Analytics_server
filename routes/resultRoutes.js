import express from "express";
import { getResults } from "../controllers/resultController.js";
import { protect } from "../middleware/AuthMiddleware.js"; 

const router = express.Router();

router.use(protect);

router.get("/", getResults);

export default router;