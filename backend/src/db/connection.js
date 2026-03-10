const mysql = require("mysql2/promise");
require("dotenv").config();

const shouldUseSSL = String(process.env.DB_SSL || "false").toLowerCase() === "true";

const sslConfig = shouldUseSSL
  ? {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  ssl: sslConfig,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;