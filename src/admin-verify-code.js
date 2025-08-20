// netlify/functions/admin-verify-code.js
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || 2027;
const admins = [
  { name: "Kelvin", email: "owolobi28@gmail.com" },
  { name: "Emmazy", email: "emmazypro721@gmail.com" }
];

exports.handler = async function(event, context) {
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
  const { adminEmail, code } = body;
  if (!adminEmail || !code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Email and code required" })
    };
  }
  // Check admin
  if (!admins.some(a => a.email === adminEmail)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Not an admin" })
    };
  }
  // Check code
  const codesFile = path.join(__dirname, "admin-codes.json");
  let codes = {};
  if (fs.existsSync(codesFile)) {
    try {
      codes = JSON.parse(fs.readFileSync(codesFile, "utf8"));
    } catch (e) { codes = {}; }
  }
  if (codes[adminEmail] && codes[adminEmail] === code) {
    // Remove code after verification
    delete codes[adminEmail];
    fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
    // Issue admin JWT
    const token = jwt.sign({ email: adminEmail, isAdmin: true }, JWT_SECRET, { expiresIn: "1d" });
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, token })
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Invalid code" })
    };
  }
};
