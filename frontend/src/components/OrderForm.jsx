import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const OrderForm = () => {
  const [user_id, setUserId] = useState('');
  const [total_price, setTotalPrice] = useState('');
  const [status, setStatus] = useState('');
  const [menu_item_id, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

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

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/place-order', {
        items: [{ id: parseInt(menu_item_id), quantity: parseInt(quantity) }],
        totalPrice: parseFloat(total_price),
        userId: parseInt(user_id),
      });

      console.log('Order Response:', response);

      alert('Order created successfully!');
      navigate('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response ? error.response.data.message : 'Error creating order.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Create Order</h2>

      {error && <p style={{ color: 'red' }}>{error}</p>}

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
        </button>
      </form>
    </div>
  );
};

export default OrderForm;
