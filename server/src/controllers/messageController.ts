import { Response } from 'express';
import prisma from '../utils/prisma';
import { ensureExtraTables } from '../utils/dbExtraTables';
import { io } from '../index';

/**
 * Controller quản lý tin nhắn thời gian thực (Realtime Messaging):
 * 1. Giữa Nhà tuyển dụng và Ứng viên theo từng Application.
 * 2. Giữa Admin và Khách hàng (Nhà tuyển dụng / Ứng viên) theo thời gian thực qua Socket.io (lưu bền vững trong PostgreSQL).
 */

interface DirectChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

interface DirectMessageRow {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  content: string;
  created_at: Date | string;
}

const mapDirectMessageRow = (r: DirectMessageRow): DirectChatMessage => ({
  id: r.id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  receiverId: r.receiver_id,
  content: r.content,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
});

/**
 * Gửi tin nhắn trực tiếp thời gian thực (Admin <-> Nhà tuyển dụng / Ứng viên).
 * Không dùng bot tự động trả lời — phát trực tiếp qua Socket.io giữa 2 tài khoản thật.
 */
export const sendDirectMessage = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { receiverId, content } = req.body;
    const senderId = req.user.userId;

    if (!receiverId || !content?.trim()) {
      return res.status(400).json({ message: 'Thiếu người nhận hoặc nội dung tin nhắn.' });
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { fullName: true },
    });

    const newMsg: DirectChatMessage = {
      id: `dm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId,
      senderName: sender?.fullName || 'Người dùng',
      receiverId,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    await prisma.$executeRawUnsafe(
      `INSERT INTO direct_messages (id, sender_id, sender_name, receiver_id, content, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      newMsg.id,
      newMsg.senderId,
      newMsg.senderName,
      newMsg.receiverId,
      newMsg.content
    );

    // Phát thời gian thực qua Socket.io tới cả người nhận và người gửi
    try {
      io.to(`user_${receiverId}`).emit('new_direct_message', newMsg);
      io.to(`user_${senderId}`).emit('new_direct_message', newMsg);
      io.to(`user_${receiverId}`).emit('notification', {
        type: 'NEW_MESSAGE',
        message: `${newMsg.senderName} đã gửi tin nhắn cho bạn.`,
      });
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

    return res.status(201).json({ message: 'Đã gửi tin nhắn.', data: newMsg });
  } catch (error) {
    console.error('Lỗi gửi tin nhắn trực tiếp:', error);
    return res.status(500).json({ message: 'Lỗi khi gửi tin nhắn trực tiếp.' });
  }
};

/**
 * Lấy lịch sử tin nhắn trực tiếp giữa người dùng hiện tại và đối phương (partnerId).
 */
export const getDirectMessages = async (req: any, res: Response) => {
  try {
    await ensureExtraTables();
    const { partnerId } = req.params;
    const currentUserId = req.user.userId;

    const rows = await prisma.$queryRawUnsafe<DirectMessageRow[]>(
      `SELECT id, sender_id, sender_name, receiver_id, content, created_at
       FROM direct_messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      currentUserId,
      partnerId
    );

    return res.json({ messages: rows.map(mapDirectMessageRow) });
  } catch (error) {
    console.error('Lỗi tải tin nhắn trực tiếp:', error);
    return res.status(500).json({ message: 'Lỗi khi tải tin nhắn trực tiếp.' });
  }
};

/**
 * Lấy thông tin tài khoản Admin để Nhà tuyển dụng / Ứng viên có thể nhắn tin trực tiếp với Admin.
 */
export const getSupportAdminContact = async (_req: any, res: Response) => {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: 'ADMIN' } },
      select: { id: true, fullName: true, email: true },
    });
    return res.json({ admin: adminUser });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tải thông tin Admin.' });
  }
};

/**
 * Gửi tin nhắn mới trong một cuộc trò chuyện (Application room).
 * Tin nhắn được lưu vào DB để có lịch sử kể cả khi offline, đồng thời phát qua Socket.io.
 */
export const sendMessage = async (req: any, res: Response) => {
  try {
    const { applicationId, receiverId, content } = req.body;
    const senderId = req.user.userId;

    // 1. Kiểm tra Application có tồn tại không
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: { select: { postedBy: true } },
      },
    });
    if (!application) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện.' });
    }

    // Tự động xác định người nhận nếu client chưa truyền chính xác
    const actualReceiverId =
      receiverId ||
      (senderId === application.candidateId ? application.job.postedBy : application.candidateId);

    // 2. Lưu tin nhắn vào DB
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: actualReceiverId,
        applicationId,
        content,
        isRead: false,
      },
      include: {
        sender: { select: { fullName: true, avatar: true } },
      },
    });

    // 3. Phát realtime qua Socket.io tới phòng chat và người nhận
    try {
      io.to(`chat_${applicationId}`).emit('new_message', message);
      io.to(`user_${actualReceiverId}`).emit('notification', {
        type: 'NEW_MESSAGE',
        message: `${message.sender.fullName} đã gửi tin nhắn cho bạn.`,
        applicationId,
      });
    } catch {
      // Bỏ qua nếu socket chưa sẵn sàng
    }

    return res.status(201).json({ message: 'Tin nhắn đã được gửi.', data: message });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống khi gửi tin nhắn.' });
  }
};

/**
 * Lấy lịch sử tin nhắn của một Application.
 */
export const getMessages = async (req: any, res: Response) => {
  try {
    const { applicationId } = req.params;

    const messages = await prisma.message.findMany({
      where: { applicationId },
      include: {
        sender: { select: { fullName: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.message.updateMany({
      where: {
        applicationId,
        receiverId: req.user.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};
