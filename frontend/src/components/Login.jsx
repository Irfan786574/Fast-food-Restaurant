import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/login', { email, password });

      console.log('Login Response:', response);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        console.log('JWT Token stored in localStorage:', response.data.token);
        if (response.data.isAdmin) {
          navigate('/orders');
        } else {
          navigate('/menu');
        }
      } else {
        setError('Invalid credentials');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      setError('Invalid credentials');
    }
  };

  return (
    <div className="form-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
