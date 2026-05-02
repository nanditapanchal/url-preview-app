import React, { useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [page, setPage] = useState('login');

  const handleLogin = (tok) => {
    localStorage.setItem('token', tok);
    setToken(tok);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setPage('login');
  };

  if (token) {
    return <Dashboard token={token} onLogout={handleLogout} />;
  }

  return (
    <div>
      {page === 'login' ? (
        <Login onLogin={handleLogin} onSwitch={() => setPage('register')} />
      ) : (
        <Register onSwitch={() => setPage('login')} />
      )}
    </div>
  );
}

export default App;
