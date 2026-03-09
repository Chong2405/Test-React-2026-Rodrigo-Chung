const express = require("express");
const cors = require("cors");

const productsRoutes = require("./routes/products.routes");
const ordersRoutes = require("./routes/orders.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);

module.exports = app;