// SSH-server Bridge

const express = require("express");
const { Client } = require("ssh2");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const path = require("path");

const app = express();

// Judge0 auth token — lives here on the server, never sent to the browser
const JUDGE0_AUTH_TOKEN = "yjjcWNpQGFQMkpmHQasOKegTvGL8yZ1sI4WM7YYkCuVoUwYt";

// Proxy all /judge0/* requests to the Judge0 backend on port 2358
// The browser calls /judge0/languages → this strips /judge0 and forwards to localhost:2358/languages
// The proxy injects the X-Auth-Token header so the browser never needs to know the key
app.use("/judge0", createProxyMiddleware({
  target: "http://localhost:2358",
  changeOrigin: true,
  pathRewrite: { "^/judge0": "" },
  on: {
    proxyReq: (proxyReq) => {
      proxyReq.setHeader("X-Auth-Token", JUDGE0_AUTH_TOKEN);
    }
  }
}));

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

// Start HTTP server on port 80
http.createServer(app).listen(80, "0.0.0.0", () => {
  console.log("Server running on http://localhost:80");
});