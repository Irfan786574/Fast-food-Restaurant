import { jest } from '@jest/globals';

// Setup connection mock functions
const mockExecute = jest.fn((query, params, cb) => {
  const callback = typeof params === 'function' ? params : cb;
  if (callback) {
    // Default mock response for callback queries
    callback(null, []);
    return;
  }
  return Promise.resolve([[{ 1: 1 }]]);
});

const mockBeginTransaction = jest.fn((cb) => cb(null));
const mockCommit = jest.fn((cb) => cb(null));
const mockRollback = jest.fn((cb) => cb(null));

// Mock mysql2 module before loading server.js
jest.unstable_mockModule('mysql2', () => {
  return {
    default: {
      createConnection: jest.fn().mockResolvedValue({
        execute: mockExecute,
        query: mockExecute,
        beginTransaction: mockBeginTransaction,
        commit: mockCommit,
        rollback: mockRollback,
      })
    }
  };
});

// Import request and app
import request from 'supertest';
const { default: app } = await import('./server.js');

describe('HR Fastfood Backend API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set default execute mock behavior for database checks
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, []);
        return;
      }
      return Promise.resolve([[{ 1: 1 }]]);
    });
  });

  test('GET /test-place-order should be available', async () => {
    const response = await request(app).get('/test-place-order');
    expect(response.status).toBe(200);
    expect(response.body.message).toContain('available');
  });

  test('POST /login should authenticate a user successfully', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 1, email: 'test@email.com', password: 'password123', role: 'customer' }]);
      }
    });

    const response = await request(app)
      .post('/login')
      .send({ email: 'test@email.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  test('POST /login should return 401 on invalid credentials', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, []); // No user found
      }
    });

    const response = await request(app)
      .post('/login')
      .send({ email: 'test@email.com', password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Invalid credentials');
  });

  test('POST /signup should register a new user', async () => {
    mockExecute
      .mockImplementationOnce((query, params, cb) => {
        // First query: Check duplicate email
        const callback = typeof params === 'function' ? params : cb;
        callback(null, []);
      })
      .mockImplementationOnce((query, params, cb) => {
        // Second query: Insert user
        const callback = typeof params === 'function' ? params : cb;
        callback(null, { insertId: 1 });
      });

    const response = await request(app)
      .post('/signup')
      .send({ name: 'Test User', email: 'new@email.com', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  test('GET /menu should return items', async () => {
    mockExecute.mockImplementation((query, cb) => {
      const callback = typeof query === 'function' ? query : cb;
      callback(null, [
        { id: 1, name: 'Burger', price: 450, discount: 0, is_available: 1, stock: 10 },
        { id: 2, name: 'Fries', price: 200, discount: 0, is_available: 1, stock: 5 }
      ]);
    });

    const response = await request(app).get('/menu');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
    expect(response.body[0].name).toBe('Burger');
  });

  test('PUT /admin/orders/:id/status should update order status', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 1, email: 'admin@email.com', role: 'admin' }]);
      }
    });

    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'admin@email.com', password: 'password123' });

    const adminToken = loginRes.body.token;

    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        if (query.includes('UPDATE orders')) {
          callback(null, { affectedRows: 1 });
        } else if (query.includes('COUNT(*)')) {
          callback(null, [{ count: 3 }]);
        } else if (query.includes('SELECT id FROM orders')) {
          callback(null, [{ id: 6 }]);
        } else {
          callback(null, { affectedRows: 1 });
        }
      }
    });

    const response = await request(app)
      .put('/admin/orders/5/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'preparing' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /signup should return 400 if email already exists', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      callback(null, [{ Id: 1, email: 'duplicate@email.com' }]);
    });

    const response = await request(app)
      .post('/signup')
      .send({ name: 'Test Duplicate', email: 'duplicate@email.com', password: 'password123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('already exists');
  });

  test('POST /place-order should fail if cart is empty', async () => {
    const response = await request(app)
      .post('/place-order')
      .send({ items: [], totalPrice: '0.00' });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('No items');
  });

  test('POST /place-order should place order successfully when valid', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 10, email: 'john@example.com', role: 'customer' }]);
      }
    });

    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'john@example.com', password: 'password123' });

    const userToken = loginRes.body.token;

    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        if (query.includes('INSERT INTO orders')) {
          callback(null, { insertId: 99 });
        } else if (query.includes('SELECT price, is_available, name FROM menu_items')) {
          callback(null, [{ price: 350.00, is_available: 1, name: 'Burger' }]);
        } else if (query.includes('INSERT INTO order_items')) {
          callback(null, { insertId: 101 });
        } else if (query.includes('COUNT(*)')) {
          callback(null, [{ count: 2 }]);
        } else if (query.includes('SELECT id FROM orders')) {
          callback(null, [{ id: 100 }]);
        } else {
          callback(null, []);
        }
      }
    });

    const response = await request(app)
      .post('/place-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [{ id: 1, quantity: 2 }],
        totalPrice: '700.00'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.orderId).toBe(99);
  });

  test('POST /place-order should fail if menu item is unavailable', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 10, email: 'john@example.com', role: 'customer' }]);
      }
    });

    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'john@example.com', password: 'password123' });

    const userToken = loginRes.body.token;

    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        if (query.includes('INSERT INTO orders')) {
          callback(null, { insertId: 99 });
        } else if (query.includes('SELECT price, is_available, name FROM menu_items')) {
          callback(null, [{ price: 350.00, is_available: 0, name: 'Burger' }]);
        } else {
          callback(null, []);
        }
      }
    });

    const response = await request(app)
      .post('/place-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        items: [{ id: 1, quantity: 2 }],
        totalPrice: '700.00'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('is not available');
  });

  test('GET /orders should return customer orders history', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 10, email: 'john@example.com', role: 'customer' }]);
      }
    });

    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'john@example.com', password: 'password123' });

    const userToken = loginRes.body.token;

    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [
          { order_id: 45, user_id: 10, total_price: '500.00', status: 'pending', created_at: new Date(), item_name: 'Burger', quantity: 2, line_total: '700.00' }
        ]);
      }
    });

    const response = await request(app)
      .get('/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(1);
    expect(response.body[0].id).toBe(45);
  });

  test('POST /upload-receipt should upload file successfully', async () => {
    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, [{ id: 10, email: 'john@example.com', role: 'customer' }]);
      }
    });

    const loginRes = await request(app)
      .post('/login')
      .send({ email: 'john@example.com', password: 'password123' });

    const userToken = loginRes.body.token;

    mockExecute.mockImplementation((query, params, cb) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) {
        callback(null, { affectedRows: 1 });
      }
    });

    const response = await request(app)
      .post('/upload-receipt')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('receiptFile', Buffer.from('mock pdf content'), 'receipt.pdf')
      .field('orderId', '45');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
