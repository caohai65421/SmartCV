import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  X,
  CheckCircle2,
  Send,
  Loader2,
  UserCheck,
  Mail,
  Settings,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';

export interface InterviewScheduleData {
  applicationId: string;
  candidateName: string;
  recipientEmail?: string;
  jobTitle: string;
  date: string;
  time: string;
  mode: 'OFFLINE' | 'ONLINE';
  locationOrLink: string;
  interviewer: string;
  note: string;
  createdAt: string;
}

const STORAGE_KEY = 'cvconnect_interview_schedules';

export function getSavedInterviews(): Record<string, InterviewScheduleData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveInterviewToStorage(data: InterviewScheduleData) {
  const all = getSavedInterviews();
  all[data.applicationId] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

interface InterviewScheduleModalProps {
  application: any;
  existingSchedule?: InterviewScheduleData | null;
  onClose: () => void;
  onScheduled: (schedule: InterviewScheduleData) => void;
}

export const InterviewScheduleModal: React.FC<InterviewScheduleModalProps> = ({
  application,
  existingSchedule,
  onClose,
  onScheduled,
}) => {
  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  const cvData = application?.cv?.data || {};
  const candidateName =
    cvData.fullName ||
    cvData.personalInfo?.fullName ||
    application?.candidate?.fullName ||
    'Ứng viên';
  const defaultCandidateEmail =
    existingSchedule?.recipientEmail ||
    cvData.email ||
    cvData.personalInfo?.email ||
    application?.candidate?.email ||
    '';
  const jobTitle = application?.job?.title || 'Vị trí tuyển dụng';
  const companyName = application?.job?.company?.name || 'Quý Công ty';
  const builtInRoomUrl = `${window.location.origin}/interview-room/${application?.id}`;

  const [date, setDate] = useState(existingSchedule?.date || defaultDate());
  const [time, setTime] = useState(existingSchedule?.time || '09:30');
  const [mode, setMode] = useState<'OFFLINE' | 'ONLINE'>(existingSchedule?.mode || 'ONLINE');
  const [locationOrLink, setLocationOrLink] = useState(
    existingSchedule?.locationOrLink || builtInRoomUrl
  );
  const [interviewer, setInterviewer] = useState(
    existingSchedule?.interviewer || 'Bộ phận Tuyển dụng Nhân sự (HR) & Tech Lead'
  );
  const [note, setNote] = useState(
    existingSchedule?.note ||
      'Vui lòng kiểm tra trước Camera/Micro và vào phòng phỏng vấn trước giờ hẹn 5 phút.'
  );

  // Cấu hình gửi thông báo qua Email / Gmail
  const [sendEmail, setSendEmail] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState(defaultCandidateEmail);
  const [smtpConfigured, setSmtpConfigured] = useState<boolean>(false);
  const [smtpSenderEmail, setSmtpSenderEmail] = useState<string>('');
  const [showSmtpSetup, setShowSmtpSetup] = useState(false);
  const [smtpInputEmail, setSmtpInputEmail] = useState('');
  const [smtpInputPass, setSmtpInputPass] = useState('');
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const [submitting, setSubmitting] = useState(false);
  const [doneResult, setDoneResult] = useState<{
    schedule: InterviewScheduleData;
    emailSent: boolean;
    emailMessage: string;
  } | null>(null);

  useEffect(() => {
    api
      .get('/applications/smtp-status')
      .then((res) => {
        setSmtpConfigured(Boolean(res.data?.smtpConfigured));
        setSmtpSenderEmail(res.data?.senderEmail || '');
      })
      .catch(() => {});
  }, []);

  const handleModeChange = (newMode: 'OFFLINE' | 'ONLINE') => {
    setMode(newMode);
    if (newMode === 'ONLINE' && !locationOrLink.startsWith('http')) {
      setLocationOrLink(builtInRoomUrl);
    } else if (newMode === 'OFFLINE' && locationOrLink.startsWith('http')) {
      setLocationOrLink(
        application?.job?.location ||
          'Tòa nhà FPT, Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội'
      );
    }
  };

  const formattedDate = date.split('-').reverse().join('/');

  // Tạo đường dẫn mở trực tiếp trình soạn thư Gmail trên trình duyệt với đầy đủ nội dung thư mời
  const buildGmailWebComposeUrl = () => {
    const subject = `[SmartCV] Thư mời phỏng vấn & Duyệt CV vị trí ${jobTitle}`;
    const bodyLines = [
      `Thân gửi ${candidateName},`,
      '',
      `Chúc mừng bạn! Hồ sơ CV ứng tuyển của bạn cho vị trí "${jobTitle}" trên hệ thống SmartCV đã được Chấp nhận.`,
      `Bộ phận Tuyển dụng trân trọng mời bạn tham dự buổi phỏng vấn theo lịch hẹn sau:`,
      '',
      `- Vị trí ứng tuyển: ${jobTitle}`,
      `- Ngày phỏng vấn: ${formattedDate}`,
      `- Thời gian bắt đầu: ${time}`,
      `- Hình thức: ${
        mode === 'OFFLINE'
          ? 'Trực tiếp tại văn phòng'
          : 'Phỏng vấn trực tuyến (Online Video Call)'
      }`,
      `- ${mode === 'OFFLINE' ? 'Địa điểm' : 'Đường dẫn tham gia'}: ${locationOrLink}`,
      `- Người phụ trách: ${interviewer}`,
      note ? `- Lưu ý chuẩn bị: ${note}` : '',
      '',
      'Bạn vui lòng phản hồi lại email này hoặc nhắn xác nhận trên hệ thống SmartCV để Bộ phận Nhân sự sắp xếp đón tiếp chu đáo.',
      '',
      `Trân trọng,`,
      `Bộ phận Tuyển dụng Nhân sự (${companyName})`,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      recipientEmail.trim()
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines)}`;
  };

  const handleSaveSmtpConfig = async () => {
    if (!smtpInputEmail.trim() || !smtpInputPass.trim()) {
      setSmtpFeedback({
        type: 'err',
        text: 'Vui lòng nhập địa chỉ Gmail và Mật khẩu ứng dụng Google (16 ký tự).',
      });
      return;
    }
    setSavingSmtp(true);
    setSmtpFeedback(null);
    try {
      const res = await api.post('/applications/smtp-config', {
        emailUser: smtpInputEmail.trim(),
        appPassword: smtpInputPass.trim(),
      });
      setSmtpConfigured(true);
      setSmtpSenderEmail(res.data?.senderEmail || smtpInputEmail.trim());
      setShowSmtpSetup(false);
      setSmtpInputPass('');
      setSmtpFeedback({
        type: 'ok',
        text: res.data?.message || 'Đã kết nối Gmail gửi tự động thành công.',
      });
    } catch (err: any) {
      setSmtpFeedback({
        type: 'err',
        text:
          err.response?.data?.message ||
          'Không thể xác thực Gmail. Hãy đảm bảo bạn dùng Mật khẩu ứng dụng 16 ký tự của Google.',
      });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const scheduleObj: InterviewScheduleData = {
      applicationId: application.id,
      candidateName,
      recipientEmail: recipientEmail.trim(),
      jobTitle,
      date,
      time,
      mode,
      locationOrLink,
      interviewer,
      note,
      createdAt: new Date().toISOString(),
    };

    // 1. Lưu lịch hẹn vào bộ nhớ cục bộ & đồng bộ lên cơ sở dữ liệu PostgreSQL
    saveInterviewToStorage(scheduleObj);
    try {
      await api.post(`/applications/${application.id}/interview-schedule`, scheduleObj);
    } catch {
      // Đã có bộ nhớ dự phòng cục bộ nếu mạng gián đoạn
    }

    // 2. Gửi tin nhắn Lịch hẹn phỏng vấn thời gian thực trong kênh Chat của SmartCV
    const messageContent = [
      `📅 [LỊCH HẸN PHỎNG VẤN]`,
      `Chúc mừng ứng viên ${candidateName}! Hồ sơ CV của bạn cho vị trí "${jobTitle}" đã được Chấp nhận.`,
      `• Ngày phỏng vấn: ${formattedDate}`,
      `• Thời gian: ${time}`,
      `• Hình thức: ${
        mode === 'OFFLINE' ? 'Trực tiếp tại văn phòng (Offline)' : 'Phỏng vấn Online (Video Call)'
      }`,
      `• ${mode === 'OFFLINE' ? 'Địa điểm' : 'Link tham gia'}: ${locationOrLink}`,
      `• Người phỏng vấn: ${interviewer}`,
      note ? `• Lưu ý chuẩn bị: ${note}` : '',
      `Vui lòng phản hồi tin nhắn này để xác nhận tham gia phỏng vấn nhé!`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await api.post('/messages', {
        applicationId: application.id,
        receiverId: application.candidateId,
        content: messageContent,
      });
      window.dispatchEvent(
        new CustomEvent('cvconnect:interview_scheduled', {
          detail: { applicationId: application.id, schedule: scheduleObj },
        })
      );
    } catch (err) {
      console.error('Lỗi gửi tin nhắn lịch hẹn:', err);
    }

    // 3. Gửi Email / Gmail thông báo tự động tới ứng viên (nếu bật)
    if (sendEmail && recipientEmail.trim()) {
      try {
        const emailRes = await api.post(
          `/applications/${application.id}/schedule-interview-email`,
          {
            recipientEmail: recipientEmail.trim(),
            candidateName,
            date,
            time,
            mode,
            locationOrLink,
            interviewer,
            note,
          }
        );

        setSubmitting(false);
        setDoneResult({
          schedule: scheduleObj,
          emailSent: Boolean(emailRes.data?.emailSent),
          emailMessage:
            emailRes.data?.message ||
            (emailRes.data?.emailSent
              ? `Đã gửi thư mời phỏng vấn tới ${recipientEmail.trim()}.`
              : 'Đã lưu lịch phỏng vấn trên hệ thống.'),
        });
        return;
      } catch (err: any) {
        setSubmitting(false);
        setDoneResult({
          schedule: scheduleObj,
          emailSent: false,
          emailMessage:
            err.response?.data?.message ||
            'Đã gửi lịch hẹn trên hệ thống. Bạn có thể bấm nút bên dưới để mở gửi nhanh qua Gmail.',
        });
        return;
      }
    }

    setSubmitting(false);
    onScheduled(scheduleObj);
  };

  const inputCls =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-500 font-medium transition-all text-xs sm:text-sm';

  const isDummyEmail = recipientEmail.trim().toLowerCase().endsWith('@example.com');

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header nhẹ nhàng */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-700 via-teal-600 to-sky-700 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[11px] font-semibold bg-white/20 px-2.5 py-0.5 rounded-full">
                Duyệt CV &amp; Đặt lịch phỏng vấn
              </span>
              <h3 className="text-base sm:text-lg font-bold mt-1">
                Hẹn lịch phỏng vấn &amp; Gửi thư mời qua Gmail
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => (doneResult ? onScheduled(doneResult.schedule) : onClose())}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Màn hình kết quả sau khi xác nhận đặt lịch */}
        {doneResult ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm space-y-1">
                <p className="font-bold text-slate-900">
                  Đã đặt lịch phỏng vấn &amp; gửi thông báo trên hệ thống!
                </p>
                <p className="text-slate-600">
                  Ứng viên <strong>{candidateName}</strong> đã nhận được thẻ Lịch phỏng vấn ({formattedDate} lúc {time}) trong mục Trò chuyện và Thông báo.
                </p>
              </div>
            </div>

            {doneResult.emailSent ? (
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
                <Mail size={20} className="text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <p className="font-bold text-sky-900">Đã gửi Email tự động qua Gmail thành công</p>
                  <p className="text-sky-800">{doneResult.emailMessage}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-amber-900">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Chưa gửi tự động qua máy chủ SMTP</p>
                    <p className="text-amber-800 mt-0.5">{doneResult.emailMessage}</p>
                  </div>
                </div>
                <a
                  href={buildGmailWebComposeUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-amber-100/60 text-teal-700 border border-amber-300 font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Mail size={16} />
                  <span>Mở Gmail trên trình duyệt để gửi thư mời tới {recipientEmail}</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              {doneResult.schedule.mode === 'ONLINE' && (
                <Link
                  to={`/interview-room/${application.id}`}
                  onClick={() => onScheduled(doneResult.schedule)}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors"
                >
                  <Video size={15} />
                  <span>Mở phòng phỏng vấn Online</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => onScheduled(doneResult.schedule)}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Hoàn tất &amp; Đóng
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Thông tin ứng viên & vị trí */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200/80 flex items-start gap-3">
              <UserCheck size={19} className="text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold text-slate-900">Ứng viên: {candidateName}</p>
                <p className="font-medium text-teal-700 mt-0.5">Vị trí ứng tuyển: {jobTitle}</p>
              </div>
            </div>

            {/* KHU VỰC GỬI EMAIL / GMAIL CHO ỨNG VIÊN */}
            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200/80 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Mail size={15} className="text-sky-600" />
                    Gửi Email thông báo Duyệt CV &amp; Lịch phỏng vấn (Gmail)
                  </span>
                </label>

                {smtpConfigured ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    SMTP: {smtpSenderEmail}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSmtpSetup((prev) => !prev)}
                    className="text-[11px] font-semibold text-sky-700 hover:text-sky-900 bg-white px-2.5 py-1 rounded-lg border border-sky-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Settings size={12} />
                    <span>{showSmtpSetup ? 'Ẩn cài đặt Gmail' : 'Cài đặt Gmail gửi tự động'}</span>
                  </button>
                )}
              </div>

              {sendEmail && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Địa chỉ Email / Gmail nhận thư mời của ứng viên *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        required={sendEmail}
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="nhap-gmail-ung-vien@gmail.com"
                        className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-sky-500"
                      />
                      <a
                        href={buildGmailWebComposeUrl()}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở cửa sổ soạn thư Gmail trên trình duyệt với nội dung điền sẵn"
                        className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-100/70 text-sky-700 border border-sky-200 font-semibold text-xs inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                      >
                        <ExternalLink size={13} />
                        <span>Soạn trên Gmail Web</span>
                      </a>
                    </div>
                  </div>

                  {isDummyEmail && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1.5 rounded-lg">
                      Tài khoản mẫu đang dùng email giả lập <strong>{recipientEmail}</strong> — bạn có thể sửa trực tiếp ô trên thành địa chỉ <strong>@gmail.com</strong> thật để kiểm tra nhận thư mời!
                    </p>
                  )}
                </div>
              )}

              {smtpFeedback && (
                <p
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border ${
                    smtpFeedback.type === 'ok'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  {smtpFeedback.text}
                </p>
              )}

              {/* Khung cấu hình nhanh Gmail + Google App Password ngay trên giao diện */}
              {showSmtpSetup && (
                <div className="p-3.5 rounded-xl bg-white border border-sky-200 space-y-2.5 text-xs">
                  <p className="font-bold text-slate-800">
                    Kết nối tài khoản Gmail để hệ thống tự động gửi ngầm (Nodemailer SMTP):
                  </p>
                  <p className="text-slate-500 leading-relaxed">
                    Nhập địa chỉ Gmail của bạn và <strong>Mật khẩu ứng dụng 16 ký tự</strong> (tạo tại{' '}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-600 underline font-semibold"
                    >
                      Google App Passwords
                    </a>
                    ). Nếu chưa tạo mã 16 ký tự, bạn vẫn có thể dùng nút <strong>Soạn trên Gmail Web</strong> ở trên.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      value={smtpInputEmail}
                      onChange={(e) => setSmtpInputEmail(e.target.value)}
                      placeholder="Gmail gửi đi (vd: hr.congty@gmail.com)"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                    />
                    <input
                      type="password"
                      value={smtpInputPass}
                      onChange={(e) => setSmtpInputPass(e.target.value)}
                      placeholder="Mật khẩu ứng dụng 16 ký tự"
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingSmtp}
                      onClick={handleSaveSmtpConfig}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      {savingSmtp && <Loader2 size={13} className="animate-spin" />}
                      <span>Lưu &amp; Kiểm tra kết nối Gmail</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ngày & Giờ phỏng vấn */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-600" /> Ngày phỏng vấn *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-600" /> Giờ bắt đầu *
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Hình thức phỏng vấn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Hình thức phỏng vấn *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleModeChange('OFFLINE')}
                  className={`p-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'OFFLINE'
                      ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <MapPin size={15} /> Trực tiếp tại văn phòng
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('ONLINE')}
                  className={`p-2.5 rounded-xl border font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    mode === 'ONLINE'
                      ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Video size={15} /> Phỏng vấn Online trực tiếp
                </button>
              </div>
            </div>

            {/* Địa điểm hoặc Link Online */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  {mode === 'OFFLINE' ? (
                    <>
                      <MapPin size={14} className="text-teal-600" /> Địa chỉ văn phòng phỏng vấn *
                    </>
                  ) : (
                    <>
                      <Video size={14} className="text-sky-600" /> Đường dẫn phòng phỏng vấn Online *
                    </>
                  )}
                </label>
                {mode === 'ONLINE' && locationOrLink !== builtInRoomUrl && (
                  <button
                    type="button"
                    onClick={() => setLocationOrLink(builtInRoomUrl)}
                    className="text-[11px] font-semibold text-sky-700 hover:underline cursor-pointer"
                  >
                    Dùng phòng Video SmartCV tích hợp sẵn
                  </button>
                )}
              </div>
              <input
                required
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                placeholder={
                  mode === 'OFFLINE'
                    ? 'Nhập địa chỉ công ty...'
                    : builtInRoomUrl
                }
                className={inputCls}
              />
              {mode === 'ONLINE' && locationOrLink === builtInRoomUrl && (
                <p className="text-[11px] text-sky-700 mt-1">
                  Tích hợp sẵn gọi Video, Chia sẻ màn hình, Xem CV &amp; Chấm điểm ngay trên SmartCV (hoặc bạn có thể dán link Meet/Zoom riêng).
                </p>
              )}
            </div>

            {/* Người phỏng vấn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Người phụ trách phỏng vấn
              </label>
              <input
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                placeholder="VD: Anh Trần Minh (Tech Lead) & Bộ phận HR"
                className={inputCls}
              />
            </div>

            {/* Ghi chú dặn dò ứng viên */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-teal-600" /> Ghi chú gửi kèm cho Ứng viên
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Dặn dò ứng viên chuẩn bị tài liệu, laptop..."
              />
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Để sau
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                <span>
                  {submitting
                    ? 'Đang lưu lịch & gửi Email...'
                    : sendEmail
                    ? 'Xác nhận & Gửi lịch qua Chat + Gmail'
                    : 'Xác nhận & Gửi lịch phỏng vấn'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default InterviewScheduleModal;
