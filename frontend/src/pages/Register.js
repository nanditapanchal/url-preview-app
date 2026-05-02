import React, { useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function Register({ onSwitch }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await axios.post(`${API}/register`, { username, password });
      setSuccess('Account created! You can now log in.');
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Create account</h2>
        <p>Sign up to start saving URL previews</p>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-msg">{error}</div>}
          {success && <div className="success-msg">{success}</div>}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <div className="switch-link">
          Already have an account?{' '}
          <span onClick={onSwitch}>Log in</span>
        </div>
      </div>
    </div>
  );
}

export default Register;
