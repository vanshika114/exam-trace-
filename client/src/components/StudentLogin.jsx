import React, { useState } from 'react';
import './StudentLogin.css';

export default function StudentLogin({ onLogin }) {
  const [name, setName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!examCode.trim()) {
      setError('Exam code is required');
      return;
    }
    if (examCode.trim().length < 4) {
      setError('Exam code must be at least 4 characters');
      return;
    }

    setLoading(true);

    try {
      // Generate a unique userId from name + exam code + timestamp
      const userId = `${name.replace(/\s+/g, '_')}_${examCode}_${Date.now()}`;
      
      // Store in localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('studentName', name);
      localStorage.setItem('examCode', examCode);
      localStorage.setItem('loginTime', new Date().toISOString());

      // Send to backend to initialize session
      // const response = await fetch('/api/sessions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     userId,
      //     studentName: name,
      //     examCode: examCode,
      //     loginTime: new Date().toISOString()
      //   })
      // });

      // if (!response.ok) {
      //   throw new Error('Failed to initialize session');
      // }

      // Call parent callback with login data
      onLogin({ userId, name, examCode });

    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
      localStorage.removeItem('userId');
      localStorage.removeItem('studentName');
      localStorage.removeItem('examCode');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>ExamTrace</h1>
          <p className="subtitle">Student Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="examCode">Exam Code</label>
            <input
              id="examCode"
              type="text"
              value={examCode}
              onChange={(e) => setExamCode(e.target.value.toUpperCase())}
              placeholder="Enter exam code (e.g., EXAM001)"
              disabled={loading}
            />
            <small>Your teacher will provide this code</small>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Start Exam'}
          </button>
        </form>

        <div className="login-footer">
          <p>This exam is monitored using ExamTrace</p>
          <p className="warning">⚠️ Unauthorized activities will be flagged</p>
        </div>
      </div>
    </div>
  );
}