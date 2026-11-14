import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const PLACEHOLDER_EMAILS = ['youremail@gmail.com', 'your_email@gmail.com', 'example@gmail.com', ''];
const PLACEHOLDER_PASSES = ['your_app_password_here', 'your_app_password', 'yourpassword', ''];
const DEFAULT_PRODUCTION_FRONTEND_URL = 'https://smart-cv-pearl.vercel.app';

/**
 * Trả về URL Frontend công khai (tự động ưu tiên Vercel Production URL khi chạy trên Render).
 */
export const getPublicFrontendUrl = (): string => {
  const raw = (process.env.FRONTEND_URL || '')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');
  const isLocal = raw.includes('localhost') || raw.includes('127.0.0.1');
  if (process.env.RENDER && (!raw || isLocal)) {
    return DEFAULT_PRODUCTION_FRONTEND_URL;
  }
  return raw || (process.env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_FRONTEND_URL : 'http://localhost:5173');
};

export const getActiveSmtpCredentials = () => {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const brevoSender = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || '').trim();
  if (brevoKey && brevoSender && !PLACEHOLDER_EMAILS.includes(brevoSender.toLowerCase())) {
    return { user: brevoSender, pass: brevoKey, configured: true };
  }

  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const resendFrom = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
  if (resendKey) {
    return { user: resendFrom, pass: resendKey, configured: true };
  }

  const user = (process.env.EMAIL_USER || '').trim();
  // Tự động bỏ khoảng trắng trong Mật khẩu ứng dụng Google 16 ký tự (VD: "abcd efgh ijkl mnop")
  const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '').trim();

  const configured =
    Boolean(user) &&
    Boolean(pass) &&
    !PLACEHOLDER_EMAILS.includes(user.toLowerCase()) &&
    !PLACEHOLDER_PASSES.includes(pass.toLowerCase()) &&
    pass.length >= 8;

  return { user, pass, configured };
};

export const saveSmtpConfigToEnv = async (emailUser: string, appPassword: string) => {
  const cleanUser = emailUser.trim();
  const cleanPass = appPassword.replace(/\s+/g, '').trim();

  // Kiểm tra kết nối Gmail SMTP thực tế trước khi lưu (hỗ trợ cả Render Free qua HTTPS Relay)
  if (!process.env.RENDER) {
    const testTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    await testTransporter.verify();
  }

  // Cập nhật ngay trong bộ nhớ runtime của server đang chạy
  process.env.EMAIL_USER = cleanUser;
  process.env.EMAIL_PASS = cleanPass;

  // Lưu vào file .env của server để giữ cấu hình cho các lần khởi động sau
  try {
    const envPath = path.join(__dirname, '..', '..', '.env');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

    if (/^EMAIL_USER=.*$/m.test(content)) {
      content = content.replace(/^EMAIL_USER=.*$/m, `EMAIL_USER="${cleanUser}"`);
    } else {
      content += `\nEMAIL_USER="${cleanUser}"`;
    }

    if (/^EMAIL_PASS=.*$/m.test(content)) {
      content = content.replace(/^EMAIL_PASS=.*$/m, `EMAIL_PASS="${cleanPass}"`);
    } else {
      content += `\nEMAIL_PASS="${cleanPass}"`;
    }

    fs.writeFileSync(envPath, content, 'utf-8');
  } catch (err) {
    console.warn('Không thể ghi file .env (vẫn giữ cấu hình trong phiên chạy hiện tại):', err);
  }
};

export interface SendEmailDetailResult {
  success: boolean;
  configured: boolean;
  senderEmail?: string;
  error?: string;
}

/**
 * Hàm gửi Email chi tiết (trả về trạng thái cấu hình & lỗi nếu có).
 */
export const sendEmailDetailed = async (
  to: string,
  subject: string,
  html: string,
  senderDisplayName = 'SmartCV Tuyển dụng'
): Promise<SendEmailDetailResult> => {
  const brevoKey = (process.env.BREVO_API_KEY || '').trim();
  const brevoSender = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || '').trim();
  if (brevoKey && brevoSender && !PLACEHOLDER_EMAILS.includes(brevoSender.toLowerCase())) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderDisplayName, email: brevoSender },
          to: [{ email: to.trim() }],
          subject,
          htmlContent: html,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Brevo HTTP ${resp.status}: ${errBody}`);
      }
      return { success: true, configured: true, senderEmail: brevoSender };
    } catch (err: any) {
      console.error('Lỗi gửi email qua Brevo HTTPS API:', err);
      return {
        success: false,
        configured: true,
        senderEmail: brevoSender,
        error: err?.message || 'Không thể gửi email qua Brevo API.',
      };
    }
  }

  const resendKey = (process.env.RESEND_API_KEY || '').trim();
  const resendFrom = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${senderDisplayName} <${resendFrom}>`,
          to: [to.trim()],
          subject,
          html,
        }),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Resend HTTP ${resp.status}: ${errBody}`);
      }
      return { success: true, configured: true, senderEmail: resendFrom };
    } catch (err: any) {
      console.error('Lỗi gửi email qua Resend HTTPS API:', err);
      return {
        success: false,
        configured: true,
        senderEmail: resendFrom,
        error: err?.message || 'Không thể gửi email qua Resend API.',
      };
    }
  }

  const { user, pass, configured } = getActiveSmtpCredentials();

  if (!configured) {
    return {
      success: false,
      configured: false,
      error: 'Chưa cấu hình dịch vụ Email gửi đi (BREVO_API_KEY / RESEND_API_KEY hoặc EMAIL_USER & EMAIL_PASS).',
    };
  }

  // Hàm gửi dự phòng qua Vercel HTTPS Serverless Relay khi chạy trên Render Free (vốn chặn cổng SMTP 465/587)
  const trySendViaVercelRelay = async (): Promise<SendEmailDetailResult | null> => {
    const rawFrontend = getPublicFrontendUrl();
    if (!rawFrontend || rawFrontend.includes('localhost') || rawFrontend.includes('127.0.0.1')) {
      return null;
    }
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.MAIL_RELAY_SECRET) {
        headers['x-mail-relay-secret'] = process.env.MAIL_RELAY_SECRET;
      }
      const resp = await fetch(`${rawFrontend}/api/send-mail`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user,
          pass,
          to: to.trim(),
          subject,
          html,
          senderDisplayName,
        }),
      });
      const data: any = await resp.json().catch(() => ({}));
      if (resp.ok && data?.success) {
        console.log('Đã gửi email thành công qua cổng HTTPS Relay (Vercel):', data.messageId);
        return { success: true, configured: true, senderEmail: user };
      }
      console.warn('Vercel Mail Relay trả lỗi:', resp.status, data);
      return null;
    } catch (err) {
      console.warn('Không thể gọi Vercel Mail Relay:', err);
      return null;
    }
  };

  // Trên Render Free (biến môi trường RENDER=true), ưu tiên gọi thẳng qua HTTPS Relay để không chờ timeout cổng 465
  if (process.env.RENDER) {
    const relayResult = await trySendViaVercelRelay();
    if (relayResult) return relayResult;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 12000,
    });

    const info = await transporter.sendMail({
      from: `"${senderDisplayName}" <${user}>`,
      to: to.trim(),
      subject,
      html,
    });

    console.log('Đã gửi email thành công qua Gmail SMTP:', info.messageId);
    return {
      success: true,
      configured: true,
      senderEmail: user,
    };
  } catch (error: any) {
    console.error('Lỗi khi gửi mail qua Gmail SMTP trực tiếp:', error?.message || error);

    // Nếu lỗi kết nối cổng SMTP (ETIMEDOUT / ECONNREFUSED), tự động chuyển tiếp qua HTTPS Relay của Vercel
    const fallbackRelay = await trySendViaVercelRelay();
    if (fallbackRelay) return fallbackRelay;

    return {
      success: false,
      configured: true,
      senderEmail: user,
      error:
        error?.responseCode === 535
          ? 'Sai địa chỉ Gmail hoặc Mật khẩu ứng dụng 16 ký tự (Google App Password).'
          : error?.message || 'Không thể gửi email qua máy chủ Gmail.',
    };
  }
};

/**
 * Hàm hỗ trợ gửi Email tương thích ngược (dùng cho Quên mật khẩu).
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  const res = await sendEmailDetailed(to, subject, html, 'SmartCV Support');
  return res.success;
};

/**
 * Tạo nội dung HTML chuyên nghiệp cho Thư mời phỏng vấn & Xác nhận duyệt CV.
 */
export const buildInterviewInvitationEmailHtml = (params: {
  candidateName: string;
  companyName: string;
  jobTitle: string;
  formattedDate: string;
  time: string;
  mode: 'OFFLINE' | 'ONLINE';
  locationOrLink: string;
  interviewer: string;
  note?: string;
  recruiterEmail?: string;
}) => {
  const {
    candidateName,
    companyName,
    jobTitle,
    formattedDate,
    time,
    mode,
    locationOrLink,
    interviewer,
    note,
    recruiterEmail,
  } = params;

  const isOnline = mode === 'ONLINE';
  const modeLabel = isOnline
    ? 'Phỏng vấn trực tuyến (Online Video Call)'
    : 'Phỏng vấn trực tiếp tại văn phòng';

  const locationDisplay =
    isOnline && /^https?:\/\//i.test(locationOrLink.trim())
      ? `<a href="${locationOrLink.trim()}" style="color:#0284c7;font-weight:600;text-decoration:underline;" target="_blank" rel="noreferrer">${locationOrLink.trim()}</a>`
      : `<span style="color:#0f172a;font-weight:600;">${locationOrLink}</span>`;

  return `
  <div style="background-color:#f8fafc;padding:28px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;line-height:1.6;">
    <div style="max-width:620px;margin:0 auto;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 14px rgba(15,23,42,0.05);">
      <div style="background:linear-gradient(135deg,#0284c7,#0f766e);padding:24px 28px;color:#ffffff;">
        <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.9;">
          Thông báo kết quả duyệt CV &amp; Lịch phỏng vấn
        </div>
        <h1 style="margin:6px 0 0;font-size:20px;font-weight:700;line-height:1.35;">
          Thư mời tham dự phỏng vấn — ${companyName}
        </h1>
      </div>

      <div style="padding:26px 28px;">
        <p style="margin:0 0 14px;font-size:15px;">
          Thân gửi <strong>${candidateName}</strong>,
        </p>
        <p style="margin:0 0 18px;font-size:14px;color:#334155;">
          Bộ phận Tuyển dụng <strong>${companyName}</strong> trân trọng thông báo: Hồ sơ CV ứng tuyển của bạn cho vị trí
          <strong style="color:#0369a1;">${jobTitle}</strong> trên hệ thống <strong>SmartCV</strong> đã được <strong>Chấp nhận</strong>.
          Chúng tôi trân trọng mời bạn tham dự buổi phỏng vấn trao đổi chi tiết theo thông tin dưới đây:
        </p>

        <div style="background-color:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 20px;margin-bottom:20px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#64748b;width:155px;vertical-align:top;">Vị trí ứng tuyển:</td>
              <td style="padding:6px 0;font-weight:700;color:#0f172a;">${jobTitle}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;vertical-align:top;">Ngày phỏng vấn:</td>
              <td style="padding:6px 0;font-weight:700;color:#0f766e;">${formattedDate}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;vertical-align:top;">Thời gian bắt đầu:</td>
              <td style="padding:6px 0;font-weight:700;color:#0f766e;">${time}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;vertical-align:top;">Hình thức:</td>
              <td style="padding:6px 0;font-weight:600;color:#0f172a;">${modeLabel}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;vertical-align:top;">${isOnline ? 'Đường dẫn họp:' : 'Địa điểm:'}</td>
              <td style="padding:6px 0;">${locationDisplay}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;vertical-align:top;">Người phụ trách:</td>
              <td style="padding:6px 0;color:#0f172a;font-weight:600;">${interviewer}</td>
            </tr>
            ${
              note
                ? `<tr>
                    <td style="padding:6px 0;color:#64748b;vertical-align:top;">Lưu ý chuẩn bị:</td>
                    <td style="padding:6px 0;color:#334155;">${note}</td>
                  </tr>`
                : ''
            }
          </table>
        </div>

        <p style="margin:0 0 14px;font-size:14px;color:#334155;">
          Bạn vui lòng phản hồi lại email này${
            recruiterEmail ? ` (hoặc liên hệ <a href="mailto:${recruiterEmail}" style="color:#0284c7;">${recruiterEmail}</a>)` : ''
          } hoặc xác nhận trực tiếp trong mục <strong>Trò chuyện với Nhà tuyển dụng</strong> trên nền tảng SmartCV để bộ phận Nhân sự đón tiếp chu đáo nhất.
        </p>

        <p style="margin:20px 0 0;font-size:14px;color:#334155;">
          Chúc bạn có một buổi phỏng vấn thuận lợi và thành công!<br/>
          <strong>Bộ phận Tuyển dụng Nhân sự — ${companyName}</strong>
        </p>
      </div>

      <div style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 28px;font-size:12px;color:#64748b;text-align:center;">
        Email được gửi tự động từ hệ thống kết nối việc làm &amp; tuyển dụng <strong>SmartCV Vietnam</strong>.
      </div>
    </div>
  </div>
  `;
};
