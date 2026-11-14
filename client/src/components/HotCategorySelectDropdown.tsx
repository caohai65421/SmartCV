import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Job } from '../types';

// Bộ từ khóa gợi ý phong phú để tự động gợi ý khi người dùng gõ hoặc bấm vào ô "Vị trí ứng tuyển"
const SUGGESTED_KEYWORDS: string[] = [
  'Thực tập sinh',
  'Thực tập sinh kế toán',
  'Thực tập sinh nhân sự',
  'Thực tập sinh marketing',
  'Thực tập sinh kinh doanh',
  'Thực tập sinh IT',
  'Thực tập sinh pháp lý',
  'Thực tập sinh SEO',
  'Thực tập sinh Tester',
  'Thực tập sinh Java',
  'Thực tập sinh lập trình Web',
  'Frontend Developer',
  'Frontend Developer ReactJS',
  'Frontend Developer Next.js',
  'Backend Developer Node.js',
  'Backend Developer Java',
  'Fullstack Web Developer',
  'Mobile App Developer Flutter',
  'Mobile App Developer React Native',
  'UI/UX Product Designer',
  'DevOps & Cloud Engineer',
  'QA / Software Tester',
  'Product Manager',
  'Business Analyst (BA)',
  'Nhân viên kinh doanh (Sales)',
  'Digital Marketing',
  'Content Creator / Copywriter',
  'Kế toán tổng hợp',
  'Chuyên viên tuyển dụng Nhân sự (HR)',
  'Chăm sóc khách hàng',
  'Thiết kế đồ họa (Graphic Designer)',
  'AI Engineer / Data Analyst',
];

const RELATED_KEYWORDS: string[] = [
  'Thực tập sinh Nhân sự',
  'Thực tập sinh Marketing',
  'Frontend ReactJS / TypeScript',
  'Backend Node.js / Express',
  'Fullstack Developer',
  'UI/UX Figma Designer',
  'Chuyên viên Kinh doanh B2B',
  'Kế toán nội bộ',
  'Tester / QA Manual & Automation',
];

interface HotCategorySelectDropdownProps {
  value: string;
  onChange: (keyword: string) => void;
  onSelectSuggestion?: (keyword: string) => void;
  jobs?: Job[];
  placeholder?: string;
}

export const HotCategorySelectDropdown: React.FC<HotCategorySelectDropdownProps> = ({
  value,
  onChange,
  onSelectSuggestion,
  jobs = [],
  placeholder = 'Vị trí ứng tuyển',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đóng bảng gợi ý khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();

  // Lọc danh sách "Từ khóa gợi ý" cột bên trái
  const matchedKeywords = query
    ? SUGGESTED_KEYWORDS.filter((kw) => kw.toLowerCase().includes(query)).slice(0, 9)
    : [
        'Frontend Developer',
        'Backend Developer Node.js',
        'Thực tập sinh lập trình Web',
        'Thực tập sinh marketing',
        'Thực tập sinh kế toán',
        'Thực tập sinh nhân sự',
        'UI/UX Product Designer',
        'Fullstack Web Developer',
        'Digital Marketing',
      ];

  // Nếu người dùng gõ từ khóa chưa có trong danh sách tĩnh, thêm chính từ khóa đó lên đầu
  const displayKeywords =
    query && !matchedKeywords.some((k) => k.toLowerCase() === query)
      ? [value.trim(), ...matchedKeywords.slice(0, 8)]
      : matchedKeywords;

  // Lọc danh sách "Việc làm có thể bạn quan tâm" cột bên phải
  const suggestedJobs = (
    query
      ? jobs.filter(
          (j) =>
            j.title.toLowerCase().includes(query) ||
            j.description?.toLowerCase().includes(query) ||
            j.company?.name?.toLowerCase().includes(query)
        )
      : jobs
  ).slice(0, 6);

  // Hàm tô đậm phần từ khóa khớp với chữ người dùng đang gõ (giống hệt giao diện mẫu)
  const renderHighlightedKeyword = (fullText: string) => {
    if (!query) {
      return <span className="font-bold text-slate-800">{fullText}</span>;
    }
    const lowerText = fullText.toLowerCase();
    const matchIndex = lowerText.indexOf(query);
    if (matchIndex === -1) {
      return <span className="text-slate-500 font-medium">{fullText}</span>;
    }

    const before = fullText.slice(0, matchIndex);
    const match = fullText.slice(matchIndex, matchIndex + query.length);
    const after = fullText.slice(matchIndex + query.length);

    return (
      <span>
        {before && <span className="text-slate-500 font-medium">{before}</span>}
        <strong className="font-extrabold text-slate-800">{match}</strong>
        {after && <span className="text-slate-400 font-semibold">{after}</span>}
      </span>
    );
  };

  const handleChooseKeyword = (kw: string) => {
    onChange(kw);
    if (onSelectSuggestion) {
      onSelectSuggestion(kw);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-[1.15] z-50">
      {/* Ô nhập trực tiếp "Vị trí ứng tuyển" */}
      <div
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
        className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus-within:bg-white border border-slate-200/70 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 rounded-xl transition-all h-full"
      >
        <Search size={17} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400"
        />
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
              inputRef.current?.focus();
            }}
            className="p-0.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            title="Xóa từ khóa"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Bảng gợi ý 2 cột: Cột trái "Từ khóa gợi ý & Từ khóa liên quan" | Cột phải "Việc làm có thể bạn quan tâm" */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full md:w-[760px] lg:w-[840px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="grid grid-cols-1 md:grid-cols-12 max-h-[420px] overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* CỘT TRÁI (6/12): TỪ KHÓA GỢI Ý & TỪ KHÓA LIÊN QUAN */}
            <div className="md:col-span-6 p-4 text-left">
              <h4 className="text-sm font-extrabold text-slate-800 mb-2.5 px-2">
                Từ khóa gợi ý
              </h4>

              <div className="space-y-0.5">
                {displayKeywords.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleChooseKeyword(kw)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-xs sm:text-sm text-left transition-colors group"
                  >
                    <Search size={15} className="text-slate-400 group-hover:text-primary-600 shrink-0" />
                    <span className="truncate">{renderHighlightedKeyword(kw)}</span>
                  </button>
                ))}
              </div>

              {/* Từ khóa liên quan */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-800 mb-2 px-2">
                  Từ khóa liên quan
                </h4>
                <div className="space-y-0.5">
                  {RELATED_KEYWORDS.slice(0, 5).map((rel) => (
                    <button
                      key={rel}
                      type="button"
                      onClick={() => handleChooseKeyword(rel)}
                      className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-xs sm:text-sm text-slate-600 font-medium text-left transition-colors group"
                    >
                      <Search size={15} className="text-slate-400 group-hover:text-primary-600 shrink-0" />
                      <span className="truncate group-hover:text-slate-900">{rel}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (6/12): VIỆC LÀM CÓ THỂ BẠN QUAN TÂM */}
            <div className="md:col-span-6 p-4 bg-slate-50/30 text-left">
              <h4 className="text-sm font-extrabold text-slate-800 mb-3 px-1">
                Việc làm có thể bạn quan tâm
              </h4>

              {suggestedJobs.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy công việc trùng khớp trực tiếp. Nhấn Enter để tìm kiếm mở rộng.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {suggestedJobs.map((job) => (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 p-2.5 rounded-xl bg-white hover:bg-primary-50/50 border border-slate-100 hover:border-primary-200 transition-all group shadow-sm"
                    >
                      {/* Logo công ty */}
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {job.company?.logoUrl ? (
                          <img
                            src={job.company.logoUrl}
                            alt={job.company.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs font-black text-primary-600 flex flex-col items-center">
                            <Building2 size={18} />
                          </span>
                        )}
                      </div>

                      {/* Thông tin việc làm: Tên việc, Tên công ty in hoa, Mức lương màu xanh lá */}
                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-primary-600 transition-colors truncate">
                          {job.title}
                        </h5>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide truncate mt-0.5">
                          {job.company?.name || 'CÔNG TY TUYỂN DỤNG'}
                        </p>
                        <p className="text-xs font-extrabold text-emerald-600 mt-1">
                          {job.salary || 'Thoả thuận'}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotCategorySelectDropdown;
