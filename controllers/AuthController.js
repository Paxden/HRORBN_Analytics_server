// controllers/AuthController.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// generate token
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// ==========================
// 🔓 SIGNUP
// ==========================
export const signup = async (req, res) => {
  try {
    const user = await User.create(req.body);

    const token = generateToken(user);

    res.json({
      message: "Signup successful",
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ==========================
// 🔐 LOGIN
// ==========================
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
      },
    });
    
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ==========================
// 👤 PROFILE
// ==========================
export const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
};


export const checkAuth = (req, res) => {
  res.json({
    user: req.user
  });
};