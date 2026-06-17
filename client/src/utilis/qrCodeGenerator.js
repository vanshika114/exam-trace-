/**
 * QR Code Generator Utility
 * Creates QR codes with session-specific mobile monitoring URLs
 */

// Install: npm install qrcode.react
// Also install: npm install qrcode (for server-side if needed)

export const generateMonitoringQRCode = (sessionId, studentName, examCode, baseURL = '') => {
  /**
   * Generate a unique monitoring URL that opens the MobileMonitor page
   * Format: /monitor?sessionId=XXX&studentName=XXX&examCode=XXX&token=XXX
   */
  
  const monitoringURL = new URL(
    `/monitor`,
    baseURL || window.location.origin
  );

  // Add query parameters for mobile monitor
  monitoringURL.searchParams.append('sessionId', sessionId);
  monitoringURL.searchParams.append('studentName', encodeURIComponent(studentName));
  monitoringURL.searchParams.append('examCode', examCode);
  monitoringURL.searchParams.append('token', generateSessionToken(sessionId));
  monitoringURL.searchParams.append('timestamp', new Date().toISOString());

  return monitoringURL.toString();
};

/**
 * Generate a session-specific token for security
 * This token should match server-side validation
 */
export const generateSessionToken = (sessionId) => {
  // Simple token generation - in production, use cryptographic methods
  const hash = btoa(`${sessionId}_${Date.now()}_exam`);
  return hash.replace(/[+/=]/g, (c) => ({
    '+': '-',
    '/': '_',
    '=': ''
  }[c]));
};

/**
 * Validate monitoring URL token (client-side check)
 */
export const validateMonitoringToken = (token, sessionId) => {
  if (!token || !sessionId) return false;
  
  // Token should contain session ID
  try {
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    return decoded.includes(sessionId);
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

/**
 * Parse monitoring URL parameters
 */
export const parseMonitoringURL = () => {
  const params = new URLSearchParams(window.location.search);
  
  return {
    sessionId: params.get('sessionId'),
    studentName: decodeURIComponent(params.get('studentName') || ''),
    examCode: params.get('examCode'),
    token: params.get('token'),
    timestamp: params.get('timestamp')
  };
};

/**
 * Generate QR Code SVG using qrcode.react library
 * Usage in component:
 * 
 * import QRCode from 'qrcode.react';
 * 
 * const qrValue = generateMonitoringQRCode(sessionId, name, code);
 * return <QRCode value={qrValue} size={256} />;
 */
export const generateQRCodeConfig = (url, options = {}) => {
  const defaultOptions = {
    value: url,
    size: options.size || 256,
    level: options.level || 'H', // Error correction level: L, M, Q, H
    includeMargin: options.includeMargin !== false,
    imageSettings: {
      src: options.imageSrc || '',
      x: options.imageX || undefined,
      y: options.imageY || undefined,
      height: options.imageHeight || 30,
      width: options.imageWidth || 30,
      excavate: options.imageExcavate || true,
    }
  };

  // Remove imageSettings if no image
  if (!defaultOptions.imageSettings.src) {
    delete defaultOptions.imageSettings;
  }

  return defaultOptions;
};

/**
 * Generate multiple QR codes for batch operations
 * Useful for creating QR codes for multiple students
 */
export const generateBatchQRCodes = (sessions) => {
  /**
   * Input: Array of session objects
   * [{
   *   sessionId: 'sess_123',
   *   studentName: 'John Doe',
   *   examCode: 'EXAM001'
   * }]
   * 
   * Output: Array of QR code URLs
   */
  
  return sessions.map(session => ({
    ...session,
    qrCodeURL: generateMonitoringQRCode(
      session.sessionId,
      session.studentName,
      session.examCode
    ),
    qrCodeConfig: generateQRCodeConfig(
      generateMonitoringQRCode(
        session.sessionId,
        session.studentName,
        session.examCode
      ),
      { size: 256 }
    )
  }));
};

/**
 * Download QR code as image
 * Requires ref to QRCode component
 */
export const downloadQRCode = (qrRef, fileName = 'exam-monitoring-qr.png') => {
  if (!qrRef || !qrRef.current) {
    console.error('QR Code ref not available');
    return;
  }

  const canvas = qrRef.current.querySelector('canvas');
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Get QR code SVG as data URL
 */
export const getQRCodeDataURL = (qrRef) => {
  if (!qrRef || !qrRef.current) {
    console.error('QR Code ref not available');
    return null;
  }

  const canvas = qrRef.current.querySelector('canvas');
  if (!canvas) {
    console.error('Canvas not found');
    return null;
  }

  return canvas.toDataURL('image/png');
};

/**
 * Print QR code
 */
export const printQRCode = (qrRef, studentName = '') => {
  if (!qrRef || !qrRef.current) {
    console.error('QR Code ref not available');
    return;
  }

  const printWindow = window.open('', '', 'height=400,width=600');
  const canvas = qrRef.current.querySelector('canvas');
  
  if (!canvas) {
    console.error('Canvas not found');
    return;
  }

  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>ExamTrace QR Code - ${studentName}</title>
      <style>
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          font-family: Arial, sans-serif;
        }
        .qr-container {
          text-align: center;
          padding: 30px;
        }
        h2 {
          margin-top: 20px;
          color: #333;
        }
        .instructions {
          margin-top: 20px;
          font-size: 12px;
          color: #666;
          max-width: 400px;
        }
      </style>
    </head>
    <body>
      <div class="qr-container">
        <img src="${canvas.toDataURL('image/png')}" alt="QR Code" style="max-width: 300px;">
        <h2>Exam Monitoring QR Code</h2>
        ${studentName ? `<p>Student: ${studentName}</p>` : ''}
        <div class="instructions">
          <p><strong>Instructions:</strong></p>
          <p>1. Student scans this QR code with their mobile device</p>
          <p>2. Opens the mobile monitoring page in browser</p>
          <p>3. Page will monitor for suspicious activity</p>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(content);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 250);
};

export default {
  generateMonitoringQRCode,
  generateSessionToken,
  validateMonitoringToken,
  parseMonitoringURL,
  generateQRCodeConfig,
  generateBatchQRCodes,
  downloadQRCode,
  getQRCodeDataURL,
  printQRCode
};