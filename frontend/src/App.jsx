import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import SignupPage from './components/SignupPage';
import VerifyPage from './components/VerifyPage';
import AboutPage from './components/AboutPage';
import MenuPage from './components/MenuPage';
import OrderConfirmationPage from './components/OrderConfirmationPage';
import OrderSuccessPage from './components/OrderSuccessPage';
import ReceiptUploadPage from './components/ReceiptUploadPage';
import OrderList from './components/OrderList';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Customer pages — require login */}
        <Route path="/menu" element={<PrivateRoute><MenuPage /></PrivateRoute>} />
        <Route path="/order-confirmation" element={<PrivateRoute><OrderConfirmationPage /></PrivateRoute>} />
        <Route path="/order-success" element={<PrivateRoute><OrderSuccessPage /></PrivateRoute>} />
        <Route path="/receipt-upload" element={<PrivateRoute><ReceiptUploadPage /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
