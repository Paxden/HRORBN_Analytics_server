import Result from "../models/Result.js";
import mongoose from "mongoose";

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

export const getResults = async (req, res) => {
  try {
    const {
      examId,
      page = 1,
      limit = 20,
      search = "",
      status,
      resit,
      minScore,
      maxScore,
      sortBy = "average",
      order = "desc",
      department,
      level,
    } = req.query;

    /** ======================
     * Validate examId
     * ====================== */
    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "Valid examId is required" });
    }

    /** ======================
     * Base Query
     * ====================== */
    const query = {
      examId: toObjectId(examId),
    };

    /** ======================
     * SEARCH (HRORBN enhanced)
     * ====================== */
    if (search) {
      query.$or = [
        { examNumber: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { departmentCode: { $regex: search, $options: "i" } },
        { programmeLevel: { $regex: search, $options: "i" } },
      ];
    }

    /** ======================
     * STATUS FILTER (PASS/FAIL/RESIT)
     * ====================== */
    if (status) {
      query.status = status;
    }

    /** ======================
     * RESIT FILTER (HRORBN CORE)
     * ====================== */
    if (resit === "true") {
      query.isResit = true;
    }

    if (resit === "false") {
      query.isResit = false;
    }

    /** ======================
     * STRUCTURE FILTERS
     * ====================== */
    if (department) query.departmentCode = department;
    if (level) query.levelCode = level;

    /** ======================
     * SCORE RANGE FILTER
     * ====================== */
    if (minScore || maxScore) {
      query.average = {};
      if (minScore) query.average.$gte = Number(minScore);
      if (maxScore) query.average.$lte = Number(maxScore);
    }

    /** ======================
     * PAGINATION
     * ====================== */
    const skip = (Number(page) - 1) * Number(limit);

    /** ======================
     * SORTING
     * ====================== */
    const sortOrder = order === "asc" ? 1 : -1;

    const allowedSortFields = [
      "average",
      "totalScore",
      "grade",
      "examNumber",
      "department",
      "programmeLevel",
      "isResit",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "average";

    /** ======================
     * EXECUTE QUERY
     * ====================== */
    const [results, total] = await Promise.all([
      Result.find(query)
        .sort({ [safeSortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      Result.countDocuments(query),
    ]);

    /** ======================
     * RESPONSE
     * ====================== */
    return res.json({
      data: results,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ RESULTS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
};
