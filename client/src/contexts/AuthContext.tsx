import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

/**
 * Định nghĩa kiểu dữ liệu cho User (Dựa theo Prisma UI)
 */
interface User {
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
  token: string | null;   // Bổ sung để các bên khác (SocketContext) lấy token dễ dàng
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Lưu phiên đăng nhập theo từng tab trình duyệt (sessionStorage) để khi copy link sang tab mới
  // không bị tự động dính lại vai trò đã đăng nhập trước đó, đồng thời dễ kiểm thử nhiều vai trò song song.
  useEffect(() => {
    // Dọn dẹp token cũ lưu trong localStorage từ phiên bản trước (nếu có)
    try {
      localStorage.removeItem('token');
    } catch {
      // Bỏ qua nếu trình duyệt chặn storage
    }

    const fetchMe = async () => {
      const storedToken = sessionStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);

      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Không thể xác thực token cũ:', error);
        sessionStorage.removeItem('token');
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  const login = (newToken: string, userData: User) => {
    sessionStorage.setItem('token', newToken);
    localStorage.removeItem('token');
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook giúp lấy dữ liệu Auth một cách dễ dàng ở bất kỳ Component nào.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
