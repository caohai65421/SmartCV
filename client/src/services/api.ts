import axios from 'axios';

export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'smartcv_user';

/**
 * Đọc JWT Token đã lưu bền vững trong localStorage (có tương thích ngược với sessionStorage cũ).
 */
export const getStoredToken = (): string | null => {
  try {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
};

/**
 * Chuẩn hóa URL từ biến môi trường VITE_API_URL để tránh lỗi dư dấu "/" hoặc quên "/api" khi nhập trên Vercel.
 */
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api')
  .trim()
  .replace(/\/+$/, '');
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

/**
 * Cấu hình Axios Client cho toàn bộ dự án.
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // Đủ thời gian chờ Render Free Tier thức dậy khi cold-start
});

// Tự động đính kèm JWT Token từ localStorage vào mọi request API.
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Nếu token hết hạn (401) khi gọi các API cần xác thực, phát tín hiệu đồng bộ để AuthContext đăng xuất gọn gàng.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const reqUrl = String(error?.config?.url || '');
    const isPublicAuthAction =
      reqUrl.includes('/auth/login') ||
      reqUrl.includes('/auth/register') ||
      reqUrl.includes('/auth/change-password') ||
      reqUrl.includes('/auth/forgot-password') ||
      reqUrl.includes('/auth/reset-password');

    if (status === 401 && !isPublicAuthAction && getStoredToken()) {
      window.dispatchEvent(new CustomEvent('smartcv:auth_expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
