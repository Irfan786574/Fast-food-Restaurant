import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const OrderConfirmationPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrderDetails = async () => {
      const storedCart = JSON.parse(localStorage.getItem('cart')) || {};
      if (Object.keys(storedCart).length === 0) {
        setError('Cart is empty');
        return;
      }
      setCart(storedCart);

      try {
        const response = await api.get('/menu');
        setMenuItems(response.data);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Failed to fetch menu items');
      }
    };
    loadOrderDetails();
  }, []);

  const cartEntries = Object.entries(cart)
    .map(([id, quantity]) => {
      const item = menuItems.find((m) => String(m.id) === String(id));
      return item ? { item, quantity: parseInt(quantity) } : null;
    })
    .filter(Boolean);

  const totalPrice = cartEntries.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  const handleConfirm = async () => {
    if (cartEntries.length === 0) return;
    setSubmitting(true);
    setError('');

    const items = cartEntries.map(({ item, quantity }) => ({ id: item.id, quantity }));

    try {
      const response = await api.post(
        '/place-order',
        { items, totalPrice: totalPrice.toFixed(2) },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      if (response.data.success) {
        localStorage.removeItem('cart');
        navigate(`/order-success?orderId=${encodeURIComponent(response.data.orderId)}`);
      } else {
        throw new Error(response.data.message || 'Order failed');
      }
    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.response?.data?.message || err.message || 'Error placing order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      localStorage.removeItem('cart');
      navigate('/menu');
    }
  };

  return (
    <div className="order-confirm-wrapper">
      <header className="orig-header">
        <nav className="orig-nav">
          <div className="logo"><h1>HR FASTFOOD</h1></div>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">Contact</Link></li>
          </ul>
        </nav>
      </header>

      <section className="order-summary-container">
        <h2>Confirm Your Order</h2>

        {error && (
          <div className="error">
            {error}. <Link to="/menu">Return to menu</Link>
          </div>
        )}

        {!error && (
          <>
            <div id="order-summary-list">
              {cartEntries.map(({ item, quantity }) => (
                <div className="order-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong><br />
                    <small>PKR {item.price} each</small>
                  </div>
                  <div>Qty: {quantity}</div>
                  <div><strong>PKR {(item.price * quantity).toFixed(2)}</strong></div>
                </div>
              ))}
            </div>

            <div id="total-price">
              <h3>Total Price: PKR {totalPrice.toFixed(2)}</h3>
            </div>

            <div className="button-container">
              <button id="confirm-order-btn" disabled={submitting} onClick={handleConfirm}>
                {submitting ? 'Processing...' : 'Confirm Order'}
              </button>
              <button id="cancel-order-btn" onClick={handleCancel}>Cancel Order</button>
            </div>
          </>
        )}
      </section>

      <footer className="orig-footer">
        <p>&copy; 2025 HR Fastfood. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default OrderConfirmationPage;
