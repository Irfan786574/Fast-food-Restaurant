import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const OrderSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="order-success-wrapper">
      <header className="orig-header">
        <nav className="orig-nav">
          <div className="logo"><h1>HR FASTFOOD</h1></div>
        </nav>
      </header>

      <section className="success-container">
        <h2>🎉 Order Placed Successfully!</h2>
        {orderId && <p>Your order number is <strong>#{orderId}</strong></p>}
        <p>We've received your order and it's now on queue. You can track its status from your orders page.</p>

        <div className="success-actions">
          <Link to="/orders" className="btn-primary">View My Orders</Link>
          <Link to={`/receipt-upload?orderId=${orderId || ''}`} className="btn-secondary">Upload Payment Receipt</Link>
          <Link to="/menu">Back to Menu</Link>
        </div>
      </section>

      <footer className="orig-footer">
        <p>&copy; 2025 HR Fastfood. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default OrderSuccessPage;
