// Import required modules
const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// A simple route to check if the server is running
app.get('/', (req, res) => {
  res.send('Hello, World! Your server is running.');
});

// Your custom route for the API (e.g., compiling code)
app.post('/compile', (req, res) => {
  // Placeholder logic: You can add code execution logic here
  const { language, code } = req.body;
  
  if (!language || !code) {
    return res.status(400).send({ error: 'Language and code are required!' });
  }

  // Simulating compiling the code (you can integrate an actual API here)
  const result = {
    message: `Compiling ${language} code...`,
    compiledCode: code,
    success: true
  };

  res.status(200).json(result);
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
