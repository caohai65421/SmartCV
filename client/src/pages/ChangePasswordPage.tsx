import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Loader2, CheckCircle, AlertCircle, ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ChangePasswordPage = () => {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const backLink =
    user?.role?.name === 'ADMIN'
      ? '/admin'
      : user?.role?.name === 'RECRUITER'
      ? '/recruiter-dashboard'
      : '/candidate-dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      return setError('Mật khẩu mới cần có tối thiểu 6 ký tự.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp.');
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await api.post('/auth/change-password', { oldPassword, newPassword });
      setSuccess(res.data.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 sm:pt-28 pb-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200/80">
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-slate-500 hover:text-primary-600 font-semibold mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Quay lại bảng điều khiển</span>
          </Link>

          <div className="mb-7">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-primary-600 mb-4 border border-sky-100">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Cài đặt &amp; Đổi mật khẩu
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Bảo mật tài khoản của bạn bằng cách cập nhật mật khẩu định kỳ.
            </p>
          </div>

          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 font-semibold text-xs sm:text-sm">
              <CheckCircle size={20} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm transition-all"
                  placeholder="Nhập mật khẩu hiện tại"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm transition-all"
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  minLength={6}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm transition-all"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-red-600 font-semibold text-xs sm:text-sm">
                <AlertCircle size={17} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Xác nhận đổi mật khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
