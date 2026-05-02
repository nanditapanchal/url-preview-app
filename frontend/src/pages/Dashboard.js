import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function Dashboard({ token, onLogout }) {
  const [url, setUrl] = useState('');
  const [savedUrls, setSavedUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  const fetchSavedUrls = async () => {
    try {
      const res = await axios.get(`${API}/urls`, { headers });
      setSavedUrls(res.data);
    } catch (err) {
      if (err.response?.status === 401) onLogout();
    }
  };

  useEffect(() => {
    fetchSavedUrls();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/preview`, { url }, { headers });
      setSavedUrls(prev => [res.data, ...prev]);
      setUrl('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get preview');
    }
    setLoading(false);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🔗 URL Preview</h1>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="url-form">
        <h2>Enter a website URL</h2>
        <form onSubmit={handleSubmit}>
          <div className="url-input-row">
            <input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Preview'}
            </button>
          </div>
        </form>
        {error && <div className="error-msg" style={{ marginTop: 10 }}>{error}</div>}
      </div>

      <div className="saved-section">
        <h2>Saved Previews ({savedUrls.length})</h2>
        {savedUrls.length === 0 ? (
          <div className="empty-state">No saved URLs yet. Enter a URL above to get started!</div>
        ) : (
          savedUrls.map((item, i) => (
            <div className="url-card" key={i}>
              <PreviewImage src={item.preview_url} alt={item.title} />
              <div className="url-card-info">
                <div className="url-card-title">{item.title || item.url}</div>
                <a
                  className="url-card-link"
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {item.url}
                </a>
                <div className="url-card-date">{formatDate(item.saved_at)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PreviewImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="url-card-preview-placeholder">
        Preview not available
      </div>
    );
  }

  return (
    <img
      className="url-card-preview"
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}

export default Dashboard;
