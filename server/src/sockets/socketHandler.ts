import { Server, Socket } from 'socket.io';
import prisma from '../utils/prisma';
import { verifyToken } from '../utils/jwt';

interface InterviewParticipant {
  socketId: string;
  userId: string;
  fullName: string;
  role: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
}

// Lưu trạng thái thành viên đang trực tuyến trong từng phòng phỏng vấn: applicationId -> Map<socketId, InterviewParticipant>
const interviewRooms = new Map<string, Map<string, InterviewParticipant>>();

/**
 * Cấu hình Socket.io nâng cao - Xử lý chat thời gian thực, thông báo
 * và tín hiệu WebRTC cho Phòng phỏng vấn trực tuyến (Online Video Interview Room).
 */
export const initSocketHandlers = (io: Server) => {
  // Middleware xác thực Socket - Chỉ cho phép User đã đăng nhập kết nối
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Bạn cần đăng nhập để sử dụng tính năng chat.'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Token không hợp lệ.'));
    }

    // Lưu thông tin user vào socket để dùng sau
    (socket as any).user = decoded;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`🔌 User "${user.userId}" đã kết nối Socket (ID: ${socket.id})`);

    // Tự động join vào phòng cá nhân để nhận thông báo riêng
    socket.join(`user_${user.userId}`);

    /**
     * Sự kiện: Tham gia phòng chat của một Application.
     * Mỗi Application (đơn ứng tuyển) tạo một phòng chat riêng biệt.
     */
    socket.on('join_chat', (applicationId: string) => {
      socket.join(`chat_${applicationId}`);
      console.log(`💬 User ${user.userId} đã vào phòng chat: ${applicationId}`);
    });

    /**
     * Sự kiện: Rời phòng chat.
     */
    socket.on('leave_chat', (applicationId: string) => {
      socket.leave(`chat_${applicationId}`);
    });

    /**
     * Sự kiện: Gửi tin nhắn mới trong phòng chat.
     * Tin nhắn được lưu vào DB rồi phát lại cho mọi người trong phòng.
     */
    socket.on('send_message', async (data: {
      applicationId: string;
      receiverId: string;
      content: string;
    }) => {
      try {
        // 1. Lưu tin nhắn vào DB
        const message = await prisma.message.create({
          data: {
            senderId: user.userId,
            receiverId: data.receiverId,
            applicationId: data.applicationId,
            content: data.content,
          },
          include: {
            sender: { select: { fullName: true, avatar: true } },
          },
        });

        // 2. Phát tin nhắn tới tất cả người trong phòng chat
        io.to(`chat_${data.applicationId}`).emit('new_message', message);

        // 3. Gửi thông báo cho người nhận (nếu họ không ở trong phòng chat)
        io.to(`user_${data.receiverId}`).emit('notification', {
          type: 'NEW_MESSAGE',
          message: `${message.sender.fullName} đã gửi tin nhắn cho bạn.`,
          applicationId: data.applicationId,
        });
      } catch (error) {
        console.error('Lỗi khi gửi tin nhắn qua Socket:', error);
        socket.emit('error', { message: 'Không thể gửi tin nhắn.' });
      }
    });

    /**
     * Sự kiện: Đánh dấu tin nhắn đã đọc.
     */
    socket.on('mark_read', async (applicationId: string) => {
      try {
        await prisma.message.updateMany({
          where: {
            applicationId,
            receiverId: user.userId,
            isRead: false,
          },
          data: { isRead: true },
        });
      } catch (error) {
        console.error('Lỗi khi đánh dấu đã đọc:', error);
      }
    });

    /**
     * =========================================================================
     * PHÒNG PHỎNG VẤN TRỰC TUYẾN (WEBRTC SIGNALING & REALTIME ROOM PRESENCE)
     * =========================================================================
     */
    const removeSocketFromInterviewRoom = (applicationId: string) => {
      const roomMap = interviewRooms.get(applicationId);
      if (!roomMap || !roomMap.has(socket.id)) return;
      roomMap.delete(socket.id);
      if (roomMap.size === 0) {
        interviewRooms.delete(applicationId);
      }
      socket.leave(`interview_${applicationId}`);
      io.to(`interview_${applicationId}`).emit('interview_peer_left', {
        socketId: socket.id,
        userId: user.userId,
        applicationId,
      });
    };

    socket.on(
      'join_interview_room',
      async (payload: {
        applicationId: string;
        micOn?: boolean;
        camOn?: boolean;
        screenSharing?: boolean;
      }) => {
        try {
          const applicationId = String(payload?.applicationId || '');
          if (!applicationId) return;

          const application = await prisma.application.findUnique({
            where: { id: applicationId },
            include: {
              job: { select: { title: true, postedBy: true } },
            },
          });

          if (!application) {
            socket.emit('interview_room_error', {
              message: 'Không tìm thấy phòng phỏng vấn trực tuyến này.',
            });
            return;
          }

          const isCandidate = application.candidateId === user.userId;
          const isRecruiter = application.job.postedBy === user.userId;
          const isAdmin = (user.roleName || user.role) === 'ADMIN';

          if (!isCandidate && !isRecruiter && !isAdmin) {
            socket.emit('interview_room_error', {
              message: 'Bạn không có quyền tham gia phòng phỏng vấn này.',
            });
            return;
          }

          const dbUser = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { fullName: true },
          });

          const participant: InterviewParticipant = {
            socketId: socket.id,
            userId: user.userId,
            fullName: dbUser?.fullName || (isRecruiter ? 'Nhà tuyển dụng' : 'Ứng viên'),
            role: isRecruiter ? 'RECRUITER' : isCandidate ? 'CANDIDATE' : 'ADMIN',
            micOn: payload?.micOn !== false,
            camOn: payload?.camOn !== false,
            screenSharing: Boolean(payload?.screenSharing),
          };

          let roomMap = interviewRooms.get(applicationId);
          if (!roomMap) {
            roomMap = new Map<string, InterviewParticipant>();
            interviewRooms.set(applicationId, roomMap);
          }

          const existingPeers = Array.from(roomMap.values()).filter(
            (p) => p.socketId !== socket.id
          );

          roomMap.set(socket.id, participant);
          socket.join(`interview_${applicationId}`);

          // Gửi danh sách thành viên đang có mặt cho người vừa vào (người mới sẽ chủ động tạo WebRTC Offer)
          socket.emit('interview_room_participants', {
            applicationId,
            participants: existingPeers,
          });

          // Báo cho người đang ở trong phòng biết đối phương vừa vào
          socket.to(`interview_${applicationId}`).emit('interview_peer_joined', {
            applicationId,
            participant,
          });

          // Nếu đối phương chưa vào phòng, gửi thông báo chuông realtime để họ vào ngay
          const otherPartyPresent = existingPeers.some((p) => p.userId !== user.userId);
          if (!otherPartyPresent) {
            if (isRecruiter) {
              io.emit(`notification_candidate_${application.candidateId}`, {
                type: 'INTERVIEW_CALL_STARTED',
                message: `🎥 Nhà tuyển dụng đã mở phòng phỏng vấn Online cho vị trí "${application.job.title}". Bấm vào Lịch phỏng vấn để tham gia!`,
                applicationId,
              });
            } else if (isCandidate) {
              io.emit(`notification_recruiter_${application.job.postedBy}`, {
                type: 'INTERVIEW_CALL_STARTED',
                message: `🎥 Ứng viên ${participant.fullName} đã vào phòng phỏng vấn Online vị trí "${application.job.title}".`,
                applicationId,
              });
            }
          }
        } catch (err) {
          console.error('Lỗi join_interview_room:', err);
        }
      }
    );

    socket.on('leave_interview_room', (data: { applicationId: string }) => {
      if (data?.applicationId) {
        removeSocketFromInterviewRoom(String(data.applicationId));
      }
    });

    socket.on(
      'webrtc_offer',
      (data: { targetSocketId: string; applicationId: string; sdp: any }) => {
        if (!data?.targetSocketId || !data?.sdp) return;
        io.to(data.targetSocketId).emit('webrtc_offer', {
          fromSocketId: socket.id,
          fromUserId: user.userId,
          applicationId: data.applicationId,
          sdp: data.sdp,
        });
      }
    );

    socket.on(
      'webrtc_answer',
      (data: { targetSocketId: string; applicationId: string; sdp: any }) => {
        if (!data?.targetSocketId || !data?.sdp) return;
        io.to(data.targetSocketId).emit('webrtc_answer', {
          fromSocketId: socket.id,
          fromUserId: user.userId,
          applicationId: data.applicationId,
          sdp: data.sdp,
        });
      }
    );

    socket.on(
      'webrtc_ice_candidate',
      (data: { targetSocketId: string; applicationId: string; candidate: any }) => {
        if (!data?.targetSocketId || !data?.candidate) return;
        io.to(data.targetSocketId).emit('webrtc_ice_candidate', {
          fromSocketId: socket.id,
          applicationId: data.applicationId,
          candidate: data.candidate,
        });
      }
    );

    socket.on(
      'interview_media_state',
      (data: {
        applicationId: string;
        micOn: boolean;
        camOn: boolean;
        screenSharing: boolean;
      }) => {
        const roomMap = interviewRooms.get(String(data?.applicationId || ''));
        const existing = roomMap?.get(socket.id);
        if (existing) {
          existing.micOn = Boolean(data.micOn);
          existing.camOn = Boolean(data.camOn);
          existing.screenSharing = Boolean(data.screenSharing);
        }
        socket.to(`interview_${data?.applicationId}`).emit('interview_media_state', {
          socketId: socket.id,
          userId: user.userId,
          micOn: Boolean(data?.micOn),
          camOn: Boolean(data?.camOn),
          screenSharing: Boolean(data?.screenSharing),
        });
      }
    );

    /**
     * Sự kiện: Ngắt kết nối Socket.
     */
    socket.on('disconnect', () => {
      for (const [appId, roomMap] of interviewRooms.entries()) {
        if (roomMap.has(socket.id)) {
          removeSocketFromInterviewRoom(appId);
        }
      }
      console.log(`❌ User "${user.userId}" đã ngắt kết nối.`);
    });
  });
};
