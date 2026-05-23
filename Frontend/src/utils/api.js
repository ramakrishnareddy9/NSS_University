import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api'
);

const getCookieValue = (name) => {
  const cookieString = typeof document !== 'undefined' ? document.cookie : '';
  if (!cookieString) return null;

  const entry = cookieString.split('; ').find(part => part.startsWith(`${name}=`));
  if (!entry) return null;

  return decodeURIComponent(entry.split('=').slice(1).join('='));
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (typeof config.url === 'string' && (config.url.includes('/auth/refresh') || config.url.includes('/auth/logout'))) {
      const csrfToken = getCookieValue('refreshCsrfToken');
      if (csrfToken) {
        config.headers['x-refresh-csrf-token'] = csrfToken;
      }
    }

    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only redirect to login on actual token/auth failure, not on other 401 scenarios
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const errorMessage = error.response?.data?.message || '';
      const shouldRedirect = 
        errorMessage.includes('No token') ||
        errorMessage.includes('token is invalid') ||
        errorMessage.includes('token has expired') ||
        errorMessage.includes('authorization denied') ||
        errorMessage.includes('no authorization token');
      
      if (shouldRedirect) {
        originalRequest._retry = true;
        try {
          const refreshResponse = await axios.post(
            `${API_BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );

          const newToken = refreshResponse.data?.data?.accessToken || refreshResponse.data?.data?.token;
          if (newToken) {
            localStorage.setItem('token', newToken);
            if (refreshResponse.data?.data?.user) {
              localStorage.setItem('user', JSON.stringify(refreshResponse.data.data.user));
            }
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // For other 401 cases (e.g., "Email not verified"), let the component handle it
    }
    return Promise.reject(error);
  }
);

export default api;