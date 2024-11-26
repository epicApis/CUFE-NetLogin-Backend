const express = require("express");
const config = require("config");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const cors = require("cors");
const app = express();
const port = config.get("server.port");
const dbConfig = config.get("database");

app.use(express.json()); // Middleware to parse JSON bodies

// Root endpoint
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// POST endpoint to insert data into the database
app.post("/data", async (req, res) => {
  try {
    const {
      hashuser: hashuser,
      flowused: flowused,
      logintime: logintime,
      deviceid: deviceid,
      deviceos: deviceos,
      verify: verify,
    } = req.body;

    const checksumStr = `${hashuser}${flowused}${logintime}${deviceid}${deviceos}`;
    const vercode = crypto.createHash("md5").update(checksumStr).digest("hex");
    if (vercode !== verify)
      return res.status(400).json({ error: "Verification failed" });

    success = false;
    devicecount = 0;
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      "CALL loginfo(?, ?, ?, ?, ?, @success, @devicecount)",
      [
        encodeURIComponent(hashuser),
        parseFloat(flowused),
        new Date(logintime),
        encodeURIComponent(deviceid),
        encodeURIComponent(deviceos),
      ]
    );

    const [[result]] = await connection.query(
      "SELECT @success AS success, @devicecount AS devicecount"
    );
    success = result.success;
    devicecount = result.devicecount;

    res.status(200).json({ success: success, devicecount: devicecount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.use(cors());

let accessCount = 0;
let lastSyncTime = Date.now();
let accessLogs = [];

app.get("/access", (req, res) => {
  try {
    const ip = req.ip;
    const time = new Date();

    accessCount++;
    accessLogs.push({ ip, time });

    res.status(200).json({ count: accessCount });

    if (Date.now() - lastSyncTime >= 3600000) {
      // 1 hour in milliseconds
      lastSyncTime = Date.now();
      syncAccessCountToDatabase();
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function syncAccessCountToDatabase() {
  try {
    const connection = await mysql.createConnection(dbConfig);

    for (const log of accessLogs) {
      await connection.execute(
        "INSERT INTO access (ip, time) VALUES (INET_ATON(?), ?)",
        [log.ip, log.time]
      );
    }

    const [rows] = await connection.query(
      "SELECT COUNT(*) AS count FROM access"
    );
    accessCount = rows[0].count;

    accessLogs = []; // Clear the logs after syncing

    await connection.end();
  } catch (error) {
    console.error("Error syncing access count to database:", error.message);
  }
}

// Middleware to handle 404 Not Found
app.use((req, res) => {
  res.status(404).send("Not Found");
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://0.0.0.0:${port}/`);
});
