import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  X,
  Calendar,
  Briefcase,
  LogIn,
  Sparkles,
  Send,
  Headphones,
  Phone,
  Mail,
  Clock,
  RotateCcw,
  HelpCircle,
  Bot,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import api from '../services/api';
import ChatWindow from './ChatWindow';
import InterviewScheduleModal, {
  getSavedInterviews,
  saveInterviewToStorage,
  InterviewScheduleData,
} from './InterviewScheduleModal';

interface SupportMessageItem {
  id: string;
  sender: 'cskh' | 'user';
  content: string;
  ticketCode?: string;
  isAutoAI?: boolean;
  category?: string;
  originalQuestion?: string;
  escalated?: boolean;
  createdAt: string;
}

interface QuickSupportTopic {
  id: string;
  label: string;
  answer: string;
}

const CANDIDATE_SUPPORT_TOPICS: QuickSupportTopic[] = [
  {
    id: 'cv-pdf',
    label: 'Hướng dẫn tạo & tải CV chuẩn PDF',
    answer:
      'Để tạo hoặc chỉnh sửa CV, bạn nhấn vào ảnh đại diện góc phải trên cùng → chọn "Quản lý CV" → bấm "Tạo CV mới" hoặc "Chỉnh sửa". Sau khi điền đầy đủ thông tin, nhấn nút "Xuất PDF" để tải file CV chuẩn khổ A4 về máy.',
  },
  {
    id: 'app-status',
    label: 'Kiểm tra trạng thái hồ sơ đã ứng tuyển',
    answer:
      'Bạn có thể theo dõi kết quả duyệt CV tại trang "Quản lý CV" hoặc nhấn biểu tượng chuông thông báo trên thanh điều hướng. Khi Nhà tuyển dụng chấp nhận hồ sơ hoặc đặt lịch phỏng vấn, cuộc trò chuyện sẽ xuất hiện ngay tại mục "Tất cả" và "Đã duyệt".',
  },
  {
    id: 'account-security',
    label: 'Đổi mật khẩu & bảo mật tài khoản',
    answer:
      'Để đổi mật khẩu, bạn nhấn vào tên tài khoản góc trên bên phải → chọn "Cài đặt & Bảo mật" → nhập mật khẩu hiện tại và mật khẩu mới để cập nhật. Nếu quên mật khẩu khi đăng nhập, hãy chọn "Quên mật khẩu?" tại màn hình đăng nhập.',
  },
  {
    id: 'report-job',
    label: 'Báo cáo tin tuyển dụng bất thường',
    answer:
      'SmartCV kiểm duyệt chặt chẽ các tin đăng tuyển dụng. Nếu phát hiện tin tuyển dụng có dấu hiệu thu phí ứng viên hoặc sai lệch thông tin, bạn vui lòng gửi tên vị trí và tên công ty ngay tại ô chat này hoặc gửi về email cskh@smartcv.vn để bộ phận kiểm duyệt xử lý trong vòng 24 giờ.',
  },
];

const RECRUITER_SUPPORT_TOPICS: QuickSupportTopic[] = [
  {
    id: 'post-job',
    label: 'Hướng dẫn đăng & quản lý tin tuyển dụng',
    answer:
      'Tại Bảng điều khiển Nhà tuyển dụng, bạn nhấn nút "Đăng tin tuyển dụng mới", điền tiêu đề, mức lương, địa điểm và yêu cầu kỹ năng. Bạn có thể tạm đóng hoặc chỉnh sửa nội dung tin đăng bất cứ lúc nào trong danh sách vị trí đang tuyển.',
  },
  {
    id: 'review-schedule',
    label: 'Cách duyệt hồ sơ & hẹn lịch phỏng vấn',
    answer:
      'Khi có ứng viên nộp hồ sơ, bạn bấm vào từng tin tuyển dụng để xem danh sách CV kèm mức độ phù hợp. Nhấn "Chấp nhận" để duyệt hồ sơ và sử dụng nút "Hẹn lịch phỏng vấn" ngay trong khung chat để gửi lịch hẹn tự động tới ứng viên.',
  },
  {
    id: 'company-info',
    label: 'Cập nhật thông tin doanh nghiệp & tài khoản',
    answer:
      'Bạn có thể kiểm tra thông tin tài khoản và đổi mật khẩu tại menu góc trên bên phải ("Thông tin tài khoản" / "Cài đặt & Bảo mật"). Nếu cần điều chỉnh tên pháp nhân hoặc giấy phép doanh nghiệp, vui lòng gửi yêu cầu kèm mã số thuế tới cskh@smartcv.vn.',
  },
  {
    id: 'spam-cv',
    label: 'Hỗ trợ lọc hồ sơ không phù hợp',
    answer:
      'Hệ thống SmartCV tự động cảnh báo các hồ sơ thiếu thông tin cơ bản hoặc không khớp chuyên ngành tuyển dụng. Nếu phát hiện tài khoản gửi hồ sơ rác hàng loạt, quý doanh nghiệp có thể gửi email ứng viên tại khung hỗ trợ này để bộ phận CSKH kiểm tra.',
  },
];

const createInitialSupportGreeting = (fullName?: string, isRecruiter?: boolean): SupportMessageItem => ({
  id: 'cskh-welcome',
  sender: 'cskh',
  isAutoAI: true,
  category: 'Trợ lý AI CSKH 24/7',
  content: `Xin chào ${fullName || 'bạn'}, Trợ lý AI Chăm sóc khách hàng SmartCV sẵn sàng giải đáp tự động 24/7 cho ${
    isRecruiter ? 'Quý doanh nghiệp' : 'bạn'
  }.\n• Các câu hỏi thường gặp (tạo/đính kèm CV PDF, mật khẩu, hẹn phỏng vấn Gmail, chỉnh sửa tin...) sẽ được AI hướng dẫn ngay lập tức.\n• Với yêu cầu xác minh doanh nghiệp, báo cáo vi phạm hoặc cần hỗ trợ chuyên sâu, hệ thống sẽ chuyển phiếu tới Chuyên viên CSKH.`,
  createdAt: new Date().toISOString(),
});

const buildLocalFallbackSupportReply = (
  rawText: string,
  userEmail?: string
): { content: string; ticketCode: string; isAutoAI: boolean; category: string } => {
  const lower = rawText.toLowerCase();
  const ticketCode = `CSKH-${Math.floor(100000 + Math.random() * 900000)}`;

  if (lower.includes('mật khẩu') || lower.includes('đăng nhập') || lower.includes('quên')) {
    return {
      ticketCode,
      isAutoAI: true,
      category: 'Mật khẩu & Bảo mật',
      content: `Để đổi mật khẩu, bạn nhấn vào tên tài khoản góc trên bên phải → chọn "Cài đặt & Bảo mật". Nếu quên mật khẩu, hãy nhấn "Quên mật khẩu?" tại màn hình Đăng nhập để nhận liên kết đặt lại qua Gmail.`,
    };
  }

  if (lower.includes('cv') || lower.includes('pdf') || lower.includes('hồ sơ')) {
    return {
      ticketCode,
      isAutoAI: true,
      category: 'Hồ sơ CV & PDF',
      content: `Bạn có thể tạo CV chuẩn khổ A4 và xuất PDF tại mục "Quản lý CV", hoặc tải trực tiếp tệp CV .pdf có sẵn từ máy tính (tối đa 5MB) ngay trong biểu mẫu "Ứng tuyển vị trí này".`,
    };
  }

  if (lower.includes('ứng tuyển') || lower.includes('phỏng vấn') || lower.includes('duyệt')) {
    return {
      ticketCode,
      isAutoAI: true,
      category: 'Ứng tuyển & Phỏng vấn',
      content: `Kết quả xét duyệt CV và lịch hẹn phỏng vấn được cập nhật trực tiếp tại biểu tượng Chuông thông báo, mục "Đã nộp & phản hồi" và gửi tự động qua hộp thư Gmail của bạn.`,
    };
  }

  const emailNote = userEmail
    ? `Chuyên viên CSKH sẽ kiểm tra và phản hồi chi tiết qua email ${userEmail} trong giờ làm việc (08:00 - 22:00).`
    : 'Chuyên viên CSKH sẽ kiểm tra và phản hồi cho bạn trong giờ làm việc (08:00 - 22:00).';

  return {
    ticketCode,
    isAutoAI: false,
    category: 'Chuyển Chuyên viên CSKH',
    content: `Hệ thống đã ghi nhận phiếu hỗ trợ cho nội dung: "${rawText.trim()}".\n${emailNote}`,
  };
};

export const FloatingDirectChat: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const location = useLocation();
  const isAdmin = user?.role?.name === 'ADMIN';
  const isRecruiter = user?.role?.name === 'RECRUITER';
  const isCandidate = user?.role?.name === 'CANDIDATE';

  const [isOpen, setIsOpen] = useState(false);

  // Tự động đóng hộp thoại nổi khi điều hướng sang trang khác (VD: bấm vào Phòng phỏng vấn Online)
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  const [showLabelBubble, setShowLabelBubble] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ACCEPTED' | 'CSKH'>('ALL');
  const [schedulingApp, setSchedulingApp] = useState<any | null>(null);
  const [interviews, setInterviews] = useState<Record<string, InterviewScheduleData>>(() =>
    getSavedInterviews()
  );

  // State cho kênh Chăm sóc khách hàng (CSKH)
  const storageKey = `smartcv_cskh_thread_${user?.id || 'guest'}`;
  const [supportMessages, setSupportMessages] = useState<SupportMessageItem[]>(() => [
    createInitialSupportGreeting(user?.fullName, isRecruiter),
  ]);
  const [supportInput, setSupportInput] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const supportScrollRef = useRef<HTMLDivElement>(null);

  const scrollToSupportBottom = () => {
    if (supportScrollRef.current) {
      supportScrollRef.current.scrollTop = supportScrollRef.current.scrollHeight;
    }
  };

  // Khôi phục lịch sử trao đổi với CSKH theo từng tài khoản
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSupportMessages(parsed);
          return;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc cache
    }
    setSupportMessages([createInitialSupportGreeting(user?.fullName, isRecruiter)]);
  }, [storageKey, user?.fullName, isRecruiter]);

  const saveSupportMessages = (next: SupportMessageItem[]) => {
    setSupportMessages(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.slice(-30)));
    } catch {
      // Bỏ qua nếu đầy bộ nhớ
    }
    setTimeout(scrollToSupportBottom, 50);
  };

  // Tải danh sách hội thoại giữa Nhà tuyển dụng & Ứng viên
  const fetchConversations = async () => {
    if (!user || isAdmin) {
      setApplications([]);
      return;
    }
    try {
      if (isRecruiter) {
        const res = await api.get('/applications/recruiter');
        const apps: any[] = res.data?.applications || [];
        apps.forEach((a) => {
          if (a.interviewSchedule) saveInterviewToStorage(a.interviewSchedule);
        });
        setInterviews(getSavedInterviews());
        const sorted = [...apps].sort((a, b) => {
          if (a.status === 'ACCEPTED' && b.status !== 'ACCEPTED') return -1;
          if (a.status !== 'ACCEPTED' && b.status === 'ACCEPTED') return 1;
          return 0;
        });
        const seenAppPairs = new Set<string>();
        const uniqueApps = sorted.filter((app) => {
          const candKey =
            app.candidateId || app.candidate?.email || app.cv?.data?.fullName || app.id;
          const pairKey = `${app.jobId || app.job?.id || 'job'}_${candKey}`;
          if (seenAppPairs.has(pairKey)) return false;
          seenAppPairs.add(pairKey);
          return true;
        });
        setApplications(uniqueApps);
        if (!selectedAppId && uniqueApps.length > 0) {
          setSelectedAppId(uniqueApps[0].id);
        }
      } else if (isCandidate) {
        const res = await api.get('/applications/my');
        const apps: any[] = res.data?.applications || [];
        apps.forEach((a) => {
          if (a.interviewSchedule) saveInterviewToStorage(a.interviewSchedule);
        });
        setInterviews(getSavedInterviews());
        const sorted = [...apps].sort((a, b) => {
          if (a.status === 'ACCEPTED' && b.status !== 'ACCEPTED') return -1;
          if (a.status !== 'ACCEPTED' && b.status === 'ACCEPTED') return 1;
          return 0;
        });
        setApplications(sorted);
        if (!selectedAppId && sorted.length > 0) {
          setSelectedAppId(sorted[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách hội thoại:', err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user?.id, user?.role?.name, isOpen]);

  // Lắng nghe sự kiện mở cửa sổ Chat trực tiếp hoặc mở CSKH từ Footer
  useEffect(() => {
    const handleOpenDirectChat = (e: any) => {
      if (isAdmin) return;
      setIsOpen(true);
      fetchConversations();
      if (e.detail?.openSupport) {
        setFilterMode('CSKH');
        return;
      }
      if (e.detail?.applicationId) {
        setFilterMode('ALL');
        setSelectedAppId(e.detail.applicationId);
      }
    };

    const handleInterviewUpdated = () => {
      setInterviews(getSavedInterviews());
      fetchConversations();
    };

    window.addEventListener('cvconnect:open_direct_chat', handleOpenDirectChat);
    window.addEventListener('cvconnect:interview_scheduled', handleInterviewUpdated);
    return () => {
      window.removeEventListener('cvconnect:open_direct_chat', handleOpenDirectChat);
      window.removeEventListener('cvconnect:interview_scheduled', handleInterviewUpdated);
    };
  }, [user?.id, isAdmin]);

  const handleSelectSupportTopic = (topic: QuickSupportTopic) => {
    const now = new Date().toISOString();
    const userMsg: SupportMessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: topic.label,
      createdAt: now,
    };
    const replyMsg: SupportMessageItem = {
      id: `cskh-${Date.now() + 1}`,
      sender: 'cskh',
      isAutoAI: true,
      category: 'Giải đáp tự động 24/7',
      originalQuestion: topic.label,
      content: topic.answer,
      createdAt: new Date(Date.now() + 200).toISOString(),
    };
    saveSupportMessages([...supportMessages, userMsg, replyMsg]);
  };

  const handleSendSupportRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = supportInput.trim();
    if (!trimmed || sendingSupport) return;

    setSendingSupport(true);
    const userMsg: SupportMessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const updatedWithUser = [...supportMessages, userMsg];
    saveSupportMessages(updatedWithUser);
    setSupportInput('');

    const fallback = buildLocalFallbackSupportReply(trimmed, user?.email);

    try {
      const res = await api.post('/support/tickets', {
        fullName: user?.fullName || 'Khách truy cập',
        email: user?.email || '',
        roleName: user?.role?.name || 'GUEST',
        content: trimmed,
      });

      const handledByAI = Boolean(res.data?.handledByAI);
      const replyContent = res.data?.replyContent || fallback.content;
      const category = res.data?.category || fallback.category;
      const ticketCode = res.data?.ticketCode || res.data?.ticket?.ticketCode || fallback.ticketCode;

      const cskhMsg: SupportMessageItem = {
        id: `cskh-${Date.now() + 1}`,
        sender: 'cskh',
        content: replyContent,
        isAutoAI: handledByAI,
        category,
        originalQuestion: handledByAI ? trimmed : undefined,
        ticketCode: handledByAI ? undefined : ticketCode,
        createdAt: new Date().toISOString(),
      };
      saveSupportMessages([...updatedWithUser, cskhMsg]);
    } catch {
      const cskhMsg: SupportMessageItem = {
        id: `cskh-${Date.now() + 1}`,
        sender: 'cskh',
        content: fallback.content,
        isAutoAI: fallback.isAutoAI,
        category: fallback.category,
        originalQuestion: fallback.isAutoAI ? trimmed : undefined,
        ticketCode: fallback.isAutoAI ? undefined : fallback.ticketCode,
        createdAt: new Date().toISOString(),
      };
      saveSupportMessages([...updatedWithUser, cskhMsg]);
    } finally {
      setSendingSupport(false);
    }
  };

  // Cho phép người dùng bấm chuyển câu hỏi sang gặp Chuyên viên CSKH (Admin) nếu câu trả lời tự động của AI chưa giải quyết hết vấn đề riêng
  const handleEscalateToAdmin = async (msgId: string, questionText?: string) => {
    if (!questionText || sendingSupport) return;
    setSendingSupport(true);
    try {
      const res = await api.post('/support/tickets', {
        fullName: user?.fullName || 'Khách truy cập',
        email: user?.email || '',
        roleName: user?.role?.name || 'GUEST',
        content: questionText,
        forceEscalate: true,
      });
      const code =
        res.data?.ticketCode ||
        res.data?.ticket?.ticketCode ||
        `CSKH-${Math.floor(100000 + Math.random() * 900000)}`;

      const marked = supportMessages.map((m) =>
        m.id === msgId ? { ...m, escalated: true } : m
      );
      const confirmMsg: SupportMessageItem = {
        id: `cskh-escalated-${Date.now()}`,
        sender: 'cskh',
        isAutoAI: false,
        ticketCode: code,
        content:
          res.data?.replyContent ||
          `Đã chuyển yêu cầu "${questionText}" tới Chuyên viên CSKH. Bạn sẽ nhận được phản hồi ngay tại đây và qua hộp thư cá nhân.`,
        createdAt: new Date().toISOString(),
      };
      saveSupportMessages([...marked, confirmMsg]);
    } catch {
      alert('Không thể chuyển phiếu lúc này, vui lòng thử lại sau.');
    } finally {
      setSendingSupport(false);
    }
  };

  // Đồng bộ phản hồi chính thức từ Admin/CSKH (nếu có trong PostgreSQL) + lắng nghe realtime qua Socket.io
  const syncAdminRepliesFromServer = () => {
    if (!user || isAdmin) return;
    api
      .get('/support/my-tickets')
      .then((res) => {
        const tickets: any[] = res.data?.tickets || [];
        const repliedTickets = tickets.filter(
          (t) => t.adminReply && t.handledBy !== 'AI'
        );
        if (repliedTickets.length === 0) return;

        setSupportMessages((prev) => {
          let changed = false;
          const next = [...prev];
          repliedTickets.forEach((t) => {
            const replyId = `admin-reply-${t.id}-${t.updatedAt || ''}`;
            const existingIdx = next.findIndex((m) => m.id.startsWith(`admin-reply-${t.id}`));
            const updatedMsg: SupportMessageItem = {
              id: replyId,
              sender: 'cskh',
              ticketCode: `${t.ticketCode} • Đã phản hồi`,
              content: `Phản hồi từ Chuyên viên CSKH:\n${t.adminReply}`,
              createdAt: t.updatedAt || new Date().toISOString(),
            };
            if (existingIdx === -1) {
              changed = true;
              next.push(updatedMsg);
            } else if (next[existingIdx].id !== replyId) {
              changed = true;
              next[existingIdx] = updatedMsg;
            }
          });
          if (changed) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(next.slice(-30)));
            } catch {
              // ignore
            }
            return next;
          }
          return prev;
        });
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user || isAdmin || !isOpen || filterMode !== 'CSKH') return;
    syncAdminRepliesFromServer();
  }, [user?.id, isAdmin, isOpen, filterMode]);

  useEffect(() => {
    if (!socket || !user || isAdmin) return;
    const handleTicketReplied = () => {
      syncAdminRepliesFromServer();
    };
    socket.on('support_ticket_replied', handleTicketReplied);
    return () => {
      socket.off('support_ticket_replied', handleTicketReplied);
    };
  }, [socket, user?.id, isAdmin, storageKey]);

  const handleResetSupportChat = () => {
    const resetList = [createInitialSupportGreeting(user?.fullName, isRecruiter)];
    setSupportMessages(resetList);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Bỏ qua
    }
  };

  // Tài khoản Admin chỉ làm nhiệm vụ thống kê & quản trị hệ thống, không hiện bong bóng chat cá nhân
  if (isAdmin) {
    return null;
  }

  const filteredApps = applications.filter((app) =>
    filterMode === 'ACCEPTED' ? app.status === 'ACCEPTED' : true
  );

  const activeApp =
    applications.find((a) => a.id === selectedAppId) || filteredApps[0] || null;

  const acceptedCount = applications.filter((a) => a.status === 'ACCEPTED').length;
  const badgeCount = applications.length;

  const floatingLabelText = isRecruiter
    ? 'Chat & Hẹn lịch với Ứng viên'
    : 'Trò chuyện với Nhà tuyển dụng';

  const quickTopics = isRecruiter ? RECRUITER_SUPPORT_TOPICS : CANDIDATE_SUPPORT_TOPICS;

  const renderSupportCenterPanel = () => (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Thanh tiêu đề bộ phận CSKH */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
            <Headphones size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-slate-900 truncate">
              Trung tâm Chăm sóc khách hàng SmartCV
            </p>
            <p className="text-xs text-slate-500 truncate">
              Tổng đài 1900 6868 89 • cskh@smartcv.vn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            <Bot size={13} /> AI tự động 24/7
          </span>
          <button
            type="button"
            onClick={handleResetSupportChat}
            title="Làm mới hội thoại hỗ trợ"
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Khu vực tin nhắn & câu hỏi thường gặp */}
      <div
        ref={supportScrollRef}
        className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/70"
      >
        {supportMessages.map((m) => {
          const isMe = m.sender === 'user';
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[84%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-2xs ${
                  isMe
                    ? 'bg-teal-600 text-white rounded-br-xs'
                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-xs'
                }`}
              >
                {!isMe && m.isAutoAI && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 text-[11px] font-bold">
                    <Bot size={12} className="text-sky-600" />
                    <span>Trợ lý AI CSKH • {m.category || 'Giải đáp tự động'}</span>
                  </div>
                )}

                {!isMe && m.ticketCode && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                    <UserCheck size={12} className="text-amber-600" />
                    <span>
                      {m.ticketCode.includes('Đã phản hồi')
                        ? `Mã phiếu #${m.ticketCode}`
                        : `Mã phiếu tiếp nhận: #${m.ticketCode} • Chờ Chuyên viên`}
                    </span>
                  </div>
                )}

                <p className="leading-relaxed whitespace-pre-line">{m.content}</p>

                {!isMe && m.isAutoAI && m.originalQuestion && !m.escalated && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">
                      Cần kiểm tra riêng trên tài khoản?
                    </span>
                    <button
                      type="button"
                      disabled={sendingSupport}
                      onClick={() => handleEscalateToAdmin(m.id, m.originalQuestion)}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer disabled:opacity-50"
                    >
                      Chuyển gặp Chuyên viên CSKH →
                    </button>
                  </div>
                )}

                {!isMe && m.escalated && (
                  <p className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] font-semibold text-emerald-700">
                    ✓ Đã chuyển phiếu tới Chuyên viên CSKH hỗ trợ.
                  </p>
                )}

                <span
                  className={`block text-[10px] mt-1.5 text-right ${
                    isMe ? 'text-teal-100' : 'text-slate-400'
                  }`}
                >
                  {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          );
        })}

        {/* Các chủ đề hỗ trợ nhanh giống các cổng việc làm trực tuyến */}
        <div className="pt-1">
          <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
            <HelpCircle size={13} className="text-teal-600" />
            <span>Chọn nhanh vấn đề bạn cần giải đáp:</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {quickTopics.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => handleSelectSupportTopic(topic)}
                className="text-left text-xs font-semibold px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition-colors cursor-pointer shadow-2xs"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Form gửi yêu cầu hỗ trợ tới bộ phận CSKH */}
      <form
        onSubmit={handleSendSupportRequest}
        className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2.5 shrink-0"
      >
        <input
          type="text"
          value={supportInput}
          onChange={(e) => setSupportInput(e.target.value)}
          placeholder="Nhập vấn đề cần bộ phận Chăm sóc khách hàng hỗ trợ..."
          className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={!supportInput.trim() || sendingSupport}
          className="px-4 sm:px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Send size={15} />
          <span>Gửi yêu cầu</span>
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* BIỂU TƯỢNG TRÒ CHUYỆN TRỰC TIẾP: CHỈ HIỂN THỊ KHI ĐÃ ĐĂNG NHẬP (ỨNG VIÊN / NHÀ TUYỂN DỤNG) */}
      {user && (
        <div className="fixed bottom-20 right-3 sm:bottom-24 sm:right-6 z-[990] flex items-center gap-2.5 select-none">
          {!isOpen && showLabelBubble && (
            <div className="relative group hidden sm:flex items-center">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-4 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs sm:text-sm shadow-md border border-emerald-300 transition-all transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare size={14} className="text-emerald-600" />
                <span>{floatingLabelText}</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLabelBubble(false);
                }}
                title="Ẩn nhãn"
                className="ml-1 w-5 h-5 rounded-full bg-white/90 border border-emerald-200 text-emerald-600 hover:text-emerald-900 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
              >
                <X size={11} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            title={floatingLabelText}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-tl-[22px] rounded-tr-[22px] rounded-bl-[22px] rounded-br-[8px] sm:rounded-tl-[26px] sm:rounded-tr-[26px] sm:rounded-bl-[26px] sm:rounded-br-[10px] bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-teal-700 border-2 border-white shadow-xl shadow-emerald-600/25 flex items-center justify-center text-white transition-all transform hover:scale-105 active:scale-95 relative cursor-pointer"
          >
            <MessageSquare size={24} className="sm:w-7 sm:h-7" strokeWidth={2.4} />
            {badgeCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] border-2 border-white flex items-center justify-center shadow">
                {badgeCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* CỬA SỔ TRÒ CHUYỆN & CHĂM SÓC KHÁCH HÀNG */}
      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-6xl h-[86vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header gọn gàng */}
            <div className="px-6 py-3.5 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <MessageSquare size={20} />
                <h3 className="font-bold text-sm sm:text-base">
                  Kênh trò chuyện ứng tuyển & Chăm sóc khách hàng
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X size={16} />
                <span>Đóng</span>
              </button>
            </div>

            {!user ? (
              filterMode === 'CSKH' ? (
                <div className="flex-1 p-4 sm:p-6 bg-slate-100/70 min-h-0 flex flex-col">
                  {renderSupportCenterPanel()}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-4">
                  <MessageSquare size={52} className="mx-auto text-teal-600 opacity-40" />
                  <h4 className="font-bold text-slate-800 text-base sm:text-lg">
                    Đăng nhập để trò chuyện trực tiếp với Nhà tuyển dụng & Ứng viên
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md">
                    Hoặc bạn có thể liên hệ ngay với Bộ phận Chăm sóc khách hàng SmartCV nếu cần giải đáp thắc mắc.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <Link
                      to="/login"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 text-white font-semibold text-sm shadow-xs hover:bg-teal-700"
                    >
                      <LogIn size={17} /> Đăng nhập ngay
                    </Link>
                    <button
                      type="button"
                      onClick={() => setFilterMode('CSKH')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
                    >
                      <Headphones size={17} className="text-teal-600" /> Liên hệ CSKH
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* GIAO DIỆN CHO NHÀ TUYỂN DỤNG & ỨNG VIÊN (KÊNH ỨNG TUYỂN + KÊNH CSKH) */
              <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
                {/* CỘT TRÁI (4/12): DANH SÁCH HỘI THOẠI & KÊNH CSKH */}
                <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/70 min-h-0">
                  <div className="p-3.5 border-b border-slate-200 grid grid-cols-3 gap-1.5 bg-white shrink-0">
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        filterMode === 'ALL'
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({applications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('ACCEPTED')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        filterMode === 'ACCEPTED'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <Sparkles size={12} /> Đã duyệt ({acceptedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('CSKH')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        filterMode === 'CSKH'
                          ? 'bg-teal-600 text-white'
                          : 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                      }`}
                    >
                      <Headphones size={13} /> CSKH
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {filterMode === 'CSKH' ? (
                      <div className="divide-y divide-slate-100">
                        <div className="w-full text-left p-4 bg-white border-l-4 border-l-teal-600 shadow-2xs flex items-start gap-3.5">
                          <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                            <Headphones size={20} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              Chăm sóc khách hàng
                            </p>
                            <p className="text-xs font-semibold text-teal-700 truncate mt-0.5">
                              Hỗ trợ Ứng viên & Doanh nghiệp
                            </p>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              AI giải đáp 24/7 & Chuyên viên hỗ trợ
                            </p>
                          </div>
                        </div>

                        <div className="p-4 space-y-2.5 text-xs text-slate-600 bg-slate-50/80">
                          <p className="font-bold text-slate-800">Kênh liên hệ chính thức</p>
                          <div className="flex items-center gap-2">
                            <Phone size={14} className="text-teal-600 shrink-0" />
                            <span>
                              Hotline: <strong className="text-slate-800">1900 6868 89</strong> (Nhánh 2)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-teal-600 shrink-0" />
                            <span>
                              Email: <strong className="text-slate-800">cskh@smartcv.vn</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-teal-600 shrink-0" />
                            <span>Thời gian: 08:00 - 22:00 (Thứ 2 - CN)</span>
                          </div>
                        </div>
                      </div>
                    ) : filteredApps.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 font-medium leading-relaxed">
                        Chưa có cuộc trò chuyện ứng tuyển nào. Nếu cần giải đáp thắc mắc, bạn có thể chọn mục{' '}
                        <button
                          type="button"
                          onClick={() => setFilterMode('CSKH')}
                          className="font-bold text-teal-700 underline cursor-pointer"
                        >
                          CSKH
                        </button>{' '}
                        để liên hệ bộ phận Chăm sóc khách hàng.
                      </div>
                    ) : (
                      filteredApps.map((app) => {
                        const isSelected = activeApp?.id === app.id;
                        const partnerName = isRecruiter
                          ? app.cv?.data?.fullName || app.candidate?.fullName || 'Ứng viên'
                          : app.job?.company?.name || 'Nhà tuyển dụng';
                        const jobTitle = app.job?.title || 'Vị trí tuyển dụng';
                        const sched = app.interviewSchedule || interviews[app.id];

                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => setSelectedAppId(app.id)}
                            className={`w-full text-left p-4 transition-all hover:bg-white flex items-start gap-3.5 cursor-pointer ${
                              isSelected
                                ? 'bg-white border-l-4 border-l-emerald-600 shadow-2xs'
                                : ''
                            }`}
                          >
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                                app.status === 'ACCEPTED'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                  : 'bg-primary-50 text-primary-600 border border-primary-100'
                              }`}
                            >
                              {partnerName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <p className="font-bold text-sm text-slate-900 truncate">
                                  {partnerName}
                                </p>
                                {app.status === 'ACCEPTED' && (
                                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                                    Đã duyệt
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-slate-500 truncate flex items-center gap-1 mt-1">
                                <Briefcase size={12} className="text-primary-500 shrink-0" />
                                <span className="truncate">{jobTitle}</span>
                              </p>
                              {sched && (
                                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <Calendar size={11} /> Hẹn PV: {sched.time} •{' '}
                                  {String(sched.date || '').split('-').reverse().join('/')}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* CỘT PHẢI (8/12): KHUNG HỘI THOẠI HOẶC TRUNG TÂM CSKH */}
                <div className="md:col-span-8 p-4 bg-slate-100/60 flex flex-col justify-between min-h-0">
                  {filterMode === 'CSKH' ? (
                    renderSupportCenterPanel()
                  ) : activeApp ? (
                    <ChatWindow
                      fullHeight
                      applicationId={activeApp.id}
                      receiverId={
                        isRecruiter ? activeApp.candidateId : activeApp.job?.postedBy || ''
                      }
                      receiverName={
                        isRecruiter
                          ? activeApp.cv?.data?.fullName ||
                            activeApp.candidate?.fullName ||
                            'Ứng viên'
                          : activeApp.job?.company?.name || 'Nhà tuyển dụng'
                      }
                      onOpenScheduleModal={
                        isRecruiter ? () => setSchedulingApp(activeApp) : undefined
                      }
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm font-medium gap-3">
                      <p>Chọn một cuộc trò chuyện bên trái để bắt đầu</p>
                      <button
                        type="button"
                        onClick={() => setFilterMode('CSKH')}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Headphones size={14} /> Liên hệ Chăm sóc khách hàng
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal hẹn lịch phỏng vấn nếu mở từ trong cửa sổ Chat */}
      {schedulingApp && (
        <InterviewScheduleModal
          application={schedulingApp}
          existingSchedule={interviews[schedulingApp.id] || null}
          onClose={() => setSchedulingApp(null)}
          onScheduled={(newSchedule) => {
            setInterviews((prev) => ({ ...prev, [newSchedule.applicationId]: newSchedule }));
            setSchedulingApp(null);
          }}
        />
      )}
    </>
  );
};

export default FloatingDirectChat;
