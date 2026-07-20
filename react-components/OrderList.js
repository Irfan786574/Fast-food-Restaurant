// /src/components/OrderList.js

import React, { useState, useEffect } from 'react';
import api from '../order-management-frontend/src/utils/api';

const OrderList = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Fetch orders with the token in the Authorization header
        const response = await api.get('/orders', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Get token from localStorage
          },
        });

        setOrders(response.data);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div>
      <h2>Orders</h2>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>User ID</th>
            <th>Total Price</th>
            <th>Status</th>
            <th>Menu Item ID</th>
            <th>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.order_id}>
              <td>{order.order_id}</td>
              <td>{order.user_id}</td>
              <td>{order.total_price}</td>
              <td>{order.status}</td>
              <td>{order.menu_item_id}</td>
              <td>{order.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderList;
