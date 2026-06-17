/**
 * Session Utilities
 * Handles session management, storage, and validation
 */

const SESSION_KEYS = {
  USER_ID: 'userId',
  STUDENT_NAME: 'studentName',
  EXAM_CODE: 'examCode',
  LOGIN_TIME: 'loginTime',
  JUDGE_TOKEN: 'judgeToken',
  JUDGE_ROLE: 'judgeRole',
  SESSION_ID: 'sessionId'
};

/**
 * Get current user's session data
 */
export const getSessionData = () => {
  const session = {
    userId: localStorage.getItem(SESSION_KEYS.USER_ID),
    studentName: localStorage.getItem(SESSION_KEYS.STUDENT_NAME),
    examCode: localStorage.getItem(SESSION_KEYS.EXAM_CODE),
    loginTime: localStorage.getItem(SESSION_KEYS.LOGIN_TIME),
    sessionId: localStorage.getItem(SESSION_KEYS.SESSION_ID)
  };

  // Validate that required fields exist
  if (!session.userId) {
    return null;
  }

  return session;
};

/**
 * Get judge session data
 */
export const getJudgeSession = () => {
  const session = {
    token: localStorage.getItem(SESSION_KEYS.JUDGE_TOKEN),
    role: localStorage.getItem(SESSION_KEYS.JUDGE_ROLE)
  };

  if (!session.token || session.role !== 'judge') {
    return null;
  }

  return session;
};

/**
 * Check if user is authenticated as student
 */
export const isStudentAuthenticated = () => {
  return getSessionData() !== null;
};

/**
 * Check if user is authenticated as judge
 */
export const isJudgeAuthenticated = () => {
  return getJudgeSession() !== null;
};

/**
 * Create a new session for student
 */
export const createStudentSession = (studentName, examCode) => {
  const userId = generateUserId(studentName, examCode);
  const sessionId = generateSessionId();
  const loginTime = new Date().toISOString();

  localStorage.setItem(SESSION_KEYS.USER_ID, userId);
  localStorage.setItem(SESSION_KEYS.STUDENT_NAME, studentName);
  localStorage.setItem(SESSION_KEYS.EXAM_CODE, examCode);
  localStorage.setItem(SESSION_KEYS.LOGIN_TIME, loginTime);
  localStorage.setItem(SESSION_KEYS.SESSION_ID, sessionId);

  return {
    userId,
    studentName,
    examCode,
    loginTime,
    sessionId
  };
};

/**
 * Create a new session for judge
 */
export const createJudgeSession = (token) => {
  localStorage.setItem(SESSION_KEYS.JUDGE_TOKEN, token);
  localStorage.setItem(SESSION_KEYS.JUDGE_ROLE, 'judge');

  return {
    token,
    role: 'judge'
  };
};

/**
 * Clear student session
 */
export const clearStudentSession = () => {
  localStorage.removeItem(SESSION_KEYS.USER_ID);
  localStorage.removeItem(SESSION_KEYS.STUDENT_NAME);
  localStorage.removeItem(SESSION_KEYS.EXAM_CODE);
  localStorage.removeItem(SESSION_KEYS.LOGIN_TIME);
  localStorage.removeItem(SESSION_KEYS.SESSION_ID);
};

/**
 * Clear judge session
 */
export const clearJudgeSession = () => {
  localStorage.removeItem(SESSION_KEYS.JUDGE_TOKEN);
  localStorage.removeItem(SESSION_KEYS.JUDGE_ROLE);
};

/**
 * Clear all sessions
 */
export const clearAllSessions = () => {
  clearStudentSession();
  clearJudgeSession();
};

/**
 * Generate unique userId from student info
 */
export const generateUserId = (studentName, examCode) => {
  const sanitizedName = studentName.replace(/\s+/g, '_').toLowerCase();
  const timestamp = Date.now();
  return `${sanitizedName}_${examCode}_${timestamp}`;
};

/**
 * Generate unique session ID
 */
export const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `sess_${timestamp}_${random}`;
};

/**
 * Get session duration in milliseconds
 */
export const getSessionDuration = () => {
  const session = getSessionData();
  if (!session || !session.loginTime) {
    return null;
  }

  const loginTime = new Date(session.loginTime);
  const currentTime = new Date();
  return currentTime.getTime() - loginTime.getTime();
};

/**
 * Get formatted session duration
 */
export const getFormattedSessionDuration = () => {
  const duration = getSessionDuration();
  if (!duration) return 'N/A';

  const seconds = Math.floor(duration / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

/**
 * Check if session is valid (not expired)
 * @param maxDurationMinutes - Maximum session duration in minutes
 */
export const isSessionValid = (maxDurationMinutes = 180) => {
  const duration = getSessionDuration();
  if (!duration) return false;

  const maxDurationMs = maxDurationMinutes * 60 * 1000;
  return duration < maxDurationMs;
};

/**
 * Get session info for API calls
 */
export const getSessionHeaders = () => {
  const session = getSessionData();
  if (!session) {
    return {};
  }

  return {
    'X-User-ID': session.userId,
    'X-Session-ID': session.sessionId,
    'X-Student-Name': session.studentName,
    'X-Exam-Code': session.examCode
  };
};

/**
 * Get judge session headers
 */
export const getJudgeHeaders = () => {
  const session = getJudgeSession();
  if (!session) {
    return {};
  }

  return {
    'Authorization': `Bearer ${session.token}`,
    'X-Judge-Role': 'judge'
  };
};

/**
 * Merge headers with session info
 */
export const buildAuthHeaders = (isJudge = false) => {
  const baseHeaders = {
    'Content-Type': 'application/json'
  };

  if (isJudge) {
    return { ...baseHeaders, ...getJudgeHeaders() };
  }

  return { ...baseHeaders, ...getSessionHeaders() };
};

/**
 * Make authenticated API call
 */
export const apiCall = async (
  endpoint,
  options = {},
  isJudge = false
) => {
  const headers = buildAuthHeaders(isJudge);

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - clear session
      if (isJudge) {
        clearJudgeSession();
      } else {
        clearStudentSession();
      }
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Validate session token from URL
 */
export const validateSessionToken = (token) => {
  if (!token) return false;

  try {
    // Simple validation - token should be base64
    atob(token);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get session metadata
 */
export const getSessionMetadata = () => {
  const session = getSessionData();
  if (!session) {
    return null;
  }

  return {
    ...session,
    duration: getFormattedSessionDuration(),
    isValid: isSessionValid(),
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    screenResolution: `${window.innerWidth}x${window.innerHeight}`
  };
};

/**
 * Log session activity
 */
export const logSessionActivity = async (activityType, details = {}) => {
  const session = getSessionData();
  if (!session) {
    console.warn('No active session');
    return;
  }

  const activity = {
    sessionId: session.sessionId,
    userId: session.userId,
    activityType,
    details,
    timestamp: new Date().toISOString()
  };

  try {
    await apiCall('/api/activity', {
      method: 'POST',
      body: JSON.stringify(activity)
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export default {
  getSessionData,
  getJudgeSession,
  isStudentAuthenticated,
  isJudgeAuthenticated,
  createStudentSession,
  createJudgeSession,
  clearStudentSession,
  clearJudgeSession,
  clearAllSessions,
  generateUserId,
  generateSessionId,
  getSessionDuration,
  getFormattedSessionDuration,
  isSessionValid,
  getSessionHeaders,
  getJudgeHeaders,
  buildAuthHeaders,
  apiCall,
  validateSessionToken,
  getSessionMetadata,
  logSessionActivity
};