// /src/components/Login.js

import React, { useState } from 'react';
import api from '../order-management-frontend/src/utils/api';  // Axios instance to interact with backend
import { useNavigate } from 'react-router-dom';  // Import useNavigate from react-router-dom

const Login = () => {
  const [email, setEmail] = useState('');  // State for email input
  const [password, setPassword] = useState('');  // State for password input
  const [error, setError] = useState('');  // State for error messages
  const navigate = useNavigate();  // For navigation after successful login

  // Handle form submission (Login)
  const handleSubmit = async (e) => {
    e.preventDefault();  // Prevent the form from submitting in the default way

    try {
      // Send POST request to the backend for login
      const response = await api.post('/login', { email, password });

      // Log the response to check the token
      console.log('Login Response:', response);

      // Check if we received a token from backend
      if (response.data.token) {
        // Store the JWT token in localStorage
        localStorage.setItem('token', response.data.token);
        console.log('JWT Token stored in localStorage:', response.data.token);

        // Redirect user to the orders page after successful login
        navigate('/orders');
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      // Catch any errors and display them
      console.error('Error logging in:', error);
      setError('Invalid credentials');
    }
  };

  return (
    <div>
      <h2>Login</h2>

      {/* Login form */}
      <form onSubmit={handleSubmit}>
        {/* Email input */}
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}  // Update email state
            required
          />
        </div>

        {/* Password input */}
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}  // Update password state
            required
          />
        </div>

        {/* Error message */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Submit button */}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
