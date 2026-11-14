import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY, getStoredToken } from '../services/api';

/**
 * Định nghĩa kiểu dữ liệu cho User
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar: string | null;
  role: {
    id: number;
    name: string;
  };
  company?: {
    id: string;
    name: string;
  } | null;
}

/**
 * Interface cho Context quản lý Auth
 */
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readCachedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.role?.name) {
      return parsed as User;
    }
    return null;
  } catch {
    return null;
  }
};

const writeAuthStorage = (nextToken: string | null, nextUser: User | null) => {
  try {
    if (nextToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    sessionStorage.removeItem(AUTH_TOKEN_KEY);

    if (nextUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // Bỏ qua nếu trình duyệt chặn quyền ghi storage
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(() => {
    const existing = getStoredToken();
    if (existing) {
      try {
        localStorage.setItem(AUTH_TOKEN_KEY, existing);
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
      } catch {
        // ignore
      }
    }
    return existing;
  });

  const [user, setUserState] = useState<User | null>(() => {
    const existingToken = getStoredToken();
    return existingToken ? readCachedUser() : null;
  });

  // Nếu đã có sẵn cả token & thông tin user lưu trong localStorage, hiển thị giao diện đã đăng nhập ngay lập tức
  // (không bắt người dùng nhìn màn hình trắng chờ Render cold-start). Chỉ bật loading khi có token nhưng chưa có cache user.
  const [loading, setLoading] = useState<boolean>(() => {
    const existingToken = getStoredToken();
    const cachedUser = readCachedUser();
    return Boolean(existingToken && !cachedUser);
  });

  const setUser = useCallback((nextUser: User | null) => {
    setUserState(nextUser);
    try {
      if (nextUser) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  const clearAuth = useCallback(() => {
    writeAuthStorage(null, null);
    setToken(null);
    setUserState(null);
    setLoading(false);
  }, []);

  // Xác thực & đồng bộ thông tin tài khoản mới nhất từ Backend (bền vững qua đóng tab / mở tab mới / cold-start)
  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | undefined;

    const verifySession = async (attempt = 1) => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (!cancelled) {
          setUserState(null);
          setToken(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setToken(storedToken);
      }

      try {
        const response = await api.get('/auth/me');
        if (cancelled) return;
        const freshUser: User | undefined = response.data?.user;
        if (freshUser) {
          setUserState(freshUser);
          writeAuthStorage(storedToken, freshUser);
        }
        setLoading(false);
      } catch (error: any) {
        if (cancelled) return;
        const status = error?.response?.status;

        // CHỈ xoá phiên đăng nhập khi Backend xác nhận Token không hợp lệ/hết hạn (401) hoặc tài khoản đã bị xoá (404).
        // Nếu lỗi mạng tạm thời hoặc Render Free đang thức dậy (502/503/504/timeout), giữ nguyên phiên đăng nhập và tự thử lại!
        if (status === 401 || status === 404) {
          clearAuth();
        } else {
          setLoading(false);
          if (attempt < 2) {
            retryTimer = window.setTimeout(() => {
              verifySession(attempt + 1);
            }, 5000);
          }
        }
      }
    };

    verifySession();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [clearAuth]);

  // Đồng bộ tức thì trạng thái Đăng nhập / Đăng xuất giữa nhiều tab trình duyệt
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_KEY || e.key === AUTH_USER_KEY || e.key === null) {
        const nextToken = getStoredToken();
        const nextUser = nextToken ? readCachedUser() : null;
        setToken(nextToken);
        setUserState(nextUser);
        setLoading(false);
      }
    };

    const handleAuthExpired = () => {
      clearAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('smartcv:auth_expired', handleAuthExpired);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('smartcv:auth_expired', handleAuthExpired);
    };
  }, [clearAuth]);

  const login = useCallback((newToken: string, userData: User) => {
    writeAuthStorage(newToken, userData);
    setToken(newToken);
    setUserState(userData);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook giúp lấy dữ liệu Auth ở bất kỳ Component nào.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
