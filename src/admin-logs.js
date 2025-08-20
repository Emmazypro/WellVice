// netlify/functions/admin-logs.js
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || 2027;

exports.handler = async function(event, context) {
  const authHeader = event.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Unauthorized" })
    };
  }
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Invalid token" })
    };
  }
  if (!decoded.isAdmin) {
    return {
      statusCode: 403,
      body: JSON.stringify({ success: false, message: "Forbidden" })
    };
  }
  const logFile = path.join(__dirname, "logs.json");
  let logs = [];
  if (fs.existsSync(logFile)) {
    try {
      logs = JSON.parse(fs.readFileSync(logFile, "utf8"));
    } catch (e) { logs = []; }
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, logs })
  };
};
