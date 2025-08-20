// netlify/functions/verify-email.js
const fs = require("fs");
const path = require("path");

exports.handler = async function(event, context) {
  const params = event.queryStringParameters || {};
  const { token, email } = params;
  if (!token || !email) {
    return {
      statusCode: 400,
      body: "Missing token or email."
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
  const userIndex = users.findIndex(u => u.email === email && u.verificationToken === token);
  if (userIndex === -1) {
    return {
      statusCode: 400,
      body: "Invalid verification link."
    };
  }
  users[userIndex].verified = true;
  delete users[userIndex].verificationToken;
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  return {
    statusCode: 200,
    body: "Email verified! You can now log in to MediPal."
  };
};
