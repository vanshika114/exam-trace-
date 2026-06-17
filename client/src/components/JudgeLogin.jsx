import React, { useState } from 'react';
import './JudgeLogin.css';

export default function JudgeLogin({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    if (password.length < 4) {
      setError('Invalid password');
      return;
    }

    setLoading(true);

    try {
      // Send password to backend for verification
      const response = await fetch('/api/judge/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        throw new Error('Invalid password');
      }

      const data = await response.json();

      // Store judge session
      localStorage.setItem('judgeToken', data.token || 'judge_' + Date.now());
      localStorage.setItem('judgeRole', 'judge');
      localStorage.setItem('judgeLoginTime', new Date().toISOString());

      // Call parent callback
      onLogin({ 
        role: 'judge',
        token: data.token 
      });

    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
      // Optional: Send failed attempt to backend for security logging
      try {
        await fetch('/api/judge/log-attempt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            timestamp: new Date().toISOString(),
            success: false 
          })
        });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="judge-login-container">
      <div className="judge-login-card">
        <div className="judge-login-header">
          <div className="judge-badge">👨‍⚖️</div>
          <h1>ExamTrace</h1>
          <p className="subtitle">Judge Access</p>
        </div>

        <form onSubmit={handleSubmit} className="judge-login-form">
          <div className="form-group">
            <label htmlFor="password">Administrator Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="judge-login-button"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Access Dashboard'}
          </button>
        </form>

        <div className="judge-login-footer">
          <p>🔐 Secure judge access for exam monitoring</p>
          <p className="access-info">View student reports • Monitor integrity • Generate QR codes</p>
        </div>
      </div>
    </div>
  );
}