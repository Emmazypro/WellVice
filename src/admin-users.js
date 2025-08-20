// netlify/functions/admin-users.js
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
  const usersFile = path.join(__dirname, "users.json");
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } catch (e) { users = []; }
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, users })
  };
};
