import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/index.js";
import { authMiddleware } from "../middleware/index.js";

const router = Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      message: "User registered successfully",
      user: { id: user._id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.banned) {
      return res.status(403).json({
        error: "Your account has been banned",
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const tokenData = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
    };

    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;

    res.cookie("authToken", JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user._id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.cookie("authToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  res.json({ success: true, message: "Logged out successfully" });
});

// Get current user
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.banned) {
      res.clearCookie("authToken", { path: "/" });
      return res.status(403).json({
        error: "Your account has been banned",
        banned: true,
        banReason: user.banReason || "No reason provided",
      });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update profile
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const { fullName, avatar } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, avatar },
      { new: true },
    ).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
