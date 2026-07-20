import React, { useState } from 'react';
import api from '../api-related/api';  // Axios instance
import { useNavigate } from 'react-router-dom';

const OrderForm = () => {
  const [user_id, setUserId] = useState('');
  const [total_price, setTotalPrice] = useState('');
  const [status, setStatus] = useState('');
  const [menu_item_id, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');  // For showing error message
  const [loading, setLoading] = useState(false);  // To show loading indicator
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Form Validation
    if (!user_id || !total_price || !status || !menu_item_id || !quantity) {
      setError('All fields are required');
      return;
    }

    const orderData = {
      user_id,
      total_price,
      status,
      menu_item_id,
      quantity,
    };

    setLoading(true);  // Start loading indicator
    setError('');  // Clear any previous error

    try {
      // Send the order data without the JWT token (no Authorization header)
      const response = await api.post('/orders', orderData);

      console.log('Order Response:', response);  // Log the response from the backend

      alert('Order created successfully!');
      navigate('/orders');  // Redirect to orders page after successful order creation
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response ? error.response.data.message : 'Error creating order.');  // Show error message from backend
    } finally {
      setLoading(false);  // Stop loading indicator after request completion
    }
  };

  return (
    <div>
      <h2>Create Order</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}  {/* Display error message */}

      <form onSubmit={handleSubmit}>
        <div>
          <label>User ID:</label>
          <input
            type="text"
            value={user_id}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <div>
          <label>Total Price:</label>
          <input
            type="text"
            value={total_price}
            onChange={(e) => setTotalPrice(e.target.value)}
          />
        </div>

        <div>
          <label>Status:</label>
          <input
            type="text"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>

        <div>
          <label>Menu Item ID:</label>
          <input
            type="text"
            value={menu_item_id}
            onChange={(e) => setMenuItemId(e.target.value)}
          />
        </div>

        <div>
          <label>Quantity:</label>
          <input
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Create Order'}
        </button>  {/* Disable button while loading */}
      </form>
    </div>
  );
};

export default OrderForm;
