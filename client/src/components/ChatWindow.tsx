import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Send, User, Loader2, Calendar, Video, CheckCircle2 } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Message } from '../types';

interface Props {
  applicationId: string;
  receiverId: string;
  receiverName: string;
  compact?: boolean;
  fullHeight?: boolean;
  onOpenScheduleModal?: () => void;
}

const ChatWindow = ({
  applicationId,
  receiverId,
  receiverName,
  compact = false,
  fullHeight = false,
  onOpenScheduleModal,
}: Props) => {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const location = useLocation();
  const isRecruiter = user?.role?.name === 'RECRUITER';
  const inInterviewRoom = location.pathname.startsWith('/interview-room/');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  /** 1. Tải lịch sử nhắn tin */
  const fetchHistory = async () => {
    try {
      const res = await api.get(`/messages/${applicationId}`);
      setMessages(res.data.messages || []);
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchHistory();

    // Lắng nghe sự kiện cập nhật lịch phỏng vấn từ Modal để tải lại tin nhắn ngay lập tức
    const onScheduleSent = (e: any) => {
      if (!e.detail || e.detail.applicationId === applicationId) {
        fetchHistory();
      }
    };
    window.addEventListener('cvconnect:interview_scheduled', onScheduleSent);
    return () => {
      window.removeEventListener('cvconnect:interview_scheduled', onScheduleSent);
    };
  }, [applicationId]);

  /** 2. Socket.io: Join room & Lắng nghe tin nhắn mới */
  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('join_chat', applicationId);

    const onNewMessage = (msg: Message) => {
      if (msg.applicationId === applicationId) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('new_message', onNewMessage);

    return () => {
      socket.emit('leave_chat', applicationId);
      socket.off('new_message', onNewMessage);
    };
  }, [socket, connected, applicationId]);

  /** 3. Cuộn khi có tin nhắn mới */
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /** 4. Gửi tin nhắn qua API (và tự động phát realtime qua Socket ở Backend) */
  const sendTextMessage = async (textContent: string) => {
    const content = textContent.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await api.post('/messages', {
        applicationId,
        receiverId,
        content,
      });
      const savedMsg = res.data?.data;
      if (savedMsg) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === savedMsg.id)) return prev;
          return [...prev, savedMsg];
        });
      }
      setInput('');
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendTextMessage(input);
  };

  const quickReplies = isRecruiter
    ? [
        'Chào bạn, công ty đã duyệt hồ sơ CV của bạn!',
        'Bạn kiểm tra lịch hẹn phỏng vấn và xác nhận giúp công ty nhé.',
        'Bạn có thể gửi thêm link Portfolio hoặc GitHub không?',
      ]
    : [
        'Em cảm ơn Anh/Chị Nhà tuyển dụng! Em xác nhận tham gia phỏng vấn đúng giờ ạ.',
        'Dạ em đã nhận được lịch hẹn phỏng vấn của công ty ạ.',
        'Em xin phép hỏi thêm về quy trình phỏng vấn của vị trí này ạ?',
      ];

  return (
    <div
      className={`flex flex-col ${
        fullHeight ? 'h-full flex-1' : compact ? 'h-[430px]' : 'h-[500px]'
      } bg-white rounded-3xl border border-slate-200/80 shadow-lg overflow-hidden`}
    >
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-primary-600 to-indigo-700 text-white flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
            <User size={19} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm sm:text-base leading-tight truncate">{receiverName}</p>
            <p className="text-[10px] uppercase font-bold text-primary-100 tracking-wider flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Kênh trò chuyện trực tiếp
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!inInterviewRoom && (
            <Link
              to={`/interview-room/${applicationId}`}
              title="Mở phòng phỏng vấn Video trực tuyến"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 border border-emerald-300/40 transition-all"
            >
              <Video size={14} />
              <span className="hidden sm:inline">Phỏng vấn Online</span>
            </Link>
          )}
          {isRecruiter && onOpenScheduleModal && (
            <button
              type="button"
              onClick={onOpenScheduleModal}
              className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-extrabold text-xs flex items-center gap-1.5 border border-white/20 transition-all shrink-0 cursor-pointer"
            >
              <Calendar size={14} />
              <span className="hidden sm:inline">Hẹn lịch</span>
            </button>
          )}
        </div>
      </div>

      {/* Danh sách tin nhắn */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/60"
        style={{ scrollBehavior: 'smooth' }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-300">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 text-center px-4">
            <Calendar size={40} className="opacity-25 text-primary-500" />
            <p className="font-bold text-xs sm:text-sm text-slate-600">
              Bắt đầu cuộc trò chuyện với {receiverName}
            </p>
            <p className="text-[11px] text-slate-400">
              Bạn có thể chọn nhanh mẫu tin nhắn bên dưới hoặc nhập nội dung trao đổi trực tiếp.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMine = m.senderId === user?.id;
            const isInterviewCard = m.content.startsWith('📅 [LỊCH HẸN PHỎNG VẤN]');

            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                {isInterviewCard ? (
                  <div className="max-w-[88%] sm:max-w-[80%] rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-md text-slate-800 space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
                      <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Calendar size={16} />
                      </span>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                          Thư mời phỏng vấn chính thức
                        </span>
                        <h5 className="text-xs sm:text-sm font-black text-slate-900">
                          Lịch hẹn phỏng vấn ứng viên tiềm năng
                        </h5>
                      </div>
                    </div>
                    <div className="text-xs leading-relaxed whitespace-pre-line font-medium text-slate-700">
                      {m.content.replace('📅 [LỊCH HẸN PHỎNG VẤN]\n', '')}
                    </div>
                    {!inInterviewRoom && (
                      <div className="pt-1">
                        <Link
                          to={`/interview-room/${applicationId}`}
                          className="w-full py-2 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Video size={14} />
                          <span>Tham gia phòng phỏng vấn trực tuyến →</span>
                        </Link>
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 size={12} /> Đã gửi lịch hẹn
                      </span>
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl font-medium text-xs sm:text-sm shadow-sm whitespace-pre-line ${
                      isMine
                        ? 'bg-primary-600 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-200/80'
                    }`}
                  >
                    {m.content}
                    <div
                      className={`text-[10px] mt-1 opacity-60 flex items-center gap-1 ${
                        isMine ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Gợi ý tin nhắn nhanh (Hiển thị gọn gàng không thanh cuộn ngang thô) */}
      <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-1.5 shrink-0">
        {quickReplies.map((reply, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendTextMessage(reply)}
            className="px-3 py-1.5 rounded-full bg-white hover:bg-primary-50 text-slate-600 hover:text-primary-700 border border-slate-200 hover:border-primary-300 text-[11px] font-semibold transition-all text-left"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Ô nhập tin nhắn */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-white border-t border-slate-100 flex gap-2.5 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn trao đổi trực tiếp..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 font-medium transition-all text-xs sm:text-sm"
          onFocus={scrollToBottom}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-12 h-12 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl flex items-center justify-center shadow-md shadow-primary-200 transition-all transform active:scale-95 disabled:opacity-50 shrink-0"
        >
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
