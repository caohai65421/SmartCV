import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Briefcase,
  FileText,
  Building2,
  UserRound,
  CheckCircle2,
  ArrowRight,
  Mail,
  DollarSign,
  Clock,
  LogIn,
  UserPlus,
} from 'lucide-react';
import api from '../services/api';

interface LandingJobItem {
  id: string;
  title: string;
  location: string;
  salary?: string;
  deadline?: string;
  status?: string;
  company?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [latestJobs, setLatestJobs] = useState<LandingJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    let mounted = true;
    api
      .get('/jobs')
      .then((res) => {
        if (!mounted) return;
        const list: LandingJobItem[] = res.data?.jobs || [];
        const openJobs = list.filter((j) => j.status !== 'CLOSED');
        setLatestJobs(openJobs.slice(0, 6));
      })
      .catch(() => {
        if (mounted) setLatestJobs([]);
      })
      .finally(() => {
        if (mounted) setLoadingJobs(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('keyword', keyword.trim());
    if (location.trim()) params.set('location', location.trim());
    const qs = params.toString();
    navigate(qs ? `/jobs?${qs}` : '/jobs');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      {/* 1. KHU VỰC MỞ ĐẦU (HERO) */}
      <section className="bg-gradient-to-b from-sky-50/90 via-teal-50/40 to-slate-50 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Cột trái: Thông điệp chính + Tìm kiếm nhanh + Nút Đăng nhập / Đăng ký */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-teal-200 text-teal-800 text-xs font-semibold shadow-2xs">
                <Briefcase size={14} className="text-teal-600" />
                <span>Cổng thông tin việc làm & Hồ sơ CV trực tuyến</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-bold text-slate-900 leading-tight tracking-tight">
                Kết nối ứng viên tài năng với{' '}
                <span className="text-primary-700">doanh nghiệp uy tín</span> trên toàn quốc
              </h1>

              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
                Khởi tạo hồ sơ CV chuẩn khổ A4, đính kèm tệp PDF sẵn có từ máy tính, tra cứu việc
                làm theo vị trí bản đồ và nhận thư mời phỏng vấn trực tiếp qua hộp thư Gmail hoàn
                toàn miễn phí.
              </p>

              {/* Thanh tra cứu công việc nhanh */}
              <form
                onSubmit={handleQuickSearch}
                className="bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <Search size={17} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Vị trí công việc, kỹ năng (VD: Frontend, Java, Tester...)"
                    className="w-full bg-transparent text-sm text-slate-800 focus:outline-none"
                  />
                </div>

                <div className="sm:w-48 flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <MapPin size={16} className="text-teal-600 shrink-0" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="">Tất cả địa điểm</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Tìm việc làm
                </button>
              </form>

              {/* Cụm nút điều hướng rõ ràng trước khi Đăng nhập / Đăng ký */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors shadow-2xs"
                >
                  <LogIn size={16} />
                  <span>Đăng nhập hệ thống</span>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-sky-50 text-primary-700 border border-primary-200 text-sm font-semibold transition-colors"
                >
                  <UserPlus size={16} />
                  <span>Đăng ký tài khoản mới</span>
                </Link>
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:text-teal-700 transition-colors"
                >
                  <span>Xem danh sách việc làm</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            {/* Cột phải: Thẻ điểm nhấn tiện ích của nền tảng */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-sm space-y-5">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Vì sao nên bắt đầu cùng SmartCV?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Quy trình ứng tuyển và sàng lọc hồ sơ rõ ràng, thuận tiện cho cả hai phía.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: FileText,
                      color: 'bg-sky-50 text-sky-700 border-sky-200',
                      title: 'Thiết kế CV chuẩn A4 & Đính kèm PDF linh hoạt',
                      desc: 'Tạo CV trực tuyến xuất PDF sắc nét hoặc tải trực tiếp file CV .pdf từ máy tính khi nộp đơn.',
                    },
                    {
                      icon: Search,
                      color: 'bg-teal-50 text-teal-700 border-teal-200',
                      title: 'Bộ lọc chuyên sâu & Bản đồ việc làm quanh bạn',
                      desc: 'Tra cứu nhanh theo mức lương, cấp bậc kinh nghiệm, hình thức làm việc và khoảng cách thực tế.',
                    },
                    {
                      icon: Mail,
                      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      title: 'Thông báo kết quả & Lịch phỏng vấn qua Gmail',
                      desc: 'Tự động gửi thư mời phỏng vấn chi tiết kèm hình thức Online/Trực tiếp thẳng tới email cá nhân.',
                    },
                  ].map((feat, idx) => {
                    const Icon = feat.icon;
                    return (
                      <div key={idx} className="flex items-start gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${feat.color}`}
                        >
                          <Icon size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{feat.title}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CHỌN VAI TRÒ THAM GIA (ỨNG VIÊN HOẶC NHÀ TUYỂN DỤNG) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Lựa chọn vai trò phù hợp với nhu cầu của bạn
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
            Tất cả tính năng dành cho Ứng viên và Nhà tuyển dụng trên SmartCV đều mở miễn phí.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Ứng viên */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-primary-700 flex items-center justify-center">
                <UserRound size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Dành cho Ứng viên tìm việc
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Xây dựng hồ sơ chuyên nghiệp và tiếp cận hàng trăm vị trí mở tuyển mỗi ngày.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Khởi tạo và quản lý nhiều mẫu CV chuẩn khổ A4, xuất file PDF nhanh chóng.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Xem mức độ phù hợp kỹ năng giữa hồ sơ cá nhân với từng công việc.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Nhắn tin trực tiếp với phòng Nhân sự và theo dõi lịch hẹn phỏng vấn.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/register?role=CANDIDATE"
                className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Đăng ký Ứng viên
              </Link>
              <Link
                to="/jobs"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                Khám phá việc làm
              </Link>
            </div>
          </div>

          {/* Card Nhà tuyển dụng */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Dành cho Nhà tuyển dụng & Doanh nghiệp
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Đăng tin tuyển dụng, quản lý hồ sơ ứng viên và đặt lịch phỏng vấn tập trung.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Đăng mới, chỉnh sửa nội dung và gia hạn hạn nộp hồ sơ bất cứ lúc nào.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Xem trực tiếp hồ sơ CV chuẩn A4 hoặc tải tệp PDF đính kèm của ứng viên.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                  <span>Gửi thư mời phỏng vấn tự động tới hộp thư Gmail của ứng viên chỉ với 1 chạm.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/register?role=RECRUITER"
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold transition-colors"
              >
                Đăng ký Nhà tuyển dụng
              </Link>
              <Link
                to="/login"
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors"
              >
                Đăng nhập Doanh nghiệp
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. VIỆC LÀM NỔI BẬT ĐANG MỞ TUYỂN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Vị trí tuyển dụng đang mở mới nhất
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Bạn có thể xem trước yêu cầu chi tiết của từng công việc trước khi đăng nhập nộp hồ sơ.
            </p>
          </div>
          <Link
            to="/jobs"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline"
          >
            <span>Xem tất cả việc làm</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {loadingJobs ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-40 rounded-2xl bg-white border border-slate-200/80 animate-pulse p-5"
              />
            ))}
          </div>
        ) : latestJobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">
            Hiện chưa có tin tuyển dụng nào đang mở.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-primary-300 p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 p-1.5">
                    {job.company?.logoUrl ? (
                      <img
                        src={job.company.logoUrl}
                        alt={job.company.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Building2 size={22} className="text-primary-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-primary-700 transition-colors line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium truncate mt-1">
                      {job.company?.name || 'Doanh nghiệp đối tác'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate max-w-[55%]">
                    <MapPin size={13} className="text-primary-500 shrink-0" />
                    <span className="truncate">{job.location}</span>
                  </span>
                  {job.salary ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold">
                      <DollarSign size={12} />
                      <span>{job.salary}</span>
                    </span>
                  ) : (
                    job.deadline && (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <Clock size={12} />
                        <span>{new Date(job.deadline).toLocaleDateString('vi-VN')}</span>
                      </span>
                    )
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4. QUY TRÌNH 3 BƯỚC RÕ RÀNG */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 text-center mb-6">
            Bắt đầu ứng tuyển chỉ với 3 bước đơn giản
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Đăng ký tài khoản miễn phí',
                desc: 'Chọn vai trò Ứng viên hoặc Nhà tuyển dụng để mở không gian làm việc phù hợp.',
              },
              {
                step: '02',
                title: 'Chuẩn bị CV & Ứng tuyển',
                desc: 'Thiết kế CV chuẩn A4 trực tuyến hoặc tải file PDF sẵn có từ máy tính để nộp đơn.',
              },
              {
                step: '03',
                title: 'Trò chuyện & Nhận lịch hẹn',
                desc: 'Trao đổi trực tiếp với Nhà tuyển dụng và nhận thư mời phỏng vấn qua Gmail.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2"
              >
                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-primary-600 text-white text-xs font-bold">
                  Bước {item.step}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
