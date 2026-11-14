import { Router } from 'express';
import {
  applyJob,
  uploadApplicationPdf,
  getApplicationsForRecruiter,
  getMyApplications,
  updateApplicationStatus,
  getSmtpStatus,
  configureSmtpSender,
  sendInterviewScheduleEmail,
  saveInterviewSchedule,
  getInterviewRoomDetails,
  saveInterviewEvaluation,
} from '../controllers/applicationController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';
import { uploadPDF } from '../middlewares/uploadMiddleware';

const applicationRouter = Router();

/**
 * Các API cho Đơn ứng tuyển - đều yêu cầu xác thực.
 */

// Ứng viên tải lên file CV PDF từ máy tính để đính kèm đơn ứng tuyển
applicationRouter.post(
  '/upload-pdf',
  authMiddleware,
  roleMiddleware(['CANDIDATE']),
  uploadPDF.single('pdf'),
  uploadApplicationPdf
);

// Ứng viên nộp đơn ứng tuyển
applicationRouter.post('/', authMiddleware, roleMiddleware(['CANDIDATE']), applyJob);

// Ứng viên xem lịch sử ứng tuyển của mình
applicationRouter.get('/my', authMiddleware, roleMiddleware(['CANDIDATE']), getMyApplications);

// Recruiter xem tất cả đơn ứng tuyển (có thể lọc theo ?jobId=...)
applicationRouter.get('/recruiter', authMiddleware, roleMiddleware(['RECRUITER']), getApplicationsForRecruiter);

// Kiểm tra & cấu hình Gmail SMTP gửi thư mời phỏng vấn tự động
applicationRouter.get('/smtp-status', authMiddleware, roleMiddleware(['RECRUITER', 'ADMIN']), getSmtpStatus);
applicationRouter.post('/smtp-config', authMiddleware, roleMiddleware(['RECRUITER', 'ADMIN']), configureSmtpSender);

// Recruiter cập nhật trạng thái đơn (ACCEPTED / REJECTED)
applicationRouter.patch('/:id/status', authMiddleware, roleMiddleware(['RECRUITER']), updateApplicationStatus);

// Recruiter lưu lịch hẹn phỏng vấn vào PostgreSQL
applicationRouter.post(
  '/:id/interview-schedule',
  authMiddleware,
  roleMiddleware(['RECRUITER']),
  saveInterviewSchedule
);

// Phòng phỏng vấn trực tuyến (Online Video Call): chỉ dành cho Ứng viên & Nhà tuyển dụng thuộc đơn này
applicationRouter.get(
  '/:id/interview-room',
  authMiddleware,
  roleMiddleware(['CANDIDATE', 'RECRUITER', 'ADMIN']),
  getInterviewRoomDetails
);

// Nhà tuyển dụng lưu điểm & ghi chú đánh giá phỏng vấn bảo mật
applicationRouter.post(
  '/:id/interview-evaluation',
  authMiddleware,
  roleMiddleware(['RECRUITER']),
  saveInterviewEvaluation
);

// Recruiter gửi Email / Gmail thông báo Duyệt CV & Lịch hẹn phỏng vấn
applicationRouter.post(
  '/:id/schedule-interview-email',
  authMiddleware,
  roleMiddleware(['RECRUITER']),
  sendInterviewScheduleEmail
);

export default applicationRouter;
