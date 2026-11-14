import { Response } from 'express';
import prisma from '../utils/prisma';
import { io } from '../index'; // Socket.io instance để gửi thông báo realtime
import { ensureExtraTables } from '../utils/dbExtraTables';
import { uploadPdfWithFallback } from '../utils/cloudinary';
import {
  getActiveSmtpCredentials,
  saveSmtpConfigToEnv,
  sendEmailDetailed,
  buildInterviewInvitationEmailHtml,
  getPublicFrontendUrl,
} from '../utils/mail';

interface AttachmentRow {
  application_id: string;
  file_name: string;
  pdf_url: string;
}

interface InterviewRow {
  application_id: string;
  candidate_name: string;
  recipient_email: string | null;
  job_title: string;
  interview_date: string;
  interview_time: string;
  mode: 'OFFLINE' | 'ONLINE';
  location_or_link: string;
  interviewer: string;
  note: string | null;
  created_at: Date;
}

interface EvaluationRow {
  application_id: string;
  rating: number;
  notes: string | null;
  updated_at: Date;
}

const mapEvaluationRow = (r: EvaluationRow) => ({
  applicationId: r.application_id,
  rating: Number(r.rating || 0),
  notes: r.notes || '',
  updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at),
});

const mapInterviewRow = (r: InterviewRow) => ({
  applicationId: r.application_id,
  candidateName: r.candidate_name,
  recipientEmail: r.recipient_email || '',
  jobTitle: r.job_title,
  date: r.interview_date,
  time: r.interview_time,
  mode: r.mode === 'ONLINE' ? ('ONLINE' as const) : ('OFFLINE' as const),
  locationOrLink: r.location_or_link,
  interviewer: r.interviewer,
  note: r.note || '',
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
});

const upsertInterviewScheduleRow = async (payload: {
  applicationId: string;
  candidateName: string;
  recipientEmail?: string;
  jobTitle: string;
  date: string;
  time: string;
  mode: string;
  locationOrLink: string;
  interviewer: string;
  note?: string;
}) => {
  await ensureExtraTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO interview_schedules (
       application_id, candidate_name, recipient_email, job_title,
       interview_date, interview_time, mode, location_or_link, interviewer, note, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (application_id) DO UPDATE SET
       candidate_name = EXCLUDED.candidate_name,
       recipient_email = EXCLUDED.recipient_email,
       job_title = EXCLUDED.job_title,
       interview_date = EXCLUDED.interview_date,
       interview_time = EXCLUDED.interview_time,
       mode = EXCLUDED.mode,
       location_or_link = EXCLUDED.location_or_link,
       interviewer = EXCLUDED.interviewer,
       note = EXCLUDED.note,
       updated_at = NOW()`,
    payload.applicationId,
    payload.candidateName,
    payload.recipientEmail || null,
    payload.jobTitle,
    payload.date,
    payload.time,
    payload.mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE',
    payload.locationOrLink,
    payload.interviewer,
    payload.note || null
  );
};

/**
 * Tải lên file CV định dạng PDF có sẵn từ máy tính của ứng viên khi nộp đơn.
 */
export const uploadApplicationPdf = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp PDF hợp lệ (tối đa 5MB).' });
    }
    const pdfUrl = await uploadPdfWithFallback(req, 'cvconnect/applications');
    return res.json({
      message: 'Tải lên file CV PDF thành công.',
      pdfUrl,
      fileName: req.file.originalname || req.file.filename,
    });
  } catch (error) {
    console.error('Lỗi upload file CV PDF đính kèm:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi tải tệp PDF.' });
  }
};

/**
 * Controller xử lý đơn ứng tuyển (Application).
 */

/**
 * Nộp đơn ứng tuyển vào một vị trí.
 * -----------------------------------------------------------------
 * LOGIC QUAN TRỌNG - requireCV:
 *   - Nếu job.requireCV = true  → ứng viên cần đính kèm CV trực tuyến (cvId) HOẶC tải file CV PDF từ máy tính (uploadedPdfUrl)
 *   - Nếu job.requireCV = false → có thể nộp nhanh không cần CV
 * -----------------------------------------------------------------
 */
export const applyJob = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { jobId, cvId, coverLetter, uploadedPdfUrl, uploadedFileName } = req.body;
    const candidateId = req.user.userId;

    // 1. Lấy thông tin tin tuyển dụng, bao gồm trường requireCV
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    }

    // 2. Kiểm tra tin tuyển dụng có còn mở & còn hạn nộp hồ sơ không
    if (job.status === 'CLOSED') {
      return res.status(400).json({ message: 'Tin tuyển dụng này đã đóng, không thể nộp đơn.' });
    }
    if (job.deadline) {
      const endOfDeadline = new Date(job.deadline);
      endOfDeadline.setHours(23, 59, 59, 999);
      if (endOfDeadline.getTime() < Date.now()) {
        return res.status(400).json({ message: 'Tin tuyển dụng này đã hết hạn nhận hồ sơ ứng tuyển.' });
      }
    }

    // 3. Kiểm tra đã nộp đơn chưa (tránh nộp trùng)
    const existingApp = await prisma.application.findFirst({
      where: { jobId, candidateId },
    });
    if (existingApp) {
      return res.status(400).json({ message: 'Bạn đã nộp đơn vào vị trí này rồi.' });
    }

    // 4. LOGIC KIỂM TRA requireCV (Chấp nhận CV tạo trên web HOẶC file PDF tải từ máy tính)
    if (job.requireCV && !cvId && !uploadedPdfUrl) {
      return res.status(400).json({
        message: 'Vị trí này yêu cầu đính kèm CV. Vui lòng chọn CV trực tuyến hoặc tải file PDF từ máy tính.',
      });
    }

    // 5. Nếu có cvId, kiểm tra CV có thuộc về ứng viên này không
    if (cvId) {
      const cv = await prisma.cV.findFirst({ where: { id: cvId, userId: candidateId } });
      if (!cv) {
        return res.status(400).json({ message: 'CV không hợp lệ hoặc không thuộc về bạn.' });
      }
    }

    // 6. Tạo đơn ứng tuyển mới
    const newApplication = await prisma.application.create({
      data: {
        jobId,
        candidateId,
        cvId: cvId || null,
        coverLetter,
        status: 'PENDING',
      },
      include: {
        candidate: { select: { fullName: true, email: true } },
        job: { select: { title: true, postedBy: true } },
      },
    });

    // 6b. Nếu ứng viên đính kèm thêm file CV PDF từ máy tính, lưu vào PostgreSQL
    if (uploadedPdfUrl) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO application_attachments (application_id, file_name, pdf_url)
         VALUES ($1, $2, $3)
         ON CONFLICT (application_id) DO UPDATE SET file_name = EXCLUDED.file_name, pdf_url = EXCLUDED.pdf_url`,
        newApplication.id,
        String(uploadedFileName || 'CV-Ung-Vien.pdf'),
        String(uploadedPdfUrl)
      );
    }

    // 7. Gửi thông báo realtime cho Nhà tuyển dụng qua Socket.io
    io.emit(`notification_recruiter_${newApplication.job.postedBy}`, {
      type: 'NEW_APPLICATION',
      message: `${newApplication.candidate.fullName} vừa nộp đơn vào vị trí "${newApplication.job.title}".`,
      applicationId: newApplication.id,
    });

    return res.status(201).json({
      message: 'Nộp đơn ứng tuyển thành công!',
      application: {
        ...newApplication,
        uploadedPdfUrl: uploadedPdfUrl || null,
        uploadedFileName: uploadedFileName || null,
      },
    });
  } catch (error: any) {
    console.error('Lỗi khi nộp đơn:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi nộp đơn.' });
  }
};

/**
 * Recruiter: Lấy danh sách đơn ứng tuyển cho tất cả các tin của mình (kèm file PDF đính kèm & lịch phỏng vấn từ PostgreSQL).
 */
export const getApplicationsForRecruiter = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { jobId } = req.query;

    const applications = await prisma.application.findMany({
      where: {
        job: { postedBy: req.user.userId },
        ...(jobId ? { jobId: jobId as string } : {}),
      },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, avatar: true } },
        cv: { select: { id: true, title: true, pdfUrl: true, data: true, template: true, createdAt: true } },
        job: { select: { id: true, title: true, description: true, requirements: true, location: true, salary: true, requireCV: true } },
      },
      orderBy: { appliedDate: 'desc' },
    });

    const appIds = applications.map((a) => a.id);
    const attachmentMap = new Map<string, AttachmentRow>();
    const interviewMap = new Map<string, ReturnType<typeof mapInterviewRow>>();
    const evaluationMap = new Map<string, ReturnType<typeof mapEvaluationRow>>();

    if (appIds.length > 0) {
      const [attRows, intRows, evalRows] = await Promise.all([
        prisma.$queryRawUnsafe<AttachmentRow[]>(`SELECT * FROM application_attachments`),
        prisma.$queryRawUnsafe<InterviewRow[]>(`SELECT * FROM interview_schedules`),
        prisma.$queryRawUnsafe<EvaluationRow[]>(`SELECT * FROM interview_evaluations`),
      ]);
      attRows.forEach((r) => {
        if (appIds.includes(r.application_id)) attachmentMap.set(r.application_id, r);
      });
      intRows.forEach((r) => {
        if (appIds.includes(r.application_id)) interviewMap.set(r.application_id, mapInterviewRow(r));
      });
      evalRows.forEach((r) => {
        if (appIds.includes(r.application_id)) evaluationMap.set(r.application_id, mapEvaluationRow(r));
      });
    }

    const enriched = applications.map((app) => {
      const att = attachmentMap.get(app.id);
      return {
        ...app,
        uploadedPdfUrl: att?.pdf_url || null,
        uploadedFileName: att?.file_name || null,
        interviewSchedule: interviewMap.get(app.id) || null,
        interviewEvaluation: evaluationMap.get(app.id) || null,
      };
    });

    return res.json({ applications: enriched });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Candidate: Lấy danh sách đơn ứng tuyển của bản thân (kèm file PDF đính kèm & lịch phỏng vấn từ PostgreSQL).
 */
export const getMyApplications = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const applications = await prisma.application.findMany({
      where: { candidateId: req.user.userId },
      include: {
        job: {
          include: { company: true },
        },
        cv: { select: { title: true, pdfUrl: true } },
      },
      orderBy: { appliedDate: 'desc' },
    });

    const appIds = applications.map((a) => a.id);
    const attachmentMap = new Map<string, AttachmentRow>();
    const interviewMap = new Map<string, ReturnType<typeof mapInterviewRow>>();

    if (appIds.length > 0) {
      const [attRows, intRows] = await Promise.all([
        prisma.$queryRawUnsafe<AttachmentRow[]>(`SELECT * FROM application_attachments`),
        prisma.$queryRawUnsafe<InterviewRow[]>(`SELECT * FROM interview_schedules`),
      ]);
      attRows.forEach((r) => {
        if (appIds.includes(r.application_id)) attachmentMap.set(r.application_id, r);
      });
      intRows.forEach((r) => {
        if (appIds.includes(r.application_id)) interviewMap.set(r.application_id, mapInterviewRow(r));
      });
    }

    const enriched = applications.map((app) => {
      const att = attachmentMap.get(app.id);
      return {
        ...app,
        uploadedPdfUrl: att?.pdf_url || null,
        uploadedFileName: att?.file_name || null,
        interviewSchedule: interviewMap.get(app.id) || null,
      };
    });

    return res.json({ applications: enriched });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Recruiter: Cập nhật trạng thái đơn ứng tuyển (Chấp nhận / Từ chối).
 */
export const updateApplicationStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'ACCEPTED' hoặc 'REJECTED'

    // Kiểm tra Status hợp lệ
    if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }

    // Kiểm tra đơn có thuộc về job của Recruiter này không
    const application = await prisma.application.findFirst({
      where: { id, job: { postedBy: req.user.userId } },
      include: {
        candidate: { select: { fullName: true } },
        job: { select: { title: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển.' });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
    });

    // Gửi thông báo realtime cho Ứng viên
    io.emit(`notification_candidate_${application.candidateId}`, {
      type: status === 'ACCEPTED' ? 'APPLICATION_ACCEPTED' : 'APPLICATION_REJECTED',
      message: status === 'ACCEPTED'
        ? `🎉 Chúc mừng! Đơn ứng tuyển vào "${application.job.title}" của bạn đã được chấp nhận.`
        : `Đơn ứng tuyển vào "${application.job.title}" của bạn chưa được chọn lần này.`,
      applicationId: id,
    });

    return res.json({ message: `Đã cập nhật trạng thái thành "${status}".`, application: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Kiểm tra trạng thái cấu hình Gmail SMTP để gửi thư mời phỏng vấn tự động.
 */
export const getSmtpStatus = async (_req: any, res: Response) => {
  const { user, configured } = getActiveSmtpCredentials();
  return res.json({
    smtpConfigured: configured,
    senderEmail: configured ? user : '',
  });
};

/**
 * Recruiter / Admin cấu hình nhanh Gmail & Google App Password để gửi thư tự động.
 */
export const configureSmtpSender = async (req: any, res: Response) => {
  try {
    const { emailUser, appPassword } = req.body;
    if (!emailUser?.trim() || !appPassword?.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập đầy đủ địa chỉ Gmail và Mật khẩu ứng dụng Google (16 ký tự).',
      });
    }

    await saveSmtpConfigToEnv(emailUser, appPassword);
    const { user } = getActiveSmtpCredentials();

    return res.json({
      message: `Đã kết nối thành công tài khoản Gmail gửi tự động: ${user}`,
      smtpConfigured: true,
      senderEmail: user,
    });
  } catch (error: any) {
    return res.status(400).json({
      message:
        error?.responseCode === 535
          ? 'Xác thực Gmail thất bại: Vui lòng kiểm tra lại địa chỉ Gmail và Mật khẩu ứng dụng Google 16 ký tự (App Password).'
          : error?.message || 'Không thể kết nối máy chủ Gmail SMTP.',
    });
  }
};

/**
 * Recruiter: Gửi Email / Gmail tự động thông báo Duyệt CV & Lịch hẹn phỏng vấn khi bấm Đặt lịch phỏng vấn.
 */
export const sendInterviewScheduleEmail = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      recipientEmail,
      candidateName,
      date,
      time,
      mode,
      locationOrLink,
      interviewer,
      note,
    } = req.body;

    const application = await prisma.application.findFirst({
      where: { id, job: { postedBy: req.user.userId } },
      include: {
        candidate: { select: { id: true, fullName: true, email: true } },
        cv: { select: { data: true } },
        job: {
          include: {
            company: true,
            author: { select: { fullName: true, email: true } },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển hợp lệ.' });
    }

    // Đảm bảo trạng thái đơn được đánh dấu Đã chấp nhận (ACCEPTED) khi đặt lịch phỏng vấn
    if (application.status !== 'ACCEPTED') {
      await prisma.application.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
    }

    const cvData: any = application.cv?.data || {};
    const targetEmail = (
      recipientEmail ||
      cvData.email ||
      cvData.personalInfo?.email ||
      application.candidate?.email ||
      ''
    ).trim();

    if (!targetEmail || !targetEmail.includes('@')) {
      return res.status(400).json({
        emailSent: false,
        message: 'Địa chỉ email nhận thư mời của ứng viên không hợp lệ.',
      });
    }

    const companyName = application.job.company?.name || 'Doanh nghiệp tuyển dụng';
    const jobTitle = application.job.title;
    const finalCandidateName =
      candidateName ||
      cvData.fullName ||
      cvData.personalInfo?.fullName ||
      application.candidate.fullName ||
      'Ứng viên';

    const resolvedMode = mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    const defaultOnlineRoomUrl = `${getPublicFrontendUrl()}/interview-room/${id}`;
    const resolvedLocationOrLink = String(
      locationOrLink || (resolvedMode === 'ONLINE' ? defaultOnlineRoomUrl : application.job.location)
    );

    // Lưu lịch hẹn phỏng vấn vào bảng interview_schedules trong PostgreSQL
    await upsertInterviewScheduleRow({
      applicationId: id,
      candidateName: finalCandidateName,
      recipientEmail: targetEmail,
      jobTitle,
      date: String(date || ''),
      time: String(time || '09:30'),
      mode: resolvedMode,
      locationOrLink: resolvedLocationOrLink,
      interviewer: String(interviewer || 'Bộ phận Tuyển dụng Nhân sự (HR)'),
      note: note ? String(note) : '',
    });

    const formattedDate = String(date || '')
      .split('-')
      .reverse()
      .join('/');

    const subject = `[SmartCV] Thư mời phỏng vấn & Duyệt CV vị trí ${jobTitle} - ${companyName}`;
    const html = buildInterviewInvitationEmailHtml({
      candidateName: finalCandidateName,
      companyName,
      jobTitle,
      formattedDate,
      time: time || '09:30',
      mode: resolvedMode,
      locationOrLink: resolvedLocationOrLink,
      interviewer: interviewer || 'Bộ phận Tuyển dụng Nhân sự (HR)',
      note,
      recruiterEmail: application.job.author?.email,
    });

    const mailRes = await sendEmailDetailed(
      targetEmail,
      subject,
      html,
      `${companyName} - Tuyển dụng`
    );

    return res.json({
      emailSent: mailRes.success,
      smtpConfigured: mailRes.configured,
      senderEmail: mailRes.senderEmail,
      recipientEmail: targetEmail,
      error: mailRes.error,
      message: mailRes.success
        ? `Đã gửi tự động thư mời phỏng vấn tới ${targetEmail}.`
        : mailRes.error || 'Chưa thể gửi email tự động.',
    });
  } catch (error) {
    console.error('Lỗi khi gửi email lịch phỏng vấn:', error);
    return res.status(500).json({
      emailSent: false,
      message: 'Lỗi hệ thống khi gửi email lịch hẹn phỏng vấn.',
    });
  }
};

/**
 * Recruiter: Lưu / cập nhật Lịch hẹn phỏng vấn trực tiếp vào PostgreSQL (kể cả khi không bật gửi Email).
 */
export const saveInterviewSchedule = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      candidateName,
      recipientEmail,
      jobTitle,
      date,
      time,
      mode,
      locationOrLink,
      interviewer,
      note,
    } = req.body;

    const application = await prisma.application.findFirst({
      where: { id, job: { postedBy: req.user.userId } },
      include: {
        candidate: { select: { fullName: true, email: true } },
        job: { select: { title: true, location: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển hợp lệ.' });
    }

    if (application.status !== 'ACCEPTED') {
      await prisma.application.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
    }

    const resolvedMode = mode === 'ONLINE' ? 'ONLINE' : 'OFFLINE';
    const defaultOnlineRoomUrl = `${getPublicFrontendUrl()}/interview-room/${id}`;
    const resolvedLocationOrLink = String(
      locationOrLink || (resolvedMode === 'ONLINE' ? defaultOnlineRoomUrl : application.job.location)
    );

    await upsertInterviewScheduleRow({
      applicationId: id,
      candidateName: String(candidateName || application.candidate.fullName || 'Ứng viên'),
      recipientEmail: String(recipientEmail || application.candidate.email || ''),
      jobTitle: String(jobTitle || application.job.title),
      date: String(date || ''),
      time: String(time || '09:30'),
      mode: resolvedMode,
      locationOrLink: resolvedLocationOrLink,
      interviewer: String(interviewer || 'Bộ phận Tuyển dụng Nhân sự (HR)'),
      note: note ? String(note) : '',
    });

    return res.json({ message: 'Đã lưu lịch hẹn phỏng vấn vào cơ sở dữ liệu PostgreSQL.' });
  } catch (error) {
    console.error('Lỗi lưu lịch phỏng vấn:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi lưu lịch phỏng vấn.' });
  }
};

/**
 * Phòng phỏng vấn trực tuyến (Online Interview Room):
 * Chỉ cho phép Ứng viên của đơn ứng tuyển đó, Nhà tuyển dụng đăng tin đó, hoặc Admin truy cập.
 */
export const getInterviewRoomDetails = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.roleName || req.user.role;

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: { select: { id: true, fullName: true, email: true, avatar: true } },
        cv: { select: { id: true, title: true, pdfUrl: true, data: true, template: true, createdAt: true } },
        job: {
          include: {
            company: true,
            author: { select: { id: true, fullName: true, email: true, avatar: true } },
          },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy phòng phỏng vấn cho đơn ứng tuyển này.' });
    }

    const isCandidate = application.candidateId === userId;
    const isRecruiter = application.job.postedBy === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isCandidate && !isRecruiter && !isAdmin) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập phòng phỏng vấn trực tuyến này.',
      });
    }

    const [attRows, intRows, evalRows] = await Promise.all([
      prisma.$queryRawUnsafe<AttachmentRow[]>(
        `SELECT * FROM application_attachments WHERE application_id = $1 LIMIT 1`,
        id
      ),
      prisma.$queryRawUnsafe<InterviewRow[]>(
        `SELECT * FROM interview_schedules WHERE application_id = $1 LIMIT 1`,
        id
      ),
      isRecruiter || isAdmin
        ? prisma.$queryRawUnsafe<EvaluationRow[]>(
            `SELECT * FROM interview_evaluations WHERE application_id = $1 LIMIT 1`,
            id
          )
        : Promise.resolve([] as EvaluationRow[]),
    ]);

    return res.json({
      application: {
        ...application,
        uploadedPdfUrl: attRows[0]?.pdf_url || null,
        uploadedFileName: attRows[0]?.file_name || null,
        interviewSchedule: intRows[0] ? mapInterviewRow(intRows[0]) : null,
        interviewEvaluation:
          (isRecruiter || isAdmin) && evalRows[0] ? mapEvaluationRow(evalRows[0]) : null,
      },
      viewerRole: isRecruiter ? 'RECRUITER' : isCandidate ? 'CANDIDATE' : 'ADMIN',
    });
  } catch (error) {
    console.error('Lỗi tải dữ liệu phòng phỏng vấn:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi tải phòng phỏng vấn.' });
  }
};

/**
 * Recruiter: Lưu ghi chú & điểm đánh giá phỏng vấn bảo mật ngay trong phòng phỏng vấn trực tuyến.
 */
export const saveInterviewEvaluation = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { id } = req.params;
    const { rating, notes } = req.body;

    const application = await prisma.application.findFirst({
      where: { id, job: { postedBy: req.user.userId } },
    });

    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy đơn ứng tuyển hợp lệ.' });
    }

    const safeRating = Math.max(0, Math.min(5, Math.round(Number(rating || 0))));
    const safeNotes = String(notes || '').slice(0, 4000);

    await prisma.$executeRawUnsafe(
      `INSERT INTO interview_evaluations (application_id, rating, notes, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (application_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      id,
      safeRating,
      safeNotes
    );

    return res.json({
      message: 'Đã lưu đánh giá & ghi chú phỏng vấn bảo mật.',
      evaluation: {
        applicationId: id,
        rating: safeRating,
        notes: safeNotes,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Lỗi lưu đánh giá phỏng vấn:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi lưu ghi chú phỏng vấn.' });
  }
};
