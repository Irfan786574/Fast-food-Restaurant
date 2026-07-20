import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const runSync = async () => {
  console.log('🔄 Starting local database to Aiven Cloud sync...');

  // 1. Connection to Local Database (Source)
  let localConn;
  try {
    localConn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hr_fastfood'
    });
    console.log('✅ Connected to LOCAL WAMP database.');
  } catch (err) {
    console.error('❌ Could not connect to local database. Make sure WampServer is running!');
    console.error(err.message);
    return;
  }

  // 2. Connection to Aiven Database (Target)
  let aivenConn;
  try {
    aivenConn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '25161'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      ssl: { rejectUnauthorized: false }
    });
    console.log('✅ Connected to AIVEN Cloud database.');
  } catch (err) {
    console.error('❌ Could not connect to Aiven Cloud database. Check your .env file credentials!');
    console.error(err.message);
    localConn.end();
    return;
  }

  try {
    // Disable Foreign Key checks on Aiven during schema drop and recreate
    await aivenConn.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('⚙️ Temporarily disabled foreign key constraints on Aiven.');

    // Drop tables on Aiven to clean up outdated schemas
    console.log('🗑️ Dropping old tables on Aiven to rebuild correct schemas...');
    await aivenConn.query('DROP TABLE IF EXISTS order_items');
    await aivenConn.query('DROP TABLE IF EXISTS orders');
    await aivenConn.query('DROP TABLE IF EXISTS menu_items');
    await aivenConn.query('DROP TABLE IF EXISTS users');

    // Recreate tables with correct schemas matching local WAMP
    console.log('🏗️ Rebuilding correct tables on Aiven...');
    
    await aivenConn.query(`
      CREATE TABLE users (
        Id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        verification_code VARCHAR(10) NULL,
        verification_expires DATETIME NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'customer'
      )
    `);

    await aivenConn.query(`
      CREATE TABLE menu_items (
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
    `);

    await aivenConn.query(`
      CREATE TABLE orders (
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
    `);

    await aivenConn.query(`
      CREATE TABLE order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        menu_item_id INT NOT NULL,
        quantity INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tables rebuilt successfully.');

    // Table names to sync in order
    const tables = ['users', 'menu_items', 'orders', 'order_items'];

    for (const table of tables) {
      console.log(`\n📦 Syncing table: [${table}]...`);

      // Fetch column list from local WAMP table
      const [srcColsData] = await localConn.query(`DESCRIBE ${table}`);
      const srcCols = srcColsData.map(c => c.Field);

      // Fetch column list from Aiven target table
      const [destColsData] = await aivenConn.query(`DESCRIBE ${table}`);
      const destCols = destColsData.map(c => c.Field);

      // Intersect columns to sync only columns that exist in both databases
      const commonCols = srcCols.filter(col => destCols.includes(col));
      console.log(`  🔍 Columns to sync: [${commonCols.join(', ')}]`);

      // Fetch all rows from local database
      const [rows] = await localConn.query(`SELECT * FROM ${table}`);
      console.log(`  📥 Read ${rows.length} rows from local table.`);

      if (rows.length === 0) {
        console.log(`  ⚠️ No data to transfer for [${table}].`);
        continue;
      }

      // Generate dynamic insert query using common columns
      const placeholders = commonCols.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO ${table} (${commonCols.join(', ')}) VALUES (${placeholders})`;

      let insertedCount = 0;
      for (const row of rows) {
        const values = commonCols.map(col => row[col]);
        await aivenConn.query(insertQuery, values);
        insertedCount++;
      }
      console.log(`  📤 Successfully uploaded ${insertedCount} rows to Aiven [${table}].`);
    }

    // Re-enable Foreign Key constraints
    await aivenConn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n⚙️ Re-enabled foreign key constraints on Aiven.');
    console.log('🎉 Database sync completed successfully!');

  } catch (err) {
    console.error('❌ Error during data sync:', err.message);
  } finally {
    // Close connections
    await localConn.end();
    await aivenConn.end();
    console.log('🔌 Closed database connections.');
  }
};

runSync();
