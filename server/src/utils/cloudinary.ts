import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import prisma from './prisma';
import { ensureExtraTables } from './dbExtraTables';

dotenv.config();

// Cấu hình Cloudinary
const getCloudinaryClient = () => {
  cloudinary.config({
    cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  });
  return cloudinary;
};

/**
 * Kiểm tra xem biến môi trường Cloudinary đã được cấu hình đầy đủ hay chưa
 */
export const isCloudinaryConfigured = (): boolean => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  return Boolean(
    cloudName &&
      apiKey &&
      apiSecret &&
      !cloudName.includes('your_') &&
      !apiKey.includes('your_')
  );
};

/**
 * Lưu bản sao file PDF vào PostgreSQL để không bị mất khi Render Free ngủ / khởi động lại
 */
export const savePdfToDatabaseFallback = async (filePath: string, filename: string) => {
  try {
    await ensureExtraTables();
    const buffer = await fs.promises.readFile(filePath);
    await prisma.$executeRawUnsafe(
      `INSERT INTO uploaded_files (filename, mime_type, content, created_at)
       VALUES ($1, 'application/pdf', $2, NOW())
       ON CONFLICT (filename) DO UPDATE SET content = EXCLUDED.content, created_at = NOW()`,
      filename,
      buffer
    );
  } catch (err) {
    console.warn('⚠️ Không thể lưu bản sao dự phòng PDF vào PostgreSQL:', err);
  }
};

/**
 * Upload một file cục bộ lên Cloudinary
 */
export const uploadToCloudinary = async (filePath: string, folder: string) => {
  const client = getCloudinaryClient();
  try {
    const result = await client.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error('❌ Lỗi Upload Cloudinary:', error);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

/**
 * Upload PDF thông minh:
 * 1. Luôn sao lưu vào PostgreSQL trước để đảm bảo xem/tải 100% không bao giờ lỗi 404/401.
 * 2. Nếu có cấu hình Cloudinary: đẩy file lên Cloudinary Media Library.
 *    - Kiểm tra nhanh xem link Cloudinary có cho phép xem công khai (HTTP 200) không
 *      (một số tài khoản Cloudinary Free mới tạo mặc định chặn xem PDF công khai với lỗi 401).
 *    - Nếu HTTP 200 -> trả về link Cloudinary; nếu bị chặn 401 -> trả về link HTTPS từ server dự phòng PostgreSQL.
 */
export const uploadPdfWithFallback = async (
  req: any,
  folder: string
): Promise<string> => {
  const filePath: string = req.file.path;
  const filename: string = req.file.filename;
  const fallbackUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

  await savePdfToDatabaseFallback(filePath, filename);

  if (!isCloudinaryConfigured()) {
    return fallbackUrl;
  }

  try {
    const client = getCloudinaryClient();
    const result = await client.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    // Kiểm tra quyền truy cập công khai của link PDF trên Cloudinary
    try {
      const checkResp = await fetch(result.secure_url, { method: 'HEAD' });
      if (checkResp.ok) {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath).catch(() => {});
        }
        return result.secure_url;
      }
      console.warn(
        `⚠️ Cloudinary trả về HTTP ${checkResp.status} khi mở PDF công khai — chuyển sang link dự phòng HTTPS của hệ thống.`
      );
    } catch (_) {
      // Nếu không kiểm tra được mạng thì dùng link dự phòng an toàn
    }

    return fallbackUrl;
  } catch (err) {
    console.warn('⚠️ Upload PDF lên Cloudinary không thành công, dùng bản lưu PostgreSQL:', err);
    return fallbackUrl;
  }
};

export default cloudinary;
