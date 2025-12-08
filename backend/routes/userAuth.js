// routes/userAuth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Setup multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Unique filename: user_{timestamp}.ext
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `user_${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

// Middleware: Authenticate Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  
  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const secret = process.env.JWT_SECRET || "your_jwt_secret_here";
    const payload = jwt.verify(token, secret);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
}

// ---------------------------------------------------------
// IMAGE SERVING ROUTE (Self-contained fix)
// ---------------------------------------------------------
router.get("/profile-image/:filename", (req, res) => {
  const filepath = path.join(process.cwd(), UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ message: "Image not found" });
  }
});

// ---------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { fullName, username, email, password, phone, address } = req.body;

  try {
    if (!fullName || !username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username or Email already taken" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      photoUrl: "", // Default empty
      phone: phone ? String(phone).trim() : "",
      address: address ? String(address).trim() : "",
    });

    await newUser.save();

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        phone: newUser.phone,
        address: newUser.address,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Server error during signup" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const secret = process.env.JWT_SECRET || "your_jwt_secret_here";
    const payload = { id: user._id, username: user.username };
    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        photoUrl: user.photoUrl,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl,
        phone: user.phone,
        address: user.address,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("GET /me error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/auth/me
 * Update profile (fullName, photo, phone, address). Protected.
 */
router.put("/me", authenticateToken, upload.single("photo"), async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullName) user.fullName = fullName.trim();

    if (typeof phone !== "undefined") {
      // basic sanitize: store trimmed string (you can add stricter validation if desired)
      user.phone = String(phone).trim();
    }

    if (typeof address !== "undefined") {
      user.address = String(address).trim();
    }

    if (req.file) {
      // 1. Delete old photo if it exists locally
      try {
        if (user.photoUrl && user.photoUrl.includes("/profile-image/")) {
          const oldFilename = user.photoUrl.split("/").pop();
          const oldPath = path.join(process.cwd(), UPLOAD_DIR, oldFilename);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      } catch (e) {
        console.warn("Failed to delete old photo:", e);
      }

      // 2. Save new Path pointing to our custom route
      user.photoUrl = `/api/auth/profile-image/${req.file.filename}`;
    }

    await user.save();

    return res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (err) {
    console.error("PUT /me error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/auth/me
 * Delete current user's profile, photo, and optionally related resources (e.g. chats).
 */
router.delete("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1) delete local profile photo (if we store one)
    try {
      if (user.photoUrl && user.photoUrl.includes("/profile-image/")) {
        const filename = user.photoUrl.split("/").pop();
        const filepath = path.join(process.cwd(), UPLOAD_DIR, filename);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }
    } catch (e) {
      console.warn("Failed to delete user photo file:", e);
      // continue even if file removal fails
    }

    // 2) optionally delete related resources (e.g. chats) if Chat model exists
    try {
      // adjust field name if your Chat model uses a different owner field
      const Chat = require("../models/Chat");
      if (Chat) {
        await Chat.deleteMany({ user: req.userId }).catch((err) => {
          console.warn("Failed to delete user chats:", err);
        });
      }
    } catch (e) {
      // no Chat model available — ignore
    }

    // 3) remove user document
    await User.deleteOne({ _id: req.userId });

    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("DELETE /me error", err);
    return res.status(500).json({ message: "Server error while deleting account" });
  }
});


// ---------------------------------------------------------
// NEW: Fetch users (list) - admin-only
// GET /api/auth/users
// Query params (optional): page, limit, search
// ---------------------------------------------------------
router.get("/users", authenticateToken, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId).select("isAdmin");
    if (!requestingUser) return res.status(404).json({ message: "Requesting user not found" });

    if (!requestingUser.isAdmin) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20")));
    const search = (req.query.search || "").toString().trim();

    const filter = {};
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [{ username: re }, { email: re }, { fullName: re }, { phone: re }];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      total,
      page,
      limit,
      users,
    });
  } catch (err) {
    console.error("GET /users error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ---------------------------------------------------------
// NEW: Fetch a specific user's data
// GET /api/auth/users/:id
// :id can be a user id or "me"
// Accessible to the user themself or an admin
// ---------------------------------------------------------
router.get("/users/:id", authenticateToken, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.userId).select("isAdmin");
    if (!requestingUser) return res.status(404).json({ message: "Requesting user not found" });

    const paramId = req.params.id;
    const targetId = paramId === "me" ? req.userId : paramId;

    if (targetId.toString() !== req.userId.toString() && !requestingUser.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(targetId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("GET /users/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
