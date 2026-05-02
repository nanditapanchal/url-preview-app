import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function Dashboard({ token, onLogout }) {
  const [url, setUrl] = useState('');
  const [savedUrls, setSavedUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null); // holds image src when open

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
      {/* Lightbox overlay */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
          <img
            className="lightbox-img"
            src={lightbox}
            alt="screenshot"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

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
              {loading ? 'Fetching preview...' : 'Preview'}
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
            <URLCard
              key={i}
              item={item}
              formatDate={formatDate}
              onScreenshotClick={(src) => setLightbox(src)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function URLCard({ item, formatDate, onScreenshotClick }) {
  const domain = getDomain(item.url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const hasScreenshot = item.preview_url && item.preview_url.length > 0;

  return (
    <div className="url-card">
      {/* Screenshot — clicking opens lightbox, not the website */}
      {hasScreenshot ? (
        <ScreenshotImage
          src={item.preview_url}
          alt={item.title}
          onClick={() => onScreenshotClick(item.preview_url)}
        />
      ) : (
        <div className="url-card-no-preview">
          <span>📷 Screenshot not available for this site</span>
        </div>
      )}

      {/* Info row */}
      <div className="url-card-bottom">
        <FaviconImg src={faviconUrl} domain={domain} />
        <div className="url-card-bottom-text">
          <div className="url-card-title">{item.title || domain}</div>
          {/* Only this link opens the website */}
          <a className="url-card-link" href={item.url} target="_blank" rel="noreferrer">
            {item.url}
          </a>
          <div className="url-card-date">{formatDate(item.saved_at)}</div>
        </div>
      </div>
    </div>
  );
}

function ScreenshotImage({ src, alt, onClick }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="url-card-no-preview">
        <span>📷 Screenshot not available for this site</span>
      </div>
    );
  }

  return (
    <div className="screenshot-wrapper" onClick={onClick} title="Click to enlarge">
      <img
        className="url-card-preview"
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
      />
      <div className="screenshot-overlay">🔍 Click to enlarge</div>
    </div>
  );
}

function FaviconImg({ src, domain }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="favicon-fallback">
        {domain.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      className="favicon-img"
      src={src}
      alt={domain}
      onError={() => setFailed(true)}
    />
  );
}

export default Dashboard;