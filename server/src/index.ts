import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';

// Nạp biến môi trường từ file .env
dotenv.config();

// Import tất cả Routes
import authRouter from './routes/authRoutes';
import jobRouter from './routes/jobRoutes';
import companyRouter from './routes/companyRoutes';
import cvRouter from './routes/cvRoutes';
import applicationRouter from './routes/applicationRoutes';
import messageRouter from './routes/messageRoutes';
import adminRouter from './routes/adminRoutes';
import supportRouter from './routes/supportRoutes';
import aiRouter from './routes/aiRoutes';
import prisma from './utils/prisma';
import { ensureExtraTables } from './utils/dbExtraTables';

// Import Socket Handler
import { initSocketHandlers } from './sockets/socketHandler';

// ============================
// Cấu hình danh sách Origin hợp lệ (hỗ trợ Vercel, Preview URLs & Localhost)
// ============================
const parseAllowedOrigins = (): string[] => {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  const list = raw
    .split(',')
    .map((url) => url.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  for (const requiredOrigin of ['http://localhost:5173', 'https://smart-cv-pearl.vercel.app']) {
    if (!list.includes(requiredOrigin)) {
      list.push(requiredOrigin);
    }
  }
  return list;
};

const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // Cho phép healthcheck, server-to-server, Postman
  const normalized = origin.trim().replace(/\/+$/, '');
  const allowedList = parseAllowedOrigins();
  if (allowedList.includes('*') || allowedList.includes(normalized)) {
    return true;
  }
  // Hỗ trợ tự động các bản Preview Deployment trên Vercel (*.vercel.app) trừ khi tắt tường minh
  if (process.env.ALLOW_VERCEL_ORIGINS !== 'false' && normalized.endsWith('.vercel.app')) {
    return true;
  }
  return false;
};

const corsOriginDelegate = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error(`CORS không cho phép origin: ${origin}`));
  }
};

// ============================
// Khởi tạo Express App
// ============================
const app = express();
// Tin cậy Reverse Proxy trên Render để req.protocol trả về đúng 'https'
app.set('trust proxy', 1);

const httpServer = createServer(app);

// ============================
// Khởi tạo Socket.io
// ============================
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginDelegate,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

// ============================
// Middleware cơ bản
// ============================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
); // Bảo mật HTTP headers & cho phép xem file PDF tĩnh qua cross-origin
app.use(
  cors({
    origin: corsOriginDelegate,
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));                    // Parse JSON body (hỗ trợ ảnh chân dung CV tải lên)
app.use(express.urlencoded({ extended: true, limit: '15mb' })); // Parse URL-encoded body

// Tạo thư mục uploads nếu chưa tồn tại
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (PDF CVs) từ đĩa cục bộ trước, sau đó fallback từ PostgreSQL nếu Render Free vừa khởi động lại
app.use('/uploads', express.static(uploadsDir));
app.get('/uploads/:filename', async (req, res) => {
  try {
    await ensureExtraTables();
    const rows = await prisma.$queryRawUnsafe<Array<{ mime_type: string; content: Buffer }>>(
      `SELECT mime_type, content FROM uploaded_files WHERE filename = $1 LIMIT 1`,
      req.params.filename
    );
    if (!rows || rows.length === 0 || !rows[0].content) {
      return res.status(404).json({ message: 'Không tìm thấy tệp đính kèm.' });
    }
    const buffer = Buffer.isBuffer(rows[0].content)
      ? rows[0].content
      : Buffer.from(rows[0].content as any);
    res.setHeader('Content-Type', rows[0].mime_type || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(req.params.filename)}"`);
    return res.send(buffer);
  } catch (err) {
    console.error('Lỗi tải file PDF dự phòng từ PostgreSQL:', err);
    return res.status(500).json({ message: 'Lỗi hệ thống khi đọc tệp PDF.' });
  }
});

// ============================
// Đăng ký tất cả Routes - Tiền tố /api
// ============================
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);           // Xác thực: đăng ký, đăng nhập, getMe
app.use('/api/jobs', jobRouter);            // Tin tuyển dụng: CRUD, tìm kiếm
app.use('/api/companies', companyRouter);   // Công ty: tạo, cập nhật
app.use('/api/cvs', cvRouter);             // CV: tạo, sửa, xoá, upload PDF
app.use('/api/applications', applicationRouter); // Đơn ứng tuyển: nộp, duyệt
app.use('/api/messages', messageRouter);    // Tin nhắn: gửi, lấy lịch sử
app.use('/api/admin', adminRouter);         // Admin: thống kê, quản lý
app.use('/api/support', supportRouter);     // Chăm sóc khách hàng: phiếu hỗ trợ CSKH
app.use('/api/ai', aiRouter);               // Trợ lý AI thông minh: phân tích dữ liệu theo ngữ cảnh

// Route kiểm tra API hoạt động
app.get('/', (_req, res) => {
  res.json({
    message: '🚀 Chào mừng đến với SmartCV API!',
    status: 'Online',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      jobs: '/api/jobs',
      companies: '/api/companies',
      cvs: '/api/cvs',
      applications: '/api/applications',
      messages: '/api/messages',
      admin: '/api/admin',
    },
  });
});

// ============================
// Khởi tạo Socket.io Handlers
// ============================
initSocketHandlers(io);

// ============================
// Tự động khởi tạo bảng mở rộng & Seed dữ liệu mẫu lần đầu nếu DB trống
// ============================
const bootstrapDatabase = async () => {
  try {
    await ensureExtraTables();
    if (process.env.AUTO_SEED === 'false') return;

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Cơ sở dữ liệu đang trống — bắt đầu nạp dữ liệu mẫu (Admin, Công ty, Việc làm, CV)...');
      const serverRoot = path.join(__dirname, '..');
      exec('npx ts-node prisma/seed.ts', { cwd: serverRoot }, (error, stdout, stderr) => {
        if (error) {
          console.error('⚠️ Lỗi khi chạy auto-seed:', error.message);
          if (stderr) console.error(stderr);
          return;
        }
        if (stdout) console.log(stdout);
        console.log('✅ Tự động nạp dữ liệu mẫu hoàn tất!');
      });
    }
  } catch (err) {
    console.error('Lỗi kiểm tra khởi tạo cơ sở dữ liệu:', err);
  }
};

// ============================
// Khởi động Server
// ============================
const PORT = Number(process.env.PORT) || 5000;
if (process.env.SMARTCV_DISABLE_LISTEN !== 'true') {
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SmartCV Server đang chạy tại cổng: ${PORT}`);
    console.log(`📡 Socket.io đang lắng nghe kết nối...`);
    bootstrapDatabase();
  });
}

// Export app, httpServer và io để dùng ở các Controller & kiểm thử tích hợp
export { app, httpServer, io };
