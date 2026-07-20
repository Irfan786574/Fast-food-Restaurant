console.log('Starting server...');
import express from 'express';
//import mysql from 'mysql2/promise';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import cors from 'cors';
import mysql from 'mysql2';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const backend = express();
import dotenv from 'dotenv';
dotenv.config();

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/receipts/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed!'));
  }
});

// Serve uploads statically
backend.use('/uploads', express.static('uploads'));


const JWT_SECRET = process.env.JWT_SECRET || 'DEVELOPED_BY_MUHAMMAD_IRFAN';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

const isAdminUser = (user) =>
  user.role === 'admin' || (ADMIN_EMAIL && user.email === ADMIN_EMAIL);

const filterAvailableMenu = (items) =>
  items.filter(
    (item) =>
      item.is_available === undefined || item.is_available === 1 || item.is_available === true
  );


// Middleware to parse JSON bodies from requests
backend.use(express.json());

// Use morgan for logging requests
backend.use(morgan('dev'));

// Enable CORS for all origins (you can restrict it later if needed)
backend.use(cors()); // This allows all origins by default

// MySQL database connection configuration
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '3306');
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbDatabase = process.env.DB_DATABASE || 'hr_fastfood';

console.log(`📡 Connecting to MySQL database at ${dbHost}:${dbPort}...`);

const connection = await mysql.createConnection({ 
  host: dbHost,
  port: dbPort,
  user: dbUser, 
  password: dbPassword,  
  database: dbDatabase,
  ssl: dbHost !== 'localhost' ? { rejectUnauthorized: false } : null
});

// Database Schema Auto-Initialization Helper
const initDatabase = (conn) => {
  return new Promise((resolve, reject) => {
    console.log('🔄 Checking database tables and structures...');

    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_code VARCHAR(10) NULL,
        verification_expires DATETIME NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer'
      )
    `;
    
    const createMenuItemsTable = `
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NULL,
        description TEXT NULL,
        price DECIMAL(10, 2) NULL,
        image_url VARCHAR(255) NULL,
        category VARCHAR(255) NULL,
        is_available TINYINT(1) NOT NULL DEFAULT 1,
        stock INT NOT NULL DEFAULT 100,
        discount INT DEFAULT 0
      )
    `;

    const createOrdersTable = `
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        total_price DECIMAL(10, 2) NULL,
        status VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        menu_item_id INT NULL,
        quantity INT NULL,
        receipt_url VARCHAR(255) NULL,
        FOREIGN KEY (user_id) REFERENCES users(Id) ON DELETE SET NULL
      )
    `;

    const createOrderItemsTable = `
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
      )
    `;

    // Execute queries sequentially
    conn.query(createUsersTable, (err) => {
      if (err) return reject(err);
      conn.query(createMenuItemsTable, (err) => {
        if (err) return reject(err);
        conn.query(createOrdersTable, (err) => {
          if (err) return reject(err);
          conn.query(createOrderItemsTable, (err) => {
            if (err) return reject(err);

             // Check if menu_items needs seeding
             conn.query('SELECT COUNT(*) as count FROM menu_items', (err, rows) => {
               if (err) return reject(err);
               const count = (rows && rows[0] && rows[0].count !== undefined) ? rows[0].count : 0;
               if (count === 0) {
                 console.log('🌱 Seeding initial menu items...');
                 const seedQuery = `
                   INSERT INTO menu_items (name, price, description, image_url, stock, is_available, discount) VALUES
                   ('Cheese Burger', 350.00, 'Delicious beef burger with melted cheese and fresh vegetables', '/images/logos/burger_logo.jpg', 100, 1, 0),
                   ('Veg Pizza', 650.00, 'Freshly baked pizza loaded with onions, capsicum, olives, and cheese', '/images/logos/burger_logo.jpg', 100, 1, 0),
                   ('French Fries', 180.00, 'Crispy salted golden potato fries served with tomato ketchup', '/images/logos/burger_logo.jpg', 100, 1, 0)
                 `;
                 conn.query(seedQuery, (err) => {
                   if (err) return reject(err);
                   console.log('✅ Database tables created and menu seeded successfully!');
                   resolve();
                 });
               } else {
                 console.log('✅ Database tables verified successfully!');
                 resolve();
               }
             });
          });
        });
      });
    });
  });
};

// Check if connection worked and run database initialization
try {
  await connection.execute('SELECT 1');
  console.log('✅ Connected to MySQL database!');
  await initDatabase(connection);
} catch (err) {
  console.error('❌ Error connecting or initializing MySQL:', err.message);
  process.exit(1); // Stop server if database fails
}

// Auto-promote orders from 'on queue' or 'pending' to 'preparing' if fewer than 5 orders are in 'preparing' state
const autoPromoteOrders = (callback) => {
  connection.execute(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'preparing'",
    (err, countResults) => {
      if (err) {
        console.error('Error counting preparing orders:', err);
        if (callback) callback(err);
        return;
      }
      
      const preparingCount = countResults[0].count;
      const availableSlots = 5 - preparingCount;

      if (availableSlots <= 0) {
        if (callback) callback(null);
        return; // Kitchen preparing queue is full
      }

      // Find the oldest orders that are 'on queue' or 'pending'
      const selectQuery = `
        SELECT id FROM orders 
        WHERE status = 'on queue' OR status = 'pending' 
        ORDER BY created_at ASC, id ASC 
        LIMIT ?
      `;
      connection.execute(selectQuery, [String(availableSlots)], (err, selectResults) => {
        if (err) {
          console.error('Error selecting orders to promote:', err);
          if (callback) callback(err);
          return;
        }

        if (selectResults.length === 0) {
          if (callback) callback(null);
          return; // No orders waiting to be promoted
        }

        // Update their status to 'preparing'
        const orderIdsToPromote = selectResults.map(r => r.id);
        const placeholders = orderIdsToPromote.map(() => '?').join(',');
        const updateQuery = `UPDATE orders SET status = 'preparing' WHERE id IN (${placeholders})`;

        connection.execute(updateQuery, orderIdsToPromote, (err) => {
          if (err) {
            console.error('Error promoting orders:', err);
            if (callback) callback(err);
            return;
          }
          console.log(`🚀 Auto-promoted orders to preparing: ${orderIdsToPromote.join(', ')}`);
          if (callback) callback(null);
        });
      });
    }
  );
};

// Middleware to authenticate user (JWT token)
const authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  console.log('🔍 DEBUG - authHeader:', authHeader);
  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.log('❌ DEBUG - Token missing');
    return res.status(403).json({ message: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ DEBUG - Token verify error:', err.message);
      return res.status(403).json({ message: 'Invalid token' });
    }
    console.log('✅ DEBUG - Token verified for user:', user);
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  authenticateToken(req, res, () => {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

// POST /login - For User Authentication (JWT Token Generation)
backend.post('/login', (req, res) => {
  console.log('🔍 DEBUG - req.body:', req.body);
  console.log('🔍 DEBUG - req.headers:', req.headers['content-type']);
  
  const email = req.body.email;
  const password = req.body.password;
  
  console.log('🔍 DEBUG - email:', email);
  console.log('🔍 DEBUG - password:', password);

  // Check if email or password are missing or undefined
  if (!email || !password) {
    console.log('❌ DEBUG - Missing credentials');
    return res.status(400).json({ message: "Email and password are required" });
  }

  console.log('🔍 DEBUG - About to execute query with params:', [email, password]);
  
  const queryParams = [email, password];
  const query = `SELECT * FROM users WHERE email = ? AND password = ?`;

  connection.execute(query, queryParams, (err, results) => {
    console.log('🔍 DEBUG - Query callback executed');
    console.log('🔍 DEBUG - err:', err);
    console.log('🔍 DEBUG - results:', results);
    console.log('🔍 DEBUG - results.length:', results ? results.length : 'N/A');
    
    if (err) {
      console.error('❌ DEBUG - Database error:', err);
      return res.status(500).json({ message: "Error checking credentials" });
    }

    // If no matching user found
    if (results.length === 0) {
      console.log('❌ DEBUG - No user found for email:', email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log('✅ DEBUG - User found:', results[0]);
    
    const user = {
      id: results[0].id !== undefined ? results[0].id : results[0].Id,
      email: results[0].email,
      role: results[0].role || 'customer',
    };
    console.log('✅ DEBUG - Creating token for user:', user);

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ DEBUG - Token created, sending response');

    res.json({
      token,
      role: user.role,
      email: user.email,
      isAdmin: isAdminUser(user),
    });
    console.log('✅ DEBUG - Response sent');
  });
  
  console.log('🔍 DEBUG - After query execution (function continues)');
});
// POST /signup - Create a new user account
// POST /signup - Create user (no email OTP)
backend.post('/signup', (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email, and password are required" });
  }

  const checkEmailQuery = "SELECT id FROM users WHERE email = ?";
  connection.execute(checkEmailQuery, [email], (checkErr, existingUsers) => {
    if (checkErr) {
      return res.status(500).json({ message: "Error checking email" });
    }
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const insertQuery = `
      INSERT INTO users (name, email, password, is_verified, verification_code, verification_expires)
      VALUES (?, ?, ?, 1, NULL, NULL)
    `;
    connection.execute(insertQuery, [name, email, password], (insertErr) => {
      if (insertErr) {
        return res.status(500).json({ message: "Error creating user" });
      }
      return res.status(201).json({
        success: true,
        message: "Account created successfully. You can log in."
      });
    });
  });
});

// TEST ROUTE - Add this before your /place-order route
backend.get('/test-place-order', (req, res) => {
    res.json({
        message: "/place-order endpoint is available",
        method: "POST",
        expectedBody: {
            items: [
                { id: 1, quantity: 2 },
                { id: 3, quantity: 1 }
            ],
            totalPrice: 30.97,
            userId: 1
        }
    });
});

// Also add a simple POST endpoint for testing
backend.post('/test-order', (req, res) => {
    console.log('Test order received:', req.body);
    res.json({
        success: true,
        message: "Test order received",
        orderId: "TEST-" + Date.now(),
        receivedData: req.body
    });
});
// POST /orders - Create a new order (Protected by JWT)
// POST /orders - Create a new order (Protected by JWT)
// POST /orders - Create a new order without JWT token (no authentication required)
// SIMPLE PLACE-ORDER ENDPOINT
// backend.post('/place-order', (req, res) => {
//   console.log('Order received:', req.body);
  
//   // Generate order ID
//   const orderId = 'ORD' + Date.now();
  
//   res.json({
//     success: true,
//     orderId: orderId,
//     message: 'Order placed successfully',
//     timestamp: new Date().toISOString()
//   });
// });


backend.post('/place-order', (req, res) => {
  console.log('📦 Order received:', req.body);

  let responseSent = false;
  const safeSend = (statusCode, payload) => {
    if (responseSent) return;
    responseSent = true;
    if (statusCode != null && statusCode !== undefined) {
      return res.status(statusCode).json(payload);
    }
    return res.json(payload);
  };

  const { items, totalPrice } = req.body;
  let userId = req.body.userId;

  const token = req.header('Authorization')?.split(' ')[1];
  if (!userId && token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return safeSend(401, { success: false, message: 'Invalid or expired token' });
    }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return safeSend(400, { success: false, message: 'No items in order' });
  }

  connection.beginTransaction((err) => {
    if (err) {
      console.error('❌ Transaction error:', err);
      return safeSend(500, { success: false, message: 'Database error' });
    }

    const orderQuery =
      'INSERT INTO orders (user_id, total_price, status, created_at) VALUES (?, ?, ?, NOW())';
    connection.execute(orderQuery, [userId, totalPrice, 'pending'], (err, orderResult) => {
      if (err) {
        console.error('❌ Order insert error:', err);
        return connection.rollback(() => {
          safeSend(500, { success: false, message: 'Error creating order' });
        });
      }

      const orderId = orderResult.insertId;
      let itemsProcessed = 0;
      let hasError = false;

      items.forEach((item) => {
        if (hasError) return;

        const priceQuery =
          'SELECT price, is_available, name FROM menu_items WHERE id = ?';
        connection.execute(priceQuery, [item.id], (err, priceResults) => {
          if (err) {
            hasError = true;
            console.error('❌ Price query error:', err);
            return connection.rollback(() => {
              safeSend(500, { success: false, message: 'Error getting item prices' });
            });
          }

          if (priceResults.length === 0) {
            hasError = true;
            return connection.rollback(() => {
              safeSend(400, { success: false, message: `Menu item ${item.id} not found` });
            });
          }

          const row = priceResults[0];
          const unitPrice = row.price;
          const available =
            row.is_available === undefined || row.is_available === 1 || row.is_available === true;

          if (!available) {
            hasError = true;
            return connection.rollback(() => {
              safeSend(400, { success: false, message: `${row.name} is not available` });
            });
          }

          const lineTotal = unitPrice * item.quantity;

          const itemQuery =
            'INSERT INTO order_items (order_id, menu_item_id, quantity, total_price) VALUES (?, ?, ?, ?)';
          connection.execute(
            itemQuery,
            [orderId, item.id, item.quantity, lineTotal],
            (err) => {
              if (err) {
                hasError = true;
                console.error('❌ Order item insert error:', err);
                return connection.rollback(() => {
                  safeSend(500, { success: false, message: 'Error adding items to order' });
                });
              }

              itemsProcessed++;

              const commitOrder = () => {
                connection.commit((err) => {
                  if (err) {
                    console.error('❌ Commit error:', err);
                    return connection.rollback(() => {
                      safeSend(500, { success: false, message: 'Error completing order' });
                    });
                  }

                  autoPromoteOrders(() => {
                    safeSend(null, {
                      success: true,
                      orderId,
                      message: 'Order placed successfully',
                      timestamp: new Date().toISOString(),
                    });
                  });
                });
              };

              if (itemsProcessed === items.length && !hasError) {
                commitOrder();
              }
            }
          );
        });
      });
    });
  });
});

backend.get('/menu', (req, res) => {
  connection.execute('SELECT * FROM menu_items ORDER BY id', (err, results) => {
    if (err) {
      console.error('Error fetching menu items:', err);
      return res.status(500).json({ message: 'Error fetching menu items' });
    }
    res.json(filterAvailableMenu(results));
  });
});

backend.get('/admin/menu', authenticateAdmin, (req, res) => {
  connection.execute('SELECT * FROM menu_items ORDER BY id', (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching menu items' });
    }
    res.json(results);
  });
});

backend.post('/admin/menu', authenticateAdmin, (req, res) => {
  const { name, price, discount, image_url, stock, is_available } = req.body;

  if (!name || price === undefined || price === null) {
    return res.status(400).json({ message: 'Name and price are required' });
  }

  const query = `
    INSERT INTO menu_items (name, price, discount, image_url, is_available)
    VALUES (?, ?, ?, ?, ?)
  `;
  connection.execute(
    query,
    [
      name,
      price,
      discount || 0,
      image_url || '',
      is_available !== undefined ? (is_available ? 1 : 0) : 1,
    ],
    (err, result) => {
      if (err) {
        console.error('Error creating menu item:', err);
        return res.status(500).json({
          message: 'Error creating menu item.',
        });
      }
      res.status(201).json({ success: true, id: result.insertId, message: 'Item added' });
    }
  );
});

backend.put('/admin/menu/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { name, price, discount, image_url, is_available } = req.body;

  const query = `
    UPDATE menu_items
    SET name = ?, price = ?, discount = ?, image_url = ?, is_available = ?
    WHERE id = ?
  `;
  connection.execute(
    query,
    [name, price, discount || 0, image_url || '', is_available ? 1 : 0, id],
    (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error updating menu item' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.json({ success: true, message: 'Item updated' });
    }
  );
});

backend.delete('/admin/menu/:id', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  connection.execute('DELETE FROM menu_items WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting menu item' });
    }
    res.json({ success: true, message: 'Item deleted' });
  });
});

backend.put('/admin/orders/:id/status', authenticateAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const query = 'UPDATE orders SET status = ? WHERE id = ?';
  connection.execute(query, [status, id], (err, result) => {
    if (err) {
      console.error('Error updating order status:', err);
      return res.status(500).json({ message: 'Error updating order status' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    autoPromoteOrders(() => {
      res.json({ success: true, message: 'Order status updated successfully' });
    });
  });
});

backend.get('/orders', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const isAdmin = isAdminUser(req.user);

  let query = `
    SELECT o.id AS order_id, o.total_price, o.status, o.created_at,
           COALESCE(oi.quantity, o.quantity) AS quantity,
           COALESCE(oi.total_price, o.total_price) AS line_total,
           mi.name AS item_name,
           mi.id AS menu_item_id
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON COALESCE(oi.menu_item_id, o.menu_item_id) = mi.id
  `;

  const queryParams = [];
  if (!isAdmin) {
    query += ' WHERE o.user_id = ?';
    queryParams.push(userId);
  }

  query += ' ORDER BY o.created_at DESC, o.id DESC';

  connection.execute(query, queryParams, (err, rows) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ message: 'Error fetching orders' });
    }

    const ordersMap = new Map();
    rows.forEach((row) => {
      if (!ordersMap.has(row.order_id)) {
        ordersMap.set(row.order_id, {
          id: row.order_id,
          total_price: row.total_price,
          status: row.status,
          created_at: row.created_at,
          items: [],
        });
      }
      if (row.item_name) {
        ordersMap.get(row.order_id).items.push({
          menu_item_id: row.menu_item_id,
          name: row.item_name,
          quantity: row.quantity,
          line_total: row.line_total,
        });
      }
    });

    res.json(Array.from(ordersMap.values()));
  });
});

// POST /upload-receipt - Upload payment receipt for verification
backend.post('/upload-receipt', authenticateToken, upload.single('receiptFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No receipt file uploaded' });
  }

  const userId = req.user.id;
  const orderId = req.body.orderId;
  const receiptUrl = `/uploads/receipts/${req.file.filename}`;

  const processUpload = (actualOrderId) => {
    const query = 'UPDATE orders SET receipt_url = ?, status = ? WHERE id = ? AND user_id = ?';
    connection.execute(query, [receiptUrl, 'awaiting_verification', actualOrderId, userId], (err, result) => {
      if (err) {
        console.error('Error updating order with receipt:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Order not found or access denied' });
      }
      res.json({ success: true, message: 'Receipt uploaded successfully', receiptUrl });
    });
  };

  if (orderId) {
    processUpload(orderId);
  } else {
    // Fallback: Find the latest order for the user
    const findQuery = 'SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1';
    connection.execute(findQuery, [userId], (err, results) => {
      if (err) {
        console.error('Error finding latest order:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ success: false, message: 'No orders found for this user' });
      }
      processUpload(results[0].id);
    });
  }
});

// Error handling middleware (specifically for multer)
backend.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || (err.message && err.message.includes('allowed'))) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});


// DELETE /orders/:order_id - Delete an order
backend.delete('/orders/:order_id', (req, res) => {
  const { order_id } = req.params;

  const query = `DELETE FROM orders WHERE id = ?`;

  connection.execute(query, [order_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error deleting order');
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json({ message: "Order deleted successfully" });
  });
});

// Helper function to calculate total price
function calculateTotalPrice(items) {
  let totalPrice = 0;
  // Assuming `menu_items` table has `id` and `price` columns
  items.forEach(item => {
    const query = 'SELECT price FROM menu_items WHERE id = ?';
    connection.execute(query, [item.id], (err, results) => {
      if (err) throw err;

      if (results.length > 0) {
        totalPrice += results[0].price * item.quantity;
      }
    });
  });
  return totalPrice;
}

// Start the Express server on port 5000 if not in test environment
const PORT = 5000;
if (process.env.NODE_ENV !== 'test') {
  backend.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default backend;
