// SSH-server Bridge

const express = require("express");
const cors = require("cors");
const { Client } = require("ssh2");
const fs = require("fs");
const https = require("https");
const path = require("path");

const app = express();

// Enable CORS and JSON body parsing
app.use(cors({ origin: "https://localhost:3000" }));
app.use(express.json());

// CSP header (optional for frontend JS)
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self';"
  );
  next();
});

app.get("/", (req, res) => {
  res.send("SSH Bridge Server Running");
});

// SSH endpoint - called by csci.js from frontend
app.post("/ssh-sign-in", (req, res) => {
  const { username, password } = req.body;
  const conn = new Client();

  conn.on("ready", () => {
    conn.end();
    res.json({ success: true, message: "SSH connection successful" });
  });

  conn.on("error", (err) => {
    res.json({ success: false, error: err.message });
  });

  conn.connect({
    host: "csci.hsutx.edu", // your server
    port: 22,
    username,
    password
  });
});

// HTTPS options
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "server.cert"))
};

// Start HTTPS server on port 4000
https.createServer(httpsOptions, app).listen(4000, () => {
  console.log("SSH bridge running on https://localhost:4000");
});