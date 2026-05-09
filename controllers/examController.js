import Exam from "../models/Exam.js";
import Result from "../models/Result.js";
import { processCSV } from "../utilis/csvProcessor.js";
import fs from "fs";

// ==============================
// Get all exams for current user
// ==============================
export const getUserExams = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const exams = await Exam.find({
      uploadedBy: req.user.id,
    }).sort({ createdAt: -1 });

    const formattedExams = await Promise.all(
      exams.map(async (exam) => {
        const count = await Result.countDocuments({
          examId: exam._id,
        });

        const passCount = await Result.countDocuments({
          examId: exam._id,
          status: "PASS",
        });

        const failCount = await Result.countDocuments({
          examId: exam._id,
          status: "FAIL",
        });

        return {
          _id: exam._id.toString(),
          title: exam.title,
          createdAt: exam.createdAt,
          date: exam.date,
          resultCount: count,
          passCount,
          failCount,
        };
      }),
    );

    res.json({
      success: true,
      exams: formattedExams,
    });
  } catch (error) {
    console.error("Get exams error:", error);
    res.status(500).json({ message: "Failed to fetch exams" });
  }
};

// ==============================
// Upload Exam Results CSV
// ==============================
export const uploadExamResults = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title } = req.body;

    if (!title) {
      return res.status(400).json({
        message: "Title is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required",
      });
    }

    // Create exam first
    const exam = await Exam.create({
      title,
      date: new Date(),
      uploadedBy: req.user.id,
    });

    // Parse CSV
    const parsedResults = await processCSV(req.file.path);

    if (!parsedResults.length) {
      fs.unlinkSync(req.file.path);

      return res.status(400).json({
        message: "No valid results found in CSV",
      });
    }

    // Attach examId
    const resultsWithExam = parsedResults.map((row) => ({
      ...row,
      examId: exam._id,
    }));

    // Save all results
    await Result.insertMany(resultsWithExam);

    // Remove uploaded temp file
    fs.unlinkSync(req.file.path);

    // Summary
    const passCount = resultsWithExam.filter((r) => r.status === "PASS").length;

    const failCount = resultsWithExam.filter((r) => r.status === "FAIL").length;

    const avgScore =
      resultsWithExam.reduce((sum, r) => sum + Number(r.average || 0), 0) /
      resultsWithExam.length;

    res.json({
      success: true,
      message: "Results uploaded successfully",

      examId: exam._id.toString(),
      count: resultsWithExam.length,
      passCount,
      failCount,
      avgScore: Number(avgScore.toFixed(1)),

      exam: {
        _id: exam._id.toString(),
        title: exam.title,
        createdAt: exam.createdAt,
      },
    });
  } catch (error) {
    console.error("Upload failed:", error);
    res.status(500).json({
      message: "Upload failed",
    });
  }
};

// ==============================
// Get Single Exam
// ==============================
export const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    const totalCandidates = await Result.countDocuments({
      examId: exam._id,
    });

    const passCount = await Result.countDocuments({
      examId: exam._id,
      status: "PASS",
    });

    const failCount = await Result.countDocuments({
      examId: exam._id,
      status: "FAIL",
    });

    res.json({
      success: true,
      exam: {
        ...exam.toObject(),
        totalCandidates,
        passCount,
        failCount,
      },
    });
  } catch (error) {
    console.error("Get exam error:", error);
    res.status(500).json({
      message: "Failed to fetch exam",
    });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findOne({
      _id: req.params.id,
      uploadedBy: req.user.id,
    });

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found",
      });
    }

    // delete all results linked to exam
    await Result.deleteMany({ examId: exam._id });

    // delete exam
    await exam.deleteOne();

    res.json({
      success: true,
      message: "Exam and results deleted successfully",
    });
  } catch (error) {
    console.error("Delete exam error:", error);
    res.status(500).json({
      message: "Failed to delete exam",
    });
  }
};
