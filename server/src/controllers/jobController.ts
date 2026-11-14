import { Request, Response } from 'express';
import prisma from '../utils/prisma';

/**
 * Controller xử lý các tin tuyển dụng (Jobs).
 */
export const createJob = async (req: any, res: Response) => {
  try {
    const { 
      title, 
      description, 
      requirements, 
      salary, 
      location, 
      deadline, 
      requireCV 
    } = req.body;

    const recruiterId = req.user.userId;

    // 1. Kiểm tra xem Nhà tuyển dụng đã có Công ty chưa; nếu chưa có thì khởi tạo mặc định từ tài khoản
    let company = await prisma.company.findUnique({
      where: { recruiterId },
    });

    if (!company) {
      const recruiter = await prisma.user.findUnique({
        where: { id: recruiterId },
        select: { fullName: true },
      });
      company = await prisma.company.create({
        data: {
          name: recruiter?.fullName ? `Doanh nghiệp của ${recruiter.fullName}` : 'Doanh nghiệp tuyển dụng',
          location: location || 'Hà Nội',
          recruiterId,
        },
      });
    }

    // 2. Tạo tin tuyển dụng mới
    const newJob = await prisma.job.create({
      data: {
        title,
        description,
        requirements: requirements || {}, // Có thể là JSON array hoặc object
        salary,
        location,
        deadline: deadline ? new Date(deadline) : null,
        companyId: company.id,
        postedBy: recruiterId,
        requireCV: requireCV !== undefined ? requireCV : true, // Tận dụng field requireCV
        status: 'OPEN',
      },
    });

    return res.status(201).json({
      message: 'Đăng tin tuyển dụng thành công.',
      job: newJob,
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo tin tuyển dụng:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi đăng tin.' });
  }
};

/**
 * Lấy tất cả tin tuyển dụng công khai cho Ứng viên (Candidate)
 */
export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const { keyword, location } = req.query;

    const keywordList = keyword
      ? (keyword as string).split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const locationParts = location
      ? (location as string).split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    // Nếu ứng viên chọn tới cấp Phường/Xã (3 cấp: Phường, Quận, Tỉnh), tìm các việc làm khớp cả chuỗi hoặc khớp cấp Quận, Tỉnh
    const districtProvinceQuery =
      locationParts.length >= 2 ? locationParts.slice(-2).join(', ') : (location as string);

    const andConditions: any[] = [{ status: 'OPEN' }];

    if (keywordList.length > 0) {
      andConditions.push({
        OR: keywordList.flatMap((kw) => [
          { title: { contains: kw, mode: 'insensitive' } },
          { description: { contains: kw, mode: 'insensitive' } },
        ]),
      });
    }

    if (location) {
      andConditions.push({
        OR: [
          { location: { contains: location as string, mode: 'insensitive' } },
          { location: { contains: districtProvinceQuery, mode: 'insensitive' } },
        ],
      });
    }

    const jobs = await prisma.job.findMany({
      where: {
        AND: andConditions,
      },
      include: {
        company: true, // Bao gồm thông tin công ty để hiển thị Logo
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tải danh sách tin.' });
  }
};

/**
 * Lấy chi tiết tin tuyển dụng theo ID
 */
export const getJobById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        company: true,
        author: {
          select: { fullName: true, email: true, avatar: true }
        }
      },
    });

    if (!job) {
      return res.status(404).json({ message: 'Không tìm thấy tin tuyển dụng.' });
    }

    return res.json({ job });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi tải chi tiết tin.' });
  }
};

/**
 * Lấy danh sách tin đã đăng của riêng Nhà tuyển dụng hiện tại
 */
export const getRecruiterJobs = async (req: any, res: Response) => {
  try {
    const jobs = await prisma.job.findMany({
      where: { postedBy: req.user.userId },
      include: {
        company: true,
        _count: {
          select: { applications: true } // Đếm số đơn ứng tuyển cho mỗi job
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ jobs });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi hệ thống.' });
  }
};

/**
 * Nhà tuyển dụng: Chỉnh sửa nội dung & gia hạn Hạn nộp hồ sơ (Deadline) cho vị trí tuyển dụng đã đăng
 */
export const updateRecruiterJob = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      requirements,
      salary,
      location,
      deadline,
      requireCV,
    } = req.body;

    const existing = await prisma.job.findFirst({
      where: { id, postedBy: req.user.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy vị trí tuyển dụng của bạn.' });
    }

    if (!title?.trim() || !description?.trim() || !location?.trim()) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ tiêu đề, địa điểm và mô tả công việc.' });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: {
        title: title.trim(),
        description: description.trim(),
        requirements: requirements !== undefined ? requirements : existing.requirements,
        salary: salary !== undefined ? salary : existing.salary,
        location: location.trim(),
        deadline: deadline ? new Date(deadline) : null,
        requireCV: requireCV !== undefined ? Boolean(requireCV) : existing.requireCV,
      },
      include: {
        company: true,
        _count: { select: { applications: true } },
      },
    });

    return res.json({
      message: 'Đã cập nhật nội dung tin tuyển dụng thành công.',
      job: updated,
    });
  } catch (error) {
    console.error('Lỗi cập nhật tin tuyển dụng:', error);
    return res.status(500).json({ message: 'Lỗi hệ thống khi cập nhật tin tuyển dụng.' });
  }
};

/**
 * Nhà tuyển dụng: Đóng hoặc Mở lại vị trí tuyển dụng của chính mình
 */
export const updateRecruiterJobStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'OPEN' | 'CLOSED'

    if (!['OPEN', 'CLOSED'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });
    }

    const existing = await prisma.job.findFirst({
      where: { id, postedBy: req.user.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy vị trí tuyển dụng của bạn.' });
    }

    const updated = await prisma.job.update({
      where: { id },
      data: { status },
    });

    return res.json({ message: 'Đã cập nhật trạng thái vị trí tuyển dụng.', job: updated });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái vị trí.' });
  }
};

/**
 * Nhà tuyển dụng: Xóa vị trí tuyển dụng của chính mình
 */
export const deleteRecruiterJob = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.job.findFirst({
      where: { id, postedBy: req.user.userId },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy vị trí tuyển dụng của bạn.' });
    }

    // Xóa các tin nhắn và đơn ứng tuyển liên quan trước khi xóa job
    const apps = await prisma.application.findMany({ where: { jobId: id } });
    for (const app of apps) {
      await prisma.message.deleteMany({ where: { applicationId: app.id } });
    }
    await prisma.application.deleteMany({ where: { jobId: id } });
    await prisma.job.delete({ where: { id } });

    return res.json({ message: 'Đã xóa vị trí tuyển dụng thành công.' });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi khi xóa vị trí tuyển dụng.' });
  }
};
