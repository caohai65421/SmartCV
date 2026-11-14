import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { io } from '../index';

/**
 * Controller quản lý tin nhắn thời gian thực (Realtime Messaging):
 * 1. Giữa Nhà tuyển dụng và Ứng viên theo từng Application.
 * 2. Giữa Admin và Khách hàng (Nhà tuyển dụng / Ứng viên) theo thời gian thực qua Socket.io.
 */

interface DirectChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

const DIRECT_CHAT_FILE = path.join(__dirname, '..', '..', 'uploads', 'direct_messages.json');

const readDirectMessages = (): DirectChatMessage[] => {
  try {
    if (!fs.existsSync(DIRECT_CHAT_FILE)) return [];
    const raw = fs.readFileSync(DIRECT_CHAT_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeDirectMessages = (msgs: DirectChatMessage[]) => {
  try {
    const dir = path.dirname(DIRECT_CHAT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DIRECT_CHAT_FILE, JSON.stringify(msgs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi lưu tin nhắn trực tiếp:', err);
  }
};

/**
 * Gửi tin nhắn trực tiếp thời gian thực (Admin <-> Nhà tuyển dụng / Ứng viên).
 * Không dùng bot tự động trả lời — phát trực tiếp qua Socket.io giữa 2 tài khoản thật.
 */
export const sendDirectMessage = async (req: any, res: Response) => {
  try {
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

    const allMsgs = readDirectMessages();
    allMsgs.push(newMsg);
    writeDirectMessages(allMsgs);

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
    return res.status(500).json({ message: 'Lỗi khi gửi tin nhắn trực tiếp.' });
  }
};

/**
 * Lấy lịch sử tin nhắn trực tiếp giữa người dùng hiện tại và đối phương (partnerId).
 */
export const getDirectMessages = async (req: any, res: Response) => {
  try {
    const { partnerId } = req.params;
    const currentUserId = req.user.userId;

    const allMsgs = readDirectMessages();
    const conversation = allMsgs.filter(
      (m) =>
        (m.senderId === currentUserId && m.receiverId === partnerId) ||
        (m.senderId === partnerId && m.receiverId === currentUserId)
    );

    return res.json({ messages: conversation });
  } catch (error) {
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
