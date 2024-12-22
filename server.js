const cors = require('cors');
const express = require('express');
const app = express();

app.use(cors());  // This will allow all domains (including GitHub Pages)

app.get('/endpoint', (req, res) => {
    res.json({ message: 'This is a public API response' });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
