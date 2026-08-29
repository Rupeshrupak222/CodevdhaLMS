import axios from 'axios';
import { toast } from 'react-hot-toast';

// Public pages that should never redirect to /login on auth failure
const PUBLIC_PAGES = ['/privacy', '/terms', '/contact'];

const isPublicPage = () => {
  if (typeof window === 'undefined') return false;
  return PUBLIC_PAGES.includes(window.location.pathname);
};

let isRefreshing = false;
let pendingRequests: Array<(token: string | null) => void> = [];

const flushPendingRequests = (token: string | null) => {
  pendingRequests.forEach((callback) => callback(token));
  pendingRequests = [];
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send HttpOnly cookies for JWT
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('lms-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response Interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url?.includes('/auth/login')) {
      const errMsg = error.response?.data?.message || 'Invalid email or password';
      toast.error(errMsg);
      return Promise.reject(error);
    }

    // Bypass refresh logic and automatic toasts for face auth endpoints
    const isFaceAuthEndpoint = originalRequest.url?.includes('/auth/face-verify') || originalRequest.url?.includes('/auth/face-enroll');

    if (error.response?.status === 401 && !originalRequest.url?.includes('/auth/refresh') && !isFaceAuthEndpoint) {
      // Check if this is a force-logout (logged in on another device)
      if (error.response?.data?.code === 'FORCE_LOGOUT') {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('lms-token');
          // Redirect immediately — don't retry, don't queue
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            toast.error('Session ended. You have been logged in on another device.', { duration: 4000 });
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('lms-token');
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((token) => {
            if (!token) {
              reject(error);
              return;
            }

            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/auth/refresh');
        const newToken = refreshResponse?.data?.data?.accessToken;
        if (!newToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        if (typeof window !== 'undefined') {
          sessionStorage.setItem('lms-token', newToken);
        }

        flushPendingRequests(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        flushPendingRequests(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('lms-token');
          if (!window.location.pathname.includes('/login') && !isPublicPage()) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.status !== 401 && !isFaceAuthEndpoint) {
      const responseData = error.response?.data;
      if (responseData && responseData.message === 'Validation failed' && Array.isArray(responseData.errors)) {
        console.error('[Validation Error Details]', responseData.errors);
      } else {
        console.error('[API Error]', error.response?.data || error.message);
      }
    }

    return Promise.reject(error);
  }
);

// SWR fetcher utility
export const fetcher = (url: string) => api.get(url).then(res => res.data.data);
