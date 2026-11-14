import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, AlertCircle, Loader2, Building2, UserRound } from 'lucide-react';
import api from '../services/api';

const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole =
    searchParams.get('role') === 'RECRUITER' ? 'RECRUITER' : 'CANDIDATE';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [roleName, setRoleName] = useState(initialRole);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const r = searchParams.get('role');
    if (r === 'RECRUITER' || r === 'CANDIDATE') {
      setRoleName(r);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { email, password, fullName, roleName });
      navigate('/login');
    } catch (err: any) {
      console.error('Đăng ký thất bại:', err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-24">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200/80">
        <div className="p-8 sm:p-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Đăng ký tài khoản SmartCV</h1>
            <p className="text-sm text-slate-500">
              Chọn vai trò phù hợp để tạo CV ứng tuyển hoặc đăng tin tuyển dụng nhân sự.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5 text-red-600">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Vai trò tài khoản:</label>
              <div className="grid grid-cols-2 gap-3.5">
                <div
                  onClick={() => setRoleName('CANDIDATE')}
                  className={`relative cursor-pointer p-4 border rounded-2xl transition-colors flex flex-col items-center gap-2.5 ${
                    roleName === 'CANDIDATE'
                      ? 'border-primary-500 bg-sky-50/60'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      roleName === 'CANDIDATE'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    <UserRound size={22} />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      roleName === 'CANDIDATE' ? 'text-primary-700' : 'text-slate-600'
                    }`}
                  >
                    Ứng viên
                  </span>
                </div>

                <div
                  onClick={() => setRoleName('RECRUITER')}
                  className={`relative cursor-pointer p-4 border rounded-2xl transition-colors flex flex-col items-center gap-2.5 ${
                    roleName === 'RECRUITER'
                      ? 'border-primary-500 bg-sky-50/60'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${
                      roleName === 'RECRUITER'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-200/80 text-slate-500'
                    }`}
                  >
                    <Building2 size={22} />
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      roleName === 'RECRUITER' ? 'text-primary-700' : 'text-slate-600'
                    }`}
                  >
                    Nhà tuyển dụng
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Họ và tên</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email đăng nhập
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Mail size={17} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                  <Lock size={17} />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm sm:text-base shadow-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Đang đăng ký...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Tạo tài khoản
                </>
              )}
            </button>
          </form>

          <div className="mt-7 text-center text-sm">
            <p className="text-slate-500">
              Đã có tài khoản?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:underline">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
