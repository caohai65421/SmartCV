import axios from 'axios';

/**
 * Chuẩn hóa URL từ biến môi trường VITE_API_URL để tránh lỗi dư dấu "/" hoặc quên "/api" khi nhập trên Vercel.
 */
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

/**
 * Cấu hình Axios Client cho toàn bộ dự án. 
 * baseURL: Link tới API của Backend.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Sử dụng interceptor để tự động chèn JWT Token (theo phiên tab hiện tại) vào Header nếu có.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
