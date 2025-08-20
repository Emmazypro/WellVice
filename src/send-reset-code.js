// netlify/functions/send-reset-code.js
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

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

  const { email } = body;
  if (!email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Email required" })
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
      statusCode: 404,
      body: JSON.stringify({ success: false, message: "Email not registered" })
    };
  }

  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store code in reset-codes.json
  const codesFile = path.join(__dirname, "reset-codes.json");
  let codes = {};
  if (fs.existsSync(codesFile)) {
    try {
      codes = JSON.parse(fs.readFileSync(codesFile, "utf8"));
    } catch (e) {
      codes = {};
    }
  }
  codes[email] = code;
  fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));

  // Send code via Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "MediPal Password Reset Code",
    text: `Your password reset code is: ${code}`
  };

  try {
    await transporter.sendMail(mailOptions);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Reset code sent" })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Failed to send email" })
    };
  }
};
