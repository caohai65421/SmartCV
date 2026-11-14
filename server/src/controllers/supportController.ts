import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma';
import { ensureExtraTables } from '../utils/dbExtraTables';
import { sendEmail } from '../utils/mail';
import { verifyToken } from '../utils/jwt';
import { io } from '../index';

export interface SupportTicketRow {
  id: string;
  ticket_code: string;
  user_id: string | null;
  full_name: string;
  email: string;
  role_name: string;
  content: string;
  admin_reply: string | null;
  status: string;
  handled_by: string;
  ai_category: string | null;
  created_at: Date;
  updated_at: Date;
}

const removeVietnameseTones = (str: string): string =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

interface AISupportDecision {
  handledByAI: boolean;
  category: string;
  answer: string;
  suggestedAdminDraft: string;
}

/**
 * Bộ máy AI CSKH phân tích ngữ nghĩa câu hỏi (hỗ trợ cả tiếng Việt có dấu & không dấu)
 * - Tự động trả lời ngay lập tức các câu hỏi thường gặp (FAQ) để giảm tải cho Admin.
 * - Chỉ chuyển cấp (escalate) sang hàng đợi Admin khi người dùng yêu cầu gặp chuyên viên,
 *   khiếu nại, báo cáo vi phạm, xác minh pháp nhân hoặc vấn đề đặc thù của riêng tài khoản.
 */
export const evaluateSupportQuestionWithAI = (
  rawQuestion: string,
  roleName: string,
  fullName?: string,
  forceEscalate?: boolean
): AISupportDecision => {
  const text = rawQuestion.trim();
  const lower = text.toLowerCase();
  const ascii = removeVietnameseTones(text);
  const greetingName = fullName && fullName !== 'Khách truy cập' ? fullName : 'bạn';
  const isRecruiter = roleName === 'RECRUITER';

  // 1. Kiểm tra nếu người dùng chủ động yêu cầu gặp người thật / Admin hoặc báo cáo vi phạm / sự cố tài khoản đặc thù
  const escalationKeywords = [
    'gap nhan vien',
    'gap admin',
    'gap chuyen vien',
    'nguoi that',
    'tu van vien',
    'chuyen vien',
    'lua dao',
    'thu phi',
    'bao cao vi pham',
    'bao cao tin',
    'khieu nai',
    'to cao',
    'khoa tai khoan',
    'bi khoa',
    'xoa tai khoan',
    'doi email dang nhap',
    'giay phep kinh doanh',
    'ma so thue',
    'xac minh doanh nghiep',
    'loi he thong',
    'khong dang nhap duoc du dung mat khau',
  ];

  const wantsHuman =
    Boolean(forceEscalate) ||
    escalationKeywords.some((kw) => ascii.includes(kw));

  if (wantsHuman) {
    let draft = `Chào ${greetingName}, bộ phận Quản trị & CSKH SmartCV đã kiểm tra yêu cầu của bạn và hỗ trợ xử lý như sau:\n- Chúng tôi đã ghi nhận thông tin xác minh trên hệ thống.\n- Nếu cần bổ sung minh chứng, bạn vui lòng phản hồi qua email cskh@smartcv.vn.`;
    if (ascii.includes('lua dao') || ascii.includes('thu phi') || ascii.includes('vi pham')) {
      draft = `Chào ${greetingName}, cảm ơn bạn đã báo cáo thông tin bảo vệ cộng đồng SmartCV. Bộ phận Kiểm duyệt đã tiến hành rà soát tin tuyển dụng / tài khoản nêu trên và sẽ tạm khóa ngay nếu phát hiện vi phạm quy chế không thu phí ứng viên.`;
    } else if (ascii.includes('doi email') || ascii.includes('xac minh') || ascii.includes('doanh nghiep')) {
      draft = `Chào ${greetingName}, bộ phận Quản trị đã tiếp nhận yêu cầu cập nhật thông tin tài khoản doanh nghiệp. Quý đơn vị vui lòng gửi xác nhận từ email tên miền công ty tới cskh@smartcv.vn để hoàn tất đối chiếu bảo mật.`;
    }

    return {
      handledByAI: false,
      category: forceEscalate
        ? 'Khách yêu cầu gặp Chuyên viên'
        : 'Yêu cầu xác minh / Báo cáo cần Admin xử lý',
      answer: `Yêu cầu của ${greetingName} thuộc nhóm cần Chuyên viên Quản trị kiểm tra trực tiếp trên hệ thống. SmartCV đã khởi tạo phiếu hỗ trợ ưu tiên để bộ phận CSKH xử lý và phản hồi sớm nhất (kèm thông báo qua hộp thư của bạn).`,
      suggestedAdminDraft: draft,
    };
  }

  // 2. CƠ SỞ TRI THỨC CÂU HỎI THƯỜNG GẶP (AI TỰ ĐỘNG GIẢI ĐÁP 100%, KHÔNG TẠO TẢI CHO ADMIN)
  // 2.1. Đính kèm / Tải lên file CV PDF từ máy tính khi nộp đơn
  if (
    (ascii.includes('pdf') && (ascii.includes('dinh kem') || ascii.includes('tai len') || ascii.includes('upload') || ascii.includes('may tinh') || ascii.includes('nop'))) ||
    ascii.includes('file cv') ||
    ascii.includes('cv co san')
  ) {
    return {
      handledByAI: true,
      category: 'Đính kèm file CV PDF',
      answer:
        `Chào ${greetingName}, bạn hoàn toàn có thể đính kèm file CV định dạng PDF có sẵn từ máy tính theo 3 bước:\n` +
        `1. Mở trang Chi tiết công việc bạn muốn ứng tuyển → nhấn nút "Ứng tuyển vị trí này".\n` +
        `2. Tại mục "Tải file CV PDF từ máy tính", nhấn chọn tệp .pdf từ thiết bị của bạn (dung lượng tối đa 5MB).\n` +
        `3. Điền thêm thư giới thiệu (nếu muốn) rồi bấm "Gửi hồ sơ ứng tuyển". Nhà tuyển dụng sẽ xem và tải được trực tiếp file PDF gốc của bạn.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.2. Tạo CV chuẩn A4, chỉnh sửa mẫu CV & xuất PDF
  if (
    ascii.includes('tao cv') ||
    ascii.includes('sua cv') ||
    ascii.includes('thiet ke cv') ||
    ascii.includes('xuat pdf') ||
    ascii.includes('tai cv ve') ||
    ascii.includes('mau cv') ||
    ascii.includes('chuan a4')
  ) {
    return {
      handledByAI: true,
      category: 'Tạo & Xuất CV chuẩn A4',
      answer:
        `Chào ${greetingName}, để tạo hoặc chỉnh sửa CV trực tuyến chuẩn khổ A4 trên SmartCV:\n` +
        `• Nhấn vào tên tài khoản góc trên bên phải → chọn "Quản lý CV" → bấm "Tạo CV ngay" (hoặc "Chỉnh sửa").\n` +
        `• Điền thông tin học vấn, kinh nghiệm, kỹ năng, ngoại ngữ và chọn bố cục màu sắc yêu thích.\n` +
        `• Sau khi lưu, bạn nhấn nút "Tải PDF" trên thanh công cụ xem trước để xuất file PDF sắc nét về máy.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.3. Quên mật khẩu / Đổi mật khẩu
  if (
    ascii.includes('quen mat khau') ||
    ascii.includes('doi mat khau') ||
    ascii.includes('mat khau') ||
    ascii.includes('reset password') ||
    ascii.includes('lay lai tk')
  ) {
    return {
      handledByAI: true,
      category: 'Mật khẩu & Bảo mật tài khoản',
      answer:
        `Chào ${greetingName}, về thao tác mật khẩu trên SmartCV:\n` +
        `• Nếu bạn đang đăng nhập và muốn đổi mật khẩu: Nhấn vào tên tài khoản góc phải trên cùng → "Cài đặt & Bảo mật" → nhập mật khẩu cũ và mật khẩu mới (tối thiểu 6 ký tự).\n` +
        `• Nếu bạn quên mật khẩu: Tại trang Đăng nhập, nhấn "Quên mật khẩu?" → nhập email đăng ký. Hệ thống sẽ gửi tự động liên kết đặt lại mật khẩu thẳng vào hộp thư Gmail của bạn.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.4. Chỉnh sửa tin tuyển dụng / Gia hạn hạn nộp (Deadline) / Đóng mở tin (Nhà tuyển dụng)
  if (
    ascii.includes('sua tin') ||
    ascii.includes('chinh sua tin') ||
    ascii.includes('gia han') ||
    ascii.includes('han nop') ||
    ascii.includes('deadline') ||
    ascii.includes('dong tin') ||
    ascii.includes('dang tin')
  ) {
    return {
      handledByAI: true,
      category: 'Quản lý & Gia hạn tin tuyển dụng',
      answer:
        `Chào ${greetingName}, Nhà tuyển dụng có thể đăng mới, chỉnh sửa nội dung hoặc gia hạn hạn nộp hồ sơ bất cứ lúc nào:\n` +
        `1. Truy cập Bảng điều khiển Nhà tuyển dụng → chọn tab "Quản lý vị trí đã đăng".\n` +
        `2. Nhấn nút "Chỉnh sửa" trên vị trí cần cập nhật để đổi tiêu đề, mức lương, mô tả hoặc chọn lại ngày "Hạn nộp hồ sơ" mới → nhấn "Lưu thay đổi".\n` +
        `3. Nếu muốn tạm ngưng nhận hồ sơ mà không xóa tin, bạn chỉ cần nhấn nút "Đóng nhận CV".`,
      suggestedAdminDraft: '',
    };
  }

  // 2.5. Đặt lịch phỏng vấn & Gửi Email / Gmail cho ứng viên
  if (
    ascii.includes('hen phong van') ||
    ascii.includes('lich phong van') ||
    ascii.includes('gui mail') ||
    ascii.includes('gui email') ||
    ascii.includes('gmail') ||
    ascii.includes('app password') ||
    ascii.includes('thu moi')
  ) {
    return {
      handledByAI: true,
      category: 'Lịch phỏng vấn & Thông báo Gmail',
      answer: isRecruiter
        ? `Chào ${greetingName}, để duyệt CV và gửi thư mời phỏng vấn tự động qua Gmail:\n` +
          `1. Tại mục "Xét duyệt CV theo vị trí", nhấn "Chấp nhận" (hoặc "Hẹn lịch phỏng vấn") ở hồ sơ ứng viên phù hợp.\n` +
          `2. Chọn Ngày, Giờ, Hình thức (Trực tiếp tại văn phòng hoặc Online Meet/Zoom) và kiểm tra địa chỉ email nhận của ứng viên.\n` +
          `3. Bấm "Xác nhận & Gửi thư mời": hệ thống sẽ đồng thời lưu lịch vào cơ sở dữ liệu, gửi tin nhắn chat và gửi email HTML chuyên nghiệp qua Gmail tới ứng viên.`
        : `Chào ${greetingName}, khi Nhà tuyển dụng duyệt CV và đặt lịch phỏng vấn cho bạn:\n` +
          `• Bạn sẽ nhận ngay thư mời chi tiết trong hộp thư Gmail cá nhân.\n` +
          `• Đồng thời lịch hẹn (ngày, giờ, địa điểm hoặc link phỏng vấn Online) cũng hiển thị trực tiếp tại mục "Quản lý CV → Đã nộp & phản hồi" và trong cửa sổ Trò chuyện với Nhà tuyển dụng.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.6. Kiểm tra trạng thái duyệt hồ sơ / Bao lâu có kết quả
  if (
    ascii.includes('trang thai') ||
    ascii.includes('ket qua') ||
    ascii.includes('duyet chua') ||
    ascii.includes('bao lau') ||
    ascii.includes('da nop') ||
    ascii.includes('ung tuyen')
  ) {
    return {
      handledByAI: true,
      category: 'Theo dõi kết quả ứng tuyển',
      answer:
        `Chào ${greetingName}, bạn có thể kiểm tra kết quả xét duyệt hồ sơ theo thời gian thực tại:\n` +
        `• Biểu tượng Chuông thông báo trên thanh menu đầu trang.\n` +
        `• Hoặc vào menu tài khoản → "Quản lý CV" → chuyển sang tab "Đã nộp & phản hồi" để xem trạng thái từng đơn (Đang chờ xét duyệt / Đã chấp nhận / Chưa phù hợp) và nhắn tin trực tiếp với Nhà tuyển dụng.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.7. Bộ lọc nâng cao, lưu tin tuyển dụng & tìm việc gần vị trí (Bản đồ)
  if (
    ascii.includes('tim viec') ||
    ascii.includes('bo loc') ||
    ascii.includes('muc luong') ||
    ascii.includes('luu viec') ||
    ascii.includes('da luu') ||
    ascii.includes('ban do') ||
    ascii.includes('gan day') ||
    ascii.includes('remote')
  ) {
    return {
      handledByAI: true,
      category: 'Tìm kiếm, Lọc việc làm & Bản đồ',
      answer:
        `Chào ${greetingName}, để tìm công việc nhanh và chính xác nhất trên SmartCV:\n` +
        `• Sử dụng thanh tìm kiếm kết hợp nút "Bộ lọc nâng cao" trên trang Việc làm để lọc theo Mức lương, Cấp bậc (Thực tập / Junior / Senior), Hình thức (Toàn thời gian / Remote / Hybrid) và loại hồ sơ.\n` +
        `• Bấm nút "Bản đồ" trên thanh tìm kiếm để quét các công ty tuyển dụng quanh bán kính 5km - 20km từ vị trí của bạn.\n` +
        `• Nhấn biểu tượng "Lưu tin" ở góc tin đăng để xem lại tại mục "Vị trí đã lưu".`,
      suggestedAdminDraft: '',
    };
  }

  // 2.8. Hỏi về chi phí / Miễn phí sử dụng
  if (
    ascii.includes('mat phi') ||
    ascii.includes('thu tien') ||
    ascii.includes('mien phi') ||
    ascii.includes('chi phi') ||
    ascii.includes('bang gia') ||
    ascii.includes('goi vip') ||
    ascii.includes('thanh toan')
  ) {
    return {
      handledByAI: true,
      category: 'Chính sách sử dụng miễn phí',
      answer:
        `Chào ${greetingName}, toàn bộ tính năng trên nền tảng SmartCV (Tạo & xuất CV chuẩn A4, Đính kèm PDF, Ứng tuyển, Đăng tin tuyển dụng, Xếp hạng độ phù hợp CV và Đặt lịch phỏng vấn qua Gmail) đều hoàn toàn MIỄN PHÍ.\n` +
        `Lưu ý an toàn: Ứng viên tuyệt đối không chuyển khoản bất kỳ khoản phí đặt cọc hay phí dự tuyển nào. Nếu phát hiện tin đăng bất thường, hãy gõ "Báo cáo vi phạm" để chuyển ngay cho Admin kiểm tra.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.9. Cập nhật thông tin Công ty / Xuất danh sách ứng viên Excel CSV cho Nhà tuyển dụng
  if (
    ascii.includes('thong tin cong ty') ||
    ascii.includes('logo') ||
    ascii.includes('xuat excel') ||
    ascii.includes('xuat csv') ||
    ascii.includes('xep hang cv') ||
    ascii.includes('cham diem')
  ) {
    return {
      handledByAI: true,
      category: 'Tiện ích dành cho Nhà tuyển dụng',
      answer:
        `Chào ${greetingName}, hướng dẫn nhanh dành cho Nhà tuyển dụng:\n` +
        `• Cập nhật hồ sơ & Bản đồ doanh nghiệp: Mở tab "Thông tin Công ty & Bản đồ" → bấm "Chỉnh sửa thông tin & Bản đồ" → điền địa chỉ, quy mô, logo rồi nhấn Lưu.\n` +
        `• Xuất danh sách ứng viên ra Excel (CSV): Tại tab "Xét duyệt CV theo vị trí", hệ thống tự động chấm điểm độ khớp từ khóa JD + kinh nghiệm + ngoại ngữ; bạn nhấn nút "Xuất CSV" để tải bảng tổng hợp mở bằng Microsoft Excel.`,
      suggestedAdminDraft: '',
    };
  }

  // 2.10. Chào hỏi / Hỏi tổng quát
  if (
    lower.length <= 28 &&
    (ascii.includes('xin chao') ||
      ascii.includes('chao') ||
      ascii === 'hi' ||
      ascii === 'hello' ||
      ascii === 'alo' ||
      ascii.includes('huong dan') ||
      ascii.includes('giup minh') ||
      ascii.includes('ho tro'))
  ) {
    return {
      handledByAI: true,
      category: 'Tư vấn chung',
      answer:
        `Xin chào ${greetingName}! Trợ lý AI CSKH của SmartCV trực 24/7 để giải đáp ngay các câu hỏi thường gặp về:\n` +
        `• Tạo CV chuẩn A4 & đính kèm file CV PDF khi ứng tuyển\n` +
        `• Theo dõi trạng thái duyệt CV & lịch hẹn phỏng vấn qua Gmail\n` +
        `• Chỉnh sửa / gia hạn tin tuyển dụng & đổi mật khẩu\n` +
        `Bạn hãy nhập cụ thể câu hỏi (hoặc gõ "Gặp chuyên viên" nếu cần Admin hỗ trợ trực tiếp vấn đề tài khoản nhé)!`,
      suggestedAdminDraft: '',
    };
  }

  // 3. Nếu câu hỏi dài / đặc thù không nằm trong bộ câu hỏi thường gặp -> Chuyển tạo phiếu để Chuyên viên Admin trả lời chính xác
  return {
    handledByAI: false,
    category: 'Câu hỏi chi tiết cần Chuyên viên hỗ trợ',
    answer:
      `Cảm ơn ${greetingName} đã gửi câu hỏi. Vì nội dung "${text}" cần kiểm tra chi tiết theo trường hợp cụ thể, Trợ lý AI đã tự động chuyển yêu cầu thành phiếu hỗ trợ tới Chuyên viên CSKH SmartCV.\n` +
      `Bộ phận CSKH sẽ phản hồi ngay tại khung này và qua email của bạn trong giờ làm việc (08:00 - 22:00).`,
    suggestedAdminDraft: `Chào ${greetingName}, cảm ơn bạn đã liên hệ Trung tâm CSKH SmartCV. Về vấn đề "${text}", bộ phận hỗ trợ xin giải đáp chi tiết như sau:\n- `,
  };
};

const mapTicketRow = (row: SupportTicketRow) => {
  const aiEval = evaluateSupportQuestionWithAI(row.content, row.role_name, row.full_name, true);
  return {
    id: row.id,
    ticketCode: row.ticket_code,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    roleName: row.role_name,
    content: row.content,
    adminReply: row.admin_reply,
    status: row.status,
    handledBy: row.handled_by || 'ADMIN',
    aiCategory: row.ai_category || aiEval.category,
    suggestedReply: aiEval.suggestedAdminDraft,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * Xử lý câu hỏi CSKH bằng AI trước:
 * - Nếu là câu hỏi phổ biến (FAQ): AI tự động trả lời ngay & đánh dấu RESOLVED (handled_by = 'AI'), KHÔNG đẩy vào hàng chờ Chờ xử lý của Admin.
 * - Nếu cần con người xử lý (hoặc khách bấm "Chuyển gặp Chuyên viên"): Tạo phiếu OPEN (handled_by = 'ADMIN') để Admin phản hồi.
 */
export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    await ensureExtraTables();

    let userId: string | null = null;
    let userFullName = String(req.body.fullName || '').trim();
    let userEmail = String(req.body.email || '').trim();
    let roleName = String(req.body.roleName || 'GUEST').trim();
    const forceEscalate = Boolean(req.body.forceEscalate);

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded: any = verifyToken(authHeader.split(' ')[1]);
        if (decoded?.userId) {
          userId = decoded.userId;
          const dbUser = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { role: true },
          });
          if (dbUser) {
            userFullName = dbUser.fullName;
            userEmail = dbUser.email;
            roleName = dbUser.role?.name || roleName;
          }
        }
      } catch {
        // Cho phép khách vãng lai hỏi CSKH
      }
    }

    const content = String(req.body.content || '').trim();
    if (!content) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần hỗ trợ.' });
    }

    const finalName = userFullName || 'Khách truy cập';
    const finalEmail = userEmail || 'Chưa cung cấp email';

    const decision = evaluateSupportQuestionWithAI(content, roleName, finalName, forceEscalate);
    const id = crypto.randomUUID();
    const ticketCode =
      String(req.body.ticketCode || '').trim() ||
      `CSKH-${Math.floor(100000 + Math.random() * 900000)}`;

    if (decision.handledByAI) {
      // AI tự động giải đáp hoàn tất -> Lưu nhật ký RESOLVED bởi AI để Admin không bị quá tải mà vẫn thống kê được
      await prisma.$executeRawUnsafe(
        `INSERT INTO support_tickets (id, ticket_code, user_id, full_name, email, role_name, content, admin_reply, status, handled_by, ai_category)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'RESOLVED', 'AI', $9)`,
        id,
        ticketCode,
        userId,
        finalName,
        finalEmail,
        roleName,
        content,
        decision.answer,
        decision.category
      );

      return res.status(200).json({
        handledByAI: true,
        needsAdmin: false,
        category: decision.category,
        replyContent: decision.answer,
        ticketCode,
      });
    }

    // Câu hỏi phức tạp / báo cáo vi phạm / khách yêu cầu gặp Chuyên viên -> Tạo phiếu OPEN cho Admin
    await prisma.$executeRawUnsafe(
      `INSERT INTO support_tickets (id, ticket_code, user_id, full_name, email, role_name, content, status, handled_by, ai_category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'OPEN', 'ADMIN', $8)`,
      id,
      ticketCode,
      userId,
      finalName,
      finalEmail,
      roleName,
      content,
      decision.category
    );

    const rows = await prisma.$queryRawUnsafe<SupportTicketRow[]>(
      `SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`,
      id
    );

    try {
      io.emit('admin_new_support_ticket', {
        ticketCode,
        fullName: finalName,
        content,
      });
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

    return res.status(201).json({
      handledByAI: false,
      needsAdmin: true,
      category: decision.category,
      replyContent: decision.answer,
      ticketCode,
      ticket: rows[0] ? mapTicketRow(rows[0]) : { id, ticketCode },
    });
  } catch (error) {
    console.error('Lỗi xử lý CSKH:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi xử lý yêu cầu hỗ trợ.' });
  }
};

/**
 * Người dùng đăng nhập xem lịch sử các phiếu đã chuyển Chuyên viên Admin và có phản hồi từ Admin
 */
export const getMySupportTickets = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const userId = req.user.userId;
    const rows = await prisma.$queryRawUnsafe<SupportTicketRow[]>(
      `SELECT * FROM support_tickets
       WHERE user_id = $1 AND handled_by = 'ADMIN'
       ORDER BY created_at DESC LIMIT 30`,
      userId
    );
    return res.json({ tickets: rows.map(mapTicketRow) });
  } catch (error) {
    console.error('Lỗi tải phiếu CSKH cá nhân:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Admin: Lấy tất cả phiếu hỗ trợ CSKH (Ưu tiên phiếu OPEN cần Admin xử lý lên đầu)
 */
export const adminGetAllSupportTickets = async (_req: Request, res: Response) => {
  try {
    await ensureExtraTables();
    const rows = await prisma.$queryRawUnsafe<SupportTicketRow[]>(
      `SELECT * FROM support_tickets
       ORDER BY
         CASE WHEN status = 'OPEN' THEN 0 WHEN handled_by = 'ADMIN' THEN 1 ELSE 2 END,
         created_at DESC`
    );
    return res.json({ tickets: rows.map(mapTicketRow) });
  } catch (error) {
    console.error('Lỗi tải danh sách phiếu CSKH:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Admin: Phản hồi và cập nhật trạng thái phiếu hỗ trợ CSKH (hỗ trợ gửi kèm email phản hồi qua Gmail SMTP)
 */
export const adminReplySupportTicket = async (req: Request, res: Response) => {
  try {
    await ensureExtraTables();
    const { id } = req.params;
    const { adminReply, status, sendEmailNotification } = req.body;

    const existingRows = await prisma.$queryRawUnsafe<SupportTicketRow[]>(
      `SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`,
      id
    );
    if (!existingRows[0]) {
      return res.status(404).json({ message: 'Không tìm thấy phiếu hỗ trợ.' });
    }

    const current = existingRows[0];
    const nextReply =
      adminReply !== undefined ? String(adminReply).trim() : current.admin_reply;
    const nextStatus =
      status && ['OPEN', 'RESOLVED'].includes(status)
        ? status
        : nextReply
        ? 'RESOLVED'
        : current.status;

    await prisma.$executeRawUnsafe(
      `UPDATE support_tickets
       SET admin_reply = $1, status = $2, handled_by = 'ADMIN', updated_at = NOW()
       WHERE id = $3`,
      nextReply || null,
      nextStatus,
      id
    );

    let emailSent = false;
    if (
      sendEmailNotification &&
      nextReply &&
      current.email &&
      current.email.includes('@')
    ) {
      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; color: #1e293b;">
          <h2 style="margin-top: 0; color: #0284c7;">Phản hồi phiếu hỗ trợ #${current.ticket_code} — SmartCV CSKH</h2>
          <p>Xin chào <strong>${current.full_name}</strong>,</p>
          <p style="color: #475569; line-height: 1.6;">Trung tâm Chăm sóc khách hàng <strong>SmartCV</strong> đã xử lý yêu cầu hỗ trợ của bạn:</p>
          <div style="background: #f8fafc; border-left: 4px solid #94a3b8; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #475569;">
            <strong>Nội dung bạn gửi:</strong><br/>${current.content}
          </div>
          <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px 16px; margin: 16px 0; font-size: 14px; color: #0f172a; line-height: 1.6;">
            <strong>Phản hồi từ Chuyên viên CSKH:</strong><br/>${nextReply.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 13px; color: #64748b;">Trân trọng,<br/><strong>Trung tâm CSKH SmartCV</strong> (Hotline: 1900 6868 89)</p>
        </div>
      `;
      emailSent = await sendEmail(
        current.email,
        `[SmartCV CSKH] Phản hồi phiếu hỗ trợ #${current.ticket_code}`,
        html
      );
    }

    if (current.user_id && nextReply) {
      try {
        io.to(`user_${current.user_id}`).emit('support_ticket_replied', {
          ticketCode: current.ticket_code,
          adminReply: nextReply,
        });
      } catch {
        // Bỏ qua nếu socket chưa kết nối
      }
    }

    const updatedRows = await prisma.$queryRawUnsafe<SupportTicketRow[]>(
      `SELECT * FROM support_tickets WHERE id = $1 LIMIT 1`,
      id
    );

    return res.json({
      message: emailSent
        ? 'Đã lưu phản hồi CSKH và gửi email thông báo tới người dùng.'
        : 'Đã cập nhật phiếu hỗ trợ CSKH thành công.',
      emailSent,
      ticket: updatedRows[0] ? mapTicketRow(updatedRows[0]) : null,
    });
  } catch (error) {
    console.error('Lỗi phản hồi phiếu CSKH:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật phiếu CSKH.' });
  }
};

/**
 * Admin: Xoá phiếu hỗ trợ CSKH
 */
export const adminDeleteSupportTicket = async (req: Request, res: Response) => {
  try {
    await ensureExtraTables();
    const { id } = req.params;
    await prisma.$executeRawUnsafe(`DELETE FROM support_tickets WHERE id = $1`, id);
    return res.json({ message: 'Đã xoá phiếu hỗ trợ CSKH.' });
  } catch (error) {
    console.error('Lỗi xoá phiếu CSKH:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};
