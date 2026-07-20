import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [customerTab, setCustomerTab] = useState('orders'); // 'orders' | 'contact'

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/orders', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getUserDetailsFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return { role: 'customer', email: '' };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        role: payload.role || 'customer',
        email: payload.email || '',
      };
    } catch (e) {
      return { role: 'customer', email: '' };
    }
  };

  const { role, email } = getUserDetailsFromToken();
  const isAdmin = role === 'admin';

  // Admin status update handler
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, 
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Helper for customer progress bar steps
  const getStatusStepIndex = (status) => {
    switch (status) {
      case 'pending':
      case 'on queue':
        return 0; // Placed
      case 'preparing':
        return 1; // Cooking
      case 'on the way':
        return 2; // On the way
      case 'delivered':
        return 3; // Delivered
      default:
        return 0;
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSuccess('Thank you for reaching out! We will contact you soon.');
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  // ----------------------------------------------------
  // ADMIN DASHBOARD RENDER
  // ----------------------------------------------------
  if (isAdmin) {
    const totalOrders = orders.length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const preparingCount = orders.filter(o => o.status === 'preparing').length;
    const waitingCount = orders.filter(o => o.status === 'on queue').length;
    const completedCount = orders.filter(o => o.status === 'delivered').length;

    const preparingOrders = orders.filter(o => o.status === 'preparing')
                                  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const waitingOrders = orders.filter(o => o.status === 'on queue' || o.status === 'pending')
                                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return (
      <div className="orders-container">
        <h1>Admin Command Center</h1>
        <p className="admin-sub">Logged in as: <strong>{email}</strong> (Administrator)</p>

        {/* KPI Stats Panel */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Orders</h3>
            <p className="stat-number">{totalOrders}</p>
          </div>
          <div className="stat-card pending">
            <h3>Waiting in Queue</h3>
            <p className="stat-number">{waitingCount + pendingCount}</p>
          </div>
          <div className="stat-card preparing">
            <h3>Active in Kitchen</h3>
            <p className="stat-number">{preparingCount} / 5</p>
          </div>
          <div className="stat-card completed">
            <h3>Delivered</h3>
            <p className="stat-number">{completedCount}</p>
          </div>
        </div>

        {/* CHEF ACTIVE BOARD */}
        <div className="kitchen-board">
          <div className="board-header">
            <h2>👨‍🍳 Chef's Active Prep Cards (Max 5 Slots)</h2>
            <span className="live-badge">LIVE KITCHEN FEED</span>
          </div>
          
          {preparingOrders.length === 0 ? (
            <p className="no-prep-items">🛎️ No orders are currently in preparation. Promote an order below or wait for a customer to order!</p>
          ) : (
            <div className="chef-cards-grid">
              {preparingOrders.map((order, index) => (
                <div className="chef-order-card" key={order.id}>
                  <div className="card-header-bar">
                    <span className="chef-slot-num">Slot #{index + 1}</span>
                    <span className="chef-order-id">Order #{order.id}</span>
                  </div>
                  <div className="chef-card-body">
                    <ul className="chef-items-list">
                      {order.items && order.items.map((item, idx) => (
                        <li key={idx}>
                          <span className="qty-tag">{item.quantity}x</span>
                          <span className="item-name-tag">{item.name}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="order-time-stamp">Ordered: {new Date(order.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div className="chef-card-footer">
                    <button 
                      className="chef-action-btn complete"
                      onClick={() => handleStatusChange(order.id, 'on the way')}
                    >
                      🚀 Finish & Dispatch
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WAITING QUEUE TRACK */}
        <div className="waiting-queue-section">
          <h2>⏱️ Waiting Queue Pipeline (FIFO Track)</h2>
          <p className="queue-hint">First-in, first-out sequence. When an active slot is dispatched above, the next order here automatically moves to the kitchen board!</p>
          
          {waitingOrders.length === 0 ? (
            <p className="no-queue-msg">🎉 Queue is empty! All placed orders are currently cooking.</p>
          ) : (
            <div className="queue-track">
              {waitingOrders.map((order, idx) => (
                <div className="queue-node-card" key={order.id}>
                  <div className="node-pos">{idx + 1}</div>
                  <div className="node-details">
                    <span className="node-id">Order #{order.id}</span>
                    <span className="node-items-count">({order.items ? order.items.length : 0} item types)</span>
                  </div>
                  <button 
                    className="promote-node-btn"
                    onClick={() => handleStatusChange(order.id, 'preparing')}
                  >
                    Cook Now 🍳
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GENERAL LOGISTICS TABLE */}
        <div className="orders-table-wrapper">
          <h2>All Database Orders & Status overrides</h2>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {loading && <p>Loading orders...</p>}
          
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Created At</th>
                <th>Items Detail</th>
                <th>Total Price</th>
                <th>Manage Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>#{order.id}</strong></td>
                  <td>{new Date(order.created_at).toLocaleString()}</td>
                  <td>
                    <ul className="order-items-list">
                      {order.items && order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name} <strong>(x{item.quantity})</strong>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>PKR {order.total_price}</td>
                  <td>
                    <select
                      className={`status-select ${order.status}`}
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    >
                      <option value="pending">Pending (Waiting)</option>
                      <option value="on queue">On Queue (Waiting)</option>
                      <option value="preparing">Preparing (Cooking)</option>
                      <option value="on the way">On the Way</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // CUSTOMER DESIGN MATCHING order.html & main-after-login.html
  // ----------------------------------------------------
  return (
    <div className="original-customer-layout">
      {/* Header exactly matching order.html navbar styling */}
      <header className="orig-header">
        <nav className="orig-nav">
          <div className="logo">
            <h1>HR FASTFOOD</h1>
          </div>
          <ul className="nav-links">
            <li><a href="http://localhost/HR_RESPONSIVE_WEBSITE/public/index.html">Home</a></li>
            <li><a href="http://localhost/HR_RESPONSIVE_WEBSITE/public/menu.html">Menu</a></li>
            <li><button className={`nav-tab-link-btn ${customerTab === 'orders' ? 'active' : ''}`} onClick={() => setCustomerTab('orders')}>My Orders</button></li>
            <li><button className={`nav-tab-link-btn ${customerTab === 'contact' ? 'active' : ''}`} onClick={() => setCustomerTab('contact')}>Contact Us</button></li>
            <li><button id="origLogoutBtn" onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </header>

      {/* Main Container matching the class .order from order.css */}
      <main className="orig-main-content">
        
        {/* VIEW 1: MY ORDERS VIEW */}
        {customerTab === 'orders' && (
          <section className="orig-order-section">
            <h2>Order History</h2>
            <p className="order-note">All orders are loaded from your account in the database.</p>
            
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p className="loading">Loading orders...</p>}
            
            <div id="orderSummary">
              {orders.length === 0 ? (
                <p>You have no orders yet. <a href="http://localhost/HR_RESPONSIVE_WEBSITE/public/main-after-login.html">Place your first order</a></p>
              ) : (
                orders.map(order => {
                  const activeStep = getStatusStepIndex(order.status);
                  const isActive = order.status !== 'delivered' && order.status !== 'cancelled';
                  
                  return (
                    <div className="order-card" key={order.id}>
                      <div className="order-header">
                        <strong>Order #{order.id}</strong>
                        <span className={`status status-${order.status.replace(' ', '')}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="order-date">{new Date(order.created_at).toLocaleString()}</p>
                      
                      <ul className="order-items">
                        {order.items && order.items.map((item, idx) => (
                          <li key={idx}>
                            {item.name} &times; {item.quantity} &mdash; PKR {item.line_total || (item.quantity * 350 /* dummy fallback */)}
                          </li>
                        ))}
                      </ul>
                      
                      <p className="order-total">
                        <strong>Total: PKR {order.total_price}</strong>
                      </p>

                      {/* Live Tracker progress bar if the order is currently active */}
                      {isActive && (
                        <div className="orig-tracker-wrapper">
                          <div className="orig-tracker-bar">
                            <div 
                              className="orig-tracker-fill"
                              style={{ width: `${(activeStep / 3) * 100}%` }}
                            ></div>
                          </div>
                          <div className="orig-tracker-steps">
                            <div className={`orig-step-node ${activeStep >= 0 ? 'active' : ''}`}>
                              <span className="orig-node-icon">📦</span>
                              <span className="orig-node-lbl">Placed</span>
                            </div>
                            <div className={`orig-step-node ${activeStep >= 1 ? 'active' : ''}`}>
                              <span className="orig-node-icon">🍳</span>
                              <span className="orig-node-lbl">Cooking</span>
                            </div>
                            <div className={`orig-step-node ${activeStep >= 2 ? 'active' : ''}`}>
                              <span className="orig-node-icon">🛵</span>
                              <span className="orig-node-lbl">On Way</span>
                            </div>
                            <div className={`orig-step-node ${activeStep >= 3 ? 'active' : ''}`}>
                              <span className="orig-node-icon">🎉</span>
                              <span className="orig-node-lbl">Arrived</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

        {/* VIEW 2: CONTACT VIEW */}
        {customerTab === 'contact' && (
          <section className="orig-contact-section">
            <h2>Get in Touch with HR Fastfood</h2>
            <p className="order-note">We’re always happy to hear from you! Whether it’s a question, a suggestion, or just to say hello, we’re here to help.</p>

            <div className="orig-contact-info">
              <div className="orig-contact-item">
                <h3>Call Us</h3>
                <p>Have any questions or want to place an order? Give us a call at <strong>03190387386</strong></p>
              </div>
              <div className="orig-contact-item">
                <h3>Email Us</h3>
                <p>Send us an email at <strong>mirfancs786@gmail.com</strong> for inquiries or feedback.</p>
              </div>
              <div className="orig-contact-item">
                <h3>Visit Us</h3>
                <p>Feel free to drop by! Our location is: <strong>Colony Market near pieas chowk</strong></p>
              </div>
            </div>

            {/* Google Map Embed */}
            <div className="orig-google-map">
              <h3>Our Location</h3>
              <div className="orig-map-iframe-container">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d683.2270856444484!2d73.26586326955616!3d33.657095998331776!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMzPCsDM5JzI1LjYiTiA3M8KwMTUnNTkuNCJF!5e1!3m2!1sen!2s!4v1752609987632!5m2!1sen!2s" 
                  width="100%" 
                  height="350" 
                  style={{ border: 0, borderRadius: '8px' }} 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>

            {/* Contact Form */}
            <div className="orig-contact-form">
              <h3>Send Us a Message</h3>
              {contactSuccess && <p className="success-banner">{contactSuccess}</p>}
              
              <form onSubmit={handleContactSubmit}>
                <label htmlFor="origContactName">Your Name</label>
                <input 
                  type="text" 
                  id="origContactName" 
                  placeholder="John Doe" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required 
                />

                <label htmlFor="origContactEmail">Your Email</label>
                <input 
                  type="email" 
                  id="origContactEmail" 
                  placeholder="youremail@example.com" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required 
                />

                <label htmlFor="origContactMsg">Your Message</label>
                <textarea 
                  id="origContactMsg" 
                  placeholder="Write your message here..." 
                  rows="4" 
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                ></textarea>

                <button type="submit">Send Message</button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Footer matching website exactly */}
      <footer className="orig-footer">
        <p>&copy; 2025 HR Fastfood. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default OrderList;
