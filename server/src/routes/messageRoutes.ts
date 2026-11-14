import { Router } from 'express';
import {
  sendMessage,
  getMessages,
  sendDirectMessage,
  getDirectMessages,
  getSupportAdminContact,
} from '../controllers/messageController';
import { authMiddleware } from '../middlewares/authMiddleware';

const messageRouter = Router();

/**
 * Các API tin nhắn thời gian thực - yêu cầu xác thực.
 */

// Lấy thông tin tài khoản Admin hỗ trợ
messageRouter.get('/direct/admin-contact', authMiddleware, getSupportAdminContact);

// Lấy lịch sử tin nhắn trực tiếp theo partnerId (Admin <-> NTD / Ứng viên)
messageRouter.get('/direct/:partnerId', authMiddleware, getDirectMessages);

// Gửi tin nhắn trực tiếp thời gian thực (Admin <-> NTD / Ứng viên)
messageRouter.post('/direct', authMiddleware, sendDirectMessage);

// Gửi tin nhắn mới theo Application
messageRouter.post('/', authMiddleware, sendMessage);

// Lấy lịch sử tin nhắn theo Application ID
messageRouter.get('/:applicationId', authMiddleware, getMessages);

export default messageRouter;
