const pool = require("../db/connection");
const ALLOWED_STATUSES = ["Pending", "InProgress", "Completed"];

function buildItemsSummary(items) {
  let productsCount = 0;
  let finalPrice = 0;

  for (const item of items) {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unitPrice || 0);
    productsCount += qty;
    finalPrice += qty * unitPrice;
  }

  return { productsCount, finalPrice };
}

function validateOrderPayload(orderNumber, items) {
  if (!orderNumber || typeof orderNumber !== "string") {
    return "orderNumber is required";
  }

  if (!Array.isArray(items) || items.length === 0) {
    return "items are required";
  }

  for (const item of items) {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const productId = Number(item.productId || 0);

    if (!productId || productId <= 0) {
      return "Each item must include a valid productId";
    }

    if (!qty || qty <= 0) {
      return "Each item qty must be greater than 0";
    }

    if (Number.isNaN(unitPrice) || unitPrice <= 0) {
      return "Each item unitPrice must be greater than 0";
    }
  }

  return null;
}

async function getExistingOrder(connOrPool, id) {
  const [rows] = await connOrPool.query(
    "SELECT id, status FROM orders WHERE id = ?",
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
}

async function getOrders(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, order_number, order_date, products_count, final_price, status
       FROM orders ORDER BY id DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching orders", error: error.message });
  }
}

async function getOrderById(req, res) {
  const { id } = req.params;

  try {
    const [orderRows] = await pool.query(
      `SELECT id, order_number, order_date, products_count, final_price, status
       FROM orders WHERE id = ?`,
      [id]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [itemRows] = await pool.query(
      `SELECT oi.id, oi.product_id, p.name, oi.qty, oi.unit_price, oi.total_price
       FROM order_items oi
       INNER JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [id]
    );

    res.json({
      ...orderRows[0],
      items: itemRows,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching order", error: error.message });
  }
}

async function createOrder(req, res) {
  const { orderNumber, items, status = "Pending" } = req.body;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const payloadError = validateOrderPayload(orderNumber, items);
  if (payloadError) {
    return res.status(400).json({ message: payloadError });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { productsCount, finalPrice } = buildItemsSummary(items);

    const [orderResult] = await conn.query(
      `INSERT INTO orders (order_number, order_date, products_count, final_price, status)
       VALUES (?, NOW(), ?, ?, ?)`,
      [orderNumber, productsCount, finalPrice, status]
    );

    const orderId = orderResult.insertId;

    for (const item of items) {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const totalPrice = qty * unitPrice;

      await conn.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.productId, qty, unitPrice, totalPrice]
      );
    }

    await conn.commit();
    res.status(201).json({ message: "Order created", orderId });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Error creating order", error: error.message });
  } finally {
    conn.release();
  }
}

async function updateOrder(req, res) {
  const { id } = req.params;
  const { orderNumber, items, status = "Pending" } = req.body;

  const payloadError = validateOrderPayload(orderNumber, items);
  if (payloadError) {
    return res.status(400).json({ message: payloadError });
  }

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const existingOrder = await getExistingOrder(conn, id);
    if (!existingOrder) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (existingOrder.status === "Completed") {
      await conn.rollback();
      return res.status(409).json({
        message: "Completed orders cannot be modified",
      });
    }

    const { productsCount, finalPrice } = buildItemsSummary(items);

    await conn.query(
      `UPDATE orders
       SET order_number = ?, products_count = ?, final_price = ?, status = ?
       WHERE id = ?`,
      [orderNumber, productsCount, finalPrice, status, id]
    );

    await conn.query("DELETE FROM order_items WHERE order_id = ?", [id]);

    for (const item of items) {
      const qty = Number(item.qty || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const totalPrice = qty * unitPrice;

      await conn.query(
        `INSERT INTO order_items (order_id, product_id, qty, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?)`,
        [id, item.productId, qty, unitPrice, totalPrice]
      );
    }

    await conn.commit();
    res.json({ message: "Order updated", orderId: Number(id) });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Error updating order", error: error.message });
  } finally {
    conn.release();
  }
}

async function deleteOrder(req, res) {
  const { id } = req.params;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const existingOrder = await getExistingOrder(conn, id);

    if (!existingOrder) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not found" });
    }

    if (existingOrder.status === "Completed") {
      await conn.rollback();
      return res.status(409).json({
        message: "Completed orders cannot be deleted",
      });
    }

    await conn.query("DELETE FROM order_items WHERE order_id = ?", [id]);
    await conn.query("DELETE FROM orders WHERE id = ?", [id]);
    await conn.commit();

    res.json({ message: "Order deleted" });
  } catch (error) {
    await conn.rollback();
    res.status(500).json({ message: "Error deleting order", error: error.message });
  } finally {
    conn.release();
  }
}

async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      message: "status must be Pending, InProgress, or Completed",
    });
  }

  try {
    const existingOrder = await getExistingOrder(pool, id);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (existingOrder.status === "Completed") {
      return res.status(409).json({
        message: "Completed orders cannot be modified",
      });
    }

    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);

    res.json({ message: "Order status updated", orderId: Number(id), status });
  } catch (error) {
    res.status(500).json({
      message: "Error updating order status",
      error: error.message,
    });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
};