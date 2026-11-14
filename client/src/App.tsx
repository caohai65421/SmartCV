import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { LogIn, UserPlus, Shield } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

// Import các trang
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import JobListPage from './pages/JobListPage';
import JobDetailPage from './pages/JobDetailPage';
import CVBuilderPage from './pages/CVBuilderPage';
import CandidateDashboard from './pages/CandidateDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import OnlineInterviewRoomPage from './pages/OnlineInterviewRoomPage';
import AIJobAssistant from './components/AIJobAssistant';
import FloatingDirectChat from './components/FloatingDirectChat';
import HeaderNotificationAndUserMenu from './components/HeaderNotificationAndUserMenu';
import FooterInfoModal from './components/FooterInfoModal';

const Navigation = () => {
  const { user } = useAuth();
  const location = useLocation();

  const logoTarget = !user
    ? '/'
    : user.role.name === 'ADMIN'
    ? '/admin'
    : user.role.name === 'RECRUITER'
    ? '/recruiter-dashboard'
    : '/jobs';

  const handleAdminGoStats = () => {
    if (user?.role.name === 'ADMIN') {
      window.dispatchEvent(new CustomEvent('smartcv:admin_go_stats'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full border-b border-slate-200 z-50">
      <div className="absolute inset-0 bg-white/85 backdrop-blur-md -z-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between gap-2">
        <Link
          to={logoTarget}
          onClick={handleAdminGoStats}
          title="Về trang chủ SmartCV"
          className="flex items-center gap-2 group shrink-0"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-600 via-primary-600 to-teal-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-md shadow-indigo-200/80 group-hover:rotate-6 transition-transform">
            CV
          </div>
          <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-indigo-700 via-primary-600 to-teal-600 bg-clip-text text-transparent tracking-tighter">
            SmartCV
          </span>
        </Link>

        {/* Thanh liên kết trung tâm khi chưa đăng nhập: Trang chủ & Tìm việc làm */}
        {!user && (
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                location.pathname === '/'
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              to="/jobs"
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/jobs')
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Tìm việc làm
            </Link>
          </nav>
        )}

        {/* Thanh điều hướng nhanh cho Ứng viên */}
        {user?.role.name === 'CANDIDATE' && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/jobs"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/jobs')
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Tìm việc làm
            </Link>
            <Link
              to="/candidate-dashboard"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/candidate-dashboard') ||
                location.pathname.startsWith('/cv-builder')
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Quản lý CV &amp; Ứng tuyển
            </Link>
          </nav>
        )}

        {/* Thanh điều hướng nhanh cho Nhà tuyển dụng */}
        {user?.role.name === 'RECRUITER' && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/recruiter-dashboard"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/recruiter-dashboard')
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Quản lý tuyển dụng
            </Link>
            <Link
              to="/jobs"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname.startsWith('/jobs')
                  ? 'bg-sky-50 text-primary-700'
                  : 'text-slate-600 hover:text-primary-600 hover:bg-slate-50'
              }`}
            >
              Thị trường việc làm
            </Link>
          </nav>
        )}

        {/* Nút riêng cho Admin: Bấm vào sẽ luôn trở về trang Thống Kê Tổng Quan */}
        {user?.role.name === 'ADMIN' && (
          <nav className="flex items-center">
            <Link
              to="/admin"
              onClick={handleAdminGoStats}
              title="Trở về Thống kê tổng quan hệ thống"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-red-50 text-red-600 hover:text-red-700 font-bold text-xs sm:text-base transition-all cursor-pointer"
            >
              <Shield size={19} className="shrink-0" />
              <span>Quản trị hệ thống</span>
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Nút Chuông Thông báo + Menu Dropdown Tài khoản */}
              <HeaderNotificationAndUserMenu />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-3">
              <Link to="/login" className="flex items-center gap-1.5 text-slate-600 hover:text-primary-600 font-bold transition-colors px-2.5 sm:px-4 py-2 text-xs sm:text-base">
                <LogIn size={18} />
                <span>Đăng nhập</span>
              </Link>
              <Link to="/register" className="bg-primary-600 text-white px-3.5 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center gap-1.5 text-xs sm:text-base">
                <UserPlus size={18} />
                <span>Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const HomePage = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user?.role.name === 'RECRUITER') {
    return <Navigate to="/recruiter-dashboard" replace />;
  }
  if (user?.role.name === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (user?.role.name === 'CANDIDATE') {
    return <Navigate to="/jobs" replace />;
  }

  // Khi chưa đăng nhập: Mở Trang chủ giới thiệu riêng trước khi Đăng nhập / Đăng ký
  return <LandingPage />;
};

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  if (roles && !roles.includes(user.role.name)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const FooterSection = ({
  onOpenArticle,
}: {
  onOpenArticle: (key: string) => void;
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role.name === 'ADMIN';
  const isRecruiter = user?.role.name === 'RECRUITER';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Giao diện chân trang gọn gàng riêng cho tài khoản Quản trị viên (Admin)
  if (isAdmin) {
    return (
      <footer className="w-full border-t border-indigo-100 bg-white/90 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-slate-600">
            © 2026 SmartCV Vietnam • Bảng điều khiển Quản trị & Thống kê hệ thống
          </p>
          <div className="flex flex-wrap items-center gap-4 font-semibold">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('smartcv:admin_go_stats'));
              }}
              className="text-indigo-600 hover:underline cursor-pointer"
            >
              Thống kê tổng quan
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('smartcv:admin_open_menu', { detail: 'support' })
                );
              }}
              className="text-teal-700 hover:underline cursor-pointer"
            >
              Quản lý Hỗ trợ CSKH
            </button>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="w-full border-t border-slate-200/80 bg-gradient-to-br from-slate-50 via-primary-50/50 to-teal-50/50 pt-14 pb-10 mt-16 text-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-10 border-b border-slate-200/80">
          {/* CỘT 1 (4/12): THƯƠNG HIỆU, LIÊN HỆ & CỘNG ĐỒNG */}
          <div className="lg:col-span-4 space-y-5">
            <div>
              <Link to="/" onClick={scrollToTop} className="inline-flex items-center gap-2.5 group">
                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 via-primary-600 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-500/20">
                  CV
                </div>
                <span className="text-3xl font-black bg-gradient-to-r from-indigo-700 via-primary-600 to-teal-600 bg-clip-text text-transparent tracking-tighter">
                  SmartCV
                </span>
              </Link>
              <p className="text-sm font-bold text-slate-700 mt-2">
                Tiếp lợi thế, nối thành công
              </p>
            </div>

            {/* Liên hệ */}
            <div className="space-y-1.5 text-xs sm:text-[13px]">
              <h4 className="text-sm font-black text-slate-900 mb-2">Liên hệ</h4>
              <p className="text-slate-600">
                Hotline:{' '}
                <span className="font-bold text-slate-900">
                  1900 6868 89 | Nhánh 2 (Giờ hành chính)
                </span>
              </p>
              <p className="text-slate-600">
                Email:{' '}
                <span className="font-bold text-slate-900">hotro@smartcv.vn</span>
              </p>
              <p className="text-slate-600">
                Hỗ trợ trực tuyến (AI 24/7):{' '}
                <button
                  type="button"
                  onClick={() =>
                    window.dispatchEvent(
                      new CustomEvent('cvconnect:open_direct_chat', {
                        detail: { openSupport: true },
                      })
                    )
                  }
                  className="font-bold text-teal-700 hover:text-teal-900 underline decoration-teal-400 cursor-pointer"
                >
                  Kết nối ngay →
                </button>
              </p>
              <p className="text-slate-600">
                Fanpage: <span className="font-bold text-slate-800">SmartCV Vietnam</span>
              </p>
              <p className="text-slate-600">
                LinkedIn: <span className="font-bold text-slate-800">SmartCV Vietnam</span>
              </p>
              <p className="text-slate-600">
                TikTok: <span className="font-bold text-slate-800">SmartCV Vietnam</span>
              </p>
            </div>

            {/* Cộng đồng SmartCV — Đúng 4 icon ứng dụng: Facebook, YouTube, LinkedIn, TikTok */}
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">
                Cộng đồng SmartCV
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  title="Facebook SmartCV"
                  className="w-9 h-9 rounded-full bg-slate-600 hover:bg-primary-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M15.12 5.32H17V2.14A26.11 26.11 0 0 0 14.26 2c-2.72 0-4.58 1.66-4.58 4.7v2.62H6.61v3.56h3.07V22h3.68v-9.12h3.06l.46-3.56h-3.52V6.65c0-1.05.29-1.73 1.76-1.73Z" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  title="YouTube SmartCV"
                  className="w-9 h-9 rounded-full bg-slate-600 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.51 2.51 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.51 2.51 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15V9l5.2 3-5.2 3Z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  title="LinkedIn SmartCV"
                  className="w-9 h-9 rounded-full bg-slate-600 hover:bg-primary-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                >
                  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M6.94 5a2 2 0 1 1-4-.002 2 2 0 0 1 4 .002ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68Z" />
                  </svg>
                </a>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noreferrer"
                  title="TikTok SmartCV"
                  className="w-9 h-9 rounded-full bg-slate-600 hover:bg-slate-900 text-white flex items-center justify-center transition-colors shadow-2xs"
                >
                  <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24">
                    <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* CỘT 2 (2/12): VỀ SMARTCV & ĐỐI TÁC TIÊU BIỂU */}
          <div className="lg:col-span-2 space-y-6 text-xs sm:text-[13px]">
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">Về SmartCV</h4>
              <ul className="space-y-2 text-slate-600 font-medium">
                {[
                  { key: 'gioi-thieu', label: 'Giới thiệu nền tảng' },
                  { key: 'tuyen-dung-nhan-su', label: 'Tuyển dụng nhân sự' },
                  { key: 'lien-he-hop-tac', label: 'Liên hệ hợp tác' },
                  { key: 'hoi-dap', label: 'Hỏi đáp thường gặp' },
                  { key: 'chinh-sach-bao-mat', label: 'Chính sách quyền riêng tư' },
                  { key: 'dieu-khoan-dich-vu', label: 'Điều khoản dịch vụ' },
                ].map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(item.key)}
                      className="text-left hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">Đối tác tiêu biểu</h4>
              <ul className="space-y-2 text-slate-600 font-medium">
                {[
                  { key: 'fpt-software', label: 'FPT Software' },
                  { key: 'viettel-digital', label: 'Viettel Digital' },
                  { key: 'vng-corporation', label: 'VNG Corporation' },
                  { key: 'kms-technology', label: 'KMS Technology' },
                ].map((partner) => (
                  <li key={partner.key}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(partner.key)}
                      className="text-left hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                    >
                      {partner.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CỘT 3 (3/12): HỒ SƠ VÀ CV (HOẶC DÀNH CHO NHÀ TUYỂN DỤNG) & TIỆN ÍCH */}
          <div className="lg:col-span-3 space-y-6 text-xs sm:text-[13px]">
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">
                {isRecruiter ? 'Quản lý tuyển dụng' : 'Hồ sơ và CV'}
              </h4>
              {isRecruiter ? (
                <ul className="space-y-2 text-slate-600 font-medium">
                  <li>
                    <Link
                      to="/recruiter-dashboard"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Bảng điều khiển Nhà tuyển dụng
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/jobs"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Xem danh sách tin trên thị trường
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent('cvconnect:open_direct_chat', {
                            detail: { openSupport: true },
                          })
                        )
                      }
                      className="hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                    >
                      Trung tâm hỗ trợ Doanh nghiệp
                    </button>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-slate-600 font-medium">
                  <li>
                    <Link
                      to="/candidate-dashboard?tab=my-cv"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Quản lý CV của bạn
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/cv-builder"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Thiết kế CV chuẩn A4 & PDF
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/candidate-dashboard?tab=saved-jobs"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Vị trí việc làm đã lưu
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/candidate-dashboard?tab=applied-jobs"
                      onClick={scrollToTop}
                      className="hover:text-teal-700 hover:underline transition-colors"
                    >
                      Hồ sơ CV đã ứng tuyển & duyệt
                    </Link>
                  </li>
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Tiện ích trên SmartCV</h4>
              <ul className="space-y-2 text-slate-600 font-medium">
                {[
                  { key: 'ai-goi-y-viec-lam', label: 'Gợi ý việc làm phù hợp hồ sơ' },
                  { key: 'ai-cham-diem-cv', label: 'Đánh giá & xếp hạng hồ sơ ứng tuyển' },
                  { key: 'ai-match-score', label: 'Phân tích độ phù hợp công việc' },
                  { key: 'chat-thoi-gian-thuc', label: 'Nhắn tin trực tiếp với Nhà tuyển dụng' },
                  { key: 'github-portfolio', label: 'Liên kết GitHub & Portfolio cá nhân' },
                ].map((feat) => (
                  <li key={feat.key}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(feat.key)}
                      className="text-left hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                    >
                      {feat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* CỘT 4 (3/12): XÂY DỰNG SỰ NGHIỆP & QUY TẮC CHUNG */}
          <div className="lg:col-span-3 space-y-6 text-xs sm:text-[13px]">
            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">
                Xây dựng sự nghiệp
              </h4>
              <ul className="space-y-2 text-slate-600 font-medium">
                <li>
                  <Link to="/jobs" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm nổi bật
                  </Link>
                </li>
                <li>
                  <Link to="/jobs?keyword=Senior" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm lương cao
                  </Link>
                </li>
                <li>
                  <Link to="/jobs?keyword=Developer" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm IT / Phần mềm
                  </Link>
                </li>
                <li>
                  <Link to="/jobs?keyword=Senior" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm Senior / Trưởng nhóm
                  </Link>
                </li>
                <li>
                  <Link to="/jobs?keyword=AI" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm AI & Dữ liệu
                  </Link>
                </li>
                <li>
                  <Link to="/jobs?keyword=Frontend" onClick={scrollToTop} className="hover:text-teal-700 hover:underline transition-colors">
                    Việc làm từ xa (Remote / Hybrid)
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-black text-slate-900 mb-3">Quy tắc chung</h4>
              <ul className="space-y-2 text-slate-600 font-medium">
                {[
                  { key: 'dieu-kien-giao-dich', label: 'Điều kiện sử dụng chung' },
                  { key: 'quy-trinh-duyet-ho-so', label: 'Quy trình duyệt hồ sơ minh bạch' },
                  { key: 'bao-mat-ung-vien', label: 'Bảo mật thông tin cá nhân ứng viên' },
                ].map((policy) => (
                  <li key={policy.key}>
                    <button
                      type="button"
                      onClick={() => onOpenArticle(policy.key)}
                      className="text-left hover:text-teal-700 hover:underline transition-colors cursor-pointer"
                    >
                      {policy.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <p>© 2026 SmartCV Vietnam. Nền tảng kết nối việc làm và tuyển dụng trực tuyến.</p>
        </div>
      </div>
    </footer>
  );
};

const AppContent = () => {
  const [activeFooterArticle, setActiveFooterArticle] = useState<string | null>(null);
  const location = useLocation();
  const isInterviewRoom = location.pathname.startsWith('/interview-room/');

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 flex flex-col font-sans">
      <Navigation />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route path="/jobs" element={<JobListPage />} />
          <Route path="/jobs/:id" element={<JobDetailPage />} />

          <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

          {/* Phòng phỏng vấn Video trực tuyến giữa Nhà tuyển dụng & Ứng viên */}
          <Route
            path="/interview-room/:applicationId"
            element={
              <ProtectedRoute roles={['CANDIDATE', 'RECRUITER', 'ADMIN']}>
                <OnlineInterviewRoomPage />
              </ProtectedRoute>
            }
          />

          {/* Candidate */}
          <Route path="/cv-builder" element={<ProtectedRoute roles={['CANDIDATE']}><CVBuilderPage /></ProtectedRoute>} />
          <Route path="/cv-builder/:id" element={<ProtectedRoute roles={['CANDIDATE']}><CVBuilderPage /></ProtectedRoute>} />
          <Route path="/my-cvs" element={<ProtectedRoute roles={['CANDIDATE']}><Navigate to="/candidate-dashboard" replace /></ProtectedRoute>} />
          <Route path="/candidate-dashboard" element={<ProtectedRoute roles={['CANDIDATE']}><CandidateDashboard /></ProtectedRoute>} />

          {/* Recruiter */}
          <Route path="/recruiter-dashboard" element={<ProtectedRoute roles={['RECRUITER']}><RecruiterDashboard /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {!isInterviewRoom && (
        <>
          <FooterSection onOpenArticle={setActiveFooterArticle} />

          {/* Modal hiển thị nội dung chi tiết khi bấm vào các mục Giới thiệu / Đối tác / Tính năng AI / Quy tắc ở Footer */}
          <FooterInfoModal
            articleKey={activeFooterArticle}
            onClose={() => setActiveFooterArticle(null)}
          />

          {/* Biểu tượng Trò chuyện Trực tiếp giữa Nhà tuyển dụng & Ứng viên (Nằm ngay bên trên Trợ lý ảo AI) */}
          <FloatingDirectChat />

          {/* Trợ lý AI Nổi Góc Phải Dưới Màn Hình */}
          <AIJobAssistant />
        </>
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
