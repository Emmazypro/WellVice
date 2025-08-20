// netlify/functions/admin-payments.js
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
  // For demo, payments can be stored in payments.json
  const paymentsFile = path.join(__dirname, "payments.json");
  let payments = [];
  if (fs.existsSync(paymentsFile)) {
    try {
      payments = JSON.parse(fs.readFileSync(paymentsFile, "utf8"));
    } catch (e) { payments = []; }
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, payments })
  };
};
