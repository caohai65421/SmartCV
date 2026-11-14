import prisma from './prisma';

let initialized = false;

/**
 * Khởi tạo tự động các bảng mở rộng trong PostgreSQL (Phiếu hỗ trợ CSKH tích hợp AI, Lịch phỏng vấn, File PDF đính kèm)
 * mà không làm gián đoạn Prisma Client hiện hành.
 */
export const ensureExtraTables = async (): Promise<void> => {
  if (initialized) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id TEXT PRIMARY KEY,
        ticket_code TEXT NOT NULL,
        user_id TEXT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        role_name TEXT NOT NULL DEFAULT 'CANDIDATE',
        content TEXT NOT NULL,
        admin_reply TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        handled_by TEXT NOT NULL DEFAULT 'ADMIN',
        ai_category TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Bổ sung cột handled_by & ai_category nếu bảng đã tồn tại từ phiên trước
    await prisma.$executeRawUnsafe(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS handled_by TEXT NOT NULL DEFAULT 'ADMIN';
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE support_tickets
      ADD COLUMN IF NOT EXISTS ai_category TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS interview_schedules (
        application_id TEXT PRIMARY KEY,
        candidate_name TEXT NOT NULL,
        recipient_email TEXT,
        job_title TEXT NOT NULL,
        interview_date TEXT NOT NULL,
        interview_time TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'OFFLINE',
        location_or_link TEXT NOT NULL,
        interviewer TEXT NOT NULL,
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS application_attachments (
        application_id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        pdf_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS interview_evaluations (
        application_id TEXT PRIMARY KEY,
        rating INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Bảng lưu trữ nội dung file PDF trong PostgreSQL giúp file không bị mất khi Render Free khởi động lại
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        filename TEXT PRIMARY KEY,
        mime_type TEXT NOT NULL DEFAULT 'application/pdf',
        content BYTEA NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Đảm bảo 3 vai trò mặc định luôn tồn tại ngay khi khởi tạo DB mới
    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO roles (name)
        VALUES ('CANDIDATE'), ('RECRUITER'), ('ADMIN')
        ON CONFLICT (name) DO NOTHING;
      `);
    } catch (_) {
      // Bỏ qua nếu bảng roles chưa được tạo bởi Prisma
    }

    // Cập nhật phiếu mẫu câu hỏi thường gặp sang trạng thái đã được AI tự động giải đáp
    await prisma.$executeRawUnsafe(
      `UPDATE support_tickets
       SET status = 'RESOLVED',
           handled_by = 'AI',
           ai_category = 'Hướng dẫn đính kèm CV PDF',
           admin_reply = $1,
           updated_at = NOW()
       WHERE id = 'ticket-seed-1' AND status = 'OPEN'`,
      'Trợ lý AI CSKH tự động giải đáp:\nĐể đính kèm thêm file CV PDF từ máy tính, bạn mở trang Chi tiết công việc muốn ứng tuyển → bấm "Ứng tuyển vị trí này" → tại mục "Tải file CV PDF từ máy tính", chọn tệp .pdf (tối đa 5MB) rồi nhấn "Gửi hồ sơ ứng tuyển".'
    );

    // Đảm bảo có sẵn 1 phiếu mẫu thuộc nhóm cần Chuyên viên / Admin xác minh thực tế
    const escalatedCheck = await prisma.$queryRawUnsafe<Array<{ cnt: bigint | number }>>(
      `SELECT COUNT(*)::int AS cnt FROM support_tickets WHERE id = 'ticket-seed-3'`
    );
    if (Number(escalatedCheck?.[0]?.cnt || 0) === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO support_tickets (id, ticket_code, user_id, full_name, email, role_name, content, admin_reply, status, handled_by, ai_category)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, NULL, 'OPEN', 'ADMIN', $7)`,
        'ticket-seed-3',
        'CSKH-260922',
        'Công Ty Giải Pháp Số Minh Khuê',
        'hr@minhkhue-tech.vn',
        'RECRUITER',
        'Doanh nghiệp cần thay đổi người đại diện nhân sự và cập nhật lại email đăng nhập chính của tài khoản tuyển dụng, nhờ Quản trị viên xác minh hỗ trợ.',
        'Yêu cầu xác minh tài khoản doanh nghiệp'
      );
    }

    initialized = true;
  } catch (error) {
    console.error('Lỗi khởi tạo bảng mở rộng PostgreSQL:', error);
  }
};
