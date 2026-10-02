import axios from 'axios';

export function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing via local network IP or localhost, dynamically point to host port 3001
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return `http://${hostname}:3001`;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-attach authorization token and dynamic baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = `${getBackendUrl()}/api`;
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(Array.isArray(message) ? message[0] : message));
  }
);

export default api;
