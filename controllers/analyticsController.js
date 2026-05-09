import Result from "../models/Result.js";
import mongoose from "mongoose";

const toObjectId = (id) => new mongoose.Types.ObjectId(id);
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const PASS_MARK = 50;

// ==============================
// TOP CANDIDATES (HRORBN)
// ==============================
export const getTopCandidates = async (req, res) => {
  try {
    const { examId, limit = 10 } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    const top = await Result.find({
      examId: toObjectId(examId),
      isResit: false, // ✅ EXCLUDE RESIT
    })
      .sort({ average: -1 })
      .limit(Number(limit))
      .lean();

    res.json(top);
  } catch (err) {
    console.error("getTopCandidates error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// SCORE DISTRIBUTION (HRORBN)
// ==============================
export const getScoreDistribution = async (req, res) => {
  try {
    const { examId, month, year } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    const match = {
      examId: toObjectId(examId),
      isResit: false, // ✅ IMPORTANT
      ...(month && { month }),
      ...(year && { year }),
    };

    const distribution = await Result.aggregate([
      { $match: match },
      {
        $bucket: {
          groupBy: "$average",
          boundaries: [0, 40, 50, 60, 70, 100],
          default: "others",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    res.json(distribution);
  } catch (err) {
    console.error("getScoreDistribution error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// DASHBOARD STATS (HRORBN)
// ==============================
export const getDashboardStats = async (req, res) => {
  try {
    const { examId, departmentCode, programmeLevel, month, year } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({
        message: "Valid examId is required",
      });
    }

    const baseMatch = {
      examId: toObjectId(examId),
      ...(departmentCode && { departmentCode }),
      ...(programmeLevel && { programmeLevel }),
      ...(month && { month }),
      ...(year && { year }),
    };

    // =========================
    // ACTIVE CANDIDATE STATS
    // (Exclude resit from averages/ranking metrics)
    // =========================
    const stats = await Result.aggregate([
      {
        $match: {
          ...baseMatch,
          isResit: false,
        },
      },
      {
        $group: {
          _id: null,

          activeCandidates: { $sum: 1 },

          avgScore: { $avg: "$average" },

          maxScore: { $max: "$average" },

          minScore: { $min: "$average" },
        },
      },
    ]);

    const base = stats[0] || {
      activeCandidates: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
    };

    // =========================
    // RESIT COUNT
    // =========================
    const resitCandidates = await Result.countDocuments({
      ...baseMatch,
      isResit: true,
    });

    // =========================
    // OVERALL PASS COUNT
    // (ACTIVE + RESIT)
    // =========================
    const overallPassStats = await Result.aggregate([
      {
        $match: baseMatch,
      },
      {
        $group: {
          _id: null,

          totalCandidates: { $sum: 1 },

          passCount: {
            $sum: {
              $cond: [{ $gte: ["$average", PASS_MARK] }, 1, 0],
            },
          },
        },
      },
    ]);

    const overall = overallPassStats[0] || {
      totalCandidates: 0,
      passCount: 0,
    };

    const failCount = overall.totalCandidates - overall.passCount;

    const passRate = overall.totalCandidates
      ? (overall.passCount / overall.totalCandidates) * 100
      : 0;

    return res.json({
      // population
      totalCandidates: overall.totalCandidates,
      activeCandidates: base.activeCandidates,
      resitCandidates,

      // performance
      avgScore: Number((base.avgScore || 0).toFixed(2)),
      maxScore: base.maxScore,
      minScore: base.minScore,

      // pass/fail
      passCount: overall.passCount,
      failCount,

      passRate: Number(passRate.toFixed(2)),
    });
  } catch (err) {
    console.error("dashboard error:", err);

    res.status(500).json({
      message: err.message,
    });
  }
};

// ==============================
// SCORE BAND ANALYSIS (HRORBN)
// ==============================
export const getScoreBandAnalysis = async (req, res) => {
  try {
    const { examId } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    const bands = await Result.aggregate([
      {
        $match: {
          examId: toObjectId(examId),
          isResit: false, // ✅ IMPORTANT
        },
      },
      {
        $bucket: {
          groupBy: "$average",
          boundaries: [0, 50, 60, 70, 101],
          default: "others",
          output: {
            count: { $sum: 1 },
          },
        },
      },
    ]);

    const result = {
      fail: 0,
      pass: 0,
      credit: 0,
      distinction: 0,
    };

    bands.forEach((b) => {
      if (b._id === 0) result.fail = b.count;
      if (b._id === 50) result.pass = b.count;
      if (b._id === 60) result.credit = b.count;
      if (b._id === 70) result.distinction = b.count;
    });

    const total =
      result.fail + result.pass + result.credit + result.distinction;

    res.json({
      total,
      bands: result,
      percentages: {
        fail: total ? ((result.fail / total) * 100).toFixed(2) : 0,
        pass: total ? ((result.pass / total) * 100).toFixed(2) : 0,
        credit: total ? ((result.credit / total) * 100).toFixed(2) : 0,
        distinction: total
          ? ((result.distinction / total) * 100).toFixed(2)
          : 0,
      },
    });
  } catch (err) {
    console.error("Score band error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// PROGRAMME ANALYTICS (HRORBN)
// ==============================
export const getProgrammeAnalytics = async (req, res) => {
  try {
    const { examId } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    const match = {
      examId: toObjectId(examId),
      isResit: false, // ✅ IMPORTANT
    };

    const total = await Result.countDocuments(match);

    const programmes = await Result.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$programmeLevel",
          count: { $sum: 1 },
          avgScore: { $avg: "$average" },

          passCount: {
            $sum: {
              $cond: [{ $gte: ["$average", PASS_MARK] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          passRate: {
            $multiply: [{ $divide: ["$passCount", "$count"] }, 100],
          },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          programme: "$_id",
          count: 1,
          avgScore: { $round: ["$avgScore", 2] },
          passRate: { $round: ["$passRate", 2] },
          percentage: {
            $round: [{ $multiply: [{ $divide: ["$count", total] }, 100] }, 2],
          },
        },
      },
    ]);

    res.json({
      total,
      programmes,
    });
  } catch (err) {
    console.error("getProgrammeAnalytics error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// PROGRAMME DETAILS (HRORBN)
// ==============================
export const getProgrammeDetails = async (req, res) => {
  try {
    const { examId, programme } = req.query; // Changed from programmeLevel to programme

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ 
        success: false,
        message: "Valid examId is required" 
      });
    }

    if (!programme) {
      return res.status(400).json({ 
        success: false,
        message: "Programme name is required" 
      });
    }

    const data = await Result.aggregate([
      {
        $match: {
          examId: toObjectId(examId),
          programmeLevel: programme, // Match the programme name
          // Don't filter by isResit only - include both active and resit for complete picture
        },
      },
      {
        $group: {
          _id: "$programmeLevel",
          totalCandidates: { $sum: 1 },
          activeCandidates: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                1, 0
              ],
            },
          },
          resitCandidates: {
            $sum: {
              $cond: [{ $eq: ["$isResit", true] }, 1, 0],
            },
          },
          avgScore: { 
            $avg: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                "$average", null
              ],
            },
          },
          highestScore: { 
            $max: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                "$average", null
              ],
            },
          },
          lowestScore: { 
            $min: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                "$average", null
              ],
            },
          },
          passCount: {
            $sum: {
              $cond: [{ $gte: ["$average", PASS_MARK] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          failCount: { $subtract: ["$totalCandidates", "$passCount"] },
          passRate: {
            $cond: [
              { $gt: ["$totalCandidates", 0] },
              { $multiply: [{ $divide: ["$passCount", "$totalCandidates"] }, 100] },
              0
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          programme: "$_id",
          totalCandidates: 1,
          activeCandidates: 1,
          resitCandidates: 1,
          passCount: 1,
          failCount: 1,
          avgScore: { $round: [{ $ifNull: ["$avgScore", 0] }, 2] },
          highestScore: { $round: [{ $ifNull: ["$highestScore", 0] }, 2] },
          lowestScore: { $round: [{ $ifNull: ["$lowestScore", 0] }, 2] },
          passRate: { $round: [{ $ifNull: ["$passRate", 0] }, 2] },
        },
      },
    ]);

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No data found for this programme",
        programme: null,
      });
    }

    return res.json({
      success: true,
      programme: data[0],
    });
  } catch (err) {
    console.error("getProgrammeDetails error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
// ==============================
// SCORE TREND (HRORBN)
// ==============================
export const getScoreTrend = async (req, res) => {
  try {
    const { examId } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    const trend = await Result.aggregate([
      {
        $match: {
          examId: toObjectId(examId),
          isResit: false, // ✅ IMPORTANT
        },
      },
      {
        $group: {
          _id: "$createdAt",
          averageScore: { $avg: "$average" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          averageScore: { $round: ["$averageScore", 2] },
          count: 1,
        },
      },
    ]);

    res.json({ data: trend });
  } catch (err) {
    console.error("score trend error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ==============================
// COMPARE EXAMS (HRORBN)
// ==============================
export const compareExams = async (req, res) => {
  try {
    const { examIds, departmentCode, programmeLevel, month, year } = req.body;

    if (!examIds || examIds.length < 2) {
      return res.status(400).json({
        message: "Provide at least 2 examIds",
      });
    }

    const matchBase = {
      examId: { $in: examIds.map(toObjectId) },
      isResit: false, // ✅ IMPORTANT
      ...(departmentCode && { departmentCode }),
      ...(programmeLevel && { programmeLevel }),
      ...(month && { month }),
      ...(year && { year }),
    };

    const results = await Result.find(matchBase).lean();

    const examMap = {};

    results.forEach((r) => {
      const id = r.examId.toString();

      if (!examMap[id]) {
        examMap[id] = {
          total: 0,
          pass: 0,
          fail: 0,
          scores: [],
          departments: new Set(),
          programmes: new Set(),
        };
      }

      const bucket = examMap[id];

      bucket.total += 1;
      bucket.scores.push(r.average);

      if (r.departmentCode) bucket.departments.add(r.departmentCode);
      if (r.programmeLevel) bucket.programmes.add(r.programmeLevel);

      if (r.average >= PASS_MARK) bucket.pass += 1;
      else bucket.fail += 1;
    });

    const comparison = Object.entries(examMap).map(([examId, data]) => {
      const avgScore =
        data.scores.reduce((a, b) => a + b, 0) / data.scores.length;

      const passRate = (data.pass / data.total) * 100;

      const performanceIndex = avgScore * 0.7 + passRate * 0.3;

      return {
        examId,
        totalCandidates: data.total,
        avgScore: Number(avgScore.toFixed(2)),
        passRate: Number(passRate.toFixed(2)),
        failRate: Number(((data.fail / data.total) * 100).toFixed(2)),
        performanceIndex: Number(performanceIndex.toFixed(2)),

        departments: Array.from(data.departments),
        programmes: Array.from(data.programmes),
      };
    });

    res.json({ comparison });
  } catch (err) {
    console.error("compareExams error:", err);
    res.status(500).json({ message: err.message });
  }
};


// ==============================
// TOP 10 DEPARTMENTS (HRORBN)
// ==============================
export const getTopDepartments = async (req, res) => {
  try {
    const { examId, limit = 10, month, year, programmeLevel } = req.query;

    if (!examId || !isValidId(examId)) {
      return res.status(400).json({
        success: false,
        message: "Valid examId is required",
      });
    }

    const match = {
      examId: toObjectId(examId),
      ...(month && { month: parseInt(month) }),
      ...(year && { year: parseInt(year) }),
      ...(programmeLevel && { programmeLevel }),
    };

    const departments = await Result.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$department",
          totalCandidates: { $sum: 1 },
          activeCandidates: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                1, 0
              ],
            },
          },
          resitCandidates: {
            $sum: { $cond: [{ $eq: ["$isResit", true] }, 1, 0] },
          },
          passCount: {
            $sum: { $cond: [{ $gte: ["$average", PASS_MARK] }, 1, 0] },
          },
          avgScore: {
            $avg: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                "$average", null
              ],
            },
          },
          maxScore: {
            $max: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                "$average", null
              ],
            },
          },
        },
      },
      {
        $match: {
          _id: { $nin: [null, "", "UNKNOWN"] },
        },
      },
      {
        $addFields: {
          passRate: {
            $cond: [
              { $gt: ["$totalCandidates", 0] },
              { $multiply: [{ $divide: ["$passCount", "$totalCandidates"] }, 100] },
              0
            ],
          },
          failCount: { $subtract: ["$totalCandidates", "$passCount"] },
        },
      },
      { $sort: { passRate: -1, avgScore: -1, totalCandidates: -1 } },
      { $limit: Number(limit) },
      {
        $project: {
          _id: 0,
          department: "$_id",
          totalCandidates: 1,
          activeCandidates: 1,
          resitCandidates: 1,
          passCount: 1,
          failCount: 1,
          avgScore: { $round: [{ $ifNull: ["$avgScore", 0] }, 2] },
          maxScore: { $round: [{ $ifNull: ["$maxScore", 0] }, 2] },
          passRate: { $round: [{ $ifNull: ["$passRate", 0] }, 2] },
        },
      },
    ]);

    return res.json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (err) {
    console.error("getTopDepartments error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// Add this function to get single department details
export const getDepartmentDetails = async (req, res) => {
  try {
    const { examId, department } = req.query;

    if (!examId || !isValidId(examId) || !department) {
      return res.status(400).json({
        success: false,
        message: "Valid examId and department are required",
      });
    }

    const match = {
      examId: toObjectId(examId),
      department: department,
    };

    const stats = await Result.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$department",
          totalCandidates: { $sum: 1 },
          activeCandidates: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$isResit", false] }, { $eq: ["$isResit", null] }] },
                1, 0
              ],
            },
          },
          resitCandidates: {
            $sum: { $cond: [{ $eq: ["$isResit", true] }, 1, 0] },
          },
          passCount: {
            $sum: { $cond: [{ $gte: ["$average", PASS_MARK] }, 1, 0] },
          },
          avgScore: { $avg: "$average" },
          highestScore: { $max: "$average" },
          lowestScore: { $min: "$average" },
        },
      },
      {
        $addFields: {
          passRate: {
            $cond: [
              { $gt: ["$totalCandidates", 0] },
              { $multiply: [{ $divide: ["$passCount", "$totalCandidates"] }, 100] },
              0
            ],
          },
          failCount: { $subtract: ["$totalCandidates", "$passCount"] },
        },
      },
      {
        $project: {
          _id: 0,
          department: "$_id",
          totalCandidates: 1,
          activeCandidates: 1,
          resitCandidates: 1,
          passCount: 1,
          failCount: 1,
          avgScore: { $round: [{ $ifNull: ["$avgScore", 0] }, 2] },
          highestScore: { $round: [{ $ifNull: ["$highestScore", 0] }, 2] },
          lowestScore: { $round: [{ $ifNull: ["$lowestScore", 0] }, 2] },
          passRate: { $round: [{ $ifNull: ["$passRate", 0] }, 2] },
        },
      },
    ]);

    return res.json({
      success: true,
      department: stats[0] || null,
    });
  } catch (err) {
    console.error("getDepartmentDetails error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
