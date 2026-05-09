import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  title: String,
  date: Date,
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }
}, { timestamps: true });

export default mongoose.model("Exam", examSchema);