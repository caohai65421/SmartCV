import { Router } from 'express';
import {
  createJob,
  getAllJobs,
  getJobById,
  getRecruiterJobs,
  updateRecruiterJob,
  updateRecruiterJobStatus,
  deleteRecruiterJob,
} from '../controllers/jobController';
import { authMiddleware, roleMiddleware } from '../middlewares/authMiddleware';

const jobRouter = Router();

/**
 * Các API cho việc lấy thông tin tin tuyển dụng (Public)
 */
// Lấy danh sách tin (Tìm kiếm, hiển thị Home)
jobRouter.get('/', getAllJobs);

// Xem chi tiết tin cụ thể
jobRouter.get('/detail/:id', getJobById);

/**
 * Các API quản lý tin dành riêng cho Nhà tuyển dụng (Recruiter)
 */
// Đăng tin mới (Yêu cầu đăng nhập + vai trò RECRUITER)
jobRouter.post('/', authMiddleware, roleMiddleware(['RECRUITER']), createJob);

// Xem các tin của chính mình (Hỗ trợ cả 2 đường dẫn /recruiter/my và /recruiter/my-jobs)
jobRouter.get('/recruiter/my', authMiddleware, roleMiddleware(['RECRUITER']), getRecruiterJobs);
jobRouter.get('/recruiter/my-jobs', authMiddleware, roleMiddleware(['RECRUITER']), getRecruiterJobs);

// Chỉnh sửa nội dung & gia hạn hạn nộp (Deadline) cho vị trí đã đăng
jobRouter.put('/:id', authMiddleware, roleMiddleware(['RECRUITER']), updateRecruiterJob);

// Đóng / Mở lại vị trí đã đăng
jobRouter.patch('/:id/status', authMiddleware, roleMiddleware(['RECRUITER']), updateRecruiterJobStatus);

// Xóa vị trí đã đăng
jobRouter.delete('/:id', authMiddleware, roleMiddleware(['RECRUITER']), deleteRecruiterJob);

export default jobRouter;
