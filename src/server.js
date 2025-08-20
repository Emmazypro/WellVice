require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ status: 'API running' });
});

// Example login route (replace with your actual logic)
app.post('/login', (req, res) => {
  // TODO: Implement login logic
  res.status(501).json({ message: 'Login not implemented yet' });
});

// Add more routes here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
