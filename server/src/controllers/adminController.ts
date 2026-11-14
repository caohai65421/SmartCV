import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Controller dành cho Quản trị viên (Admin).
 */

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        avatar: true,
        roleId: true,
        role: true,
        company: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { roleId: role.id },
      include: { role: true },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return res.json({
      message: `Đã cập nhật vai trò thành "${roleName}" thành công.`,
      user: userWithoutPassword,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const deleteUser = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?.userId === id) {
      return res.status(400).json({ message: 'Bạn không thể tự xoá tài khoản Admin đang đăng nhập.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Tìm tất cả tin tuyển dụng do user này đăng (nếu là Recruiter)
      const userJobs = await tx.job.findMany({
        where: { postedBy: id },
        select: { id: true },
      });
      const jobIds = userJobs.map((j) => j.id);

      // 2. Tìm tất cả đơn ứng tuyển liên quan tới user (ứng viên nộp hoặc nộp vào job của user)
      const relatedApps = await tx.application.findMany({
        where: {
          OR: [
            { candidateId: id },
            ...(jobIds.length > 0 ? [{ jobId: { in: jobIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const appIds = relatedApps.map((a) => a.id);

      // 3. Xóa tin nhắn liên quan
      await tx.message.deleteMany({
        where: {
          OR: [
            { senderId: id },
            { receiverId: id },
            ...(appIds.length > 0 ? [{ applicationId: { in: appIds } }] : []),
          ],
        },
      });

      // 4. Xóa các đơn ứng tuyển liên quan
      if (appIds.length > 0) {
        await tx.application.deleteMany({
          where: { id: { in: appIds } },
        });
      }

      // 5. Gỡ liên kết CV của user (nếu còn tham chiếu) rồi xóa CV
      const userCVs = await tx.cV.findMany({
        where: { userId: id },
        select: { id: true },
      });
      const cvIds = userCVs.map((c) => c.id);
      if (cvIds.length > 0) {
        await tx.application.updateMany({
          where: { cvId: { in: cvIds } },
          data: { cvId: null },
        });
        await tx.cV.deleteMany({ where: { userId: id } });
      }

      // 6. Xóa các Job và Company của user (nếu có)
      if (jobIds.length > 0) {
        await tx.job.deleteMany({ where: { postedBy: id } });
      }
      await tx.company.deleteMany({ where: { recruiterId: id } });

      // 7. Xóa tài khoản người dùng
      await tx.user.delete({ where: { id } });
    });

    return res.json({ message: 'Đã xoá người dùng và dữ liệu liên quan thành công.' });
  } catch (error) {
    console.error('Lỗi xoá người dùng:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi xoá người dùng.' });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalCVs,
      totalJobs,
      totalApplications,
      totalCompanies,
      usersByRole,
      applications,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.cV.count(),
      prisma.job.count(),
      prisma.application.count(),
      prisma.company.count(),
      prisma.user.groupBy({
        by: ['roleId'],
        _count: { id: true },
      }),
      prisma.application.findMany({
        select: {
          id: true,
          jobId: true,
          candidateId: true,
          status: true,
          appliedDate: true,
        },
        orderBy: { appliedDate: 'desc' },
      }),
    ]);

    return res.json({
      stats: {
        totalUsers,
        totalCVs,
        totalJobs,
        totalApplications,
        totalCompanies,
        usersByRole,
        applications,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const adminGetAllJobs = async (req: Request, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      include: {
        company: true,
        author: { select: { fullName: true, email: true } },
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

export const adminDeleteJob = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      const apps = await tx.application.findMany({
        where: { jobId: id },
        select: { id: true },
      });
      const appIds = apps.map((a) => a.id);
      if (appIds.length > 0) {
        await tx.message.deleteMany({ where: { applicationId: { in: appIds } } });
        await tx.application.deleteMany({ where: { jobId: id } });
      }
      await tx.job.delete({ where: { id } });
    });
    return res.json({ message: 'Đã xoá tin tuyển dụng thành công.' });
  } catch (error) {
    console.error('Lỗi xoá tin tuyển dụng:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi xoá tin tuyển dụng.' });
  }
};

/**
 * Admin cập nhật trạng thái tin tuyển dụng (OPEN/CLOSED)
 */
export const adminUpdateJobStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // OPEN hoặc CLOSED

    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái tin tuyển dụng không hợp lệ.' });
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data: { status }
    });

    return res.json({ message: 'Cập nhật trạng thái tin thành công.', job: updatedJob });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Lấy tất cả CV trong hệ thống
 */
export const adminGetAllCVs = async (req: Request, res: Response) => {
  try {
    const cvs = await prisma.cV.findMany({
      include: {
        user: { select: { fullName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ cvs });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Xóa CV bất kỳ
 */
export const adminDeleteCV = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.application.updateMany({
        where: { cvId: id },
        data: { cvId: null },
      }),
      prisma.cV.delete({ where: { id } }),
    ]);
    return res.json({ message: 'Đã xoá CV thành công.' });
  } catch (error) {
    console.error('Lỗi xoá CV:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi xoá CV.' });
  }
};
