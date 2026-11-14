import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Briefcase,
  FileText,
  ChevronRight,
  ChevronLeft,
  Compass,
  Map as MapIcon,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  SlidersHorizontal,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import api from '../services/api';
import { Job, CV } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ProvinceSelectDropdown from '../components/ProvinceSelectDropdown';
import HotCategorySelectDropdown from '../components/HotCategorySelectDropdown';
import JobNearbyMap from '../components/JobNearbyMap';
import { getSavedJobIds, toggleSavedJobId } from '../utils/savedJobs';
import {
  computeMatchedJobsFromCV,
  extractImportantKeywordsFromCV,
  getCandidateAddressKey,
} from '../components/AIJobAssistant';

type SalaryFilterId = 'ALL' | 'UNDER_15' | '15_TO_25' | '25_TO_40' | 'OVER_35' | 'NEGOTIABLE';
type LevelFilterId = 'ALL' | 'INTERN_FRESHER' | 'JUNIOR_MID' | 'SENIOR_LEAD';
type WorkTypeFilterId = 'ALL' | 'FULLTIME' | 'INTERNSHIP' | 'REMOTE_HYBRID';
type ApplyMethodFilterId = 'ALL' | 'REQUIRE_CV' | 'QUICK_APPLY';
type SortById = 'NEWEST' | 'SALARY_DESC' | 'SALARY_ASC' | 'TITLE_ASC';

const ITEMS_PER_PAGE = 6;

// Phân tích chuỗi mức lương (VD: "20 - 35 triệu", "Trên 30 triệu", "1500 USD", "Thỏa thuận") sang đơn vị triệu VNĐ
const parseSalaryMillion = (
  salaryRaw?: string | null
): { min: number; max: number; negotiable: boolean } => {
  if (!salaryRaw || !salaryRaw.trim()) {
    return { min: 0, max: 0, negotiable: true };
  }
  const lower = salaryRaw.toLowerCase();
  if (lower.includes('thỏa thuận') || lower.includes('thoả thuận') || lower.includes('cạnh tranh')) {
    return { min: 0, max: 0, negotiable: true };
  }

  const nums = (lower.match(/\d+(?:[.,]\d+)?/g) || []).map((n) =>
    parseFloat(n.replace(',', '.'))
  );
  if (nums.length === 0) {
    return { min: 0, max: 0, negotiable: true };
  }

  const isUsd = lower.includes('usd') || lower.includes('$');
  const factor = isUsd ? 0.025 : 1; // 1000 USD ~ 25 triệu VNĐ

  if (nums.length >= 2) {
    return {
      min: nums[0] * factor,
      max: nums[1] * factor,
      negotiable: false,
    };
  }

  const val = nums[0] * factor;
  if (lower.includes('dưới') || lower.includes('tới') || lower.includes('up to')) {
    return { min: 0, max: val, negotiable: false };
  }
  if (lower.includes('trên') || lower.includes('từ') || lower.includes('+')) {
    return { min: val, max: 999, negotiable: false };
  }
  return { min: val, max: val, negotiable: false };
};

// Suy luận cấp bậc kinh nghiệm từ tiêu đề và yêu cầu công việc
const inferJobLevel = (job: Job): 'INTERN_FRESHER' | 'JUNIOR_MID' | 'SENIOR_LEAD' => {
  const combined = `${job.title} ${job.description || ''} ${JSON.stringify(
    job.requirements || ''
  )}`.toLowerCase();

  if (
    combined.includes('thực tập') ||
    combined.includes('intern') ||
    combined.includes('fresher') ||
    combined.includes('sinh viên')
  ) {
    return 'INTERN_FRESHER';
  }

  if (
    combined.includes('senior') ||
    combined.includes('lead') ||
    combined.includes('trưởng nhóm') ||
    combined.includes('manager') ||
    combined.includes('architect') ||
    /[3-9]\+?\s*năm/.test(combined)
  ) {
    return 'SENIOR_LEAD';
  }

  return 'JUNIOR_MID';
};

// Suy luận hình thức làm việc từ mô tả công việc
const inferWorkType = (job: Job): 'INTERNSHIP' | 'REMOTE_HYBRID' | 'FULLTIME' => {
  const combined = `${job.title} ${job.location || ''} ${job.description || ''} ${JSON.stringify(
    job.requirements || ''
  )}`.toLowerCase();

  if (combined.includes('thực tập') || combined.includes('intern')) {
    return 'INTERNSHIP';
  }
  if (combined.includes('remote') || combined.includes('hybrid') || combined.includes('từ xa')) {
    return 'REMOTE_HYBRID';
  }
  return 'FULLTIME';
};

const JobListPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCandidate = user?.role?.name === 'CANDIDATE';
  const [searchParams] = useSearchParams();
  const urlKeyword = searchParams.get('keyword') || '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [myCV, setMyCV] = useState<CV | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState(urlKeyword);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNearbyMap, setShowNearbyMap] = useState(false);

  // State cho Bộ lọc nâng cao & Phân trang
  const [salaryFilter, setSalaryFilter] = useState<SalaryFilterId>('ALL');
  const [levelFilter, setLevelFilter] = useState<LevelFilterId>('ALL');
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkTypeFilterId>('ALL');
  const [applyMethodFilter, setApplyMethodFilter] = useState<ApplyMethodFilterId>('ALL');
  const [sortBy, setSortBy] = useState<SortById>('NEWEST');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Địa chỉ hiện tại của Ứng viên đang ở (tách biệt theo từng tài khoản user.id)
  const addressStorageKey = getCandidateAddressKey(user?.id);
  const [candidateAddress, setCandidateAddress] = useState<string>(
    () =>
      (user?.id && localStorage.getItem(getCandidateAddressKey(user.id))) ||
      'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội'
  );
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState(candidateAddress);
  const [aiFilterTab, setAiFilterTab] = useState<'ALL' | 'NEWEST' | 'NEAREST' | 'KEYWORD'>('ALL');

  useEffect(() => {
    const onAddrUpdated = (e: any) => {
      const addr = e?.detail?.address || localStorage.getItem(addressStorageKey);
      if (addr) {
        setCandidateAddress(addr);
        setAddressDraft(addr);
      }
    };
    window.addEventListener('cvconnect:address_updated', onAddrUpdated);
    return () => window.removeEventListener('cvconnect:address_updated', onAddrUpdated);
  }, [addressStorageKey]);

  useEffect(() => {
    api
      .get('/jobs')
      .then((res) => {
        const list: Job[] = res.data.jobs || [];
        setAllJobs(list);
      })
      .catch(() => {});

    if (isCandidate && user?.id) {
      const userAddrKey = getCandidateAddressKey(user.id);
      const cachedAddr = localStorage.getItem(userAddrKey);
      if (cachedAddr) {
        setCandidateAddress(cachedAddr);
        setAddressDraft(cachedAddr);
      }
      setSavedIds(getSavedJobIds(user.id));
      api
        .get('/cvs/my')
        .then((res) => {
          const cvList: CV[] = res.data?.cvs || [];
          const firstCV = cvList[0] || null;
          setMyCV(firstCV);
          const cvAddr =
            (firstCV?.data as any)?.address ||
            (firstCV?.data as any)?.personalInfo?.address;
          if (!localStorage.getItem(userAddrKey) && cvAddr) {
            setCandidateAddress(cvAddr);
            setAddressDraft(cvAddr);
            localStorage.setItem(userAddrKey, cvAddr);
          }
        })
        .catch(() => {});
    } else {
      setMyCV(null);
      setSavedIds([]);
    }
  }, [isCandidate, user?.id]);

  const importantCVKeywords = myCV ? extractImportantKeywordsFromCV(myCV) : [];
  const matchedJobsByCV = (() => {
    // Chỉ gợi ý việc làm khớp CV khi người dùng ĐÃ ĐĂNG NHẬP vai trò Ứng viên và ĐÃ CÓ CV
    if (!isCandidate || !myCV) return [];
    const sourceJobs = allJobs.length > 0 ? allJobs : jobs;
    if (sourceJobs.length === 0) return [];
    const evaluated = computeMatchedJobsFromCV(sourceJobs, myCV, candidateAddress);
    if (aiFilterTab === 'NEWEST') {
      return [...evaluated]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4);
    }
    if (aiFilterTab === 'NEAREST') {
      return [...evaluated]
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
        .slice(0, 4);
    }
    if (aiFilterTab === 'KEYWORD') {
      return [...evaluated]
        .sort((a, b) => (b.hitKeywords?.length || 0) - (a.hitKeywords?.length || 0))
        .slice(0, 4);
    }
    return evaluated.slice(0, 4);
  })();

  const handleSaveCandidateAddressOnHome = () => {
    const clean = addressDraft.trim();
    if (!clean) return;
    setCandidateAddress(clean);
    setEditingAddress(false);
    localStorage.setItem(addressStorageKey, clean);
    window.dispatchEvent(
      new CustomEvent('cvconnect:address_updated', { detail: { address: clean } })
    );
  };

  useEffect(() => {
    if (urlKeyword !== keyword) {
      setKeyword(urlKeyword);
    }
    fetchJobs(urlKeyword || undefined);
  }, [location, urlKeyword]);

  // Đặt lại về trang 1 mỗi khi thay đổi tiêu chí lọc nâng cao
  useEffect(() => {
    setCurrentPage(1);
  }, [salaryFilter, levelFilter, workTypeFilter, applyMethodFilter, sortBy, keyword, location]);

  const fetchJobs = async (customKeyword?: string) => {
    setLoading(true);
    try {
      const kw = customKeyword !== undefined ? customKeyword : keyword;
      const params: any = {};
      if (kw) params.keyword = kw;
      if (location) params.location = location;

      const res = await api.get('/jobs', { params });
      setJobs(res.data.jobs || []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách việc làm:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSaveJob = (jobId: string) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSavedIds(toggleSavedJobId(jobId, user.id));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const activeAdvancedFilterCount = [
    salaryFilter !== 'ALL',
    levelFilter !== 'ALL',
    workTypeFilter !== 'ALL',
    applyMethodFilter !== 'ALL',
  ].filter(Boolean).length;

  const resetAllFilters = () => {
    setKeyword('');
    setLocation('');
    setSalaryFilter('ALL');
    setLevelFilter('ALL');
    setWorkTypeFilter('ALL');
    setApplyMethodFilter('ALL');
    setSortBy('NEWEST');
    setCurrentPage(1);
    fetchJobs('');
  };

  // Áp dụng Bộ lọc nâng cao + Sắp xếp trên danh sách việc làm
  const filteredAndSortedJobs = useMemo(() => {
    const result = jobs.filter((job) => {
      // 1. Lọc theo mức lương
      if (salaryFilter !== 'ALL') {
        const sal = parseSalaryMillion(job.salary);
        if (salaryFilter === 'NEGOTIABLE') {
          if (!sal.negotiable) return false;
        } else {
          if (sal.negotiable) return false;
          if (salaryFilter === 'UNDER_15' && !(sal.min < 15)) return false;
          if (salaryFilter === '15_TO_25' && !(sal.max >= 15 && sal.min <= 25)) return false;
          if (salaryFilter === '25_TO_40' && !(sal.max >= 25 && sal.min <= 40)) return false;
          if (salaryFilter === 'OVER_35' && !(sal.max > 35 || sal.min >= 35)) return false;
        }
      }

      // 2. Lọc theo cấp bậc / kinh nghiệm
      if (levelFilter !== 'ALL') {
        if (inferJobLevel(job) !== levelFilter) return false;
      }

      // 3. Lọc theo hình thức làm việc
      if (workTypeFilter !== 'ALL') {
        if (inferWorkType(job) !== workTypeFilter) return false;
      }

      // 4. Lọc theo phương thức nộp hồ sơ
      if (applyMethodFilter === 'REQUIRE_CV' && !job.requireCV) return false;
      if (applyMethodFilter === 'QUICK_APPLY' && job.requireCV) return false;

      return true;
    });

    // Sắp xếp kết quả
    return [...result].sort((a, b) => {
      if (sortBy === 'SALARY_DESC') {
        const sa = parseSalaryMillion(a.salary);
        const sb = parseSalaryMillion(b.salary);
        const valA = sa.negotiable ? -1 : sa.max;
        const valB = sb.negotiable ? -1 : sb.max;
        return valB - valA;
      }
      if (sortBy === 'SALARY_ASC') {
        const sa = parseSalaryMillion(a.salary);
        const sb = parseSalaryMillion(b.salary);
        const valA = sa.negotiable ? 9999 : sa.min;
        const valB = sb.negotiable ? 9999 : sb.min;
        return valA - valB;
      }
      if (sortBy === 'TITLE_ASC') {
        return a.title.localeCompare(b.title, 'vi');
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [jobs, salaryFilter, levelFilter, workTypeFilter, applyMethodFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedJobs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedJobs = filteredAndSortedJobs.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const selectFilterCls =
    'w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs sm:text-[13px] font-medium text-slate-700 focus:outline-none focus:border-primary-400 focus:bg-white transition-colors cursor-pointer';

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 overflow-x-hidden">
      {/* Banner tìm kiếm tông màu sáng nhẹ nhàng, tự nhiên & đặt z-40 để Dropdown không bị Bản đồ bên dưới đè lên */}
      <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-emerald-50/60 border-b border-slate-200/80 py-6 sm:py-8 relative z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-3xl mx-auto mb-4">
            <h1 className="text-xl sm:text-3xl font-bold text-slate-800 tracking-tight">
              Tìm kiếm công việc phù hợp với bạn
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-normal max-w-xl mx-auto mt-1">
              Cập nhật việc làm mới mỗi ngày từ các doanh nghiệp uy tín trên toàn quốc
            </p>
          </div>

          {/* Thanh tìm kiếm Vị trí ứng tuyển & Tỉnh/Quận/Phường */}
          <div className="max-w-5xl mx-auto">
            <form
              onSubmit={handleSearch}
              className="relative z-40 bg-white rounded-2xl p-2 shadow-sm border border-slate-200/90 flex flex-col md:flex-row items-stretch gap-2"
            >
              {/* Ô nhập Vị trí ứng tuyển */}
              <HotCategorySelectDropdown
                value={keyword}
                onChange={(kw) => {
                  setKeyword(kw);
                  if (!kw) fetchJobs('');
                }}
                onSelectSuggestion={(kw) => fetchJobs(kw)}
                jobs={allJobs.length > 0 ? allJobs : jobs}
                placeholder="Vị trí tuyển dụng, kỹ năng..."
              />

              {/* Ô tích chọn Tỉnh/Thành phố -> Quận/Huyện -> Phường/Xã */}
              <div className="flex-[0.95] flex">
                <ProvinceSelectDropdown
                  value={location}
                  onChange={(prov) => setLocation(prov)}
                  placeholder="Tất cả tỉnh/thành phố"
                />
              </div>

              {/* Nhóm các nút hành động: Tìm kiếm & Bản đồ */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  className="flex-1 md:flex-none bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Search size={15} />
                  <span>Tìm kiếm</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNearbyMap(!showNearbyMap)}
                  className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border transition-all cursor-pointer ${
                    showNearbyMap
                      ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title="Tìm việc làm xung quanh địa chỉ của bạn"
                >
                  <Compass size={16} className={showNearbyMap ? 'text-white' : 'text-teal-600'} />
                  <span className="whitespace-nowrap">
                    {showNearbyMap ? 'Đóng bản đồ' : 'Bản đồ quanh bạn'}
                  </span>
                </button>
              </div>
            </form>

            {/* Gợi ý từ khóa tìm kiếm nhanh */}
            <div className="relative z-10 flex flex-wrap items-center justify-center gap-1.5 mt-3 px-2 text-xs text-slate-500">
              <span className="font-medium text-slate-500">Từ khóa phổ biến:</span>
              {['Frontend', 'Backend', 'Fullstack', 'Mobile', 'UI/UX', 'Thực tập sinh', 'Marketing', 'Tester'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setKeyword(tag);
                    fetchJobs(tag);
                  }}
                  className={`px-2.5 py-1 rounded-lg border transition-colors text-xs cursor-pointer ${
                    keyword.toLowerCase().includes(tag.toLowerCase())
                      ? 'bg-primary-600 text-white border-primary-600 font-semibold'
                      : 'bg-white/90 hover:bg-white text-slate-600 border-slate-200/80 hover:border-primary-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực nội dung chính (đặt z-10 để không đè lên bảng gợi ý tìm kiếm ở trên) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-7 relative z-10">
        {/* Component Bản đồ tìm việc theo bán kính 5km, 10km, 15km, 20km (khi bật) */}
        {showNearbyMap && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300">
            <JobNearbyMap jobs={filteredAndSortedJobs} />
          </div>
        )}

        {/* THANH BỘ LỌC NÂNG CAO NHẸ NHÀNG & HIỆN ĐẠI */}
        <div className="bg-white rounded-2xl border border-slate-200/85 p-4 mb-6 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
              <SlidersHorizontal size={16} className="text-primary-600" />
              <span>Bộ lọc nâng cao</span>
              {activeAdvancedFilterCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200 text-[11px] font-semibold">
                  Đang bật {activeAdvancedFilterCount} bộ lọc
                </span>
              )}
            </div>

            {(activeAdvancedFilterCount > 0 || keyword || location || sortBy !== 'NEWEST') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Đặt lại tất cả</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. Lọc theo khoảng lương */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Mức lương
              </label>
              <select
                value={salaryFilter}
                onChange={(e) => setSalaryFilter(e.target.value as SalaryFilterId)}
                className={selectFilterCls}
              >
                <option value="ALL">Tất cả mức lương</option>
                <option value="UNDER_15">Dưới 15 triệu</option>
                <option value="15_TO_25">15 – 25 triệu</option>
                <option value="25_TO_40">25 – 40 triệu</option>
                <option value="OVER_35">Trên 35 triệu</option>
                <option value="NEGOTIABLE">Thỏa thuận</option>
              </select>
            </div>

            {/* 2. Lọc theo cấp bậc / kinh nghiệm */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Cấp bậc / Kinh nghiệm
              </label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LevelFilterId)}
                className={selectFilterCls}
              >
                <option value="ALL">Tất cả cấp bậc</option>
                <option value="INTERN_FRESHER">Thực tập sinh / Fresher</option>
                <option value="JUNIOR_MID">Nhân viên / Junior – Middle</option>
                <option value="SENIOR_LEAD">Senior / Trưởng nhóm (3+ năm)</option>
              </select>
            </div>

            {/* 3. Lọc theo hình thức làm việc */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Hình thức làm việc
              </label>
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value as WorkTypeFilterId)}
                className={selectFilterCls}
              >
                <option value="ALL">Tất cả hình thức</option>
                <option value="FULLTIME">Toàn thời gian (Full-time)</option>
                <option value="INTERNSHIP">Thực tập (Internship)</option>
                <option value="REMOTE_HYBRID">Linh hoạt (Remote / Hybrid)</option>
              </select>
            </div>

            {/* 4. Lọc theo loại hồ sơ ứng tuyển */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Phương thức ứng tuyển
              </label>
              <select
                value={applyMethodFilter}
                onChange={(e) => setApplyMethodFilter(e.target.value as ApplyMethodFilterId)}
                className={selectFilterCls}
              >
                <option value="ALL">Tất cả phương thức</option>
                <option value="REQUIRE_CV">Yêu cầu đính kèm CV</option>
                <option value="QUICK_APPLY">Ứng tuyển nhanh</option>
              </select>
            </div>

            {/* 5. Sắp xếp kết quả */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <ArrowUpDown size={11} />
                <span>Sắp xếp theo</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortById)}
                className={selectFilterCls}
              >
                <option value="NEWEST">Mới cập nhật nhất</option>
                <option value="SALARY_DESC">Mức lương cao → thấp</option>
                <option value="SALARY_ASC">Mức lương thấp → cao</option>
                <option value="TITLE_ASC">Tên công việc (A → Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tiêu đề danh sách công việc */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3.5 border-b border-slate-200/80">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
              <Briefcase size={20} className="text-primary-600" />
              <span>{filteredAndSortedJobs.length} việc làm được tìm thấy</span>
              {location && (
                <span className="text-xs font-semibold bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full border border-primary-200">
                  tại {location}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị danh sách các tin tuyển dụng đang mở nộp hồ sơ
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!showNearbyMap && (
              <button
                type="button"
                onClick={() => setShowNearbyMap(true)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-white border border-primary-200 hover:border-primary-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <MapIcon size={14} />
                <span>Xem trên bản đồ bán kính</span>
              </button>
            )}
          </div>
        </div>

        {/* Danh sách việc làm dạng Cards hiện đại */}
        {loading ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-semibold text-sm">Đang tải danh sách việc làm...</p>
          </div>
        ) : filteredAndSortedJobs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8">
            <Briefcase size={52} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-slate-700 font-bold text-base mb-1">
              Chưa tìm thấy tin tuyển dụng nào phù hợp
            </h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-5">
              Hãy thử điều chỉnh khoảng lương, cấp bậc, tỉnh thành hoặc đặt lại bộ lọc để xem toàn bộ cơ hội việc làm.
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="bg-primary-600 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Xóa bộ lọc tìm kiếm
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paginatedJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:border-primary-300 transition-all duration-200 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4 mb-3">
                      {/* Logo Công ty */}
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-primary-200 transition-all overflow-hidden p-1">
                        {job.company?.logoUrl ? (
                          <img
                            src={job.company.logoUrl}
                            alt={job.company.name}
                            className="w-full h-full rounded-xl object-contain"
                          />
                        ) : (
                          <Building2 size={24} className="text-primary-600" />
                        )}
                      </div>

                      {/* Tiêu đề & Công ty */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-1 mb-1">
                          {job.title}
                        </h3>
                        <p className="text-xs font-medium text-slate-500 truncate">
                          {job.company?.name || 'Doanh nghiệp tuyển dụng'}
                        </p>
                      </div>

                      {/* Nút Lưu vị trí */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggleSaveJob(job.id);
                        }}
                        title={savedIds.includes(job.id) ? 'Bỏ lưu vị trí này' : 'Lưu vị trí này'}
                        className={`p-2 rounded-xl border transition-all shrink-0 cursor-pointer ${
                          savedIds.includes(job.id)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-400 hover:text-primary-600'
                        }`}
                      >
                        <Bookmark
                          size={16}
                          className={
                            savedIds.includes(job.id) ? 'fill-emerald-500 text-emerald-600' : ''
                          }
                        />
                      </button>
                    </div>

                    {/* Thông tin nhanh: Lương, Địa điểm, Hạn */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                      {job.salary ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                          <DollarSign size={13} className="text-emerald-600" /> {job.salary}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Thỏa thuận
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <MapPin size={13} className="text-slate-400" /> {job.location}
                      </span>

                      {job.requireCV ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                          <FileText size={11} /> Cần CV
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-lg">
                          Ứng tuyển nhanh
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer card */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {job.deadline
                        ? `Hạn nộp: ${new Date(job.deadline).toLocaleDateString('vi-VN')}`
                        : 'Đang mở tuyển dụng'}
                    </span>
                    <span className="font-semibold text-primary-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      Ứng tuyển <ChevronRight size={14} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Thanh phân trang gọn gàng khi có nhiều việc làm */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 260, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} /> Trước
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => {
                      setCurrentPage(pageNum);
                      window.scrollTo({ top: 260, behavior: 'smooth' });
                    }}
                    className={`w-8 h-8 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                      pageNum === safePage
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 260, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1 cursor-pointer"
                >
                  Sau <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* KHU VỰC GỢI Ý VIỆC LÀM PHÙ HỢP VỚI HỒ SƠ & VỊ TRÍ ĐANG Ở (TÔNG SÁNG NHẸ NHÀNG) */}
        {matchedJobsByCV.length > 0 && (
          <div className="mt-10 bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase size={19} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Việc làm gợi ý phù hợp với hồ sơ của bạn
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kỹ năng ghi nhận từ CV:{' '}
                    <span className="font-semibold text-teal-700">
                      {importantCVKeywords.slice(0, 6).join(', ')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Ô hiển thị & cập nhật nhanh địa chỉ đang ở của Ứng viên */}
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                {editingAddress ? (
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full sm:w-auto">
                    <MapPin size={14} className="text-teal-600 ml-1 shrink-0" />
                    <input
                      type="text"
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      placeholder="Nhập địa chỉ bạn đang ở..."
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none flex-1 min-w-0 sm:w-56"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCandidateAddressOnHome}
                      className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Lưu
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs max-w-full">
                    <MapPin size={14} className="text-teal-600 shrink-0" />
                    <span className="text-slate-500 font-medium">Địa chỉ hiện tại:</span>
                    <span className="font-semibold text-slate-800 break-words">
                      {candidateAddress}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressDraft(candidateAddress);
                        setEditingAddress(true);
                      }}
                      className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-teal-700 border border-slate-200 text-[11px] font-semibold transition-colors shrink-0 cursor-pointer"
                    >
                      Đổi địa chỉ
                    </button>
                  </div>
                )}

                {isCandidate && (
                  <Link
                    to="/candidate-dashboard"
                    className="text-xs font-semibold text-primary-700 bg-primary-50/80 hover:bg-primary-100 border border-primary-200/80 px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5"
                  >
                    <FileText size={13} /> Xem CV
                  </Link>
                )}
              </div>
            </div>

            {/* Bộ lọc 4 tiêu chí nhẹ nhàng */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {[
                { id: 'ALL', label: 'Tổng hợp gợi ý' },
                { id: 'NEAREST', label: 'Gần vị trí của bạn' },
                { id: 'NEWEST', label: 'Mới đăng gần đây' },
                { id: 'KEYWORD', label: 'Khớp kỹ năng CV' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAiFilterTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                    aiFilterTab === tab.id
                      ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-teal-50/60 hover:text-teal-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matchedJobsByCV.map((job: any) => (
                <div
                  key={`ai-suggest-${job.id}`}
                  className="p-4 rounded-2xl border border-slate-200 hover:border-teal-300 bg-slate-50/40 hover:bg-white transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> {job.matchScore || 95}% phù hợp CV
                        </span>
                        {job.isNewest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                            Mới đăng
                          </span>
                        )}
                        {job.distanceKm !== undefined && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Cách ~{job.distanceKm} km
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSaveJob(job.id)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                          savedIds.includes(job.id)
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-primary-600'
                        }`}
                      >
                        <Bookmark
                          size={13}
                          className={savedIds.includes(job.id) ? 'fill-emerald-500' : ''}
                        />
                        <span>{savedIds.includes(job.id) ? 'Đã lưu' : 'Lưu'}</span>
                      </button>
                    </div>

                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-sm sm:text-base font-bold text-slate-800 hover:text-primary-600 line-clamp-1"
                    >
                      {job.title}
                    </Link>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      {job.company?.name || 'Doanh nghiệp tuyển dụng'}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                        {job.salary || 'Thỏa thuận'}
                      </span>
                      <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {job.location}
                      </span>
                    </div>

                    {job.hitKeywords && job.hitKeywords.length > 0 && (
                      <p className="text-[11px] text-teal-700 font-medium mt-2">
                        Kỹ năng trùng khớp: {job.hitKeywords.slice(0, 5).join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      <span>Xem chi tiết & Ứng tuyển</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobListPage;
