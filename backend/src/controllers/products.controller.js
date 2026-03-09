const pool = require("../db/connection");

async function getProducts(req, res) {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, unit_price FROM products ORDER BY id ASC"
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error: error.message });
  }
}

async function getProductById(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      "SELECT id, name, unit_price FROM products WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error: error.message });
  }
}

async function createProduct(req, res) {
  const { name, unitPrice } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "name is required" });
  }

  const parsedUnitPrice = Number(unitPrice);
  if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
    return res.status(400).json({ message: "unitPrice must be greater than 0" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO products (name, unit_price) VALUES (?, ?)",
      [name.trim(), parsedUnitPrice]
    );

    res.status(201).json({
      message: "Product created",
      product: { id: result.insertId, name: name.trim(), unit_price: parsedUnitPrice },
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating product", error: error.message });
  }
}

async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, unitPrice } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "name is required" });
  }

  const parsedUnitPrice = Number(unitPrice);
  if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice <= 0) {
    return res.status(400).json({ message: "unitPrice must be greater than 0" });
  }

  try {
    const [result] = await pool.query(
      "UPDATE products SET name = ?, unit_price = ? WHERE id = ?",
      [name.trim(), parsedUnitPrice, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product updated",
      product: { id: Number(id), name: name.trim(), unit_price: parsedUnitPrice },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
}

async function deleteProduct(req, res) {
  const { id } = req.params;
  try {
    const [usageRows] = await pool.query(
      "SELECT COUNT(*) AS usageCount FROM order_items WHERE product_id = ?",
      [id]
    );

    if (usageRows[0].usageCount > 0) {
      return res.status(409).json({
        message: "Product is used in orders and cannot be deleted",
      });
    }

    const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};