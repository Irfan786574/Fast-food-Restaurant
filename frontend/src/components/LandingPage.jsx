import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const LandingPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch Menu from database
  useEffect(() => {
    const fetchMenuItems = async () => {
      setLoading(true);
      try {
        const response = await api.get('/menu');
        setMenuItems(response.data);
      } catch (err) {
        console.error('Error fetching menu items:', err);
        setError('Could not load menu. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    };
    fetchMenuItems();
  }, []);

  // Decode JWT payload details
  const getUserDetails = () => {
    const token = localStorage.getItem('token');
    if (!token) return { loggedIn: false, role: 'guest', email: '' };
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        loggedIn: true,
        role: payload.role || 'customer',
        email: payload.email || '',
      };
    } catch (e) {
      return { loggedIn: false, role: 'guest', email: '' };
    }
  };

  const { loggedIn, role, email } = getUserDetails();
  const isAdmin = role === 'admin';

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload(); // Refresh to reset nav status
  };

  const handleScrollToMenu = (e) => {
    e.preventDefault();
    const element = document.getElementById('menu-items-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-layout-wrapper">
      {/* Header exactly matching your landing page HTML */}
      <header className="orig-header">
        <nav className="orig-nav">
          <div className="logo">
            <h1>HR FASTFOOD</h1>
          </div>
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><a href="#menu" onClick={handleScrollToMenu}>Menu</a></li>
            
            {/* Dynamic links based on login and role */}
            {loggedIn ? (
              <>
                {isAdmin ? (
                  <li><Link to="/orders" className="panel-highlight">Admin Panel</Link></li>
                ) : (
                  <li><Link to="/orders" className="panel-highlight">My Orders</Link></li>
                )}
                <li><button id="origLogoutBtn" onClick={handleLogout}>Logout</button></li>
              </>
            ) : (
              <>
                <li><Link to="/login">Login</Link></li>
              </>
            )}
          </ul>
        </nav>
      </header>

      {/* Hero Section matching your HTML */}
      <section className="hero">
        <div className="hero-content">
          <h2>Fresh, Fast, and Delicious!</h2>
          <p>Order your favorite fast food online now and enjoy the taste!</p>
          <a href="#menu" className="btn-primary" onClick={handleScrollToMenu}>View Menu</a>
        </div>
      </section>

      {/* Menu Section matching your HTML */}
      <section className="menu" id="menu-items-section">
        <h2>Our Menu</h2>
        {error && <p style={{ color: 'red', margin: '1rem 0' }}>{error}</p>}
        {loading && <p className="loading">Loading menu from database...</p>}
        
        <div id="menu-items" className="menu-items">
          {menuItems.length === 0 && !loading && !error && (
            <p>No items available right now. Check back soon!</p>
          )}
          
          {menuItems.map(item => (
            <div className={`menu-item ${!item.is_available ? 'unavailable' : ''}`} key={item.id}>
              <img 
                src={item.image_url || '/images/logos/burger_logo.jpg'} 
                alt={item.name} 
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400'; // high-quality fallback image
                }}
              />
              <h3>{item.name}</h3>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Section matching your HTML */}
      <footer className="orig-footer">
        <p>&copy; 2025 HR Fastfood. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
