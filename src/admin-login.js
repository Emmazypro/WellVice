// netlify/functions/admin-login.js
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
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
  const { adminName, adminEmail, password } = body;
  if (!adminName || !adminEmail || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "All fields required" })
    };
  }
  // Check admin
  if (!admins.some(a => a.name.toLowerCase() === adminName.toLowerCase() && a.email === adminEmail)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Not an admin" })
    };
  }
  // Check password
  const usersFile = path.join(__dirname, "users.json");
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } catch (e) { users = []; }
  }
  const user = users.find(u => u.email === adminEmail && u.isAdmin);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Incorrect password" })
    };
  }
  // Generate code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // Store code
  const codesFile = path.join(__dirname, "admin-codes.json");
  let codes = {};
  if (fs.existsSync(codesFile)) {
    try {
      codes = JSON.parse(fs.readFileSync(codesFile, "utf8"));
    } catch (e) { codes = {}; }
  }
  codes[adminEmail] = code;
  fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
  // Send code
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: adminEmail,
    subject: "MediPal Admin Verification Code",
    text: `Your admin verification code is: ${code}`
  };
  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Verification code sent" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Failed to send email" })
    };
  }
};
