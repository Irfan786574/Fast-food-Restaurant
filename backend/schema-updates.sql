-- Run once in MySQL (hr_fastfood database) for admin stock & roles support

USE hr_fastfood;

-- Menu item stock and availability (admin can change over time)
ALTER TABLE menu_items ADD COLUMN stock INT NOT NULL DEFAULT 100;
ALTER TABLE menu_items ADD COLUMN is_available TINYINT(1) NOT NULL DEFAULT 1;

-- Optional: admin role on users (or set ADMIN_EMAIL in backend/.env)
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'customer';
-- UPDATE users SET role = 'admin' WHERE email = 'your-admin@email.com';

-- Order line items (if not created yet)
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- Store upload receipt URL for payment verification
ALTER TABLE orders ADD COLUMN receipt_url VARCHAR(255) NULL;

