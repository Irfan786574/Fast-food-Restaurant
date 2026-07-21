import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VerifyPage = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder check — mirrors the original verify.html behavior.
    // Replace with a real API call once a /verify endpoint exists on the backend.
    if (code === '123456') {
      navigate('/login');
    } else {
      setError('Invalid code, please try again.');
    }
  };

  return (
    <div className="verify-layout-wrapper">
      <header><h1>2FA Verification - HR Fastfood</h1></header>

      <section className="verify">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter Verification Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <button type="submit">Verify</button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <footer><p>&copy; 2025 HR Fastfood. All rights reserved.</p></footer>
    </div>
  );
};

export default VerifyPage;
