import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Building2,
  Sparkles,
  ShieldCheck,
  Info,
  CheckCircle2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export interface FooterInfoArticle {
  id: string;
  category: 'ABOUT' | 'PARTNER' | 'AI_FEATURE' | 'POLICY';
  badge: string;
  title: string;
  subtitle: string;
  paragraphs: string[];
  highlights: string[];
  meta?: {
    headquarters?: string;
    scale?: string;
    techStack?: string;
    website?: string;
  };
  ctaLabel?: string;
  ctaLink?: string;
}

export const FOOTER_INFO_ARTICLES: Record<string, FooterInfoArticle> = {
  // ================= VỀ SMARTCV =================
  'gioi-thieu': {
    id: 'gioi-thieu',
    category: 'ABOUT',
    badge: 'Về SmartCV',
    title: 'Giới thiệu nền tảng SmartCV',
    subtitle: 'Nền tảng kết nối nhân tài & tuyển dụng thông minh tích hợp AI thế hệ mới',
    paragraphs: [
      'SmartCV là nền tảng tuyển dụng trực tuyến hiện đại, giúp kết nối trực tiếp Ứng viên và Nhà tuyển dụng thông qua công nghệ phân tích hồ sơ thông minh (AI CV Matching) và kênh trò chuyện thời gian thực.',
      'Với trình thiết kế CV chuẩn A4 xuất PDF sắc nét cùng trợ lý AI gợi ý việc làm theo từ khóa chuyên môn và khoảng cách địa lý, SmartCV giúp ứng viên rút ngắn 70% thời gian tìm kiếm công việc phù hợp.',
    ],
    highlights: [
      'Thiết kế & quản lý CV chuẩn A4, tải ảnh đại diện trực tiếp và xuất PDF nhanh chóng.',
      'Trợ lý AI phân tích từ khóa CV, gợi ý công việc mới nhất và gần địa chỉ đang ở nhất.',
      'Nhà tuyển dụng sàng lọc, chấm điểm Match Score và hẹn lịch phỏng vấn minh bạch.',
      'Trò chuyện trực tiếp thời gian thực (Socket.io) giữa Ứng viên và Nhà tuyển dụng.',
    ],
    ctaLabel: 'Khám phá việc làm ngay',
    ctaLink: '/jobs',
  },
  'tuyen-dung-nhan-su': {
    id: 'tuyen-dung-nhan-su',
    category: 'ABOUT',
    badge: 'Cơ hội tại SmartCV',
    title: 'Tuyển dụng nhân sự nội bộ SmartCV',
    subtitle: 'Gia nhập đội ngũ phát triển sản phẩm HRTech hàng đầu tại Việt Nam',
    paragraphs: [
      'Tại SmartCV, chúng tôi luôn chào đón các kỹ sư phần mềm, chuyên gia AI/Data, Product Designer và chuyên viên phát triển kinh doanh có niềm đam mê xây dựng giải pháp công nghệ phục vụ hàng triệu người lao động.',
      'Môi trường làm việc trẻ trung, minh bạch, khuyến khích sáng tạo và tạo điều kiện tối đa để mỗi thành viên phát triển sự nghiệp bền vững.',
    ],
    highlights: [
      'Chế độ lương thưởng cạnh tranh, đánh giá hiệu suất định kỳ 2 lần/năm.',
      'Hỗ trợ làm việc linh hoạt Hybrid, trang bị đầy đủ thiết bị làm việc hiện đại.',
      'Cơ hội làm việc trực tiếp với các bài toán AI NLP, Matching Engine và Realtime System.',
      'Gửi CV ứng tuyển nội bộ trực tiếp tới: tuyendung@smartcv.vn.',
    ],
    ctaLabel: 'Tạo CV ứng tuyển ngay',
    ctaLink: '/cv-builder',
  },
  'lien-he-hop-tac': {
    id: 'lien-he-hop-tac',
    category: 'ABOUT',
    badge: 'Hợp tác doanh nghiệp',
    title: 'Liên hệ hợp tác cùng SmartCV',
    subtitle: 'Đồng hành cùng doanh nghiệp và trường đại học trong chiến lược thu hút nhân tài',
    paragraphs: [
      'SmartCV cung cấp giải pháp đăng tin tuyển dụng, quảng bá thương hiệu nhà tuyển dụng (Employer Branding) và kết nối ngày hội việc làm (Job Fair) cho các doanh nghiệp CNTT, Tài chính, Thương mại điện tử và các trường Đại học trên toàn quốc.',
      'Đội ngũ tư vấn doanh nghiệp của SmartCV luôn sẵn sàng thiết kế gói giải pháp tuyển dụng tối ưu theo nhu cầu thực tế của từng đối tác.',
    ],
    highlights: [
      'Hotline đối tác doanh nghiệp: 1900 6868 89 (Nhánh 2 - Giờ hành chính).',
      'Email hợp tác chiến lược: hotro@smartcv.vn | partnership@smartcv.vn.',
      'Hỗ trợ xác thực tài khoản Nhà tuyển dụng và đồng hành truyền thông tuyển dụng.',
    ],
  },
  'hoi-dap': {
    id: 'hoi-dap',
    category: 'ABOUT',
    badge: 'Trung tâm hỗ trợ',
    title: 'Hỏi đáp thường gặp (FAQ)',
    subtitle: 'Giải đáp nhanh các thắc mắc của Ứng viên và Nhà tuyển dụng trên SmartCV',
    paragraphs: [
      '1. Làm thế nào để tạo và nộp CV trên SmartCV? — Bạn đăng nhập tài khoản Ứng viên, vào mục Quản lý CV để tạo CV trực tuyến (chọn ảnh chân dung từ máy, điền kinh nghiệm, kỹ năng) rồi bấm Ứng tuyển ngay tại tin tuyển dụng mong muốn.',
      '2. Trợ lý AI gợi ý việc làm dựa trên tiêu chí nào? — Hệ thống tự động trích xuất các từ khóa kỹ năng quan trọng trong CV của bạn kết hợp với địa chỉ hiện tại để ưu tiên việc làm mới nhất, gần bạn nhất và có độ khớp cao nhất.',
      '3. Khi nào tôi có thể nhắn tin với Nhà tuyển dụng? — Ngay sau khi nộp hồ sơ hoặc bấm Trò chuyện với Nhà tuyển dụng, bạn có thể trao đổi thời gian thực và nhận thông báo lịch phỏng vấn trực tiếp trên hệ thống.',
    ],
    highlights: [
      'Tạo CV và ứng tuyển việc làm hoàn toàn miễn phí cho Ứng viên.',
      'Theo dõi trạng thái duyệt CV (Đang chờ, Đã chấp nhận, Lịch phỏng vấn) theo thời gian thực.',
      'Hỗ trợ khôi phục và đổi mật khẩu bảo mật qua Email.',
    ],
  },
  'chinh-sach-bao-mat': {
    id: 'chinh-sach-bao-mat',
    category: 'POLICY',
    badge: 'Pháp lý & Quyền riêng tư',
    title: 'Chính sách quyền riêng tư',
    subtitle: 'Cam kết bảo vệ dữ liệu cá nhân và hồ sơ nghề nghiệp của người dùng',
    paragraphs: [
      'SmartCV tôn trọng và cam kết bảo mật tuyệt đối thông tin cá nhân của Ứng viên cũng như dữ liệu tuyển dụng của Doanh nghiệp theo quy định pháp luật hiện hành về bảo vệ dữ liệu cá nhân.',
      'Thông tin trong CV (họ tên, email, số điện thoại, kinh nghiệm làm việc) chỉ được chia sẻ tới đúng Nhà tuyển dụng mà Ứng viên chủ động nộp hồ sơ ứng tuyển.',
    ],
    highlights: [
      'Mật khẩu tài khoản được mã hóa một chiều chuẩn bcrypt an toàn.',
      'Phiên đăng nhập được bảo vệ bằng chuẩn xác thực JWT (JSON Web Token).',
      'Ứng viên có toàn quyền chỉnh sửa, cập nhật hoặc xóa hồ sơ CV bất kỳ lúc nào.',
      'Tuyệt đối không cung cấp dữ liệu người dùng cho bên thứ ba vì mục đích quảng cáo rác.',
    ],
  },
  'dieu-khoan-dich-vu': {
    id: 'dieu-khoan-dich-vu',
    category: 'POLICY',
    badge: 'Điều khoản sử dụng',
    title: 'Điều khoản dịch vụ SmartCV',
    subtitle: 'Quy định quyền và trách nhiệm khi tham gia hệ thống tuyển dụng SmartCV',
    paragraphs: [
      'Khi đăng ký và sử dụng nền tảng SmartCV, Ứng viên cam kết cung cấp thông tin trung thực trong hồ sơ năng lực, và Nhà tuyển dụng cam kết đăng tải thông tin vị trí việc làm, mức lương, địa điểm làm việc minh bạch, chính xác.',
      'Ban quản trị SmartCV có quyền tạm khóa hoặc gỡ bỏ các tin tuyển dụng vi phạm quy chuẩn cộng đồng, yêu cầu thu phí ứng viên trái phép hoặc mạo danh thương hiệu doanh nghiệp.',
    ],
    highlights: [
      'Nghiêm cấm mọi hành vi thu phí tuyển dụng trái phép đối với ứng viên.',
      'Thông tin mô tả công việc và quyền lợi phải rõ ràng, trung thực.',
      'Giao tiếp văn minh, tôn trọng lẫn nhau qua kênh Chat trực tiếp trên hệ thống.',
    ],
  },

  // ================= ĐỐI TÁC TIÊU BIỂU =================
  'fpt-software': {
    id: 'fpt-software',
    category: 'PARTNER',
    badge: 'Đối tác chiến lược CNTT',
    title: 'FPT Software',
    subtitle: 'Công ty thành viên thuộc Tập đoàn FPT — Doanh nghiệp xuất khẩu phần mềm hàng đầu Đông Nam Á',
    paragraphs: [
      'FPT Software là đối tác tuyển dụng tiêu biểu trên nền tảng SmartCV, thường xuyên tuyển dụng hàng trăm kỹ sư phần mềm, chuyên gia Cloud, AI, Automotive và kiểm thử phần mềm tại Hà Nội, Đà Nẵng và TP. Hồ Chí Minh.',
      'Thông qua hệ thống AI CV Matching của SmartCV, ứng viên ứng tuyển vào FPT Software được đánh giá hồ sơ nhanh chóng, phản hồi kết quả xét duyệt và đặt lịch phỏng vấn trực tuyến minh bạch.',
    ],
    meta: {
      headquarters: 'Tòa nhà FPT, Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội',
      scale: '30.000+ nhân sự toàn cầu',
      techStack: 'React, Next.js, Java Spring, .NET, Cloud AWS/Azure, AI/Data',
      website: 'https://fptsoftware.com',
    },
    highlights: [
      'Môi trường làm việc chuẩn quốc tế với khách hàng tại Nhật Bản, Mỹ, Châu Âu.',
      'Lộ trình thăng tiến rõ ràng cho cả Thực tập sinh, Junior và Senior/Architect.',
      'Đang mở nhiều vị trí Frontend, Backend, Mobile, DevOps và UI/UX trên SmartCV.',
    ],
    ctaLabel: 'Xem việc làm tại FPT Software',
    ctaLink: '/jobs?keyword=Frontend',
  },
  'viettel-digital': {
    id: 'viettel-digital',
    category: 'PARTNER',
    badge: 'Đối tác Công nghệ & Fintech',
    title: 'Viettel Digital (Tổng Công ty Dịch vụ Số Viettel)',
    subtitle: 'Đơn vị tiên phong kiến tạo hệ sinh thái tài chính số & chuyển đổi số tại Việt Nam',
    paragraphs: [
      'Viettel Digital là đơn vị chủ lực của Tập đoàn Công nghiệp – Viễn thông Quân đội (Viettel) trong lĩnh vực tài chính số (Viettel Money), dữ liệu lớn (Big Data), trí tuệ nhân tạo và nền tảng thanh toán điện tử phục vụ hàng chục triệu người dùng.',
      'Hợp tác cùng SmartCV, Viettel Digital mang tới nhiều cơ hội nghề nghiệp hấp dẫn với chế độ đãi ngộ hàng đầu dành cho các kỹ sư Backend, Mobile, Security, BA và Data Engineer.',
    ],
    meta: {
      headquarters: 'Số 1 Giang Văn Minh, Quận Ba Đình, Hà Nội',
      scale: '2.500+ chuyên gia công nghệ & tài chính số',
      techStack: 'Microservices, Java, Golang, Kafka, Kubernetes, AI/ML',
      website: 'https://vietteldigital.com',
    },
    highlights: [
      'Tham gia vận hành hệ thống giao dịch tài chính quy mô hàng triệu người dùng đồng thời.',
      'Chế độ phúc lợi toàn diện, thưởng dự án và thưởng hiệu quả kinh doanh hấp dẫn.',
      'Ưu tiên ứng viên có nền tảng thuật toán, hệ thống phân tán và bảo mật tốt.',
    ],
    ctaLabel: 'Khám phá việc làm liên quan',
    ctaLink: '/jobs?keyword=Backend',
  },
  'vng-corporation': {
    id: 'vng-corporation',
    category: 'PARTNER',
    badge: 'Đối tác Kỳ lân Công nghệ',
    title: 'VNG Corporation',
    subtitle: 'Kỳ lân công nghệ đầu tiên của Việt Nam với hệ sinh thái Zalo, Zalopay, VNGGames & VNG Cloud',
    paragraphs: [
      'Được thành lập từ năm 2004 với sứ mệnh "Kiến tạo công nghệ và phát triển con người", VNG xây dựng hệ sinh thái sản phẩm số gắn liền với đời sống hàng ngày của hơn 75 triệu người dùng Việt Nam và vươn tầm khu vực.',
      'Trên nền tảng SmartCV, VNG là điểm đến mơ ước của các kỹ sư đam mê sản phẩm người dùng quy mô lớn (High-traffic Consumer Products), Cloud Computing và AI.',
    ],
    meta: {
      headquarters: 'VNG Campus, Khu chế xuất Tân Thuận, Quận 7, TP. Hồ Chí Minh',
      scale: '4.000+ nhân sự tại Việt Nam & Châu Á',
      techStack: 'C++, Go, Java, React Native, Flutter, Big Data, Cloud Native',
      website: 'https://vng.com.vn',
    },
    highlights: [
      'Văn hóa làm việc cởi mở tại VNG Campus hiện đại bậc nhất Việt Nam.',
      'Chương trình đào tạo Fresher/Associate bài bản cho sinh viên mới tốt nghiệp.',
      'Cơ hội phát triển các sản phẩm AI và Cloud quy mô khu vực.',
    ],
    ctaLabel: 'Khám phá việc làm liên quan',
    ctaLink: '/jobs?keyword=Mobile',
  },
  'kms-technology': {
    id: 'kms-technology',
    category: 'PARTNER',
    badge: 'Đối tác Phát triển Phần mềm Quốc tế',
    title: 'KMS Technology',
    subtitle: 'Công ty tư vấn, phát triển phần mềm và ươm tạo sản phẩm công nghệ chuẩn Hoa Kỳ',
    paragraphs: [
      'KMS Technology nổi tiếng với chất lượng kỹ thuật phần mềm xuất sắc, dịch vụ tư vấn chuyển đổi số, kiểm thử tự động (Automation Testing) và vườn ươm các sản phẩm SaaS thành công trên thị trường quốc tế (như Katalon, Kobiton).',
      'KMS Technology hợp tác trên SmartCV nhằm kết nối với đội ngũ kỹ sư phần mềm có tư duy sản phẩm tốt, kỹ năng tiếng Anh giao tiếp chuyên nghiệp và đam mê công nghệ hiện đại.',
    ],
    meta: {
      headquarters: 'Quận Tân Bình & Quận Phú Nhuận, TP. Hồ Chí Minh | Đà Nẵng',
      scale: '1.600+ kỹ sư phần mềm & chuyên gia QA/BA',
      techStack: 'TypeScript, React, Node.js, Java, Python, Automation QA, AI',
      website: 'https://kms-technology.com',
    },
    highlights: [
      'Nhiều năm liền được vinh danh nơi làm việc tốt nhất ngành CNTT tại Việt Nam.',
      'Chính sách làm việc Hybrid linh hoạt, chú trọng cân bằng công việc và cuộc sống.',
      'Đào tạo chuyên sâu kỹ năng Engineering Excellence và ngoại ngữ.',
    ],
    ctaLabel: 'Khám phá việc làm liên quan',
    ctaLink: '/jobs?keyword=Fullstack',
  },

  // ================= KHÁM PHÁ TÍNH NĂNG AI =================
  'ai-goi-y-viec-lam': {
    id: 'ai-goi-y-viec-lam',
    category: 'AI_FEATURE',
    badge: 'Công nghệ SmartCV AI',
    title: 'Trợ lý AI gợi ý việc làm theo CV & Địa chỉ',
    subtitle: 'Tự động kết nối đúng người, đúng việc, gần nơi ở nhất',
    paragraphs: [
      'Trợ lý AI của SmartCV tự động đọc hiểu nội dung CV cá nhân của ứng viên, bóc tách các từ khóa công nghệ và kỹ năng cốt lõi (như React, TypeScript, Node.js, UI/UX, IELTS...), kết hợp với địa chỉ hiện tại của ứng viên.',
      'Ngay khi có tin tuyển dụng mới được đăng tải, hệ thống thông báo tức thì các công việc mới nhất, tính khoảng cách ước tính (~km) và ưu tiên những vị trí phù hợp nhất.',
    ],
    highlights: [
      'Cập nhật địa chỉ đang ở ngay trong khung chat để lọc việc làm gần nhà.',
      'Thẻ thông báo "Việc làm mới được cập nhật" hiển thị trực quan các cơ hội tốt nhất.',
      'Hỏi đáp tự nhiên bằng tiếng Việt với Trợ lý AI ở góc phải màn hình.',
    ],
  },
  'ai-cham-diem-cv': {
    id: 'ai-cham-diem-cv',
    category: 'AI_FEATURE',
    badge: 'Dành cho Nhà tuyển dụng',
    title: 'AI tự động chấm điểm & xếp hạng CV',
    subtitle: 'Sàng lọc hồ sơ đa tiêu chí nhanh gấp 5 lần phương pháp thủ công',
    paragraphs: [
      'Thay vì phải đọc thủ công hàng trăm hồ sơ, hệ thống AI của SmartCV tự động chấm điểm và xếp hạng danh sách ứng viên nộp vào từng vị trí dựa trên 4 nhóm tiêu chí: Từ khóa kỹ năng yêu cầu, Số năm kinh nghiệm, Trình độ ngoại ngữ và Chứng chỉ/Giải thưởng.',
    ],
    highlights: [
      'Tự động gắn hạng #1, #2, #3 kèm giải thích chi tiết điểm mạnh và điểm cần lưu ý.',
      'Hỗ trợ Nhà tuyển dụng lọc nhanh CV đạt ngưỡng phù hợp cao.',
      'Đảm bảo tính khách quan, công bằng cho mọi hồ sơ ứng tuyển.',
    ],
  },
  'ai-match-score': {
    id: 'ai-match-score',
    category: 'AI_FEATURE',
    badge: 'Phân tích độ khớp',
    title: 'Phân tích mức độ phù hợp (Match Score %)',
    subtitle: 'Đo lường chính xác tỷ lệ tương thích giữa Hồ sơ Ứng viên và Yêu cầu Công việc',
    paragraphs: [
      'Chỉ số Match Score (%) trên SmartCV cho biết mức độ tương thích giữa kỹ năng, kinh nghiệm thực tế trong CV của ứng viên so với bản mô tả công việc (JD) của Nhà tuyển dụng.',
      'Ứng viên có thể dựa vào gợi ý từ khóa còn thiếu để bổ sung và hoàn thiện CV trước khi nhấn nộp đơn ứng tuyển.',
    ],
    highlights: [
      'Hiển thị trực quan phần trăm phù hợp ngay trên từng gợi ý việc làm.',
      'Liệt kê rõ các từ khóa quan trọng trong CV đã khớp với tin tuyển dụng.',
      'Giúp tăng tỷ lệ được Nhà tuyển dụng chấp nhận CV và mời phỏng vấn.',
    ],
  },
  'chat-thoi-gian-thuc': {
    id: 'chat-thoi-gian-thuc',
    category: 'AI_FEATURE',
    badge: 'Kết nối trực tiếp',
    title: 'Trò chuyện thời gian thực với Nhà tuyển dụng',
    subtitle: 'Trao đổi trực tiếp 1-1 qua Socket.io không qua trung gian hay bot trả lời tự động',
    paragraphs: [
      'SmartCV tích hợp kênh trò chuyện trực tiếp theo thời gian thực giữa Ứng viên và Nhà tuyển dụng. Mọi tin nhắn trao đổi về công việc, mức lương và lịch hẹn phỏng vấn đều được truyền tải tức thì; đồng thời tích hợp Trung tâm Chăm sóc khách hàng (CSKH) giải đáp nhanh các thắc mắc trong quá trình sử dụng.',
    ],
    highlights: [
      'Giao diện cửa sổ chat rộng rãi, lưu trữ đầy đủ lịch sử hội thoại.',
      'Tích hợp tính năng đặt và thông báo lịch hẹn phỏng vấn Online / Offline.',
      'Trung tâm CSKH hỗ trợ theo chủ đề và tiếp nhận phiếu yêu cầu trực tuyến.',
    ],
  },
  'github-portfolio': {
    id: 'github-portfolio',
    category: 'AI_FEATURE',
    badge: 'Hồ sơ năng lực số',
    title: 'Liên kết GitHub & Portfolio trực tiếp trên CV',
    subtitle: 'Khẳng định năng lực thực chiến qua dự án thật và mã nguồn mở',
    paragraphs: [
      'Trong trình tạo CV của SmartCV, ứng viên có thể đính kèm trực tiếp liên kết GitHub, Website cá nhân, Behance hoặc Portfolio dự án để Nhà tuyển dụng bấm xem ngay trên bản CV điện tử và bản xuất PDF.',
    ],
    highlights: [
      'Hiển thị nổi bật liên kết GitHub & Portfolio ngay phần thông tin liên hệ trên CV A4.',
      'Giúp ứng viên IT, Thiết kế, Marketing ghi điểm ấn tượng với dự án thực tế.',
    ],
  },

  // ================= QUY TẮC CHUNG =================
  'dieu-kien-giao-dich': {
    id: 'dieu-kien-giao-dich',
    category: 'POLICY',
    badge: 'Quy tắc chung',
    title: 'Điều kiện sử dụng chung',
    subtitle: 'Nguyên tắc hoạt động trực tuyến trên hệ thống SmartCV',
    paragraphs: [
      'Tất cả tính năng trên nền tảng bao gồm đăng ký tài khoản, tạo và xuất CV chuẩn A4, tìm kiếm việc làm, nộp đơn ứng tuyển, đăng tin tuyển dụng và sàng lọc hồ sơ đều được cung cấp đầy đủ, minh bạch cho người dùng trên SmartCV.',
      'Người dùng có trách nhiệm bảo mật thông tin đăng nhập và sử dụng nền tảng đúng mục đích kết nối tuyển dụng hợp pháp.',
    ],
    highlights: [
      'Cung cấp đầy đủ công cụ tạo CV, gợi ý việc làm và quản lý tuyển dụng.',
      'Cam kết môi trường kết nối việc làm văn minh, minh bạch và an toàn.',
    ],
  },
  'quy-trinh-duyet-ho-so': {
    id: 'quy-trinh-duyet-ho-so',
    category: 'POLICY',
    badge: 'Minh bạch tuyển dụng',
    title: 'Quy trình duyệt hồ sơ minh bạch',
    subtitle: 'Theo dõi trọn vẹn hành trình ứng tuyển từ lúc nộp CV tới lịch hẹn phỏng vấn',
    paragraphs: [
      'Mỗi đơn ứng tuyển trên SmartCV đều trải qua quy trình rõ ràng: Đã nộp hồ sơ (PENDING) → Nhà tuyển dụng xem & đánh giá → Chấp nhận hồ sơ (ACCEPTED) hoặc Chưa phù hợp (REJECTED) → Đặt lịch phỏng vấn.',
      'Mọi thay đổi trạng thái đều được gửi thông báo ngay lập tức vào biểu tượng Chuông thông báo của ứng viên.',
    ],
    highlights: [
      'Ứng viên luôn biết rõ tình trạng CV của mình, không còn cảnh chờ đợi vô vọng.',
      'Thông tin ngày, giờ, hình thức phỏng vấn (Online/Offline) hiển thị chi tiết.',
    ],
  },
  'bao-mat-ung-vien': {
    id: 'bao-mat-ung-vien',
    category: 'POLICY',
    badge: 'An toàn thông tin',
    title: 'Bảo mật thông tin cá nhân ứng viên',
    subtitle: 'Bảo vệ an toàn hồ sơ CV, ảnh đại diện và thông tin liên lạc của bạn',
    paragraphs: [
      'SmartCV áp dụng cơ chế phân quyền chặt chẽ theo vai trò (CANDIDATE, RECRUITER, ADMIN). Chỉ chính chủ ứng viên mới có quyền chỉnh sửa CV của mình, và chỉ những Nhà tuyển dụng nhận được đơn ứng tuyển của bạn mới có quyền xem chi tiết CV đó.',
    ],
    highlights: [
      'Phân quyền truy cập API nghiêm ngặt theo vai trò tài khoản.',
      'Kiểm duyệt tin tuyển dụng nhằm bảo vệ ứng viên khỏi các thông tin sai lệch.',
      'Bộ phận Chăm sóc khách hàng (CSKH) tiếp nhận và xử lý phản hồi nhanh chóng.',
    ],
  },
};

interface FooterInfoModalProps {
  articleKey: string | null;
  onClose: () => void;
}

export const FooterInfoModal: React.FC<FooterInfoModalProps> = ({ articleKey, onClose }) => {
  const navigate = useNavigate();

  if (!articleKey || !FOOTER_INFO_ARTICLES[articleKey]) return null;

  const article = FOOTER_INFO_ARTICLES[articleKey];

  const getHeaderStyle = () => {
    switch (article.category) {
      case 'PARTNER':
        return 'from-teal-700 via-emerald-700 to-cyan-800';
      case 'AI_FEATURE':
        return 'from-purple-700 via-indigo-700 to-primary-700';
      case 'POLICY':
        return 'from-slate-800 via-slate-900 to-teal-900';
      default:
        return 'from-primary-600 via-primary-700 to-teal-700';
    }
  };

  const getCategoryIcon = () => {
    switch (article.category) {
      case 'PARTNER':
        return <Building2 size={24} />;
      case 'AI_FEATURE':
        return <Sparkles size={24} />;
      case 'POLICY':
        return <ShieldCheck size={24} />;
      default:
        return <Info size={24} />;
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150 my-auto"
      >
        {/* Header */}
        <div
          className={`p-5 sm:p-6 bg-gradient-to-r ${getHeaderStyle()} text-white flex items-start justify-between gap-4 shrink-0`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 mt-0.5">
              {getCategoryIcon()}
            </div>
            <div className="min-w-0">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
                {article.badge}
              </span>
              <h3 className="text-lg sm:text-xl font-black leading-snug">{article.title}</h3>
              <p className="text-xs sm:text-sm text-white/85 mt-1 leading-relaxed">
                {article.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Đóng"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
          {/* Thông tin tóm tắt đối tác nếu có */}
          {article.meta && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-xs">
              {article.meta.headquarters && (
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-500 block">Trụ sở chính:</span>
                    <span className="font-bold text-slate-800">{article.meta.headquarters}</span>
                  </div>
                </div>
              )}
              {article.meta.scale && (
                <div className="flex items-start gap-2">
                  <Building2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-500 block">Quy mô nhân sự:</span>
                    <span className="font-bold text-slate-800">{article.meta.scale}</span>
                  </div>
                </div>
              )}
              {article.meta.techStack && (
                <div className="sm:col-span-2 flex items-start gap-2 pt-1 border-t border-teal-200/50">
                  <Sparkles size={15} className="text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-500">Công nghệ trọng tâm: </span>
                    <span className="font-extrabold text-teal-900">{article.meta.techStack}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Các đoạn nội dung chính */}
          <div className="space-y-3 leading-relaxed">
            {article.paragraphs.map((p, idx) => (
              <p key={idx} className="text-slate-700 text-xs sm:text-sm leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Điểm nổi bật */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Thông tin & Điểm nổi bật
            </h4>
            <ul className="space-y-2">
              {article.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Thông tin liên hệ nhanh cho mục Hợp tác / Giới thiệu */}
          {article.category === 'ABOUT' && (
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Phone size={14} className="text-primary-600" /> Hotline: 1900 6868 89
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Mail size={14} className="text-primary-600" /> Email: hotro@smartcv.vn
              </span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {article.meta?.website ? (
            <a
              href={article.meta.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-teal-700 hover:text-teal-900 underline"
            >
              <span>Website chính thức đối tác</span>
              <ExternalLink size={13} />
            </a>
          ) : (
            <span className="text-xs font-semibold text-slate-400">SmartCV Vietnam</span>
          )}

          <div className="flex items-center gap-2.5 ml-auto">
            {article.ctaLabel && article.ctaLink && (
              <button
                type="button"
                onClick={() => {
                  const target = article.ctaLink!;
                  onClose();
                  navigate(target);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                {article.ctaLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FooterInfoModal;
