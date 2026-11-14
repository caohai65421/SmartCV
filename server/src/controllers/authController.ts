import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { generateToken } from '../utils/jwt';
import { sendEmail } from '../utils/mail';

/**
 * Controller xử lý tất cả các yêu cầu liên quan đến xác thực (Authentication).
 */
export const register = async (req: Request, res: Response) => {
  try {
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const fullName = String(req.body.fullName || '').trim();
    const { roleName } = req.body;

    if (!rawEmail || !fullName) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ họ tên và email.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có tối thiểu 6 ký tự.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng.' });
    }

    // Chỉ cho phép đăng ký công khai vai trò CANDIDATE hoặc RECRUITER (ngăn leo thang đặc quyền ADMIN)
    const allowedRoleName = roleName === 'RECRUITER' ? 'RECRUITER' : 'CANDIDATE';
    const role = await prisma.role.findUnique({ where: { name: allowedRoleName } });
    if (!role) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: rawEmail,
        password: hashedPassword,
        fullName,
        roleId: role.id,
        ...(allowedRoleName === 'RECRUITER'
          ? {
              company: {
                create: {
                  name: `Doanh nghiệp của ${fullName}`,
                  location: 'Hà Nội',
                  description: JSON.stringify({
                    industry: 'Công nghệ thông tin (CNTT)',
                    scale: '10 - 50 nhân sự',
                    province: 'Hà Nội',
                    overview: `Hồ sơ tuyển dụng chính thức của ${fullName} trên nền tảng SmartCV.`,
                    coreValues: ['Chuyên nghiệp & Minh bạch', 'Môi trường làm việc năng động'],
                    services: ['Phát triển giải pháp công nghệ & Tuyển dụng nhân sự'],
                    team: 'Đội ngũ trẻ trung, sáng tạo và giàu nhiệt huyết.',
                    detailAddress: 'Hà Nội',
                  }),
                },
              },
            }
          : {}),
      },
      include: {
        role: true,
        company: true,
      },
    });

    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      message: 'Đăng ký tài khoản thành công.',
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Lỗi khi đăng ký:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
    }

    const token = generateToken({
      userId: user.id,
      roleName: user.role.name,
    });

    const { password: _, ...userWithoutPassword } = user;
    return res.json({
      message: 'Đăng nhập thành công.',
      user: userWithoutPassword,
      token,
    });
  } catch (error: any) {
    console.error('Lỗi khi đăng nhập:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { role: true, company: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const { password: _, ...userWithoutPassword } = user;
    return res.json({ user: userWithoutPassword });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Đổi mật khẩu (Dành cho người dùng đã đăng nhập)
 */
export const changePassword = async (req: any, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'Người dùng không tồn tại.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không đúng.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Quên mật khẩu: Gửi email reset
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Email không tồn tại trong hệ thống.' });

    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // Hết hạn sau 1 tiếng

    await prisma.user.update({
      where: { email },
      data: { resetToken, resetTokenExpiry: expiry }
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b;">
        <h2 style="margin-top: 0; color: #0284c7;">Khôi phục mật khẩu SmartCV</h2>
        <p>Xin chào <strong>${user.fullName}</strong>,</p>
        <p style="line-height: 1.6; color: #475569;">Bạn vừa gửi yêu cầu đặt lại mật khẩu trên nền tảng <strong>SmartCV</strong>. Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới (liên kết có hiệu lực trong 60 phút):</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">Đặt lại mật khẩu</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
      </div>
    `;

    const sent = await sendEmail(email, '[SmartCV] Liên kết đặt lại mật khẩu tài khoản', htmlContent);
    if (!sent) {
      return res.status(500).json({
        message: 'Không thể gửi email khôi phục mật khẩu. Vui lòng kiểm tra cấu hình Gmail SMTP của hệ thống.',
      });
    }

    return res.json({ message: 'Liên kết đặt lại mật khẩu đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.' });
  } catch (error) {
    console.error('Forgot PW Error:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Đặt lại mật khẩu (Dùng Token từ email)
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) return res.status(400).json({ message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    return res.json({ message: 'Mật khẩu của bạn đã được cập nhật thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};
