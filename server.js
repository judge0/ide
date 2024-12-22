const express = require("express");
const app = express();

app.use(express.json());

app.post("/compile", (req, res) => {
    res.json({ success: true, message: "Server is running", data: req.body });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
