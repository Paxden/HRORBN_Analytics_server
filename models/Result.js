import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    /** Exam Reference **/
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
    },

    /** Candidate **/
    examNumber: String,

    /** Programme **/
    levelCode: String,
    programmeLevel: String,

    departmentCode: String,
    department: String,

    /** Subjects / Courses **/
    subjects: [
      {
        courseCode: String,
        score: Number,
      },
    ],

    /** Result Summary **/
    totalScore: Number,
    average: Number,
    grade: String,
    status: String,

    isResit: {
      type: Boolean,
      default: false,
    },

    /** Session **/
    month: String,
    year: String,
  },
  { timestamps: true },
);

export default mongoose.model("Result", resultSchema);
