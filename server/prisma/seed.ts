import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ensureExtraTables } from '../src/utils/dbExtraTables';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo & chuẩn hóa dữ liệu thực tế hệ thống SmartCV (Seed) ---');
  await ensureExtraTables();

  // 1. Khởi tạo các Vai trò (Roles)
  const roleNames = ['CANDIDATE', 'RECRUITER', 'ADMIN'];
  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const roles = await prisma.role.findMany();
  const getRoleId = (name: string) => roles.find((r) => r.name === name)?.id || 1;
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 2. Tài khoản Quản trị viên (Admin)
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { roleId: getRoleId('ADMIN') },
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      fullName: 'Hệ Thống Admin',
      roleId: getRoleId('ADMIN'),
      createdAt: new Date('2026-04-10T08:00:00.000Z'),
    },
  });

  // =========================================================================
  // 3. KHỞI TẠO 3 NHÀ TUYỂN DỤNG & DOANH NGHIỆP LỚN (FPT, VIETTEL, VNG)
  // =========================================================================
  const recruiterFpt = await prisma.user.upsert({
    where: { email: 'recruiter@example.com' },
    update: {
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-05-12T08:30:00.000Z'),
    },
    create: {
      email: 'recruiter@example.com',
      password: hashedPassword,
      fullName: 'Trần Nhà Tuyển Dụng',
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-05-12T08:30:00.000Z'),
    },
  });

  const recruiterViettel = await prisma.user.upsert({
    where: { email: 'hr.viettel@smartcv.vn' },
    update: {
      fullName: 'Nguyễn Hoàng Long',
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-07-10T09:00:00.000Z'),
    },
    create: {
      email: 'hr.viettel@smartcv.vn',
      password: hashedPassword,
      fullName: 'Nguyễn Hoàng Long',
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-07-10T09:00:00.000Z'),
    },
  });

  const recruiterVng = await prisma.user.upsert({
    where: { email: 'talent.vng@smartcv.vn' },
    update: {
      fullName: 'Lê Thu Trang',
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-09-05T09:15:00.000Z'),
    },
    create: {
      email: 'talent.vng@smartcv.vn',
      password: hashedPassword,
      fullName: 'Lê Thu Trang',
      roleId: getRoleId('RECRUITER'),
      createdAt: new Date('2026-09-05T09:15:00.000Z'),
    },
  });

  // Hồ sơ công ty 1: FPT Software
  const fptDescription = JSON.stringify({
    industry: 'Công nghệ thông tin & Phần mềm (CNTT)',
    scale: 'Trên 1.000 nhân sự',
    overview:
      'Công Ty Công Nghệ FPT Software là đơn vị công nghệ hàng đầu Việt Nam chuyên cung cấp giải pháp chuyển đổi số, phát triển phần mềm doanh nghiệp, điện toán đám mây và trí tuệ nhân tạo cho đối tác tại Nhật Bản, Mỹ, Châu Âu và khu vực Châu Á - Thái Bình Dương.',
    coreValues: [
      'Chất lượng chuẩn quốc tế trong từng dự án phần mềm.',
      'Đổi mới sáng tạo và làm chủ công nghệ hiện đại.',
      'Lấy con người làm trọng tâm, lộ trình thăng tiến minh bạch.',
    ],
    services: [
      'Phát triển ứng dụng Web & Mobile quy mô lớn',
      'Tư vấn chuyển đổi số & Kiến trúc Đám mây (AWS / GCP / Azure)',
      'Giải pháp Trí tuệ nhân tạo & Dữ liệu lớn',
    ],
    team: 'Môi trường làm việc trẻ trung, cởi mở, hỗ trợ đào tạo chứng chỉ quốc tế hàng năm.',
    province: 'Quận Cầu Giấy, Hà Nội',
    detailAddress: 'Tòa nhà FPT, Số 10 Phạm Văn Bạch, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
  });

  const companyFpt = await prisma.company.upsert({
    where: { recruiterId: recruiterFpt.id },
    update: {
      name: 'Công Ty Công Nghệ FPT Software',
      description: fptDescription,
      location: 'Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội',
      website: 'https://fptsoftware.com',
    },
    create: {
      name: 'Công Ty Công Nghệ FPT Software',
      description: fptDescription,
      location: 'Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội',
      website: 'https://fptsoftware.com',
      recruiterId: recruiterFpt.id,
    },
  });

  // Hồ sơ công ty 2: Viettel Digital
  const viettelDescription = JSON.stringify({
    industry: 'Công nghệ số, Fintech & Trí tuệ nhân tạo',
    scale: '500 - 1.000 nhân sự',
    overview:
      'Tổng Công Ty Dịch Vụ Số Viettel (Viettel Digital) phát triển hệ sinh thái tài chính số Viettel Money, nền tảng dữ liệu lớn và các sản phẩm AI phục vụ hàng chục triệu người dùng trên toàn quốc.',
    coreValues: [
      'Tiên phong kiến tạo xã hội số tại Việt Nam.',
      'Kỷ luật kỹ thuật cao, hệ thống chịu tải hàng triệu giao dịch/ngày.',
      'Đãi ngộ cạnh tranh, thưởng hiệu quả dự án xứng đáng.',
    ],
    services: [
      'Hệ sinh thái Tài chính số & Thanh toán điện tử',
      'Nền tảng Trí tuệ nhân tạo & Xử lý ngôn ngữ tự nhiên',
      'Hạ tầng Microservices hiệu năng cao',
    ],
    team: 'Đội ngũ kỹ sư giàu kinh nghiệm trong lĩnh vực Fintech, AI và Bảo mật hệ thống.',
    province: 'Quận Cầu Giấy, Hà Nội',
    detailAddress:
      'Tòa nhà Viettel, Lô D26 Khu đô thị mới Cầu Giấy, Phường Yên Hòa, Quận Cầu Giấy, Hà Nội',
  });

  const companyViettel = await prisma.company.upsert({
    where: { recruiterId: recruiterViettel.id },
    update: {
      name: 'Tổng Công Ty Dịch Vụ Số Viettel (Viettel Digital)',
      description: viettelDescription,
      location: 'Lô D26 Khu đô thị mới Cầu Giấy, Quận Cầu Giấy, Hà Nội',
      website: 'https://vietteldigital.com.vn',
    },
    create: {
      name: 'Tổng Công Ty Dịch Vụ Số Viettel (Viettel Digital)',
      description: viettelDescription,
      location: 'Lô D26 Khu đô thị mới Cầu Giấy, Quận Cầu Giấy, Hà Nội',
      website: 'https://vietteldigital.com.vn',
      recruiterId: recruiterViettel.id,
    },
  });

  // Hồ sơ công ty 3: VNG Corporation
  const vngDescription = JSON.stringify({
    industry: 'Internet, Nền tảng số & Điện toán đám mây',
    scale: 'Trên 1.000 nhân sự',
    overview:
      'Công Ty Cổ Phần VNG (VNG Corporation) là doanh nghiệp công nghệ kỳ lân của Việt Nam, sở hữu hệ sinh thái sản phẩm phục vụ hàng chục triệu người dùng như Zalo, ZaloPay, VNG Cloud và các nền tảng giải trí trực tuyến.',
    coreValues: [
      'Đón nhận thách thức, cải tiến sản phẩm liên tục.',
      'Văn hóa làm việc phẳng, tôn trọng sự chủ động cá nhân.',
      'Không gian làm việc hiện đại chuẩn Campus công nghệ quốc tế.',
    ],
    services: [
      'Nền tảng nhắn tin & kết nối Zalo Ecosystem',
      'Hạ tầng đám mây VNG Cloud & SRE',
      'Ứng dụng di động đa nền tảng hiệu năng cao',
    ],
    team: 'Quy tụ các chuyên gia sản phẩm, kỹ sư Mobile, Cloud và UI/UX hàng đầu tại TP.HCM.',
    province: 'Quận 7, TP. Hồ Chí Minh',
    detailAddress:
      'VNG Campus, Khu chế xuất Tân Thuận, Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh',
  });

  const companyVng = await prisma.company.upsert({
    where: { recruiterId: recruiterVng.id },
    update: {
      name: 'Công Ty Cổ Phần VNG (VNG Corporation)',
      description: vngDescription,
      location: 'VNG Campus, Quận 7, TP. Hồ Chí Minh',
      website: 'https://vng.com.vn',
    },
    create: {
      name: 'Công Ty Cổ Phần VNG (VNG Corporation)',
      description: vngDescription,
      location: 'VNG Campus, Quận 7, TP. Hồ Chí Minh',
      website: 'https://vng.com.vn',
      recruiterId: recruiterVng.id,
    },
  });

  // =========================================================================
  // 4. KHỞI TẠO 14 TIN TUYỂN DỤNG PHÂN BỔ ĐỀU THEO THÁNG TRONG NĂM 2026
  // =========================================================================
  const futureDeadline = new Date('2026-12-31T23:59:59.000Z');

  const upsertJobByTitle = async (params: {
    title: string;
    description: string;
    requirements: string[];
    salary: string;
    location: string;
    requireCV: boolean;
    companyId: string;
    postedBy: string;
    createdAt: Date;
  }) => {
    const existing = await prisma.job.findFirst({
      where: { title: params.title, companyId: params.companyId },
    });
    if (existing) {
      return prisma.job.update({
        where: { id: existing.id },
        data: {
          description: params.description,
          requirements: params.requirements,
          salary: params.salary,
          location: params.location,
          requireCV: params.requireCV,
          status: 'OPEN',
          deadline: futureDeadline,
          createdAt: params.createdAt,
        },
      });
    }
    return prisma.job.create({
      data: {
        title: params.title,
        description: params.description,
        requirements: params.requirements,
        salary: params.salary,
        location: params.location,
        requireCV: params.requireCV,
        status: 'OPEN',
        deadline: futureDeadline,
        companyId: params.companyId,
        postedBy: params.postedBy,
        createdAt: params.createdAt,
      },
    });
  };

  // --- 8 vị trí của FPT Software ---
  const jobFptFrontend = await upsertJobByTitle({
    title: 'Senior Frontend Developer (React / Next.js)',
    description:
      'Tham gia thiết kế kiến trúc giao diện và phát triển các nền tảng Web doanh nghiệp quy mô lớn bằng React 18, Next.js và TypeScript. Phối hợp chặt chẽ cùng đội ngũ Product & Backend tối ưu hiệu năng trải nghiệm người dùng.',
    requirements: [
      'Từ 2.5 - 3+ năm kinh nghiệm phát triển Web với React và Next.js',
      'Nắm vững TypeScript, HTML5/CSS3, Tailwind CSS và quản lý State hiện đại',
      'Có kinh nghiệm tối ưu hiệu năng tải trang, viết code sạch dễ bảo trì',
    ],
    salary: '25 - 40 triệu',
    location: 'Quận Cầu Giấy, Hà Nội',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-05-20T09:00:00.000Z'),
  });

  const jobFptBackend = await upsertJobByTitle({
    title: 'Backend Node.js / Express Engineer',
    description:
      'Phát triển hệ thống RESTful API, WebSocket thời gian thực và kiến trúc Microservices phục vụ hàng trăm nghìn người dùng. Tối ưu truy vấn cơ sở dữ liệu PostgreSQL và bộ nhớ đệm Redis.',
    requirements: [
      'Từ 2+ năm kinh nghiệm làm việc với Node.js, Express hoặc NestJS',
      'Thành thạo cơ sở dữ liệu quan hệ PostgreSQL, Prisma ORM và Redis',
      'Hiểu biết về Docker, bảo mật API và quy trình CI/CD',
    ],
    salary: '20 - 35 triệu',
    location: 'Quận Đống Đa, Hà Nội',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-06-14T09:00:00.000Z'),
  });

  const jobFptUiUx = await upsertJobByTitle({
    title: 'UI/UX Product Designer',
    description:
      'Nghiên cứu hành vi người dùng (User Research), xây dựng User Flow, Wireframe, Prototype tương tác và phát triển hệ thống Design System đồng bộ trên Figma cho các sản phẩm Web/Mobile.',
    requirements: [
      'Sử dụng thành thạo Figma, Auto Layout và xây dựng Design System / Component Library',
      'Có Portfolio các dự án thiết kế UI/UX sản phẩm số thực tế và Usability Testing',
      'Tư duy thẩm mỹ hiện đại, hiểu rõ nguyên lý thiết kế lấy người dùng làm trung tâm',
    ],
    salary: '18 - 28 triệu',
    location: 'Quận Ba Đình, Hà Nội',
    requireCV: false,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-07-12T09:00:00.000Z'),
  });

  const jobFptFresher = await upsertJobByTitle({
    title: 'Thực Tập Sinh Lập Trình Web (Fresher Web Dev)',
    description:
      'Chương trình đào tạo thực chiến On-the-Job Training dưới sự hướng dẫn trực tiếp của các Senior Tech Lead. Tham gia phát triển tính năng giao diện và RESTful API cho dự án thật.',
    requirements: [
      'Sinh viên năm cuối hoặc mới tốt nghiệp chuyên ngành CNTT / Kỹ thuật phần mềm',
      'Nắm vững nền tảng HTML, CSS, JavaScript, TypeScript, React và Git cơ bản',
      'Chủ động học hỏi, có thể tham gia tối thiểu 4 ngày/tuần',
    ],
    salary: '6 - 10 triệu',
    location: 'Quận Nam Từ Liêm, Hà Nội',
    requireCV: false,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-07-28T09:00:00.000Z'),
  });

  const jobFptPm = await upsertJobByTitle({
    title: 'Product Manager (EdTech Platform)',
    description:
      'Xây dựng tầm nhìn và lộ trình phát triển sản phẩm công nghệ giáo dục (EdTech). Viết tài liệu đặc tả PRD, phân tích dữ liệu Data hành vi học viên và điều phối tiến độ theo Agile/Scrum giữa Engineering, Design và vận hành.',
    requirements: [
      'Từ 3+ năm kinh nghiệm ở vị trí Product Owner / Product Manager mảng phần mềm',
      'Khả năng phân tích dữ liệu Data sản phẩm, viết PRD và làm việc theo Agile / Scrum',
      'Tiếng Anh giao tiếp và đọc hiểu tài liệu chuyên ngành tốt',
    ],
    salary: '35 - 55 triệu',
    location: 'Quận Hoàn Kiếm, Hà Nội',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-08-18T09:00:00.000Z'),
  });

  const jobFptFullstack = await upsertJobByTitle({
    title: 'Fullstack Web Developer',
    description:
      'Phụ trách phát triển trọn vẹn các phân hệ nghiệp vụ từ giao diện Frontend React/TypeScript đến tầng dịch vụ Backend Node.js và PostgreSQL cho khách hàng doanh nghiệp.',
    requirements: [
      'Thành thạo phát triển Fullstack cả Frontend (React, TypeScript) và Backend (Node.js)',
      'Kinh nghiệm thiết kế schema PostgreSQL và tích hợp RESTful API',
      'Làm việc nhóm hiệu quả theo mô hình Agile/Scrum',
    ],
    salary: '22 - 38 triệu',
    location: 'Quận 1, TP. Hồ Chí Minh',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-09-10T09:00:00.000Z'),
  });

  const jobFptMobile = await upsertJobByTitle({
    title: 'Mobile App Developer (Flutter / React Native)',
    description:
      'Phát triển và tối ưu hóa ứng dụng Mobile đa nền tảng trên iOS và Android bằng Flutter / Dart hoặc React Native, đảm bảo chuyển động mượt mà 60fps, tích hợp thông báo đẩy và xác thực sinh trắc học.',
    requirements: [
      'Từ 2+ năm kinh nghiệm lập trình Mobile với Flutter hoặc React Native',
      'Đã từng triển khai và phát hành ứng dụng lên App Store (iOS) và Google Play (Android)',
      'Hiểu rõ quản lý bộ nhớ, tối ưu pin và trải nghiệm người dùng di động',
    ],
    salary: '20 - 32 triệu',
    location: 'Quận 7, TP. Hồ Chí Minh',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-10-05T09:00:00.000Z'),
  });

  const jobFptDevops = await upsertJobByTitle({
    title: 'DevOps & Cloud Engineer (AWS / GCP)',
    description:
      'Thiết kế và tự động hóa quy trình CI/CD, quản trị cụm Kubernetes, giám sát hệ thống Prometheus/Grafana trên Linux và đảm bảo an toàn hạ tầng đám mây AWS/GCP.',
    requirements: [
      'Kinh nghiệm thực tế DevOps với AWS hoặc GCP, Docker và Kubernetes',
      'Thành thạo Infrastructure as Code (Terraform) và CI/CD (GitLab CI / GitHub Actions)',
      'Tư duy bảo mật hệ thống Linux và xử lý sự cố hạ tầng nhanh nhạy',
    ],
    salary: '30 - 45 triệu',
    location: 'Quận Hải Châu, Đà Nẵng',
    requireCV: true,
    companyId: companyFpt.id,
    postedBy: recruiterFpt.id,
    createdAt: new Date('2026-10-19T09:00:00.000Z'),
  });

  // --- 3 vị trí của Viettel Digital ---
  const jobViettelBackend = await upsertJobByTitle({
    title: 'Senior Backend Engineer (Node.js / Microservices)',
    description:
      'Xây dựng các dịch vụ thanh toán số Fintech chịu tải lớn theo kiến trúc Microservices cho hệ sinh thái Viettel Money, đảm bảo độ sẵn sàng 99.99% và an toàn giao dịch thời gian thực.',
    requirements: [
      '2.5+ năm kinh nghiệm phát triển Backend hệ thống phân tán với Node.js / TypeScript',
      'Thành thạo PostgreSQL, Redis, Microservices và Docker',
      'Hiểu sâu về xử lý bất đồng bộ, tối ưu độ trễ RESTful API',
    ],
    salary: '28 - 45 triệu',
    location: 'Quận Cầu Giấy, Hà Nội',
    requireCV: true,
    companyId: companyViettel.id,
    postedBy: recruiterViettel.id,
    createdAt: new Date('2026-08-08T09:00:00.000Z'),
  });

  const jobViettelAi = await upsertJobByTitle({
    title: 'Kỹ Sư Phần Mềm Fullstack & Tích Hợp AI',
    description:
      'Phát triển cổng trợ lý số thông minh phục vụ chăm sóc khách hàng tự động và phân tích dữ liệu nghiệp vụ trên nền tảng Web Fullstack hiện đại.',
    requirements: [
      'Thành thạo React, Next.js, TypeScript, Node.js và tích hợp RESTful API',
      'Có kinh nghiệm làm việc với cơ sở dữ liệu PostgreSQL và xử lý dữ liệu văn bản',
      'Tư duy sản phẩm tốt, chủ động đề xuất giải pháp kỹ thuật',
    ],
    salary: '26 - 42 triệu',
    location: 'Quận Cầu Giấy, Hà Nội',
    requireCV: true,
    companyId: companyViettel.id,
    postedBy: recruiterViettel.id,
    createdAt: new Date('2026-09-22T09:00:00.000Z'),
  });

  const jobViettelBaPm = await upsertJobByTitle({
    title: 'Product Owner / Chuyên Viên Quản Trị Sản Phẩm Số',
    description:
      'Định hình tính năng mới cho ứng dụng tài chính số Fintech, viết PRD, làm việc theo Agile/Scrum cùng đội ngũ kỹ thuật và Design (Figma) để ra mắt sản phẩm đúng tiến độ, phân tích Data tối ưu tỷ lệ giữ chân người dùng.',
    requirements: [
      'Từ 2.5+ năm kinh nghiệm Product Manager / Product Owner hoặc Senior BA mảng Fintech / SaaS',
      'Kỹ năng viết PRD rõ ràng, phân tích dữ liệu Data và làm việc theo Agile / Scrum',
      'Khả năng giao tiếp, sử dụng Figma cơ bản và điều phối đa phòng ban tốt',
    ],
    salary: '25 - 40 triệu',
    location: 'Quận Nam Từ Liêm, Hà Nội',
    requireCV: true,
    companyId: companyViettel.id,
    postedBy: recruiterViettel.id,
    createdAt: new Date('2026-10-28T09:00:00.000Z'),
  });

  // --- 3 vị trí của VNG Corporation ---
  const jobVngMobile = await upsertJobByTitle({
    title: 'Senior Mobile Developer (Flutter / iOS / Android)',
    description:
      'Tham gia phát triển các tính năng cốt lõi trên siêu ứng dụng Mobile phục vụ hàng chục triệu người dùng hàng ngày trên iOS và Android, tối ưu tốc độ khởi động và trải nghiệm mượt mà.',
    requirements: [
      '2+ năm kinh nghiệm phát triển ứng dụng Mobile (Flutter, Dart, React Native, iOS hoặc Android)',
      'Kinh nghiệm tối ưu hiệu năng ứng dụng có lượng người dùng lớn',
      'Nắm vững kiến trúc Clean Architecture, Git và CI/CD cho Mobile',
    ],
    salary: '28 - 45 triệu',
    location: 'Quận 7, TP. Hồ Chí Minh',
    requireCV: true,
    companyId: companyVng.id,
    postedBy: recruiterVng.id,
    createdAt: new Date('2026-09-18T09:00:00.000Z'),
  });

  const jobVngDesign = await upsertJobByTitle({
    title: 'Senior Product UI/UX Designer',
    description:
      'Thiết kế trải nghiệm người dùng UI/UX trực quan, tinh gọn cho hệ sinh thái sản phẩm thanh toán và kết nối cộng đồng trên nền tảng Mobile và Web.',
    requirements: [
      '2+ năm kinh nghiệm thiết kế UI/UX cho sản phẩm công nghệ (Mobile / Web)',
      'Thành thạo Figma, Wireframe, Prototype, Design System và Usability Testing',
      'Có tư duy hệ thống, User Research và khả năng phối hợp chặt chẽ với đội ngũ kỹ sư',
    ],
    salary: '22 - 35 triệu',
    location: 'Quận 7, TP. Hồ Chí Minh',
    requireCV: true,
    companyId: companyVng.id,
    postedBy: recruiterVng.id,
    createdAt: new Date('2026-11-02T09:00:00.000Z'),
  });

  const jobVngCloud = await upsertJobByTitle({
    title: 'Cloud & Site Reliability Engineer (SRE / DevOps)',
    description:
      'Vận hành và mở rộng hạ tầng đám mây quy mô lớn tại VNG Cloud, xây dựng hệ thống giám sát tự động Prometheus/Grafana và tối ưu hóa cụm Kubernetes.',
    requirements: [
      'Kinh nghiệm quản trị Linux, Docker, Kubernetes và hạ tầng Cloud (AWS/GCP)',
      'Thành thạo Terraform, tự động hóa CI/CD và kỹ thuật SRE / DevOps',
      'Chủ động trong công việc, có kỹ năng xử lý sự cố hệ thống phân tán',
    ],
    salary: '32 - 48 triệu',
    location: 'Quận 7, TP. Hồ Chí Minh',
    requireCV: true,
    companyId: companyVng.id,
    postedBy: recruiterVng.id,
    createdAt: new Date('2026-11-06T09:00:00.000Z'),
  });

  // =========================================================================
  // 5. KHỞI TẠO 16 ỨNG VIÊN & HỒ SƠ CV MẪU CHUYÊN NGHIỆP, ĐA DẠNG NGÀNH NGHỀ
  // =========================================================================
  const upsertCandidateWithCV = async (params: {
    email: string;
    fullName: string;
    createdAt: Date;
    cvTitle: string;
    template: string;
    cvData: Record<string, any>;
  }) => {
    const cand = await prisma.user.upsert({
      where: { email: params.email },
      update: {
        fullName: params.fullName,
        roleId: getRoleId('CANDIDATE'),
        createdAt: params.createdAt,
      },
      create: {
        email: params.email,
        password: hashedPassword,
        fullName: params.fullName,
        roleId: getRoleId('CANDIDATE'),
        createdAt: params.createdAt,
      },
    });

    const existingCvs = await prisma.cV.findMany({
      where: { userId: cand.id },
      orderBy: { updatedAt: 'desc' },
    });

    let cv = existingCvs[0];
    if (existingCvs.length > 1) {
      const extraIds = existingCvs.slice(1).map((c) => c.id);
      await prisma.application.updateMany({
        where: { cvId: { in: extraIds } },
        data: { cvId: cv.id },
      });
      await prisma.cV.deleteMany({ where: { id: { in: extraIds } } });
    }

    if (!cv) {
      cv = await prisma.cV.create({
        data: {
          userId: cand.id,
          title: params.cvTitle,
          template: params.template,
          data: params.cvData,
          createdAt: params.createdAt,
        },
      });
    } else {
      cv = await prisma.cV.update({
        where: { id: cv.id },
        data: {
          title: params.cvTitle,
          template: params.template,
          data: params.cvData,
          createdAt: params.createdAt,
        },
      });
    }

    return { user: cand, cv };
  };

  // --- NHÓM FRONTEND / FULLSTACK / FRESHER WEB (5 ỨNG VIÊN) ---

  // 1. Nguyễn Minh Quân — Senior Frontend Engineer (3.5 năm KN)
  const candMinhQuan = await upsertCandidateWithCV({
    email: 'candidate@example.com',
    fullName: 'Nguyễn Minh Quân',
    createdAt: new Date('2026-05-18T08:30:00.000Z'),
    cvTitle: 'Hồ sơ Kỹ sư Senior Frontend (React / Next.js) - Nguyễn Minh Quân',
    template: 'Modern',
    cvData: {
      fullName: 'Nguyễn Minh Quân',
      position: 'Senior Frontend Engineer (React / Next.js)',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
      dob: '15/08/1999',
      gender: 'Nam',
      email: 'candidate@example.com',
      phone: '0987 654 321',
      address: 'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội',
      website: 'github.com/minhquan-fe • linkedin.com/in/minhquan-ng',
      yearsOfExperience: 3.5,
      summary:
        'Kỹ sư phát triển giao diện Web với 3.5 năm kinh nghiệm xây dựng các hệ thống tài chính - thương mại quy mô lớn bằng React, Next.js và TypeScript. Chú trọng kiến trúc component rõ ràng, tích hợp RESTful API / Node.js hiệu quả và tối ưu tốc độ tải trang.',
      skills: [
        'React 18',
        'Next.js',
        'TypeScript',
        'JavaScript',
        'Tailwind CSS',
        'Redux Toolkit',
        'Node.js & PostgreSQL',
        'RESTful API & Git',
      ],
      experience:
        '• 03/2024 - Hiện tại: Senior Frontend Developer tại Công ty Phần mềm Sao Khuê\n  - Thiết kế kiến trúc Frontend với Next.js 14 và TypeScript cho cổng quản trị doanh nghiệp hơn 120.000 người dùng.\n  - Cải thiện thời gian tải trang ban đầu giảm 38%, xây dựng bộ UI Component dùng chung cho 4 nhóm dự án.\n\n• 07/2022 - 02/2024: Frontend Developer tại Giải pháp Số Á Châu\n  - Phát triển giao diện thanh toán trực tuyến và bảng điều khiển báo cáo dữ liệu thời gian thực bằng React và Tailwind CSS.',
      projects:
        '1. Cổng Quản trị Tài chính Doanh nghiệp FinHub (Nhóm 12 thành viên)\n   • Vai trò: Trưởng nhóm Frontend — thiết kế hệ thống biểu đồ trực quan và phân quyền đa cấp.\n\n2. Nền tảng Tạo & Quản lý Hồ sơ Sự nghiệp Trực tuyến\n   • Vai trò: Phát triển trình dựng CV chuẩn khổ A4 và xuất tệp PDF chất lượng in ấn.',
      education:
        'Đại học Bách Khoa Hà Nội (2017 - 2022)\n• Chuyên ngành: Kỹ thuật Phần mềm — GPA: 3.56 / 4.0 (Loại Giỏi)',
      languages: [
        'Tiếng Anh (IELTS 7.5 — Giao tiếp và đọc viết tài liệu kỹ thuật thành thạo)',
        'Tiếng Nhật (JLPT N2 — Trao đổi công việc trực tiếp cùng kỹ sư cầu nối)',
      ],
      awards: [
        'Giải Nhất cuộc thi Sáng tạo Phần mềm Sinh viên 2022',
        'Chứng chỉ AWS Certified Cloud Practitioner (2024)',
      ],
    },
  });

  // 2. Phạm Thị Mai Anh — Middle Fullstack Web Developer (2.5 năm KN)
  const candMaiAnh = await upsertCandidateWithCV({
    email: 'maianh.fullstack@example.com',
    fullName: 'Phạm Thị Mai Anh',
    createdAt: new Date('2026-06-08T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Fullstack Web Developer (React & Node.js) - Phạm Thị Mai Anh',
    template: 'Professional',
    cvData: {
      fullName: 'Phạm Thị Mai Anh',
      position: 'Middle Fullstack Web Developer (React / Node.js)',
      avatar:
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      dob: '22/10/2000',
      gender: 'Nữ',
      email: 'maianh.fullstack@example.com',
      phone: '0934 567 890',
      address: 'Phường Láng Hạ, Quận Đống Đa, Hà Nội',
      website: 'github.com/maianh-web',
      yearsOfExperience: 2.5,
      summary:
        'Lập trình viên Fullstack với 2.5 năm kinh nghiệm phát triển trọn vẹn ứng dụng Web từ giao diện người dùng (React, Next.js, TypeScript, Tailwind CSS) đến dịch vụ Backend (Node.js, Express, PostgreSQL, Prisma, Docker) theo mô hình Agile/Scrum.',
      skills: [
        'React',
        'Next.js',
        'TypeScript',
        'Node.js',
        'Express',
        'PostgreSQL',
        'Prisma ORM',
        'Tailwind CSS & Docker',
      ],
      experience:
        '• 02/2024 - Hiện tại: Fullstack Developer tại CMC Global\n  - Xây dựng phân hệ đặt hàng, quản lý kho và RESTful API cổng thanh toán cho nền tảng bán lẻ đa kênh bằng React, Node.js và PostgreSQL.\n  - Tối ưu truy vấn báo cáo doanh thu giúp giảm thời gian phản hồi API từ 1.8s xuống 320ms.',
      projects:
        '1. Hệ thống Quản lý Chuỗi Cửa hàng OmniRetail\n   • Công nghệ: Next.js, TypeScript, Node.js, PostgreSQL, Redis, Docker.\n   • Kết quả: Vận hành ổn định cho hơn 85 cửa hàng bán lẻ trên toàn quốc.',
      education:
        'Học viện Công nghệ Bưu chính Viễn thông - PTIT (2018 - 2023)\n• Chuyên ngành: Công nghệ Phần mềm — GPA: 3.42 / 4.0',
      languages: [
        'Tiếng Anh (TOEIC 815 — Đọc hiểu tài liệu & họp dự án tiếng Anh)',
        'Tiếng Trung (HSK 4 — Giao tiếp thương mại cơ bản)',
      ],
      awards: [
        'Giải Nhì Nghiên cứu Khoa học Sinh viên cấp Học viện năm 2023',
        'Học bổng Khuyến khích Học tập 3 học kỳ liên tiếp',
      ],
    },
  });

  // 3. Vũ Tuấn Kiệt — Frontend Web Developer (2 năm KN)
  const candTuanKiet = await upsertCandidateWithCV({
    email: 'tuankiet.fe@example.com',
    fullName: 'Vũ Tuấn Kiệt',
    createdAt: new Date('2026-06-25T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Lập trình viên Frontend (React / Next.js / Figma) - Vũ Tuấn Kiệt',
    template: 'Modern',
    cvData: {
      fullName: 'Vũ Tuấn Kiệt',
      position: 'Frontend Web Developer (React / Next.js / UI Design System)',
      avatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=300&auto=format&fit=crop&q=80',
      dob: '12/03/2001',
      gender: 'Nam',
      email: 'tuankiet.fe@example.com',
      phone: '0916 789 234',
      address: 'Phường Trung Hòa, Quận Cầu Giấy, Hà Nội',
      website: 'github.com/tuankiet-ui',
      yearsOfExperience: 2,
      summary:
        'Lập trình viên Frontend có 2 năm kinh nghiệm phát triển ứng dụng Web tương tác cao với React, Next.js, TypeScript và Tailwind CSS. Có thế mạnh chuyển đổi bản vẽ Figma, Prototype thành bộ UI Design System chuẩn xác từng điểm ảnh.',
      skills: [
        'React',
        'Next.js',
        'TypeScript',
        'JavaScript',
        'HTML5 / CSS3',
        'Tailwind CSS',
        'Figma & Design System',
        'RESTful API',
      ],
      experience:
        '• 06/2024 - Hiện tại (2 năm): Frontend Engineer tại Công ty Giải pháp Giáo dục Số Tri Thức\n  - Phát triển giao diện phòng học trực tuyến và xây dựng thư viện 60+ component từ Figma sang React/TypeScript.',
      projects:
        '1. Cổng Đào tạo Doanh nghiệp trực tuyến SmartLearn\n   • Công nghệ: Next.js, TypeScript, Tailwind CSS, Figma Design System.',
      education:
        'Trường Đại học Công nghệ - ĐHQGHN (2019 - 2023)\n• Chuyên ngành: Hệ thống Thông tin — GPA: 3.30 / 4.0',
      languages: ['Tiếng Anh (TOEIC 780 — Đọc tài liệu và trao đổi kỹ thuật tốt)'],
      awards: ['Giải Khuyến khích Hackathon Sinh viên Công nghệ Hà Nội 2023'],
    },
  });

  // 4. Đặng Quốc Bảo — Fresher / Thực tập sinh Lập trình Web (0.5 năm KN)
  const candQuocBao = await upsertCandidateWithCV({
    email: 'quocbao.fresher@example.com',
    fullName: 'Đặng Quốc Bảo',
    createdAt: new Date('2026-07-30T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Thực tập sinh / Fresher Lập trình Web - Đặng Quốc Bảo',
    template: 'Modern',
    cvData: {
      fullName: 'Đặng Quốc Bảo',
      position: 'Fresher / Thực Tập Sinh Lập Trình Web (React & TypeScript)',
      avatar:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&auto=format&fit=crop&q=80',
      dob: '05/12/2003',
      gender: 'Nam',
      email: 'quocbao.fresher@example.com',
      phone: '0978 123 456',
      address: 'Phường Mai Dịch, Quận Cầu Giấy, Hà Nội',
      website: 'github.com/quocbao-fpt',
      yearsOfExperience: 0.5,
      summary:
        'Sinh viên năm cuối mới hoàn thành đồ án tốt nghiệp ngành Kỹ thuật Phần mềm với 0.5 năm thực tập phát triển giao diện HTML, CSS, JavaScript, TypeScript, React và ứng dụng di động React Native cơ bản. Thái độ cầu thị, sẵn sàng đi làm ngay.',
      skills: [
        'HTML5 / CSS3',
        'JavaScript (ES6+)',
        'TypeScript',
        'ReactJS',
        'React Native cơ bản',
        'Tailwind CSS & Git',
      ],
      experience:
        '• 03/2026 - 08/2026 (0.5 năm): Thực tập sinh Lập trình Web tại Xưởng Phần mềm Sinh viên FPT\n  - Tham gia xây dựng giao diện trang tra cứu lịch học và RESTful API quản lý câu lạc bộ sinh viên bằng React và TypeScript.',
      projects:
        '1. Đồ án Tốt nghiệp: Website & Mobile App Quản lý Thư viện Trực tuyến\n   • Công nghệ: React, React Native, TypeScript, Express, PostgreSQL.',
      education:
        'Đại học FPT Hà Nội (2021 - 2025)\n• Chuyên ngành: Kỹ thuật Phần mềm — GPA: 3.28 / 4.0',
      languages: ['Tiếng Nhật (JLPT N3)', 'Tiếng Anh (Đọc hiểu tài liệu lập trình tốt)'],
      awards: ['Chứng chỉ Meta Frontend Developer trên Coursera (2025)'],
    },
  });

  // 5. Nguyễn Thảo Vy — Junior / Thực tập sinh Lập trình Web (1 năm KN)
  const candThaoVy = await upsertCandidateWithCV({
    email: 'thaovy.intern@example.com',
    fullName: 'Nguyễn Thảo Vy',
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Junior / Fresher Lập trình Web (React & Node.js) - Nguyễn Thảo Vy',
    template: 'Professional',
    cvData: {
      fullName: 'Nguyễn Thảo Vy',
      position: 'Junior / Fresher Fullstack Web Developer',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
      dob: '18/09/2002',
      gender: 'Nữ',
      email: 'thaovy.intern@example.com',
      phone: '0962 345 671',
      address: 'Phường Văn Quán, Quận Hà Đông, Hà Nội',
      website: 'github.com/thaovy-web',
      yearsOfExperience: 1,
      summary:
        'Lập trình viên trẻ với 1 năm kinh nghiệm thực tập và cộng tác phát triển ứng dụng Web bằng HTML, CSS, JavaScript, TypeScript, React và Node.js / PostgreSQL. Tỉ mỉ trong kiểm thử giao diện, ham học hỏi và làm việc nhóm Agile tốt.',
      skills: [
        'HTML / CSS',
        'JavaScript',
        'TypeScript',
        'React',
        'Node.js',
        'PostgreSQL',
        'RESTful API & Git',
      ],
      experience:
        '• 07/2025 - Hiện tại (1 năm): Junior Web Developer tại Công ty Phần mềm Ánh Dương\n  - Phát triển các trang quản lý hồ sơ khách hàng, biểu mẫu đăng ký và tích hợp RESTful API bằng React, TypeScript và Node.js.',
      projects:
        '1. Hệ thống Đặt lịch Tư vấn Tuyển sinh Trực tuyến\n   • Công nghệ: React, TypeScript, Node.js, PostgreSQL.',
      education:
        'Học viện Kỹ thuật Mật mã (2020 - 2025)\n• Chuyên ngành: Công nghệ Thông tin — GPA: 3.35 / 4.0',
      languages: ['Tiếng Anh (TOEIC 730 — Đọc tài liệu kỹ thuật tốt)'],
      awards: ['Học bổng Sinh viên Giỏi năm học 2023 - 2024'],
    },
  });

  // --- NHÓM BACKEND & MICROSERVICES (2 ỨNG VIÊN CHUYÊN SÂU) ---

  // 6. Lê Hoàng Nam — Backend Node.js Engineer (2.5 năm KN)
  const candHoangNam = await upsertCandidateWithCV({
    email: 'hoangminh.dev@example.com',
    fullName: 'Lê Hoàng Nam',
    createdAt: new Date('2026-06-18T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Kỹ sư Backend Node.js / PostgreSQL - Lê Hoàng Nam',
    template: 'Modern',
    cvData: {
      fullName: 'Lê Hoàng Nam',
      position: 'Backend Software Engineer (Node.js / Express / PostgreSQL)',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
      dob: '10/04/2000',
      gender: 'Nam',
      email: 'hoangminh.dev@example.com',
      phone: '0912 345 678',
      address: 'Phường Mỹ Đình 1, Quận Nam Từ Liêm, Hà Nội',
      website: 'github.com/hoangnam-backend',
      yearsOfExperience: 2.5,
      summary:
        'Kỹ sư Backend có 2.5 năm kinh nghiệm thiết kế RESTful API, WebSocket thời gian thực và kiến trúc Microservices với Node.js, Express, TypeScript, PostgreSQL, Prisma và Redis trên môi trường Linux / Docker.',
      skills: [
        'Node.js',
        'Express / NestJS',
        'TypeScript',
        'PostgreSQL',
        'Prisma',
        'Redis',
        'Microservices & WebSocket',
        'Docker, Linux & CI/CD',
      ],
      experience:
        '• 01/2024 - Hiện tại: Backend Engineer tại Công ty Giải pháp Thanh toán Số Việt (Fintech)\n  - Thiết kế dịch vụ đối soát giao dịch tự động, quản lý hàng đợi thông báo và kết nối cổng ngân hàng bằng Node.js, PostgreSQL và Redis.\n  - Đảm bảo độ ổn định hệ thống xử lý hơn 150.000 giao dịch mỗi ngày.',
      projects:
        '1. Hệ thống Nhắn tin & Thông báo Thời gian thực cho Doanh nghiệp\n   • Công nghệ: Node.js, TypeScript, WebSocket, Redis Pub/Sub, PostgreSQL, Docker.',
      education:
        'Trường Đại học Công nghệ - ĐHQGHN (UET) (2018 - 2022)\n• Chuyên ngành: Công nghệ Thông tin — GPA: 3.36 / 4.0',
      languages: ['Tiếng Anh (TOEIC 785 — Đọc hiểu tài liệu kiến trúc hệ thống tốt)'],
      awards: ['Chứng chỉ Docker & Backend Microservices Foundation (2024)'],
    },
  });

  // 7. Trịnh Minh Đức — Senior Backend & Microservices Engineer (4 năm KN)
  const candMinhDuc = await upsertCandidateWithCV({
    email: 'minhduc.backend@example.com',
    fullName: 'Trịnh Minh Đức',
    createdAt: new Date('2026-07-04T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Senior Backend & Microservices Engineer (Node.js / NestJS) - Trịnh Minh Đức',
    template: 'Professional',
    cvData: {
      fullName: 'Trịnh Minh Đức',
      position: 'Senior Backend & Microservices Engineer (Node.js / NestJS / Cloud)',
      avatar:
        'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=300&auto=format&fit=crop&q=80',
      dob: '08/02/1998',
      gender: 'Nam',
      email: 'minhduc.backend@example.com',
      phone: '0904 512 889',
      address: 'Phường Yên Hòa, Quận Cầu Giấy, Hà Nội',
      website: 'github.com/minhduc-arch',
      yearsOfExperience: 4,
      summary:
        'Senior Backend Engineer với 4 năm kinh nghiệm thiết kế hệ thống phân tán Microservices chịu tải cao cho lĩnh vực Fintech & Thương mại điện tử bằng Node.js, NestJS, Express, TypeScript, PostgreSQL, Prisma và Redis. Thành thạo triển khai Docker, Kubernetes và CI/CD trên AWS.',
      skills: [
        'Node.js',
        'NestJS / Express',
        'TypeScript',
        'PostgreSQL & Prisma',
        'Redis & Kafka',
        'Microservices & RESTful API',
        'Docker & Kubernetes',
        'AWS & CI/CD',
      ],
      experience:
        '• 04/2022 - Hiện tại (4 năm): Senior Backend Engineer tại Công ty Công nghệ Tài chính Bắc Hà\n  - Kiến trúc lại hệ thống ví điện tử sang Microservices trên Node.js / NestJS, PostgreSQL và Redis, chịu tải 3.000 request/giây với độ trễ trung bình dưới 85ms.',
      projects:
        '1. Cổng Thanh toán & Đối soát Liên ngân hàng PayCore\n   • Công nghệ: Node.js, TypeScript, PostgreSQL, Redis, Docker, Kubernetes, AWS.',
      education:
        'Đại học Bách Khoa Hà Nội (2016 - 2021)\n• Chuyên ngành: Khoa học Máy tính — GPA: 3.62 / 4.0 (Loại Giỏi)',
      languages: [
        'Tiếng Anh (IELTS 7.0 — Họp kiến trúc hệ thống trực tiếp với chuyên gia nước ngoài)',
        'Tiếng Nhật (JLPT N3)',
      ],
      awards: [
        'Giải Nhì Olympic Tin học Sinh viên Việt Nam',
        'Chứng chỉ AWS Certified Developer - Associate (2024)',
      ],
    },
  });

  // --- NHÓM THIẾT KẾ SẢN PHẨM UI/UX (2 ỨNG VIÊN CHUYÊN SÂU) ---

  // 8. Trần Khánh Linh — UI/UX Product Designer (2.5 năm KN)
  const candKhanhLinh = await upsertCandidateWithCV({
    email: 'khanhlinh.ux@example.com',
    fullName: 'Trần Khánh Linh',
    createdAt: new Date('2026-07-20T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Thiết kế Sản phẩm UI/UX (Figma & Design System) - Trần Khánh Linh',
    template: 'Professional',
    cvData: {
      fullName: 'Trần Khánh Linh',
      position: 'UI/UX Product Designer (Web & Mobile App)',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      dob: '14/06/2001',
      gender: 'Nữ',
      email: 'khanhlinh.ux@example.com',
      phone: '0945 234 567',
      address: 'Phường Kim Mã, Quận Ba Đình, Hà Nội',
      website: 'behance.net/khanhlinh-ux • dribbble.com/khanhlinh',
      yearsOfExperience: 2.5,
      summary:
        'Nhà thiết kế UI/UX với 2.5 năm kinh nghiệm User Research, xây dựng Wireframe, Prototype, Design System trên Figma và thực hiện Usability Testing cho các sản phẩm Fintech, Y tế và Giáo dục số. Có kinh nghiệm phối hợp viết PRD cùng Product Owner theo Agile/Scrum.',
      skills: [
        'Figma',
        'Design System',
        'UI/UX Mobile & Web',
        'User Research',
        'Wireframe & Prototype',
        'Usability Testing',
        'Agile / Scrum & Product Thinking',
      ],
      experience:
        '• 04/2024 - Hiện tại: Product UI/UX Designer tại Studio Sản phẩm Số Minh Anh\n  - Thiết kế lại luồng đăng ký và thanh toán cho ứng dụng đặt lịch trực tuyến, giúp tăng 28% tỷ lệ hoàn tất biểu mẫu.\n  - Chuẩn hóa thư viện hơn 180 UI Components trên Figma dùng chung cho iOS, Android và Web.',
      projects:
        '1. Thiết kế Trải nghiệm Ứng dụng Quản lý Tài chính Cá nhân SmartWallet\n   • Công cụ: Figma, FigJam, Maze Usability Testing.',
      education:
        'Đại học Kiến Trúc Hà Nội (2019 - 2023)\n• Chuyên ngành: Thiết kế Đồ họa & Tương tác Số — Loại Giỏi',
      languages: ['Tiếng Anh (IELTS 7.0 — Thuyết trình thiết kế và đọc tài liệu UX quốc tế)'],
      awards: ['Chứng chỉ Google UX Design Professional Certificate (2024)'],
    },
  });

  // 9. Phan Minh Châu — Senior Product UI/UX Designer (3.5 năm KN)
  const candMinhChau = await upsertCandidateWithCV({
    email: 'minhchau.design@example.com',
    fullName: 'Phan Minh Châu',
    createdAt: new Date('2026-08-26T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Senior Product UI/UX Designer (Mobile & Web) - Phan Minh Châu',
    template: 'Modern',
    cvData: {
      fullName: 'Phan Minh Châu',
      position: 'Senior Product UI/UX Designer (Super App & Fintech)',
      avatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&auto=format&fit=crop&q=80',
      dob: '29/07/1999',
      gender: 'Nữ',
      email: 'minhchau.design@example.com',
      phone: '0938 654 912',
      address: 'Phường Tân Thuận Đông, Quận 7, TP. Hồ Chí Minh',
      website: 'behance.net/minhchau-product',
      yearsOfExperience: 3.5,
      summary:
        'Senior Product UI/UX Designer với 3.5 năm kinh nghiệm dẫn dắt thiết kế trải nghiệm người dùng cho ứng dụng Mobile thanh toán và nền tảng thương mại điện tử hàng triệu người dùng. Thành thạo Figma, Design System đa nền tảng, User Research, Wireframe, Prototype và Usability Testing.',
      skills: [
        'Figma & Auto Layout',
        'Design System quy mô lớn',
        'UI/UX Mobile & Web',
        'Wireframe & Interactive Prototype',
        'User Research & Usability Testing',
        'Design Handoff cho iOS / Android / Web',
      ],
      experience:
        '• 02/2023 - Hiện tại (3.5 năm): Senior UI/UX Designer tại Công ty Nền tảng Thương mại Số Sài Gòn\n  - Chủ trì xây dựng Design System thế hệ 2.0 trên Figma cho 4 dòng sản phẩm Mobile & Web, rút ngắn 40% thời gian thiết kế tính năng mới.',
      projects:
        '1. Tái thiết kế Luồng Thanh toán Một chạm cho Ứng dụng Ví Số\n   • Kết quả: Giảm tỷ lệ rời bỏ bước thanh toán xuống còn 9.5% sau Usability Testing.',
      education:
        'Đại học Kiến Trúc TP. Hồ Chí Minh (2017 - 2021)\n• Chuyên ngành: Thiết kế Mỹ thuật Số & Truyền thông Đa phương tiện — GPA: 3.51 / 4.0',
      languages: [
        'Tiếng Anh (TOEIC 860 — Làm việc trực tiếp cùng đội ngũ Product quốc tế)',
        'Tiếng Hàn (TOPIK II - Cấp 3)',
      ],
      awards: ['Giải Nhất Cuộc thi Thiết kế Trải nghiệm Sản phẩm Số Trẻ TP.HCM 2023'],
    },
  });

  // --- NHÓM LẬP TRÌNH DI ĐỘNG MOBILE (2 ỨNG VIÊN CHUYÊN SÂU) ---

  // 10. Ngô Đức Thịnh — Mobile App Developer (3 năm KN)
  const candDucThinh = await upsertCandidateWithCV({
    email: 'ducthinh.mobile@example.com',
    fullName: 'Ngô Đức Thịnh',
    createdAt: new Date('2026-09-09T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Kỹ sư Lập trình Mobile (Flutter / React Native) - Ngô Đức Thịnh',
    template: 'Modern',
    cvData: {
      fullName: 'Ngô Đức Thịnh',
      position: 'Mobile Application Developer (Flutter & React Native)',
      avatar:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
      dob: '28/11/1999',
      gender: 'Nam',
      email: 'ducthinh.mobile@example.com',
      phone: '0908 765 432',
      address: 'Phường Tân Phong, Quận 7, TP. Hồ Chí Minh',
      website: 'github.com/ducthinh-mobile',
      yearsOfExperience: 3,
      summary:
        'Kỹ sư phát triển ứng dụng Mobile với 3 năm kinh nghiệm xây dựng và phát hành 5 ứng dụng đa nền tảng iOS & Android bằng Flutter (Dart) và React Native. Thành thạo Clean Architecture, tối ưu hiệu năng 60fps, CI/CD Mobile và quy trình phát hành lên App Store / Google Play.',
      skills: [
        'Flutter',
        'Dart',
        'React Native',
        'iOS & Android Release',
        'Clean Architecture (BLoC / Riverpod)',
        'CI/CD Mobile & Git',
      ],
      experience:
        '• 05/2023 - Hiện tại (3 năm): Mobile App Developer tại Công ty Công nghệ Di động Nam Việt (TP.HCM)\n  - Phát triển chính ứng dụng đặt dịch vụ và ví tích điểm với hơn 200.000 lượt tải trên iOS và Android (điểm đánh giá 4.7/5 sao).',
      projects:
        '1. Ứng dụng Giao vận & Theo dõi Hành trình Thời gian thực GoTrack\n   • Công nghệ: Flutter, Dart, Google Maps SDK, WebSocket, Firebase.',
      education:
        'Trường Đại học Bách Khoa - ĐHQG TP.HCM (2017 - 2022)\n• Chuyên ngành: Khoa học Máy tính — GPA: 3.38 / 4.0',
      languages: [
        'Tiếng Anh (TOEIC 825 — Giao tiếp dự án và đọc tài liệu SDK tốt)',
        'Tiếng Nhật (JLPT N3)',
      ],
      awards: ['Giải Nhất Giải thưởng Ứng dụng Di động Trẻ TP.HCM 2024'],
    },
  });

  // 11. Lý Gia Khiêm — Flutter & Cross-Platform Mobile Engineer (2 năm KN)
  const candGiaKhiem = await upsertCandidateWithCV({
    email: 'giakhiem.mobile@example.com',
    fullName: 'Lý Gia Khiêm',
    createdAt: new Date('2026-09-24T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Lập trình viên Mobile (Flutter / iOS / Android) - Lý Gia Khiêm',
    template: 'Professional',
    cvData: {
      fullName: 'Lý Gia Khiêm',
      position: 'Mobile Developer (Flutter / Dart / React Native)',
      avatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=300&auto=format&fit=crop&q=80',
      dob: '16/05/2001',
      gender: 'Nam',
      email: 'giakhiem.mobile@example.com',
      phone: '0909 321 654',
      address: 'Phường Nguyễn Cư Trinh, Quận 1, TP. Hồ Chí Minh',
      website: 'github.com/giakhiem-flutter',
      yearsOfExperience: 2,
      summary:
        'Lập trình viên Mobile có 2 năm kinh nghiệm phát triển ứng dụng thương mại điện tử và chăm sóc sức khỏe trên iOS & Android với Flutter, Dart và React Native. Nắm vững quản lý bộ nhớ, tối ưu pin, tích hợp sinh trắc học và CI/CD.',
      skills: [
        'Flutter',
        'Dart',
        'React Native',
        'Mobile UI 60fps',
        'iOS / Android Store Deployment',
        'RESTful API & Git',
      ],
      experience:
        '• 08/2024 - Hiện tại (2 năm): Flutter Mobile Developer tại Công ty Giải pháp Y tế Số MedCare\n  - Xây dựng ứng dụng tư vấn bác sĩ từ xa và nhắc lịch uống thuốc đạt hơn 65.000 người dùng hoạt động hàng tháng trên App Store & Google Play.',
      projects:
        '1. Ứng dụng Chăm sóc Sức khỏe Gia đình MedCare Mobile\n   • Công nghệ: Flutter, Dart, WebRTC Video Call, Firebase Push Notification.',
      education:
        'Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM (2019 - 2023)\n• Chuyên ngành: Kỹ thuật Phần mềm — GPA: 3.32 / 4.0',
      languages: ['Tiếng Anh (TOEIC 810 — Đọc hiểu tài liệu Apple/Google Developer tốt)'],
      awards: ['Học bổng Khuyến khích Học tập Khoa CNTT năm 2022'],
    },
  });

  // --- NHÓM DEVOPS / CLOUD / SRE (2 ỨNG VIÊN CHUYÊN SÂU) ---

  // 12. Hoàng Gia Huy — DevOps & Cloud Engineer (3.5 năm KN)
  const candGiaHuy = await upsertCandidateWithCV({
    email: 'giahuy.devops@example.com',
    fullName: 'Hoàng Gia Huy',
    createdAt: new Date('2026-10-02T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Kỹ sư DevOps & Hạ tầng Đám mây (AWS / Kubernetes) - Hoàng Gia Huy',
    template: 'Professional',
    cvData: {
      fullName: 'Hoàng Gia Huy',
      position: 'DevOps & Cloud Infrastructure Engineer (AWS / GCP / K8s)',
      avatar:
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=300&auto=format&fit=crop&q=80',
      dob: '03/09/1998',
      gender: 'Nam',
      email: 'giahuy.devops@example.com',
      phone: '0935 888 999',
      address: 'Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
      website: 'github.com/giahuy-cloud',
      yearsOfExperience: 3.5,
      summary:
        'Kỹ sư DevOps & SRE với 3.5 năm kinh nghiệm vận hành hạ tầng AWS và GCP, quản trị cụm Kubernetes, Linux, tự động hóa hạ tầng bằng Terraform và thiết lập quy trình CI/CD cùng hệ thống giám sát Prometheus/Grafana.',
      skills: [
        'AWS & GCP',
        'Docker',
        'Kubernetes (EKS / GKE)',
        'Terraform',
        'CI/CD (GitLab CI / GitHub Actions)',
        'Linux & SRE',
        'Prometheus & Grafana',
      ],
      experience:
        '• 01/2023 - Hiện tại (3.5 năm): DevOps Engineer tại Trung tâm Giải pháp Đám mây Miền Trung\n  - Thiết kế kiến trúc High Availability trên AWS EKS và tự động hóa toàn bộ pipeline CI/CD cho 18 dịch vụ Microservices, tiết kiệm 25% chi phí Cloud.',
      projects:
        '1. Chuẩn hóa Hạ tầng Đa môi trường bằng Terraform & ArgoCD\n   • Công nghệ: AWS, GCP, Kubernetes, Terraform, Linux, Prometheus, Grafana.',
      education:
        'Trường Đại học Bách Khoa - Đại học Đà Nẵng (2016 - 2021)\n• Chuyên ngành: Kỹ thuật Mạng & Hệ thống Thông tin — GPA: 3.40 / 4.0',
      languages: [
        'Tiếng Anh (IELTS 7.0 — Làm việc trực tiếp với đối tác quốc tế)',
        'Tiếng Nhật (JLPT N3)',
      ],
      awards: ['Chứng chỉ quốc tế AWS Certified Solutions Architect - Associate (2024)'],
    },
  });

  // 13. Đỗ Thành Đạt — Cloud & Site Reliability Engineer (2.5 năm KN)
  const candThanhDat = await upsertCandidateWithCV({
    email: 'thanhdat.cloud@example.com',
    fullName: 'Đỗ Thành Đạt',
    createdAt: new Date('2026-10-16T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Kỹ sư Cloud & SRE (Kubernetes / Terraform / Linux) - Đỗ Thành Đạt',
    template: 'Modern',
    cvData: {
      fullName: 'Đỗ Thành Đạt',
      position: 'Cloud & Site Reliability Engineer (SRE / DevOps / Microservices)',
      avatar:
        'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=300&auto=format&fit=crop&q=80',
      dob: '24/01/2000',
      gender: 'Nam',
      email: 'thanhdat.cloud@example.com',
      phone: '0973 456 128',
      address: 'Phường Linh Trung, TP. Thủ Đức, TP. Hồ Chí Minh',
      website: 'github.com/thanhdat-sre',
      yearsOfExperience: 2.5,
      summary:
        'Kỹ sư Cloud & SRE với 2.5 năm kinh nghiệm quản trị hệ thống Linux, Docker, Kubernetes, viết Terraform trên AWS/GCP và vận hành hạ tầng Backend Microservices (Node.js, PostgreSQL, Redis) với bộ công cụ giám sát Prometheus & Grafana.',
      skills: [
        'Kubernetes & Docker',
        'Terraform',
        'AWS / GCP',
        'Linux Administration',
        'CI/CD & SRE',
        'Prometheus & Grafana',
        'PostgreSQL & Redis Infra',
      ],
      experience:
        '• 03/2024 - Hiện tại (2.5 năm): Cloud & SRE Engineer tại Công ty Hạ tầng Số Phương Nam\n  - Duy trì uptime 99.98% cho cụm 40+ node Kubernetes phục vụ các dịch vụ thanh toán và truyền thông trực tuyến.',
      projects:
        '1. Hệ thống Cảnh báo Sớm & Tự động Mở rộng Cụm Microservices\n   • Công nghệ: Kubernetes, Terraform, Prometheus, Grafana, Linux, CI/CD.',
      education:
        'Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM (UIT) (2018 - 2022)\n• Chuyên ngành: Mạng Máy tính & Truyền thông Dữ liệu — GPA: 3.44 / 4.0',
      languages: ['Tiếng Anh (TOEIC 835 — Đọc viết tài liệu vận hành chuẩn quốc tế)'],
      awards: ['Chứng chỉ Certified Kubernetes Administrator - CKA (2025)'],
    },
  });

  // --- NHÓM PRODUCT MANAGER / PRODUCT OWNER (2 ỨNG VIÊN CHUYÊN SÂU) ---

  // 14. Bùi Thanh Thảo — Product Manager (4 năm KN)
  const candThanhThao = await upsertCandidateWithCV({
    email: 'thanhthao.pm@example.com',
    fullName: 'Bùi Thanh Thảo',
    createdAt: new Date('2026-08-20T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Quản trị Sản phẩm Công nghệ (Product Manager) - Bùi Thanh Thảo',
    template: 'Professional',
    cvData: {
      fullName: 'Bùi Thanh Thảo',
      position: 'Product Manager / Product Owner (EdTech & Digital Platform)',
      avatar:
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
      dob: '21/05/1998',
      gender: 'Nữ',
      email: 'thanhthao.pm@example.com',
      phone: '0983 456 789',
      address: 'Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
      website: 'linkedin.com/in/thanhthao-pm',
      yearsOfExperience: 4,
      summary:
        'Product Manager với 4 năm kinh nghiệm xây dựng lộ trình sản phẩm EdTech, Fintech và nền tảng SaaS B2B. Thế mạnh về phân tích dữ liệu Data (SQL, Mixpanel, GA4), viết tài liệu đặc tả PRD mạch lạc, thiết kế Wireframe trên Figma và điều phối nhóm Agile/Scrum từ ý tưởng đến khi ra mắt.',
      skills: [
        'Product Manager / Product Owner',
        'Agile & Scrum',
        'Viết PRD & User Stories',
        'Data Analytics & SQL',
        'EdTech & SaaS Strategy',
        'Figma Wireframe',
      ],
      experience:
        '• 03/2022 - Hiện tại (4 năm): Product Manager tại Nền tảng Học Trực tuyến EduNext Việt Nam\n  - Quản lý lộ trình sản phẩm lớp học tương tác trực tuyến với hơn 90.000 học viên trả phí, giúp tăng tỷ lệ hoàn thành khóa học thêm 34%.',
      projects:
        '1. Ra mắt Phân hệ Luyện thi & Thanh toán Học phí Số trên Web & Mobile\n   • Vai trò: Product Manager điều phối nhóm 10 kỹ sư & 2 UI/UX Designer theo Agile/Scrum.',
      education:
        'Trường Đại học Ngoại Thương Hà Nội - FTU (2016 - 2020)\n• Chuyên ngành: Kinh tế Đối ngoại & Quản trị Kinh doanh Số — GPA: 3.60 / 4.0',
      languages: [
        'Tiếng Anh (IELTS 7.5 — Đàm phán và thuyết trình chiến lược sản phẩm lưu loát)',
        'Tiếng Trung (HSK 4)',
      ],
      awards: [
        'Giải Nhất Sản phẩm Số Tiêu biểu cấp Tổng Công ty năm 2025',
        'Chứng chỉ quốc tế Professional Scrum Product Owner (PSPO I)',
      ],
    },
  });

  // 15. Hà Quang Vinh — Product Owner / Senior Business Analyst (3 năm KN)
  const candQuangVinh = await upsertCandidateWithCV({
    email: 'quangvinh.po@example.com',
    fullName: 'Hà Quang Vinh',
    createdAt: new Date('2026-10-29T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Product Owner / Senior Business Analyst - Hà Quang Vinh',
    template: 'Modern',
    cvData: {
      fullName: 'Hà Quang Vinh',
      position: 'Product Owner / Senior Business Analyst (Fintech & EdTech)',
      avatar:
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
      dob: '11/10/1999',
      gender: 'Nam',
      email: 'quangvinh.po@example.com',
      phone: '0915 678 432',
      address: 'Phường Đồng Tâm, Quận Hai Bà Trưng, Hà Nội',
      website: 'linkedin.com/in/quangvinh-po',
      yearsOfExperience: 3,
      summary:
        'Product Owner kiêm Senior Business Analyst với 3 năm kinh nghiệm phát triển sản phẩm tài chính số Fintech và cổng đào tạo trực tuyến EdTech. Thành thạo đặc tả nghiệp vụ PRD, phân tích phễu chuyển đổi Data bằng SQL, dựng luồng trên Figma và vận hành Sprint theo Agile/Scrum.',
      skills: [
        'Product Owner / Product Manager',
        'Viết PRD & Phân tích nghiệp vụ',
        'Agile / Scrum',
        'Data Analytics & SQL',
        'Fintech & EdTech',
        'Figma Flowchart',
      ],
      experience:
        '• 06/2023 - Hiện tại (3 năm): Product Owner tại Công ty Giải pháp Tài chính & Thanh toán Số Hà Thành\n  - Quản lý Product Backlog cho phân hệ định danh điện tử eKYC và ví thanh toán học phí, rút ngắn 30% thời gian xác thực người dùng mới.',
      projects:
        '1. Cổng Thu hộ Học phí & Quản trị Trường học Số SmartPay Edu\n   • Vai trò: Product Owner kết nối nghiệp vụ Fintech và EdTech.',
      education:
        'Trường Đại học Kinh tế Quốc dân - NEU (2017 - 2021)\n• Chuyên ngành: Hệ thống Thông tin Quản lý (MIS) — GPA: 3.48 / 4.0',
      languages: ['Tiếng Anh (IELTS 7.0 — Giao tiếp và viết tài liệu đặc tả tiếng Anh chuyên sâu)'],
      awards: ['Chứng chỉ Agile Scrum Product Owner & Giải Nhì Nghiên cứu Khoa học NEU'],
    },
  });

  // --- HỒ SƠ TRÁI NGÀNH THỰC TẾ (1 ỨNG VIÊN — MINH HỌA CẢNH BÁO LỌC CV LỆCH TIÊU CHÍ) ---

  // 16. Vũ Hải Đăng — Điều phối Kho vận & Hành chính (1 năm KN)
  const candHaiDang = await upsertCandidateWithCV({
    email: 'user.spam123@example.com',
    fullName: 'Vũ Hải Đăng',
    createdAt: new Date('2026-11-04T09:00:00.000Z'),
    cvTitle: 'Hồ sơ Nhân viên Điều phối Kho vận & Hành chính - Vũ Hải Đăng',
    template: 'Basic',
    cvData: {
      fullName: 'Vũ Hải Đăng',
      position: 'Nhân viên Điều phối Giao nhận & Hành chính Kho vận',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
      dob: '19/03/2001',
      gender: 'Nam',
      email: 'user.spam123@example.com',
      phone: '0965 112 233',
      address: 'Phường Hoàng Liệt, Quận Hoàng Mai, Hà Nội',
      website: '',
      yearsOfExperience: 1,
      summary:
        'Nhân viên điều phối giao nhận hàng hóa và tổng hợp chứng từ kho vận với 1 năm kinh nghiệm làm việc thực tế, mong muốn tìm kiếm công việc văn phòng ổn định lâu dài.',
      skills: [
        'Điều phối vận chuyển',
        'Kiểm kê chứng từ kho',
        'Tin học văn phòng Word / Excel',
        'Chăm sóc khách hàng',
      ],
      experience:
        '• 2025 - Hiện tại (1 năm): Nhân viên điều phối đơn hàng tại Công ty Vận tải Nội địa Thành Đạt.',
      projects: '',
      education: 'Cao đẳng Kinh tế Kỹ thuật — Chuyên ngành Quản trị Kinh doanh Vận tải',
      languages: [],
      awards: [],
    },
  });

  const seededCandidates = [
    candMinhQuan,
    candMaiAnh,
    candTuanKiet,
    candQuocBao,
    candThaoVy,
    candHoangNam,
    candMinhDuc,
    candKhanhLinh,
    candMinhChau,
    candDucThinh,
    candGiaKhiem,
    candGiaHuy,
    candThanhDat,
    candThanhThao,
    candQuangVinh,
    candHaiDang,
  ];

  // Đảm bảo các tài khoản ứng viên tự đăng ký thêm trên máy (nếu chưa có CV) cũng có 1 CV gọn gàng để số lượng Tài khoản Ứng viên === Hồ sơ CV chuẩn A4
  const allCandidateAccounts = await prisma.user.findMany({
    where: { roleId: getRoleId('CANDIDATE') },
  });
  for (const acc of allCandidateAccounts) {
    const hasCv = await prisma.cV.findFirst({ where: { userId: acc.id } });
    if (!hasCv) {
      await prisma.cV.create({
        data: {
          userId: acc.id,
          title: `Hồ sơ ứng tuyển CNTT - ${acc.fullName}`,
          template: 'Modern',
          createdAt: acc.createdAt,
          data: {
            fullName: acc.fullName,
            position: 'Lập trình viên Phần mềm (Web Developer)',
            email: acc.email,
            phone: '0986 246 810',
            address: 'Quận Cầu Giấy, Hà Nội',
            yearsOfExperience: 1,
            summary:
              'Ứng viên phát triển phần mềm trên hệ thống SmartCV với 1 năm kinh nghiệm nền tảng lập trình Web JavaScript, TypeScript và cơ sở dữ liệu quan hệ.',
            skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL'],
            experience:
              '• 1 năm tham gia phát triển các dự án ứng dụng Web và hệ thống quản lý nội bộ.',
            education: 'Cử nhân Công nghệ Thông tin',
            languages: ['Tiếng Anh giao tiếp cơ bản'],
            awards: [],
          },
        },
      });
    }
  }

  // =========================================================================
  // 6. TẠO 40 ĐƠN ỨNG TUYỂN THỰC TẾ:
  //    - MỖI VỊ TRÍ Ở CẢ 3 CÔNG TY ĐỀU CÓ 2 - 4 CV ĐỂ SO SÁNH XẾP HẠNG!
  //    - MỖI ỨNG VIÊN NỘP CV VÀO 1 - 3 NHÀ TUYỂN DỤNG KHÁC NHAU ĐÚNG CHUYÊN MÔN!
  // =========================================================================
  const keptSeededAppIds: string[] = [];

  const ensureDefaultScheduleIfMissing = async (
    applicationId: string,
    recipientEmail: string,
    sched?: {
      candidateName: string;
      jobTitle: string;
      companyName: string;
      date: string;
      time: string;
      mode: 'ONLINE' | 'OFFLINE';
      locationOrLink: string;
      note: string;
    }
  ) => {
    if (!sched) return;
    await prisma.$executeRawUnsafe(
      `INSERT INTO interview_schedules (
         application_id, candidate_name, recipient_email, job_title,
         interview_date, interview_time, mode, location_or_link, interviewer, note, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (application_id) DO NOTHING`,
      applicationId,
      sched.candidateName,
      recipientEmail,
      sched.jobTitle,
      sched.date,
      sched.time,
      sched.mode,
      sched.locationOrLink,
      `Bộ phận Tuyển dụng — ${sched.companyName}`,
      sched.note
    );
  };

  const ensureApplication = async (params: {
    jobId: string;
    candidateId: string;
    candidateEmail?: string;
    cvId: string;
    coverLetter: string;
    appliedDate: Date;
    defaultStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    defaultInterviewSchedule?: {
      candidateName: string;
      jobTitle: string;
      companyName: string;
      date: string;
      time: string;
      mode: 'ONLINE' | 'OFFLINE';
      locationOrLink: string;
      note: string;
      createdAt?: string;
    };
  }) => {
    const existing = await prisma.application.findFirst({
      where: { jobId: params.jobId, candidateId: params.candidateId },
    });
    if (existing) {
      const updated = await prisma.application.update({
        where: { id: existing.id },
        data: {
          cvId: params.cvId,
          coverLetter: params.coverLetter,
          appliedDate: params.appliedDate,
        },
      });
      await ensureDefaultScheduleIfMissing(
        updated.id,
        params.candidateEmail || '',
        params.defaultInterviewSchedule
      );
      keptSeededAppIds.push(updated.id);
      return updated;
    }

    const created = await prisma.application.create({
      data: {
        jobId: params.jobId,
        candidateId: params.candidateId,
        cvId: params.cvId,
        coverLetter: params.coverLetter,
        status: params.defaultStatus || 'PENDING',
        appliedDate: params.appliedDate,
      },
    });

    await ensureDefaultScheduleIfMissing(
      created.id,
      params.candidateEmail || '',
      params.defaultInterviewSchedule
    );

    keptSeededAppIds.push(created.id);
    return created;
  };

  // =========================================================================
  // A. FPT SOFTWARE — 8 VỊ TRÍ (TẤT CẢ ĐỀU CÓ 2 - 4 CV = 23 ĐƠN ỨNG TUYỂN)
  // =========================================================================

  // [Vị trí 1 - FPT] Senior Frontend Developer (React / Next.js) — 4 CV
  await ensureApplication({
    jobId: jobFptFrontend.id,
    candidateId: candMinhQuan.user.id,
    cvId: candMinhQuan.cv.id,
    coverLetter:
      'Kính gửi Bộ phận Tuyển dụng FPT Software, em có 3.5 năm kinh nghiệm phát triển hệ thống Web quy mô lớn với React 18, Next.js và TypeScript cùng chứng chỉ IELTS 7.5 & Tiếng Nhật JLPT N2. Rất mong có cơ hội trao đổi thêm trong buổi phỏng vấn ạ.',
    appliedDate: new Date('2026-05-26T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
    defaultInterviewSchedule: {
      candidateName: 'Nguyễn Minh Quân',
      jobTitle: 'Senior Frontend Developer (React / Next.js)',
      companyName: 'Công Ty Công Nghệ FPT Software',
      date: '2026-11-20',
      time: '09:30',
      mode: 'ONLINE',
      locationOrLink: 'Phòng phỏng vấn Video trực tuyến trên hệ thống SmartCV',
      note: 'Vui lòng chuẩn bị sẵn camera/micro trước giờ hẹn 5 phút để trao đổi kỹ thuật cùng Tech Lead.',
      createdAt: '2026-11-12T09:00:00.000Z',
    },
  });
  await ensureApplication({
    jobId: jobFptFrontend.id,
    candidateId: candMaiAnh.user.id,
    cvId: candMaiAnh.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm phát triển ứng dụng Web với React, Next.js và TypeScript cho lĩnh vực thương mại điện tử, rất mong được đồng hành cùng đội ngũ dự án tại FPT Software.',
    appliedDate: new Date('2026-06-15T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptFrontend.id,
    candidateId: candTuanKiet.user.id,
    cvId: candTuanKiet.cv.id,
    coverLetter:
      'Mình gửi hồ sơ ứng tuyển vị trí Frontend Developer với 2 năm kinh nghiệm xây dựng giao diện React, Next.js, TypeScript và chuyển đổi Design System từ Figma.',
    appliedDate: new Date('2026-07-02T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptFrontend.id,
    candidateId: candHaiDang.user.id,
    cvId: candHaiDang.cv.id,
    coverLetter: 'Em mong muốn tìm công việc văn phòng ổn định lâu dài tại quý công ty ạ.',
    appliedDate: new Date('2026-11-05T10:00:00.000Z'),
  });

  // [Vị trí 2 - FPT] Backend Node.js / Express Engineer — 3 CV
  await ensureApplication({
    jobId: jobFptBackend.id,
    candidateId: candMinhDuc.user.id,
    cvId: candMinhDuc.cv.id,
    coverLetter:
      'Mình có 4 năm kinh nghiệm kiến trúc hệ thống Backend Microservices chịu tải cao với Node.js, NestJS/Express, PostgreSQL, Redis và Docker trên AWS. Rất mong được đóng góp tại FPT Software.',
    appliedDate: new Date('2026-07-09T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptBackend.id,
    candidateId: candHoangNam.user.id,
    cvId: candHoangNam.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm xây dựng RESTful API, WebSocket và dịch vụ thanh toán với Node.js, Express, PostgreSQL, Prisma và Redis.',
    appliedDate: new Date('2026-07-16T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptBackend.id,
    candidateId: candMaiAnh.user.id,
    cvId: candMaiAnh.cv.id,
    coverLetter:
      'Bên cạnh Frontend, em có 2.5 năm kinh nghiệm trực tiếp xây dựng dịch vụ Node.js, Express và tối ưu truy vấn PostgreSQL trong các dự án bán lẻ đa kênh.',
    appliedDate: new Date('2026-08-03T10:00:00.000Z'),
  });

  // [Vị trí 3 - FPT] UI/UX Product Designer — 3 CV
  await ensureApplication({
    jobId: jobFptUiUx.id,
    candidateId: candMinhChau.user.id,
    cvId: candMinhChau.cv.id,
    coverLetter:
      'Mình có 3.5 năm kinh nghiệm Senior Product UI/UX Designer, chủ trì xây dựng Design System trên Figma và kiểm thử Usability Testing cho ứng dụng hàng triệu người dùng.',
    appliedDate: new Date('2026-08-29T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptUiUx.id,
    candidateId: candKhanhLinh.user.id,
    cvId: candKhanhLinh.cv.id,
    coverLetter:
      'Em gửi kèm hồ sơ và Portfolio UI/UX Product Designer với 2.5 năm kinh nghiệm xây dựng Design System trên Figma, dựng Wireframe/Prototype và User Research.',
    appliedDate: new Date('2026-07-26T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptUiUx.id,
    candidateId: candTuanKiet.user.id,
    cvId: candTuanKiet.cv.id,
    coverLetter:
      'Em có kinh nghiệm thiết kế Component Library trên Figma kết hợp hiểu biết sâu về triển khai giao diện Web/Mobile thực tế.',
    appliedDate: new Date('2026-08-11T10:00:00.000Z'),
  });

  // [Vị trí 4 - FPT] Thực Tập Sinh Lập Trình Web (Fresher Web Dev) — 3 CV
  await ensureApplication({
    jobId: jobFptFresher.id,
    candidateId: candThaoVy.user.id,
    cvId: candThaoVy.cv.id,
    coverLetter:
      'Em tốt nghiệp loại Khá Giỏi ngành CNTT và đã có 1 năm thực tập/làm việc thực tế với HTML/CSS, TypeScript, React và Node.js, mong muốn gắn bó lâu dài cùng FPT Software.',
    appliedDate: new Date('2026-08-19T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptFresher.id,
    candidateId: candQuocBao.user.id,
    cvId: candQuocBao.cv.id,
    coverLetter:
      'Em tốt nghiệp Kỹ thuật Phần mềm ĐH FPT (GPA 3.28/4.0, JLPT N3), nắm vững HTML/CSS, TypeScript, ReactJS và có thể tham gia đào tạo toàn thời gian ngay ạ.',
    appliedDate: new Date('2026-08-06T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptFresher.id,
    candidateId: candHaiDang.user.id,
    cvId: candHaiDang.cv.id,
    coverLetter: 'Em xin ứng tuyển vị trí thực tập sinh để thử sức chuyển hướng công việc mới ạ.',
    appliedDate: new Date('2026-11-07T10:00:00.000Z'),
  });

  // [Vị trí 5 - FPT] Product Manager (EdTech Platform) — 2 CV
  await ensureApplication({
    jobId: jobFptPm.id,
    candidateId: candThanhThao.user.id,
    cvId: candThanhThao.cv.id,
    coverLetter:
      'Mình có 4 năm kinh nghiệm Product Manager trực tiếp phát triển nền tảng học trực tuyến EdTech hơn 90.000 học viên, sở hữu chứng chỉ quốc tế PSPO I và IELTS 7.5.',
    appliedDate: new Date('2026-08-25T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptPm.id,
    candidateId: candQuangVinh.user.id,
    cvId: candQuangVinh.cv.id,
    coverLetter:
      'Mình có 3 năm kinh nghiệm Product Owner cho các dự án cổng thanh toán học phí EdTech và quản trị trường học số theo mô hình Agile/Scrum, viết PRD và phân tích Data bằng SQL.',
    appliedDate: new Date('2026-10-30T10:00:00.000Z'),
  });

  // [Vị trí 6 - FPT] Fullstack Web Developer — 3 CV
  await ensureApplication({
    jobId: jobFptFullstack.id,
    candidateId: candMaiAnh.user.id,
    cvId: candMaiAnh.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm phát triển trọn vẹn Fullstack với React, TypeScript, Node.js và PostgreSQL theo quy trình Agile/Scrum.',
    appliedDate: new Date('2026-09-16T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptFullstack.id,
    candidateId: candMinhQuan.user.id,
    cvId: candMinhQuan.cv.id,
    coverLetter:
      'Mình có nền tảng chuyên sâu về kiến trúc Frontend React/Next.js kết hợp kinh nghiệm tích hợp dịch vụ Backend Node.js và PostgreSQL cho doanh nghiệp.',
    appliedDate: new Date('2026-09-23T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptFullstack.id,
    candidateId: candThaoVy.user.id,
    cvId: candThaoVy.cv.id,
    coverLetter:
      'Em có 1 năm kinh nghiệm xây dựng giao diện React/TypeScript kết hợp viết RESTful API Node.js và PostgreSQL, rất mong có cơ hội phỏng vấn.',
    appliedDate: new Date('2026-09-29T10:00:00.000Z'),
  });

  // [Vị trí 7 - FPT] Mobile App Developer (Flutter / React Native) — 2 CV
  await ensureApplication({
    jobId: jobFptMobile.id,
    candidateId: candDucThinh.user.id,
    cvId: candDucThinh.cv.id,
    coverLetter:
      'Mình có 3 năm kinh nghiệm phát triển ứng dụng di động đa nền tảng bằng Flutter và React Native, đã trực tiếp phát hành 5 ứng dụng lên App Store & Google Play.',
    appliedDate: new Date('2026-10-10T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptMobile.id,
    candidateId: candGiaKhiem.user.id,
    cvId: candGiaKhiem.cv.id,
    coverLetter:
      'Em có 2 năm kinh nghiệm lập trình Mobile với Flutter/Dart và React Native tại TP.HCM, tối ưu giao diện 60fps trên cả iOS và Android.',
    appliedDate: new Date('2026-10-14T10:00:00.000Z'),
  });

  // [Vị trí 8 - FPT] DevOps & Cloud Engineer (AWS / GCP) — 3 CV
  await ensureApplication({
    jobId: jobFptDevops.id,
    candidateId: candGiaHuy.user.id,
    cvId: candGiaHuy.cv.id,
    coverLetter:
      'Mình đang sinh sống tại Đà Nẵng, có 3.5 năm kinh nghiệm quản trị AWS/GCP, Kubernetes, Docker, Terraform và sở hữu chứng chỉ AWS Solutions Architect Associate.',
    appliedDate: new Date('2026-10-22T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobFptDevops.id,
    candidateId: candThanhDat.user.id,
    cvId: candThanhDat.cv.id,
    coverLetter:
      'Mình gửi hồ sơ ứng tuyển vị trí DevOps & Cloud Engineer với 2.5 năm kinh nghiệm vận hành Kubernetes (chứng chỉ CKA), Terraform, CI/CD và Prometheus/Grafana.',
    appliedDate: new Date('2026-10-26T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobFptDevops.id,
    candidateId: candMinhDuc.user.id,
    cvId: candMinhDuc.cv.id,
    coverLetter:
      'Mình có 4 năm kinh nghiệm triển khai hạ tầng Microservices với Docker, Kubernetes, AWS và thiết lập pipeline CI/CD tự động.',
    appliedDate: new Date('2026-10-31T10:00:00.000Z'),
  });

  // =========================================================================
  // B. VIETTEL DIGITAL — 3 VỊ TRÍ (MỖI VỊ TRÍ ĐỀU CÓ 3 CV = 9 ĐƠN ỨNG TUYỂN)
  // =========================================================================

  // [Vị trí 9 - Viettel] Senior Backend Engineer (Node.js / Microservices) — 3 CV
  await ensureApplication({
    jobId: jobViettelBackend.id,
    candidateId: candMinhDuc.user.id,
    cvId: candMinhDuc.cv.id,
    coverLetter:
      'Mình có 4 năm kinh nghiệm thiết kế hệ thống ví điện tử và cổng thanh toán theo kiến trúc Microservices trên Node.js, PostgreSQL và Redis chịu tải cao, rất mong được gia nhập Viettel Digital.',
    appliedDate: new Date('2026-08-22T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobViettelBackend.id,
    candidateId: candHoangNam.user.id,
    cvId: candHoangNam.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm phát triển dịch vụ đối soát giao dịch thanh toán số bằng Node.js, TypeScript, PostgreSQL và Redis, mong có cơ hội đóng góp tại Viettel Digital.',
    appliedDate: new Date('2026-09-04T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobViettelBackend.id,
    candidateId: candThanhDat.user.id,
    cvId: candThanhDat.cv.id,
    coverLetter:
      'Mình có kinh nghiệm vận hành và tối ưu hóa cụm dịch vụ phân tán PostgreSQL, Redis, Docker và Kubernetes độ sẵn sàng cao cho mảng thanh toán trực tuyến.',
    appliedDate: new Date('2026-10-18T10:00:00.000Z'),
  });

  // [Vị trí 10 - Viettel] Kỹ Sư Phần Mềm Fullstack & Tích Hợp AI — 3 CV
  await ensureApplication({
    jobId: jobViettelAi.id,
    candidateId: candMinhQuan.user.id,
    cvId: candMinhQuan.cv.id,
    coverLetter:
      'Mình có 3.5 năm kinh nghiệm React, Next.js, TypeScript kết hợp Node.js/PostgreSQL tại Cầu Giấy, rất quan tâm tới dự án cổng trợ lý số AI của Viettel Digital.',
    appliedDate: new Date('2026-09-27T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobViettelAi.id,
    candidateId: candMaiAnh.user.id,
    cvId: candMaiAnh.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm phát triển ứng dụng Fullstack React, TypeScript, Node.js và PostgreSQL, mong có cơ hội tham gia đội ngũ phát triển sản phẩm AI tại Viettel Digital.',
    appliedDate: new Date('2026-10-06T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobViettelAi.id,
    candidateId: candTuanKiet.user.id,
    cvId: candTuanKiet.cv.id,
    coverLetter:
      'Em có 2 năm kinh nghiệm xây dựng giao diện hội thoại tương tác thời gian thực với React, Next.js, TypeScript và tích hợp RESTful API.',
    appliedDate: new Date('2026-10-12T10:00:00.000Z'),
  });

  // [Vị trí 11 - Viettel] Product Owner / Chuyên Viên Quản Trị Sản Phẩm Số — 3 CV
  await ensureApplication({
    jobId: jobViettelBaPm.id,
    candidateId: candThanhThao.user.id,
    cvId: candThanhThao.cv.id,
    coverLetter:
      'Mình gửi hồ sơ ứng tuyển vị trí Product Owner tại Viettel Digital với 4 năm kinh nghiệm quản trị sản phẩm số, phân tích dữ liệu Data và chứng chỉ PSPO I.',
    appliedDate: new Date('2026-11-01T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobViettelBaPm.id,
    candidateId: candQuangVinh.user.id,
    cvId: candQuangVinh.cv.id,
    coverLetter:
      'Mình có 3 năm kinh nghiệm Product Owner mảng Fintech (eKYC & Ví thanh toán số), viết PRD chuyên sâu và phân tích phễu chuyển đổi người dùng.',
    appliedDate: new Date('2026-11-04T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobViettelBaPm.id,
    candidateId: candKhanhLinh.user.id,
    cvId: candKhanhLinh.cv.id,
    coverLetter:
      'Em có 2.5 năm kinh nghiệm thiết kế sản phẩm Fintech, nghiên cứu hành vi người dùng và phối hợp xây dựng User Stories trong mô hình Agile/Scrum.',
    appliedDate: new Date('2026-11-08T10:00:00.000Z'),
  });

  // =========================================================================
  // C. VNG CORPORATION — 3 VỊ TRÍ (MỖI VỊ TRÍ 2 - 3 CV = 8 ĐƠN ỨNG TUYỂN)
  // =========================================================================

  // [Vị trí 12 - VNG] Senior Mobile Developer (Flutter / iOS / Android) — 3 CV
  await ensureApplication({
    jobId: jobVngMobile.id,
    candidateId: candDucThinh.user.id,
    cvId: candDucThinh.cv.id,
    coverLetter:
      'Mình đang sinh sống tại Quận 7, TP.HCM và có 3 năm kinh nghiệm phát triển ứng dụng Flutter / React Native hiệu năng cao trên iOS & Android, rất mong được làm việc tại VNG Campus.',
    appliedDate: new Date('2026-09-25T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
    defaultInterviewSchedule: {
      candidateName: 'Ngô Đức Thịnh',
      jobTitle: 'Senior Mobile Developer (Flutter / iOS / Android)',
      companyName: 'Công Ty Cổ Phần VNG (VNG Corporation)',
      date: '2026-11-22',
      time: '14:30',
      mode: 'ONLINE',
      locationOrLink: 'Phòng phỏng vấn Video trực tuyến trên hệ thống SmartCV',
      note: 'Trao đổi chuyên môn Mobile Architecture & tối ưu hiệu năng ứng dụng cùng Engineering Manager.',
      createdAt: '2026-11-12T10:30:00.000Z',
    },
  });
  await ensureApplication({
    jobId: jobVngMobile.id,
    candidateId: candGiaKhiem.user.id,
    cvId: candGiaKhiem.cv.id,
    coverLetter:
      'Em có 2 năm kinh nghiệm phát triển ứng dụng Flutter/Dart trên iOS & Android tại TP.HCM, nắm vững Clean Architecture và tích hợp Video Call thời gian thực.',
    appliedDate: new Date('2026-10-03T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobVngMobile.id,
    candidateId: candQuocBao.user.id,
    cvId: candQuocBao.cv.id,
    coverLetter:
      'Em đã phát triển ứng dụng di động đa nền tảng bằng React Native trong đồ án tốt nghiệp và mong muốn tìm kiếm cơ hội phát triển mảng Mobile tại TP.HCM.',
    appliedDate: new Date('2026-10-09T10:00:00.000Z'),
  });

  // [Vị trí 13 - VNG] Senior Product UI/UX Designer — 2 CV
  await ensureApplication({
    jobId: jobVngDesign.id,
    candidateId: candMinhChau.user.id,
    cvId: candMinhChau.cv.id,
    coverLetter:
      'Mình hiện làm việc tại Quận 7, có 3.5 năm kinh nghiệm dẫn dắt thiết kế UI/UX & Design System trên Figma cho ứng dụng ví số và thương mại điện tử quy mô lớn.',
    appliedDate: new Date('2026-11-04T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobVngDesign.id,
    candidateId: candKhanhLinh.user.id,
    cvId: candKhanhLinh.cv.id,
    coverLetter:
      'Em rất ấn tượng với hệ sinh thái sản phẩm của VNG và xin gửi Portfolio UI/UX cùng 2.5 năm kinh nghiệm xây dựng Design System trên Figma và Usability Testing.',
    appliedDate: new Date('2026-11-06T10:00:00.000Z'),
  });

  // [Vị trí 14 - VNG] Cloud & Site Reliability Engineer (SRE / DevOps) — 3 CV
  await ensureApplication({
    jobId: jobVngCloud.id,
    candidateId: candGiaHuy.user.id,
    cvId: candGiaHuy.cv.id,
    coverLetter:
      'Mình gửi hồ sơ ứng tuyển vị trí Cloud & SRE Engineer với 3.5 năm kinh nghiệm vận hành Kubernetes, Terraform, Linux, Prometheus/Grafana và AWS/GCP.',
    appliedDate: new Date('2026-11-08T10:00:00.000Z'),
    defaultStatus: 'ACCEPTED',
  });
  await ensureApplication({
    jobId: jobVngCloud.id,
    candidateId: candThanhDat.user.id,
    cvId: candThanhDat.cv.id,
    coverLetter:
      'Mình đang làm việc tại TP.HCM, sở hữu chứng chỉ Kubernetes CKA và 2.5 năm kinh nghiệm vận hành cụm Kubernetes 40+ node, Terraform và CI/CD với uptime 99.98%.',
    appliedDate: new Date('2026-11-10T10:00:00.000Z'),
  });
  await ensureApplication({
    jobId: jobVngCloud.id,
    candidateId: candHoangNam.user.id,
    cvId: candHoangNam.cv.id,
    coverLetter:
      'Mình có 2.5 năm kinh nghiệm vận hành dịch vụ phân tán trên Linux, Docker, CI/CD và Redis/PostgreSQL chịu tải cao, mong muốn phát triển sâu hướng SRE tại VNG Cloud.',
    appliedDate: new Date('2026-11-11T10:00:00.000Z'),
  });

  // Dọn dẹp các đơn ứng tuyển mẫu cũ bị lệch vị trí (chỉ trong phạm vi 16 tài khoản mẫu, giữ nguyên 100% đơn của tài khoản người dùng thật)
  const seededCandUserIds = seededCandidates.map((c) => c.user.id);
  const staleApps = await prisma.application.findMany({
    where: {
      candidateId: { in: seededCandUserIds },
      id: { notIn: keptSeededAppIds },
    },
    select: { id: true },
  });
  if (staleApps.length > 0) {
    const staleIds = staleApps.map((a) => a.id);
    await prisma.message.deleteMany({ where: { applicationId: { in: staleIds } } });
    await prisma.application.deleteMany({ where: { id: { in: staleIds } } });
  }

  // Thống kê kiểm tra chi tiết từng công ty và toàn hệ thống
  const [uCount, recCount, candCount, jobCount, cvCount, appCount] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { roleId: getRoleId('RECRUITER') } }),
    prisma.user.count({ where: { roleId: getRoleId('CANDIDATE') } }),
    prisma.job.count(),
    prisma.cV.count(),
    prisma.application.count(),
  ]);

  const allJobsWithCount = await prisma.job.findMany({
    include: {
      company: { select: { name: true } },
      _count: { select: { applications: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('✓ Đồng bộ dữ liệu thực tế hoàn tất:');
  console.log(
    `  - Tổng tài khoản người dùng: ${uCount} (Admin: 1, Nhà tuyển dụng: ${recCount}, Ứng viên: ${candCount})`
  );
  console.log(`  - Tổng tin tuyển dụng: ${jobCount}`);
  console.log(`  - Tổng hồ sơ CV chuẩn A4: ${cvCount}`);
  console.log(`  - Tổng lượt nộp CV ứng tuyển: ${appCount}`);
  console.log('  - Phân bổ CV theo từng vị trí:');
  for (const j of allJobsWithCount) {
    console.log(`    • [${j.company.name}] ${j.title}: ${j._count.applications} CV`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
