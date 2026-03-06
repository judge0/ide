//command to install ssh dependencies: npm install express ssh2
//#Load HTTP server, enable CORS, and ssh libraries
const express = require("express");
const cors = require("cors");     
const { Client } = require("ssh2");
const fs = require("fs");

//create web serve and allows json body parsing
const app = express();
app.use(cors());
app.use(express.json());

// POST /ssh { "command": "ls -la" }
//ENDPOINT
app.get("/ssh-test", (req, res) => {
  const conn = new Client();

  conn.on("ready", () => {
    conn.end();
    res.json({ success: true, message: "SSH connection successful" });

  });

  conn.on("error", (err) => {
    res.json({ success: false, error: err.message });
  });

  conn.connect({
    host: "csci.hsutx.edu",              //change host as necessary
    port: 22,
    username: "dw2112",      // change username as necessary

//change file read as necessary, 
    privateKey: fs.readFileSync("/Users/dabra/.ssh/id_ed25519")  });
});
  


//Start the server
app.listen(4000, () => {
  console.log("SSH bridge is running on port 4000");
});