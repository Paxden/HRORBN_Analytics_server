import express from "express";
import upload from "../middleware/upload.js";
import {
  uploadExamResults,
  getUserExams,
  getExamById,
  deleteExam,
} from "../controllers/examController.js";
import { protect } from "../middleware/AuthMiddleware.js";

const router = express.Router();

// Get all exams for the user
router.get("/", protect, getUserExams);

// Get single exam
router.get("/:id", getExamById);

router.post("/upload", protect, upload.single("file"), uploadExamResults);

// ==============================
// Delete exam
// ==============================
router.delete("/:id", protect, deleteExam);

export default router;
