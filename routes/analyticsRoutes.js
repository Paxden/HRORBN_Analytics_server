import express from "express";
import {
  getDashboardStats,
  getTopCandidates,
  getScoreDistribution,
  compareExams,
  getScoreBandAnalysis,
  getProgrammeAnalytics,
  getProgrammeDetails,
  getScoreTrend,
  getTopDepartments,
  getDepartmentDetails,
  // ✅ move logic to controller
} from "../controllers/analyticsController.js";

import { protect } from "../middleware/AuthMiddleware.js";

const router = express.Router();

// 🔐 Protect all routes
router.use(protect);

// ==============================
// 📊 CORE DASHBOARD
// ==============================
router.get("/stats", getDashboardStats);
router.get("/distribution", getScoreDistribution);
router.get("/score-bands", getScoreBandAnalysis);

// ==============================
// 🏆 PERFORMANCE
// ==============================
router.get("/top-candidates", getTopCandidates);
// router.get("/top-candidates-by-school", getTopCandidatesBySchool);

// ==============================
// 📘 PROGRAMMES
// ==============================
router.get("/programme-analytics", getProgrammeAnalytics);
router.get("/programme-details", getProgrammeDetails);
router.get("/top-10-departments", getTopDepartments);
// Get department details
router.get('/department-details', getDepartmentDetails);

// ==============================
// 📈 TRENDS
// ==============================
router.get("/score-trend", getScoreTrend);

// ==============================
// 🔄 COMPARISON
// ==============================
router.post("/compare", compareExams);

export default router;
