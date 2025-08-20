// netlify/functions/login.js
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
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const RATE_LIMIT_FILE = path.join(__dirname, "login-rate-limit.json");
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
function checkRateLimit(ip) {
  let limits = {};
  if (fs.existsSync(RATE_LIMIT_FILE)) {
    try {
      limits = JSON.parse(fs.readFileSync(RATE_LIMIT_FILE, "utf8"));
    } catch (e) { limits = {}; }
  }
  const now = Date.now();
  if (!limits[ip]) limits[ip] = [];
  limits[ip] = limits[ip].filter(ts => now - ts < RATE_LIMIT_WINDOW);
  if (limits[ip].length >= RATE_LIMIT_MAX) return false;
  limits[ip].push(now);
  fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(limits));
  return true;
}

const JWT_SECRET = 2027; // Use same secret as verify-payment.js

exports.handler = async function(event, context) {
  const ip = event.headers["x-forwarded-for"] || "local";
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      body: JSON.stringify({ success: false, message: "Too many login attempts. Please try again later." })
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid request body" })
    };
  }

  const { email, password } = body;
  if (!email || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Email and password required" })
    };
  }

  const usersFile = path.join(__dirname, "users.json");
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } catch (e) {
      users = [];
    }
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Email not registered" })
    };
  }

  if (!user.verified) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Email not verified. Please check your inbox." })
    };
  }

  if (!bcrypt.compareSync(password, user.password)) {
    logEvent("login_failed", { email });
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Incorrect password" })
    };
  }

  // Credentials correct, generate JWT
  logEvent("login_success", { email });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, token })
  };
};
