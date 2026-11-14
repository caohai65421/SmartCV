import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20 p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200/80">
        <div className="mb-7">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold text-sm mb-5 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Quên mật khẩu?</h1>
          <p className="text-sm text-slate-500">
            Nhập địa chỉ email đã đăng ký để nhận liên kết đặt lại mật khẩu qua hộp thư.
          </p>
        </div>

        {message ? (
          <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-3">
            <CheckCircle className="text-emerald-600 mt-0.5 shrink-0" size={20} />
            <div className="space-y-2">
              <p className="text-emerald-800 text-sm font-semibold">{message}</p>
              <Link
                to="/login"
                className="inline-block text-xs font-semibold text-primary-600 hover:underline"
              >
                Về trang đăng nhập
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email đăng ký tài khoản
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors"
                  size={17}
                />
                <input
                  type="email"
                  required
                  disabled={loading}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2.5 text-red-600 text-sm font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold text-sm sm:text-base shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Đang gửi liên kết...
                </>
              ) : (
                'Gửi liên kết khôi phục'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
