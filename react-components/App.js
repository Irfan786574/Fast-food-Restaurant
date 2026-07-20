  // /src/App.js

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';  // updated import
import Navbar from './components/Navbar';
import OrderForm from './components/OrderForm';
import OrderList from './components/OrderList';
import Login from './components/Login';
import PrivateRoute from './components/PrivateRoute'; // This should be modified too for React Router v6

const App = () => {
  return (
    <Router>
      <Navbar />
      <Routes>  {/* Use Routes instead of Switch */}
        <Route path="/" element={<h1>Welcome to the Order Management System</h1>} />
        <Route path="/login" element={<Login />} />
        {/* Use PrivateRoute or protect routes using the element prop */}
        <Route path="/orders" element={<PrivateRoute component={OrderList} />} />
        <Route path="/create-order" element={<PrivateRoute component={OrderForm} />} />
      </Routes>
    </Router>
  );
};

export default App;
