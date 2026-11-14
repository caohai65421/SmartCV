import { Router } from 'express';
import {
  createSupportTicket,
  getMySupportTickets,
} from '../controllers/supportController';
import { authMiddleware } from '../middlewares/authMiddleware';

const supportRouter = Router();

// Gửi phiếu hỗ trợ CSKH mới (hỗ trợ cả tài khoản đã đăng nhập & khách)
supportRouter.post('/tickets', createSupportTicket);

// Xem lịch sử phiếu hỗ trợ CSKH của tài khoản đang đăng nhập
supportRouter.get('/my-tickets', authMiddleware, getMySupportTickets);

export default supportRouter;
