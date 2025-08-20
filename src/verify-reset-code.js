// netlify/functions/verify-reset-code.js
const fs = require("fs");
const path = require("path");

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

  const { email, code } = body;
  if (!email || !code) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Email and code required" })
    };
  }

  const codesFile = path.join(__dirname, "reset-codes.json");
  let codes = {};
  if (fs.existsSync(codesFile)) {
    try {
      codes = JSON.parse(fs.readFileSync(codesFile, "utf8"));
    } catch (e) {
      codes = {};
    }
  }

  if (codes[email] && codes[email] === code) {
    // Optionally, delete the code after successful verification
    delete codes[email];
    fs.writeFileSync(codesFile, JSON.stringify(codes, null, 2));
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Code verified" })
    };
  } else {
    return {
      statusCode: 401,
      body: JSON.stringify({ success: false, message: "Invalid code" })
    };
  }
};
