const express = require("express");
const {
	getOrders,
	getOrderById,
	createOrder,
	updateOrder,
	deleteOrder,
	updateOrderStatus,
} = require("../controllers/orders.controller");

const router = express.Router();
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;