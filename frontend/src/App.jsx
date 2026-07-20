import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/orders" element={<PrivateRoute><OrderList /></PrivateRoute>} />
        <Route path="/create-order" element={<PrivateRoute><OrderForm /></PrivateRoute>} />
      </Routes>
    </Router>
  );
};

export default App;
