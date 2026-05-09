import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

// Routes
import examRoutes from "./routes/examRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import authRoutes from "./routes/AuthRoutes.js";

dotenv.config();

const app = express();

/**
 * ==========================
 * 🔐 ENV VALIDATION (FAIL FAST)
 * ==========================
 */
if (!process.env.PORT) {
  console.warn("⚠️ PORT not defined, defaulting to 5001");
}

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI missing in environment variables");
  process.exit(1);
}

/**
 * ==========================
 * 🧠 DATABASE CONNECTION
 * ==========================
 */
connectDB()
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

/**
 * ==========================
 * 🌍 CORS CONFIG (PRODUCTION SAFE)
 * ==========================
 */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://hrorbn-analytics.vercel.app/",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-to-server or Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

/**
 * ==========================
 * 🧾 BODY PARSING
 * ==========================
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * ==========================
 * 🧪 HEALTH CHECK
 * ==========================
 */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "🚀 NMCN Analytics API is running",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ==========================
 * 📡 ROUTES
 * ==========================
 */
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/analytics", analyticsRoutes);

/**
 * ==========================
 * ❌ 404 HANDLER
 * ==========================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * ==========================
 * ⚠️ GLOBAL ERROR HANDLER
 * ==========================
 */
app.use((err, req, res, next) => {
  console.error("🔥 SERVER ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/**
 * ==========================
 * 🚀 START SERVER (RENDER SAFE)
 * ==========================
 */
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
