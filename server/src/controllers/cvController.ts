import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../utils/prisma';
import { uploadPdfWithFallback } from '../utils/cloudinary';

const safeUnlink = async (filePath: string) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (_) {}
};

/**
 * Controller quản lý hồ sơ CV (Curriculum Vitae).
 * Lưu trữ file PDF cục bộ tại server (thư mục uploads/).
 */

/**
 * Tạo CV mới (Lưu dữ liệu dạng JSON vào DB).
 */
export const createCV = async (req: any, res: Response) => {
  try {
    const { title, template, data } = req.body;
    const userId = req.user.userId;

    // Mỗi tài khoản Ứng viên chỉ sử dụng 1 CV chính duy nhất: nếu đã có thì cập nhật CV đó
    const existingCV = await prisma.cV.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    if (existingCV) {
      const updatedCV = await prisma.cV.update({
        where: { id: existingCV.id },
        data: {
          title,
          template: template || existingCV.template || 'Modern',
          data,
          updatedAt: new Date(),
        },
      });
      return res.status(200).json({
        message: 'Đã cập nhật CV cá nhân thành công.',
        cv: updatedCV,
      });
    }

    const newCV = await prisma.cV.create({
      data: {
        userId,
        title,
        template: template || 'Modern',
        data,
      },
    });

    return res.status(201).json({
      message: 'Tạo CV thành công.',
      cv: newCV,
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo CV:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi tạo CV.' });
  }
};

/**
 * Cập nhật thông tin CV đã có.
 */
export const updateCV = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { title, template, data } = req.body;
    const userId = req.user.userId;

    const cv = await prisma.cV.findFirst({ where: { id, userId } });
    if (!cv) {
      return res.status(404).json({ message: 'Không tìm thấy CV hoặc bạn không có quyền chỉnh sửa.' });
    }

    const updated = await prisma.cV.update({
      where: { id },
      data: { title, template, data, updatedAt: new Date() },
    });

    return res.json({ message: 'Cập nhật CV thành công.', cv: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Lấy danh sách CV của Ứng viên đang đăng nhập.
 */
export const getMyCVs = async (req: any, res: Response) => {
  try {
    const cvs = await prisma.cV.findMany({
      where: { userId: req.user.userId },
      orderBy: { updatedAt: 'desc' },
    });
    // Đảm bảo 1 tài khoản chỉ hiển thị 1 CV chính duy nhất
    return res.json({ cvs: cvs.slice(0, 1) });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Lấy chi tiết một CV theo ID.
 */
export const getCVById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const cv = await prisma.cV.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, email: true, avatar: true } } },
    });

    if (!cv) {
      return res.status(404).json({ message: 'Không tìm thấy CV.' });
    }
    return res.json({ cv });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Upload file PDF và lưu URL cục bộ.
 * @route POST /api/cvs/:id/upload-pdf
 */
export const uploadCVPdf = async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const cv = await prisma.cV.findFirst({ where: { id, userId } });
    if (!cv) {
      if (req.file) await safeUnlink(req.file.path);
      return res.status(404).json({ message: 'Không tìm thấy CV.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng đính kèm file PDF.' });
    }

    const pdfUrl = await uploadPdfWithFallback(req, 'cvconnect/cvs');

    const updatedCV = await prisma.cV.update({
      where: { id },
      data: { pdfUrl },
    });

    return res.json({
      message: 'Upload hồ sơ PDF thành công!',
      pdfUrl,
      cv: updatedCV,
    });
  } catch (error: any) {
    if (req.file?.path) {
      await safeUnlink(req.file.path);
    }
    console.error('Lỗi khi upload PDF:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi tải tệp PDF.' });
  }
};

/**
 * Xoá CV.
 */
export const deleteCV = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const cv = await prisma.cV.findFirst({ where: { id, userId } });
    if (!cv) {
      return res.status(404).json({ message: 'Không tìm thấy CV.' });
    }

    // Xóa file vật lý trước khi xóa record
    if (cv.pdfUrl) {
      const fileName = cv.pdfUrl.split('/').pop();
      if (fileName) {
        const filePath = path.join(__dirname, '..', '..', 'uploads', fileName);
        await safeUnlink(filePath);
      }
    }

    // Gỡ liên kết CV khỏi các đơn ứng tuyển đã nộp trước khi xóa bản ghi CV để tránh lỗi khóa ngoại
    await prisma.$transaction([
      prisma.application.updateMany({
        where: { cvId: id },
        data: { cvId: null },
      }),
      prisma.cV.delete({ where: { id } }),
    ]);
    return res.json({ message: 'Đã xoá CV thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};
