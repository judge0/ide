const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON requests
app.use(express.json());

// Your /compile endpoint logic
app.post('/compile', (req, res) => {
    const { code, language } = req.body;

    // Mock response for now
    const response = {
        status: 'success',
        message: `Code compiled successfully in ${language}`,
        result: `Output for the code: ${code}`,
    };

    res.json(response);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
