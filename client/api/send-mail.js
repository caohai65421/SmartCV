import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Mã băm bảo mật một chiều (scrypt) để chỉ Backend hợp lệ của hệ thống mới được phép gọi hàm gửi mail này
const ALLOWED_SENDER = 'cao65421@gmail.com';
const EXPECTED_PASS_SCRYPT = 'bbbab3fe271d5dca67bb26ce50e3c8c57aaebf488d64940a4c90138bf6013edc';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { user, pass, to, subject, html, senderDisplayName, verifyOnly } = req.body || {};
    const cleanUser = String(user || '').trim().toLowerCase();
    const cleanPass = String(pass || '').replace(/\s+/g, '').trim();

    if (!cleanUser || !cleanPass || (!verifyOnly && (!to || !subject || !html))) {
      return res.status(400).json({ success: false, error: 'Missing required email fields.' });
    }

    // Xác thực chống lạm dụng: Kiểm tra MAIL_RELAY_SECRET (nếu cấu hình mở rộng) hoặc khớp mã băm scrypt
    const relaySecret = process.env.MAIL_RELAY_SECRET;
    const headerSecret = req.headers['x-mail-relay-secret'];
    const authorizedBySecret = Boolean(relaySecret && headerSecret && relaySecret === headerSecret);

    let authorizedByHash = false;
    if (cleanUser === ALLOWED_SENDER) {
      const derivedHex = crypto
        .scryptSync(cleanPass, 'smartcv-mail-salt-2026', 32)
        .toString('hex');
      authorizedByHash = crypto.timingSafeEqual(
        Buffer.from(derivedHex, 'hex'),
        Buffer.from(EXPECTED_PASS_SCRYPT, 'hex')
      );
    }

    if (!authorizedBySecret && !authorizedByHash) {
      return res.status(401).json({ success: false, error: 'Unauthorized mail relay request.' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
    });

    if (verifyOnly) {
      await transporter.verify();
      return res.status(200).json({ success: true, verified: true });
    }

    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(
        {
          from: `"${senderDisplayName || 'SmartCV Tuyển dụng'}" <${cleanUser}>`,
          to: String(to).trim(),
          subject: String(subject),
          html: String(html),
        },
        (err, result) => {
          if (err) reject(err);
          else resolve(result);
        }
      );
    });

    return res.status(200).json({
      success: true,
      messageId: info?.messageId || null,
    });
  } catch (error) {
    console.error('Vercel Mail Relay Error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to send email via Gmail SMTP.',
    });
  }
}
