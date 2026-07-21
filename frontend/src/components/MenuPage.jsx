import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const getCart = () => JSON.parse(localStorage.getItem('cart')) || {};
const saveCart = (cart) => localStorage.setItem('cart', JSON.stringify(cart));

const MenuPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Clear details as per original window.onload
    localStorage.removeItem('orderDetails');
    localStorage.removeItem('cart');
    setCart({});
    
    const fetchMenu = async () => {
      setLoading(true);
      try {
        const response = await api.get('/menu');
        setMenuItems(response.data);
      } catch (err) {
        console.error('Error fetching menu:', err);
        setError('Could not load menu. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const isAvailable = (item) => {
    const available = item.is_available === undefined || item.is_available === 1 || item.is_available === true;
    const inStock = item.stock === undefined || item.stock === null || item.stock > 0;
    return available && inStock;
  };

  const updateQuantity = (item, change) => {
    const maxStock = item.stock != null ? item.stock : 999;
    const current = cart[item.id] || 0;
    let next = current + change;
    if (next < 0) next = 0;
    if (next > maxStock) {
      next = maxStock;
      alert(`Only ${maxStock} available for ${item.name}`);
    }

    const newCart = { ...cart };
    if (next > 0) {
      newCart[item.id] = next;
    } else {
      delete newCart[item.id];
    }
    setCart(newCart);
    saveCart(newCart);
  };

  const cartEntries = Object.entries(cart)
    .map(([id, quantity]) => {
      const item = menuItems.find((m) => String(m.id) === String(id));
      return item ? { item, quantity } : null;
    })
    .filter(Boolean);

  const totalPrice = cartEntries.reduce((sum, { item, quantity }) => sum + item.price * quantity, 0);

  const handlePlaceOrder = () => {
    if (cartEntries.length === 0) return;
    navigate('/order-confirmation');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('cart');
    navigate('/');
  };

  return (
    <div className="menu-page-wrapper">
      <header>
        <h1>Welcome to HR Fastfood</h1>
        <nav>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/menu">Menu</Link></li>
            <li><Link to="/orders">My Orders</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><button id="logoutBtn" onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </header>

      <section className="menu-container">
        <h2>Our Menu</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {loading && <p className="loading">Loading menu...</p>}

        <div className="menu-items">
          {!loading && menuItems.length === 0 && !error && <p>No items available right now.</p>}

          {menuItems.map((item) => {
            const available = isAvailable(item);
            const maxStock = item.stock != null ? item.stock : 999;
            const quantity = cart[item.id] || 0;

            return (
              <div className={`menu-item ${!available ? 'unavailable' : ''}`} key={item.id}>
                <img
                  src={item.image_url || '/images/logos/burger_logo.jpg'}
                  alt={item.name}
                  onError={(e) => { e.target.src = '/images/logos/burger_logo.jpg'; }}
                />
                <h3>{item.name}</h3>
                <p>Price: PKR {item.price}</p>
                {item.discount ? <p>Discount: {item.discount}% OFF</p> : null}
                <p className="stock">{available ? `Available: ${maxStock}` : 'Out of stock'}</p>

                <div className="quantity-control">
                  <button disabled={!available} onClick={() => updateQuantity(item, -1)}>-</button>
                  <input type="number" value={quantity} readOnly />
                  <button disabled={!available} onClick={() => updateQuantity(item, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="order-summary">
        <h2>Order Summary</h2>
        <div id="order-summary-list">
          {cartEntries.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            cartEntries.map(({ item, quantity }) => (
              <div className="order-item" key={item.id}>
                <span>{item.name}</span>
                <span>Qty: {quantity}</span>
                <span>Price: PKR {item.price}</span>
                <span>Total: PKR {item.price * quantity}</span>
              </div>
            ))
          )}
        </div>
        <div id="total-price">Total Price: PKR {totalPrice}</div>

        {cartEntries.length > 0 && (
          <button id="place-order-btn" onClick={handlePlaceOrder}>Place Order</button>
        )}
      </section>

      <footer>
        <p>&copy; 2025 HR Fastfood. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default MenuPage;
