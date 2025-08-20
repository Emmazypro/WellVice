// netlify/functions/profile.js
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || 2027;

exports.handler = async function(event, context) {
  // Authenticate user
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
  const userEmail = decoded.email;

  const usersFile = path.join(__dirname, "users.json");
  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    } catch (e) {
      users = [];
    }
  }
  const userIndex = users.findIndex(u => u.email === userEmail);
  if (userIndex === -1) {
    return {
      statusCode: 404,
      body: JSON.stringify({ success: false, message: "User not found" })
    };
  }

  if (event.httpMethod === "GET") {
    // Return user profile (email only)
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, email: users[userIndex].email })
    };
  }

  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: "Invalid request body" })
      };
    }
    const { email, password } = body;
    // Update email if changed and not taken
    if (email && email !== users[userIndex].email) {
      if (users.some(u => u.email === email)) {
        return {
          statusCode: 409,
          body: JSON.stringify({ success: false, message: "Email already in use" })
        };
      }
      users[userIndex].email = email;
    }
    // Update password if provided
    if (password) {
      users[userIndex].password = bcrypt.hashSync(password, 10);
    }
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ success: false, message: "Method Not Allowed" })
  };
};
