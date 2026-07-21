import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const SignupPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/signup', { name, email, password });
      navigate('/verify');
    } catch (err) {
      console.error('Error during signup:', err);
      setError(err.response?.data?.message || 'Error during signup, please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-layout-wrapper">
      <header><h1>Signup - HR Fastfood</h1></header>

      <section className="signup">
        <form onSubmit={handleSubmit}>
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? 'Signing up...' : 'Sign Up'}</button>
        </form>
        {error && <p className="error">{error}</p>}
        <p style={{ marginTop: '1rem' }}>Already have an account? <Link to="/login">Login</Link></p>
      </section>

      <footer><p>&copy; 2025 HR Fastfood. All rights reserved.</p></footer>
    </div>
  );
};

export default SignupPage;
