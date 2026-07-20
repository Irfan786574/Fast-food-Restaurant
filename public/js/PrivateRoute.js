// /src/components/PrivateRoute.js

import React from 'react';
import { Navigate } from 'react-router-dom';  // Import Navigate for v6

const PrivateRoute = ({ component: Component, ...rest }) => {
  const token = localStorage.getItem('token');

  return token ? <Component {...rest} /> : <Navigate to="/login" />;
};

export default PrivateRoute;
