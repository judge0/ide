// SSH-server Bridge

const express = require("express");
const { Client } = require("ssh2");
const fs = require("fs");
const https = require("https");
const path = require("path");

const app = express();

// Enable JSON parsing
app.use(express.json({ limit: "10kb" }));

// Serve frontend static files (index.html, js/, css/) from parent folder
app.use(express.static(path.join(__dirname, "..")));

// Optional: log every request
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// Variable to hold active SSH session
let sshSession = null;

// SSH endpoint for sign-in
app.post("/ssh-sign-in", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, error: "Username or password missing" });
  }

  console.log(`[SSH LOGIN ATTEMPT] From ${req.ip} → username: ${username}`);

  const conn = new Client();
  let responded = false;

  conn.on("ready", () => {
    console.log(`[SSH LOGIN SUCCESS] username: ${username}`);
    sshSession = conn; // keep the session active for sign-out
    if (!responded) {
      responded = true;
      res.json({ success: true, message: "SSH connection established" });
    }
  });

  conn.on("error", (err) => {
    console.log(`[SSH LOGIN FAILED] username: ${username} → ${err.message}`);
    if (!responded) {
      responded = true;
      res.json({ success: false, error: "SSH connection failed: " + err.message });
    }
  });

  conn.connect({
    host: "csci.hsutx.edu",
    port: 22,
    username,
    password,
    readyTimeout: 10000,
  });
});

// SSH endpoint for sign-out
app.post("/ssh-sign-out", (req, res) => {
  console.log("Sign-out request received:", req.body);

  if (sshSession) {
    try {
      sshSession.end(); // safely close SSH session
      sshSession = null;
      return res.json({ success: true, message: "SSH session closed" });
    } catch (err) {
      console.error("Error closing SSH session:", err);
      return res.status(500).json({ success: false, message: "Failed to close SSH session" });
    }
  } else {
    return res.status(400).json({ success: false, message: "No active SSH session" });
  }
});

// HTTPS options (key + cert in same folder as ssh-bridge.js)
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, "server.key")),
  cert: fs.readFileSync(path.join(__dirname, "server.cert")),
};

// Start HTTPS server on port 4000
https.createServer(httpsOptions, app).listen(4000, "0.0.0.0", () => {
  console.log("Server running on https://localhost:4000");
});