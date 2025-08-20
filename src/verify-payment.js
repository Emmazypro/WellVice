// server.js
const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
function logEvent(type, details) {
  const logFile = path.join(__dirname, "logs.json");
  let logs = [];
  if (fs.existsSync(logFile)) {
    try { logs = JSON.parse(fs.readFileSync(logFile, "utf8")); } catch (e) { logs = []; }
  }
  logs.push({ timestamp: new Date().toISOString(), type, details });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
}
// Utility to add admin user if not present
const bcrypt = require("bcryptjs");
const usersFile = path.join(__dirname, "users.json");
let users = [];
if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  } catch (e) { users = []; }
} else {
  users = [];
}
const adminEmail = "owolobi28@gmail.com";
const adminPassword = "Dorana19#";
if (!users.some(u => u.email === adminEmail && u.isAdmin)) {
  users.push({
    email: adminEmail,
    password: bcrypt.hashSync(adminPassword, 10),
    isAdmin: true,
    verified: true
  });
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===== Replace with your actual Paystack secret key =====
const PAYSTACK_SECRET_KEY = sk_live_53a7100c626dd5ebcced97655a95b5c934af97d4;

// ===== Replace with your own JWT secret =====
const JWT_SECRET = 2027;

app.use(bodyParser.json());

// ===== Paystack transaction verification endpoint =====
app.post("/verify-payment", async (req, res) => {
  const { reference, email, password } = req.body;
  if (!reference || !email || !password) {
    return res.status(400).json({ message: "Reference, email, and password required" });
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data;

    if (data.status && data.data.status === "success") {
      logEvent("signup", { email });
      // Payment confirmed, store user credentials
      const usersFile = path.join(__dirname, "users.json");
      let users = [];
      if (fs.existsSync(usersFile)) {
        try {
          users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
        } catch (e) {
          users = [];
        }
      }
      // Check for duplicate email
      if (users.some(u => u.email === email)) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      users.push({ email, password: hashedPassword, verified: false, verificationToken });
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));

      // Send verification email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });
      const verifyUrl = `${req.protocol}://${req.get("host")}/.netlify/functions/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Verify your MediPal account",
        text: `Welcome to MediPal! Please verify your email by clicking this link: ${verifyUrl}`
      };
      try {
        await transporter.sendMail(mailOptions);
      } catch (err) {
        console.error("Verification email failed:", err);
      }

      return res.json({ success: true, message: "Signup successful! Please check your email to verify your account." });
    } else {
      return res.status(400).json({ success: false, message: "Payment not verified" });
    }
  } catch (error) {
    logEvent("error", { error: error.response ? error.response.data : error.message, endpoint: "verify-payment" });
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// ===== Protected route example =====
app.get("/dashboard", authenticateJWT, (req, res) => {
  res.json({ message: `Welcome ${req.user.email}, you have access!` });
});

// ===== JWT authentication middleware =====
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
