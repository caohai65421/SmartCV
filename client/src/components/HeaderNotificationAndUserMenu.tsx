import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Filter,
  CheckCheck,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  FileText,
  Briefcase,
  CheckCircle2,
  XCircle,
  Calendar,
  X,
  Mail,
  Building2,
  Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import { getSavedInterviews } from './InterviewScheduleModal';

interface NotificationItem {
  id: string;
  category: 'JOBS' | 'CV_STATUS' | 'CONNECT';
  title: string;
  description: string;
  timeText: string;
  isRead: boolean;
  highlightType?: 'SUCCESS' | 'INFO' | 'WARNING';
  linkTo: string;
  adminMenu?: string;
}

export const HeaderNotificationAndUserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const isRecruiter = user?.role?.name === 'RECRUITER';
  const isCandidate = user?.role?.name === 'CANDIDATE';
  const isAdmin = user?.role?.name === 'ADMIN';

  // Trạng thái mở/đóng Dropdown Thông báo & Dropdown Tài khoản
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Bộ lọc trong bảng Thông báo giống ảnh mẫu: Tất cả | Việc làm | Trạng thái CV | Kết nối
  const [activeTab, setActiveTab] = useState<'ALL' | 'JOBS' | 'CV_STATUS' | 'CONNECT'>('ALL');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`cvconnect_read_notifs_${user?.id || 'guest'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Đồng bộ lại danh sách thông báo đã đọc khi chuyển đổi tài khoản
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cvconnect_read_notifs_${user?.id || 'guest'}`);
      setReadIds(saved ? JSON.parse(saved) : []);
    } catch {
      setReadIds([]);
    }
  }, [user?.id]);

  // Modal Thông tin tài khoản
  const [showProfileModal, setShowProfileModal] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải và tạo danh sách thông báo thực tế từ dữ liệu CV & Đơn ứng tuyển của cả 2 bên
  const loadNotifications = async () => {
    if (!user) return;
    const savedInterviews = getSavedInterviews();
    const list: NotificationItem[] = [];

    try {
      if (isRecruiter) {
        // NHÀ TUYỂN DỤNG: Nhận thông báo có ứng viên gửi CV vào vị trí của mình, trạng thái duyệt CV & lịch hẹn phỏng vấn
        const [appsRes, jobsRes] = await Promise.allSettled([
          api.get('/applications/recruiter'),
          api.get('/jobs/recruiter/my'),
        ]);

        const apps: any[] =
          appsRes.status === 'fulfilled' ? appsRes.value.data?.applications || [] : [];
        const jobs: any[] =
          jobsRes.status === 'fulfilled' ? jobsRes.value.data?.jobs || [] : [];

        apps.forEach((app) => {
          const candidateName =
            app.cv?.data?.fullName || app.candidate?.fullName || 'Ứng viên';
          const cvTitle = app.cv?.title || `Hồ sơ CV của ${candidateName}`;
          const jobTitle = app.job?.title || 'Vị trí tuyển dụng';
          const dateStr = new Date(app.appliedDate).toLocaleDateString('vi-VN');

          // 1. Thông báo có ứng viên gửi CV vào vị trí tuyển dụng
          list.push({
            id: `rec-new-cv-${app.id}`,
            category: 'CV_STATUS',
            title: `Ứng viên mới nộp CV: ${candidateName}`,
            description: `${candidateName} đã gửi "${cvTitle}" vào vị trí "${jobTitle}". Nhấn để xem và xét duyệt.`,
            timeText: dateStr,
            isRead: readIds.includes(`rec-new-cv-${app.id}`),
            highlightType: 'INFO',
            linkTo: '/recruiter-dashboard',
          });

          // 2. Nếu CV đã được chấp nhận
          if (app.status === 'ACCEPTED') {
            list.push({
              id: `rec-accepted-${app.id}`,
              category: 'CV_STATUS',
              title: `Đã chấp nhận CV của ${candidateName}`,
              description: `Bạn đã duyệt hồ sơ CV ứng tuyển vị trí "${jobTitle}". Hãy đặt lịch hẹn phỏng vấn với ứng viên!`,
              timeText: 'Vừa cập nhật',
              isRead: readIds.includes(`rec-accepted-${app.id}`),
              highlightType: 'SUCCESS',
              linkTo: '/recruiter-dashboard',
            });
          }

          // 3. Nếu đã có lịch hẹn phỏng vấn (ưu tiên dữ liệu từ PostgreSQL)
          const recSched = app.interviewSchedule || savedInterviews[app.id];
          if (recSched) {
            list.push({
              id: `rec-sched-${app.id}`,
              category: 'CONNECT',
              title: `Lịch phỏng vấn với ${candidateName}`,
              description: `Hẹn lúc ${recSched.time} ngày ${recSched.date
                .split('-')
                .reverse()
                .join('/')} (${
                recSched.mode === 'OFFLINE' ? 'Trực tiếp tại văn phòng' : 'Phỏng vấn Online — Bấm để vào phòng'
              }).`,
              timeText: 'Lịch hẹn sắp tới',
              isRead: readIds.includes(`rec-sched-${app.id}`),
              highlightType: 'SUCCESS',
              linkTo:
                recSched.mode === 'ONLINE'
                  ? `/interview-room/${app.id}`
                  : '/recruiter-dashboard',
            });
          }
        });

        jobs.slice(0, 3).forEach((job) => {
          list.push({
            id: `rec-job-${job.id}`,
            category: 'JOBS',
            title: `Vị trí đang mở: ${job.title}`,
            description: `Tin tuyển dụng tại ${job.location} đang mở nhận hồ sơ CV từ ứng viên.`,
            timeText: new Date(job.createdAt).toLocaleDateString('vi-VN'),
            isRead: readIds.includes(`rec-job-${job.id}`),
            highlightType: 'INFO',
            linkTo: '/recruiter-dashboard',
          });
        });
      } else if (isCandidate) {
        // ỨNG VIÊN: Nhận thông báo CV của mình đã được Chấp nhận / Từ chối / Đang chờ duyệt, Lịch hẹn phỏng vấn & Việc làm phù hợp
        const [appsRes, jobsRes] = await Promise.allSettled([
          api.get('/applications/my'),
          api.get('/jobs'),
        ]);

        const apps: any[] =
          appsRes.status === 'fulfilled' ? appsRes.value.data?.applications || [] : [];
        const jobs: any[] =
          jobsRes.status === 'fulfilled' ? jobsRes.value.data?.jobs || [] : [];

        apps.forEach((app) => {
          const jobTitle = app.job?.title || 'Vị trí ứng tuyển';
          const companyName = app.job?.company?.name || 'Nhà tuyển dụng';
          const cvTitle = app.cv?.title || 'Hồ sơ CV của bạn';
          const dateStr = new Date(app.appliedDate).toLocaleDateString('vi-VN');

          if (app.status === 'ACCEPTED') {
            list.unshift({
              id: `cand-accepted-${app.id}`,
              category: 'CV_STATUS',
              title: `Chúc mừng! CV của bạn đã được Chấp nhận`,
              description: `Nhà tuyển dụng ${companyName} đã chấp nhận "${cvTitle}" cho vị trí "${jobTitle}". Hãy kiểm tra tin nhắn và lịch hẹn phỏng vấn.`,
              timeText: 'Mới nhất',
              isRead: readIds.includes(`cand-accepted-${app.id}`),
              highlightType: 'SUCCESS',
              linkTo: '/candidate-dashboard',
            });
          } else if (app.status === 'REJECTED') {
            list.push({
              id: `cand-rejected-${app.id}`,
              category: 'CV_STATUS',
              title: `Kết quả xét duyệt CV: ${jobTitle}`,
              description: `Hồ sơ "${cvTitle}" tại ${companyName} chưa phù hợp trong đợt tuyển này. Bạn có thể tham khảo các vị trí khác.`,
              timeText: dateStr,
              isRead: readIds.includes(`cand-rejected-${app.id}`),
              highlightType: 'WARNING',
              linkTo: '/candidate-dashboard',
            });
          } else {
            list.push({
              id: `cand-pending-${app.id}`,
              category: 'CV_STATUS',
              title: `Đã gửi CV thành công: ${jobTitle}`,
              description: `Bạn đã nộp "${cvTitle}" vào ${companyName}. Nhà tuyển dụng đang xem xét hồ sơ của bạn.`,
              timeText: dateStr,
              isRead: readIds.includes(`cand-pending-${app.id}`),
              highlightType: 'INFO',
              linkTo: '/candidate-dashboard',
            });
          }

          const candSched = app.interviewSchedule || savedInterviews[app.id];
          if (candSched) {
            list.unshift({
              id: `cand-sched-${app.id}`,
              category: 'CONNECT',
              title: `Thư mời phỏng vấn từ ${companyName}`,
              description: `Bạn có lịch hẹn phỏng vấn vị trí "${jobTitle}" lúc ${
                candSched.time
              } ngày ${candSched.date.split('-').reverse().join('/')} (${
                candSched.mode === 'ONLINE' ? 'Phỏng vấn Online — Nhấn để vào phòng' : 'Trực tiếp'
              }).`,
              timeText: 'Lịch phỏng vấn',
              isRead: readIds.includes(`cand-sched-${app.id}`),
              highlightType: 'SUCCESS',
              linkTo:
                candSched.mode === 'ONLINE'
                  ? `/interview-room/${app.id}`
                  : '/candidate-dashboard?tab=applied-jobs',
            });
          }
        });

        jobs.slice(0, 3).forEach((job) => {
          list.push({
            id: `cand-job-${job.id}`,
            category: 'JOBS',
            title: `Gợi ý việc làm: ${job.title}`,
            description: `${job.company?.name || 'Doanh nghiệp'} đang tuyển tại ${
              job.location
            } (${job.salary || 'Lương hấp dẫn'}).`,
            timeText: 'Gợi ý mới',
            isRead: readIds.includes(`cand-job-${job.id}`),
            highlightType: 'INFO',
            linkTo: `/jobs/${job.id}`,
          });
        });
      } else if (isAdmin) {
        // QUẢN TRỊ VIÊN: Nhận thông báo phiếu CSKH cần Admin xử lý + hoạt động hệ thống
        const [statsRes, jobsRes, ticketsRes] = await Promise.allSettled([
          api.get('/admin/stats'),
          api.get('/admin/jobs'),
          api.get('/admin/support-tickets'),
        ]);
        const st = statsRes.status === 'fulfilled' ? statsRes.value.data?.stats : null;
        const adminJobs: any[] =
          jobsRes.status === 'fulfilled' ? jobsRes.value.data?.jobs || [] : [];
        const adminTickets: any[] =
          ticketsRes.status === 'fulfilled' ? ticketsRes.value.data?.tickets || [] : [];

        // Đưa các phiếu CSKH phức tạp / chuyển cấp đang chờ Admin xử lý lên đầu
        adminTickets
          .filter((t) => t.status === 'OPEN')
          .slice(0, 5)
          .forEach((t) => {
            list.push({
              id: `admin-ticket-${t.id}`,
              category: 'CONNECT',
              title: `Phiếu CSKH #${t.ticketCode} cần Admin xử lý`,
              description: `${t.fullName}: "${t.content}"`,
              timeText: new Date(t.createdAt).toLocaleDateString('vi-VN'),
              isRead: readIds.includes(`admin-ticket-${t.id}`),
              highlightType: 'WARNING',
              linkTo: '/admin',
              adminMenu: 'support',
            });
          });

        if (st) {
          list.push({
            id: 'admin-system-overview',
            category: 'CV_STATUS',
            title: 'Báo cáo tổng quan hệ thống SmartCV',
            description: `Hệ thống đang ghi nhận ${st.totalJobs || adminJobs.length} tin tuyển dụng, ${st.totalCVs || 0} hồ sơ CV chuẩn A4 và ${st.totalApplications || 0} lượt ứng tuyển.`,
            timeText: 'Cập nhật hôm nay',
            isRead: readIds.includes('admin-system-overview'),
            highlightType: 'SUCCESS',
            linkTo: '/admin',
            adminMenu: 'stats',
          });
        }

        adminJobs.slice(0, 3).forEach((job) => {
          list.push({
            id: `admin-job-${job.id}`,
            category: 'JOBS',
            title: `Tin đăng trên hệ thống: ${job.title}`,
            description: `${job.company?.name || 'Doanh nghiệp'} (${job.location}) — Trạng thái: ${
              job.status === 'OPEN' ? 'Đang mở tuyển' : 'Đã đóng'
            }.`,
            timeText: new Date(job.createdAt).toLocaleDateString('vi-VN'),
            isRead: readIds.includes(`admin-job-${job.id}`),
            highlightType: 'INFO',
            linkTo: '/admin',
            adminMenu: 'jobs',
          });
        });
      }
    } catch (err) {
      console.error('Lỗi tải thông báo:', err);
    }

    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.id, notifOpen, readIds.length]);

  // Lắng nghe sự kiện realtime khi có đơn mới, duyệt CV hoặc đặt lịch phỏng vấn
  useEffect(() => {
    const onRefresh = () => loadNotifications();
    window.addEventListener('cvconnect:interview_scheduled', onRefresh);

    if (socket && user) {
      socket.on(`notification_recruiter_${user.id}`, onRefresh);
      socket.on(`notification_candidate_${user.id}`, onRefresh);
      socket.on('notification', onRefresh);
      socket.on('admin_new_support_ticket', onRefresh);
    }

    return () => {
      window.removeEventListener('cvconnect:interview_scheduled', onRefresh);
      if (socket && user) {
        socket.off(`notification_recruiter_${user.id}`, onRefresh);
        socket.off(`notification_candidate_${user.id}`, onRefresh);
        socket.off('notification', onRefresh);
        socket.off('admin_new_support_ticket', onRefresh);
      }
    };
  }, [socket, user?.id]);

  const markAsRead = (id: string) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem(
        `cvconnect_read_notifs_${user?.id || 'guest'}`,
        JSON.stringify(updated)
      );
    }
  };

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem(
      `cvconnect_read_notifs_${user?.id || 'guest'}`,
      JSON.stringify(allIds)
    );
  };

  const filteredNotifications = notifications.filter((item) => {
    if (activeTab !== 'ALL' && item.category !== activeTab) return false;
    if (onlyUnread && item.isRead) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!user) return null;

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* =====================================================================
          1. NÚT CHUÔNG THÔNG BÁO (DÀNH CHO CẢ NHÀ TUYỂN DỤNG & ỨNG VIÊN)
          ===================================================================== */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => {
            setNotifOpen((prev) => !prev);
            setUserMenuOpen(false);
          }}
          title="Thông báo"
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-all relative ${
            notifOpen
              ? 'bg-emerald-50 border-emerald-300 text-emerald-600 shadow-sm'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
          }`}
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 rounded-full bg-red-500 text-white font-black text-[10px] border-2 border-white flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* BẢNG DROPDOWN THÔNG BÁO (Căn vừa khít màn hình điện thoại iPhone/Samsung 360px & mở rộng chuẩn trên Desktop) */}
        {notifOpen && (
          <div className="fixed left-3 right-3 top-[68px] w-auto max-w-[calc(100vw-24px)] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[410px] sm:max-w-none bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-150">
            {/* Header Thông báo + Icon Lọc & Đánh dấu đã đọc hết */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">Thông báo</h3>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyUnread((prev) => !prev)}
                  title={onlyUnread ? 'Hiển thị tất cả' : 'Chỉ lọc thông báo chưa đọc'}
                  className={`p-2 rounded-xl transition-colors ${
                    onlyUnread
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <Filter size={18} />
                </button>
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Đánh dấu tất cả là đã đọc"
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-emerald-600 transition-colors"
                >
                  <CheckCheck size={19} />
                </button>
              </div>
            </div>

            {/* Các nút Tab lọc hình viên thuốc (Tất cả | Việc làm | Trạng thái CV | Kết nối) */}
            <div className="px-4 sm:px-6 pb-3.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar border-b border-slate-100">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'JOBS', label: 'Việc làm' },
                { id: 'CV_STATUS', label: 'Trạng thái CV' },
                { id: 'CONNECT', label: 'Kết nối' },
              ].map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-600 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Danh sách thông báo hoặc Giao diện Trống giống ảnh mẫu */}
            <div className="max-h-[62vh] sm:max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-4">
                  {/* Minh họa Astronaut / Empty State giống ảnh mẫu */}
                  <div className="w-28 h-28 mx-auto rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                    <svg
                      width="72"
                      height="72"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <path d="M9 8h6" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-800">
                      Chưa có thông báo nào
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mt-1 max-w-[260px] mx-auto leading-relaxed">
                      Những cập nhật mới nhất về việc làm và CV sẽ xuất hiện tại đây
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      if (isAdmin) {
                        navigate('/admin');
                        window.dispatchEvent(new CustomEvent('smartcv:admin_go_stats'));
                      } else {
                        navigate(isRecruiter ? '/recruiter-dashboard' : '/jobs');
                      }
                    }}
                    className="px-7 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    {isAdmin
                      ? 'Về Thống kê tổng quan'
                      : isRecruiter
                      ? 'Xem CV ứng tuyển'
                      : 'Tìm việc ngay'}
                  </button>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      markAsRead(item.id);
                      setNotifOpen(false);
                      navigate(item.linkTo);
                      if (item.adminMenu) {
                        setTimeout(() => {
                          window.dispatchEvent(
                            new CustomEvent('smartcv:admin_open_menu', {
                              detail: item.adminMenu,
                            })
                          );
                        }, 50);
                      }
                    }}
                    className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-all flex items-start gap-3.5 ${
                      !item.isRead ? 'bg-emerald-50/30' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        item.highlightType === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-600'
                          : item.highlightType === 'WARNING'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-primary-50 text-primary-600'
                      }`}
                    >
                      {item.category === 'CONNECT' ? (
                        <Calendar size={18} />
                      ) : item.category === 'JOBS' ? (
                        <Briefcase size={18} />
                      ) : item.highlightType === 'SUCCESS' ? (
                        <CheckCircle2 size={18} />
                      ) : item.highlightType === 'WARNING' ? (
                        <XCircle size={18} />
                      ) : (
                        <FileText size={18} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-xs sm:text-sm leading-snug ${
                            !item.isRead
                              ? 'font-black text-slate-900'
                              : 'font-bold text-slate-700'
                          }`}
                        >
                          {item.title}
                        </p>
                        {!item.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 mt-1.5 block">
                        {item.timeText}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          2. MENU TÀI KHOẢN KHI ẤN VÀO ICON / TÊN TÀI KHOẢN (THAY VÌ 2 ICON RỜI)
          ===================================================================== */}
      <div className="relative pl-2 sm:pl-3 border-l border-slate-200" ref={userMenuRef}>
        <button
          type="button"
          onClick={() => {
            setUserMenuOpen((prev) => !prev);
            setNotifOpen(false);
          }}
          className="flex items-center gap-1.5 sm:gap-3 py-1 sm:py-1.5 px-1.5 sm:px-2.5 rounded-2xl hover:bg-slate-100/80 transition-all text-left group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary-50 border-2 border-white shadow-sm flex items-center justify-center text-primary-600 overflow-hidden relative shrink-0">
            {user.avatar ? (
              <img src={user.avatar} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={19} />
            )}
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900 leading-tight">{user.fullName}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {user.role.name}
            </p>
          </div>

          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-150 ${
              userMenuOpen ? 'rotate-180 text-primary-600' : ''
            }`}
          />
        </button>

        {/* MENU XỔ XUỐNG BÊN DƯỚI KHI ẤN VÀO TÀI KHOẢN */}
        {userMenuOpen && (
          <div className="fixed right-3 top-[68px] w-[min(18rem,calc(100vw-24px))] sm:absolute sm:right-0 sm:top-full sm:mt-3 sm:w-72 bg-white rounded-3xl shadow-2xl border border-slate-200/90 py-2.5 z-[100] animate-in fade-in zoom-in-95 duration-150">
            {/* Thông tin tóm tắt trên đỉnh menu */}
            <div className="px-4 py-3 border-b border-slate-100 mb-1">
              <p className="text-sm font-black text-slate-900 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <span className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-50 text-primary-700 border border-primary-100">
                {isRecruiter
                  ? 'Nhà tuyển dụng (Recruiter)'
                  : isCandidate
                  ? 'Ứng viên (Candidate)'
                  : 'Quản trị viên (Admin)'}
              </span>
            </div>

            {/* NÚT QUẢN TRỊ HỆ THỐNG DÀNH CHO ADMIN -> VỀ THỐNG KÊ TỔNG QUAN */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/admin');
                  window.dispatchEvent(new CustomEvent('smartcv:admin_go_stats'));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50/80 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="font-extrabold">Quản trị hệ thống</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Trở về trang Thống kê tổng quan
                  </p>
                </div>
              </button>
            )}

            {/* NÚT DUY NHẤT: QUẢN LÝ CV DÀNH CHO ỨNG VIÊN (THEO YÊU CẦU ẢNH 1) */}
            {isCandidate && (
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/candidate-dashboard');
                }}
                className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold text-slate-700 hover:bg-primary-50/70 hover:text-primary-700 flex items-center gap-3 transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="font-extrabold">Quản lý CV</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    CV của mình, vị trí đã lưu & đã duyệt
                  </p>
                </div>
              </button>
            )}

            {/* Mục 1: Thông tin tài khoản */}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                setShowProfileModal(true);
              }}
              className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary-600 flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <UserIcon size={16} />
              </div>
              <div>
                <p className="font-extrabold">Thông tin tài khoản</p>
                <p className="text-[10px] text-slate-400 font-medium">Hồ sơ cá nhân & Liên hệ</p>
              </div>
            </button>

            {/* Mục 2: Cài đặt */}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                navigate('/change-password');
              }}
              className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-primary-600 flex items-center gap-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Settings size={16} />
              </div>
              <div>
                <p className="font-semibold">Cài đặt & Bảo mật</p>
                <p className="text-[10px] text-slate-400 font-medium">Đổi mật khẩu & Quyền riêng tư</p>
              </div>
            </button>

            <div className="my-1.5 border-t border-slate-100" />

            {/* Mục 3: Đăng xuất */}
            <button
              type="button"
              onClick={() => {
                setUserMenuOpen(false);
                logout();
                navigate('/login', { replace: true });
              }}
              className="w-full px-4 py-2.5 text-left text-xs sm:text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <LogOut size={16} />
              </div>
              <div>
                <p className="font-semibold">Đăng xuất</p>
                <p className="text-[10px] text-red-400 font-medium">Thoát khỏi phiên làm việc</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* MODAL THÔNG TIN TÀI KHOẢN */}
      {showProfileModal &&
        createPortal(
          <div
            onClick={() => setShowProfileModal(false)}
            className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto"
            >
              <div className="p-6 bg-gradient-to-r from-sky-50 via-blue-50/70 to-teal-50/60 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-sky-200 text-primary-600 flex items-center justify-center shadow-xs">
                    <UserIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">Thông tin tài khoản</h3>
                    <p className="text-xs text-slate-500">Hồ sơ người dùng trên SmartCV</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="p-6 space-y-4 text-sm">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">Họ và tên:</span>
                    <span className="font-bold text-slate-900">{user.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">Email đăng nhập:</span>
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Mail size={14} className="text-primary-600" /> {user.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">Vai trò hệ thống:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-primary-700 border border-sky-200">
                      {isRecruiter
                        ? 'Nhà tuyển dụng'
                        : isCandidate
                        ? 'Ứng viên'
                        : 'Quản trị viên'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      if (isAdmin) {
                        navigate('/admin');
                        window.dispatchEvent(new CustomEvent('smartcv:admin_go_stats'));
                      } else {
                        navigate(
                          isRecruiter ? '/recruiter-dashboard' : '/candidate-dashboard'
                        );
                      }
                    }}
                    className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    {isRecruiter
                      ? 'Quản lý Tuyển dụng & CV'
                      : isCandidate
                      ? 'Đi tới Quản lý CV của tôi'
                      : 'Về Thống kê tổng quan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default HeaderNotificationAndUserMenu;
