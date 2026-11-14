import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  DollarSign,
  Clock,
  Building2,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Check,
  PlusCircle,
  Bookmark,
  Upload,
  X,
  Briefcase,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Job, CV } from '../types';
import CompanyProfileWithMap from '../components/CompanyProfileWithMap';
import { getSavedJobIds, toggleSavedJobId } from '../utils/savedJobs';

const STANDARD_TECH_KEYWORDS = [
  'React',
  'Next.js',
  'TypeScript',
  'JavaScript',
  'Tailwind CSS',
  'Redux',
  'GraphQL',
  'RESTful API',
  'HTML',
  'CSS',
  'Frontend',
  'Fullstack',
  'Node.js',
  'Express',
  'NestJS',
  'PostgreSQL',
  'Prisma',
  'Redis',
  'Microservices',
  'Docker',
  'Backend',
  'UI/UX',
  'Figma',
  'Design System',
  'Wireframe',
  'Prototype',
  'Usability Testing',
  'Flutter',
  'Dart',
  'React Native',
  'Mobile',
  'iOS',
  'Android',
  'AWS',
  'GCP',
  'Kubernetes',
  'Terraform',
  'Linux',
  'CI/CD',
  'DevOps',
  'SRE',
  'Product Manager',
  'Product Owner',
  'Agile',
  'Scrum',
  'PRD',
  'EdTech',
  'Fintech',
  'Python',
  'SQL',
  'Git',
  'Java',
  'Spring Boot',
  'Tester',
  'QA',
];

const JobDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [job, setJob] = useState<Job | null>(null);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [myCVs, setMyCVs] = useState<CV[]>([]);
  const [existingApp, setExistingApp] = useState<{
    id: string;
    status: string;
    appliedDate?: string;
    uploadedPdfUrl?: string | null;
    uploadedFileName?: string | null;
  } | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [selectedCVId, setSelectedCVId] = useState<string>('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (id && user?.id) {
      setIsSaved(getSavedJobIds(user.id).includes(id));
    } else {
      setIsSaved(false);
    }
    const syncSaved = () => {
      if (id && user?.id) setIsSaved(getSavedJobIds(user.id).includes(id));
      else setIsSaved(false);
    };
    window.addEventListener('cvconnect:saved_jobs_changed', syncSaved);
    return () => window.removeEventListener('cvconnect:saved_jobs_changed', syncSaved);
  }, [id, user?.id]);

  useEffect(() => {
    setLoading(true);
    setShowApplyForm(false);
    setSuccessMsg('');
    setErrorMsg('');
    setPdfFile(null);

    const fetchJobAndCV = async () => {
      try {
        const [jobRes, listRes] = await Promise.allSettled([
          api.get(`/jobs/detail/${id}`),
          api.get('/jobs'),
        ]);

        if (jobRes.status === 'fulfilled') {
          setJob(jobRes.value.data.job);
        }
        if (listRes.status === 'fulfilled') {
          setAllJobs(listRes.value.data?.jobs || []);
        }

        if (user?.role?.name === 'CANDIDATE') {
          const [cvResult, appsResult] = await Promise.allSettled([
            api.get('/cvs/my'),
            api.get('/applications/my'),
          ]);

          if (cvResult.status === 'fulfilled') {
            const cvs: CV[] = cvResult.value.data?.cvs || [];
            setMyCVs(cvs);
            if (cvs[0]?.id) {
              setSelectedCVId(cvs[0].id);
            }
          }

          if (appsResult.status === 'fulfilled') {
            const apps: any[] = appsResult.value.data?.applications || [];
            const matched = apps.find((a) => a.jobId === id || a.job?.id === id);
            if (matched) {
              setExistingApp({
                id: matched.id,
                status: matched.status,
                appliedDate: matched.appliedDate,
                uploadedPdfUrl: matched.uploadedPdfUrl || null,
                uploadedFileName: matched.uploadedFileName || null,
              });
            } else {
              setExistingApp(null);
            }
          }
        }
      } catch (error) {
        console.error('Lỗi:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobAndCV();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, user]);

  // Gợi ý 4 việc làm tương tự (cùng từ khóa kỹ năng / vị trí / tỉnh thành)
  const similarJobs = useMemo(() => {
    if (!job || allJobs.length === 0) return [];
    const currentText = `${job.title} ${
      Array.isArray(job.requirements) ? job.requirements.join(' ') : ''
    }`.toLowerCase();
    const currentKws = STANDARD_TECH_KEYWORDS.filter((kw) =>
      currentText.includes(kw.toLowerCase())
    );
    const currentCity = (job.location || '').split(',').pop()?.trim().toLowerCase() || '';

    return allJobs
      .filter((item) => item.id !== job.id && item.status !== 'CLOSED')
      .map((item) => {
        const text = `${item.title} ${
          Array.isArray(item.requirements) ? item.requirements.join(' ') : ''
        }`.toLowerCase();
        let score = 0;
        currentKws.forEach((kw) => {
          if (text.includes(kw.toLowerCase())) score += 3;
        });
        if (currentCity && (item.location || '').toLowerCase().includes(currentCity)) {
          score += 2;
        }
        if (job.company?.id && item.company?.id === job.company.id) {
          score += 1;
        }
        return { item, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((x) => x.item);
  }, [job, allJobs]);

  // Phân tích mức độ phù hợp giữa CV ứng viên và yêu cầu tin tuyển dụng
  const cvAnalysis = useMemo(() => {
    if (!job) return null;
    const reqText = Array.isArray(job.requirements)
      ? job.requirements.join(' ')
      : String(job.requirements || '');
    const jdText = `${job.title} ${job.description} ${reqText}`.toLowerCase();

    const jdKeywords = STANDARD_TECH_KEYWORDS.filter((kw) =>
      jdText.includes(kw.toLowerCase())
    );
    const targetKeywords =
      jdKeywords.length > 0 ? jdKeywords : ['React', 'JavaScript', 'TypeScript', 'Git'];

    const primaryCV = myCVs[0];
    if (!primaryCV) {
      return {
        hasCV: false,
        score: 0,
        matched: [] as string[],
        missing: targetKeywords,
        total: targetKeywords.length,
      };
    }

    const cvData: any = primaryCV.data || {};
    const cvText = `${primaryCV.title || ''} ${JSON.stringify(cvData)}`.toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    targetKeywords.forEach((kw) => {
      if (cvText.includes(kw.toLowerCase())) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const rawPercent = Math.round((matched.length / targetKeywords.length) * 100);
    const score = matched.length === 0 ? 20 : Math.min(98, Math.max(35, rawPercent));

    return {
      hasCV: true,
      cvId: primaryCV.id,
      score,
      matched,
      missing,
      total: targetKeywords.length,
    };
  }, [job, myCVs]);

  const handleShowApplyForm = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role.name !== 'CANDIDATE') {
      setErrorMsg('Chỉ tài khoản ứng viên mới có thể nộp đơn ứng tuyển.');
      return;
    }

    try {
      if (myCVs.length === 0) {
        const res = await api.get('/cvs/my');
        const cvs: CV[] = res.data.cvs || [];
        setMyCVs(cvs);
        if (cvs[0]?.id) setSelectedCVId(cvs[0].id);
      }
      setShowApplyForm(true);
    } catch (error) {
      console.error('Lỗi khi tải CV:', error);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (job?.requireCV && !selectedCVId && !pdfFile) {
      setErrorMsg(
        'Vị trí này yêu cầu đính kèm CV. Vui lòng chọn CV trực tuyến hoặc tải file CV PDF từ máy tính.'
      );
      return;
    }

    setApplying(true);
    try {
      let uploadedPdfUrl: string | null = null;
      let uploadedFileName: string | null = null;

      if (pdfFile) {
        const formData = new FormData();
        formData.append('pdf', pdfFile);
        const uploadRes = await api.post('/applications/upload-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPdfUrl = uploadRes.data?.pdfUrl || null;
        uploadedFileName = uploadRes.data?.fileName || pdfFile.name;
      }

      const res = await api.post('/applications', {
        jobId: id,
        cvId: selectedCVId || null,
        coverLetter,
        uploadedPdfUrl,
        uploadedFileName,
      });
      setSuccessMsg('Nộp hồ sơ ứng tuyển thành công. Nhà tuyển dụng sẽ sớm phản hồi cho bạn.');
      setExistingApp({
        id: res.data?.application?.id || 'applied',
        status: 'PENDING',
        appliedDate: new Date().toISOString(),
        uploadedPdfUrl,
        uploadedFileName,
      });
      setPdfFile(null);
      setShowApplyForm(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi nộp đơn.');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-semibold pt-24">
        Đang tải thông tin việc làm...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 font-semibold pt-24">
        Không tìm thấy tin tuyển dụng.
      </div>
    );
  }

  const isDeadlineExpired = (() => {
    if (!job.deadline) return false;
    const endOfDay = new Date(job.deadline);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
  })();

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Nút quay lại */}
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-slate-500 hover:text-primary-600 font-semibold text-sm mb-5 transition-colors"
        >
          <ArrowLeft size={17} /> Quay lại danh sách việc làm
        </button>

        {/* Card chính */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Header sáng, dịu mắt */}
          <div className="bg-gradient-to-r from-sky-50 via-blue-50/60 to-teal-50/50 border-b border-slate-200/70 p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-18 h-18 sm:w-20 sm:h-20 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-center shrink-0 shadow-sm p-2">
                {job.company?.logoUrl ? (
                  <img
                    src={job.company.logoUrl}
                    alt={job.company.name}
                    className="w-full h-full rounded-xl object-contain"
                  />
                ) : (
                  <Building2 size={32} className="text-primary-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1.5 leading-snug">
                  {job.title}
                </h1>
                <p className="text-primary-700 font-semibold text-sm sm:text-base">
                  {job.company?.name}
                </p>
              </div>
              {(!user || user.role.name === 'CANDIDATE') && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate('/login');
                      return;
                    }
                    if (id) {
                      const updated = toggleSavedJobId(id, user.id);
                      setIsSaved(updated.includes(id));
                    }
                  }}
                  className={`self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold border transition-all shrink-0 ${
                    isSaved
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'
                  }`}
                >
                  <Bookmark size={16} className={isSaved ? 'fill-primary-600 text-primary-600' : ''} />
                  <span>{isSaved ? 'Đã lưu tin' : 'Lưu tin'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Thông tin nhanh */}
          <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-white">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <MapPin size={16} className="text-primary-600 shrink-0" /> {job.location}
              </div>
              {job.salary && (
                <div className="flex items-center gap-1.5 text-teal-700 bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-lg font-semibold text-xs sm:text-sm">
                  <DollarSign size={15} /> {job.salary}
                </div>
              )}
              {job.deadline && (
                <div
                  className={`flex items-center gap-2 font-medium text-xs sm:text-sm ${
                    isDeadlineExpired ? 'text-red-600' : 'text-slate-600'
                  }`}
                >
                  <Clock
                    size={16}
                    className={`${isDeadlineExpired ? 'text-red-500' : 'text-amber-500'} shrink-0`}
                  />{' '}
                  Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                  {isDeadlineExpired && (
                    <span className="px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-[11px] font-bold text-red-600">
                      Đã hết hạn
                    </span>
                  )}
                </div>
              )}
              {job.requireCV ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 font-semibold rounded-full text-xs border border-amber-200/80">
                  <FileText size={13} /> Yêu cầu đính kèm CV
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-full text-xs border border-emerald-200/80">
                  <CheckCircle size={13} /> Không bắt buộc CV
                </div>
              )}
            </div>
          </div>

          {/* KHUNG ĐÁNH GIÁ ĐỘ PHÙ HỢP HỒ SƠ CV DÀNH CHO ỨNG VIÊN */}
          {user?.role?.name === 'CANDIDATE' && cvAnalysis && (
            <div className="px-6 sm:px-8 pt-6">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-sky-50/70 via-white to-teal-50/50 border border-slate-200/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800">
                    Đánh giá độ phù hợp hồ sơ CV với vị trí này
                  </h3>
                  {cvAnalysis.hasCV && (
                    <span className="px-3 py-1 rounded-full bg-teal-600 text-white text-xs font-bold">
                      Độ phù hợp: {cvAnalysis.score}%
                    </span>
                  )}
                </div>

                {!cvAnalysis.hasCV ? (
                  <p className="text-xs text-slate-600">
                    Bạn chưa khởi tạo CV.{' '}
                    <Link to="/cv-builder" className="text-primary-600 font-semibold underline">
                      Tạo CV ngay
                    </Link>{' '}
                    để xem mức độ đáp ứng yêu cầu và gợi ý từ khóa cần bổ sung.
                  </p>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-teal-800">
                        Kỹ năng đã có trong CV ({cvAnalysis.matched.length}/{cvAnalysis.total}):
                      </span>
                      {cvAnalysis.matched.length > 0 ? (
                        cvAnalysis.matched.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-teal-700 border border-teal-200 font-medium"
                          >
                            <Check size={11} /> {kw}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic">Chưa khớp từ khóa nào</span>
                      )}
                    </div>

                    {cvAnalysis.missing.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-amber-800">
                            Gợi ý bổ sung thêm vào CV ({cvAnalysis.missing.length}):
                          </span>
                          {cvAnalysis.missing.map((kw) => (
                            <span
                              key={kw}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white text-amber-700 border border-amber-200 font-medium"
                            >
                              <PlusCircle size={11} /> {kw}
                            </span>
                          ))}
                        </div>
                        {cvAnalysis.cvId && (
                          <Link
                            to={`/cv-builder/${cvAnalysis.cvId}`}
                            className="text-primary-700 hover:underline font-semibold shrink-0"
                          >
                            Cập nhật CV &rarr;
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mô tả công việc */}
          <div className="p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Mô tả công việc</h2>
            <div className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {job.description}
            </div>

            {job.requirements && (
              <div className="mt-7">
                <h2 className="text-lg font-bold text-slate-900 mb-3">Yêu cầu ứng viên</h2>
                {Array.isArray(job.requirements) ? (
                  <ul className="list-disc list-inside text-slate-600 text-sm sm:text-base space-y-2">
                    {(job.requirements as string[]).map((req, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {req}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                    {JSON.stringify(job.requirements, null, 2)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Khu vực Nộp đơn */}
          <div className="p-6 sm:p-8 bg-slate-50/80 border-t border-slate-100">
            {successMsg && (
              <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-sm font-semibold flex items-center gap-3">
                <CheckCircle size={20} className="shrink-0" /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-semibold flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" /> {errorMsg}
              </div>
            )}

            {existingApp ? (
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      Bạn đã ứng tuyển vị trí này
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        existingApp.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : existingApp.status === 'REJECTED'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {existingApp.status === 'ACCEPTED'
                        ? 'Đã chấp nhận'
                        : existingApp.status === 'REJECTED'
                        ? 'Chưa phù hợp'
                        : 'Đang chờ xét duyệt'}
                    </span>
                  </div>
                  {existingApp.appliedDate && (
                    <p className="text-xs text-slate-500">
                      Ngày nộp hồ sơ:{' '}
                      {new Date(existingApp.appliedDate).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
                <Link
                  to="/candidate-dashboard?tab=applied-jobs"
                  className="px-4 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors text-center shrink-0"
                >
                  Xem đơn đã ứng tuyển
                </Link>
              </div>
            ) : job.status === 'CLOSED' ? (
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 text-sm font-semibold text-center">
                Vị trí này hiện đã đóng nhận hồ sơ ứng tuyển.
              </div>
            ) : isDeadlineExpired ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-semibold text-center">
                Vị trí này đã hết hạn nhận hồ sơ ứng tuyển ({new Date(job.deadline!).toLocaleDateString('vi-VN')}). Bạn có thể tham khảo các công việc tương tự bên dưới.
              </div>
            ) : user && user.role.name !== 'CANDIDATE' ? (
              <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 text-sm font-medium text-center">
                Bạn đang xem tin tuyển dụng với vai trò{' '}
                <strong>{user.role.name === 'ADMIN' ? 'Quản trị viên' : 'Nhà tuyển dụng'}</strong>.
              </div>
            ) : (
              !showApplyForm &&
              !successMsg && (
                <button
                  onClick={handleShowApplyForm}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-base shadow-sm transition-colors flex items-center justify-center gap-2.5"
                >
                  <Send size={18} /> Ứng tuyển vị trí này
                </button>
              )
            )}

            {showApplyForm && (
              <form
                onSubmit={handleApply}
                className="space-y-5 bg-white p-6 sm:p-7 rounded-2xl border border-slate-200"
              >
                <h3 className="text-lg font-bold text-slate-900">Nộp hồ sơ ứng tuyển</h3>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2.5">
                    <FileText size={15} className="inline mr-1.5" />
                    Chọn CV đính kèm
                    {job.requireCV ? (
                      <span className="text-red-500 ml-1">* (Bắt buộc)</span>
                    ) : (
                      <span className="text-slate-400 ml-1">(Không bắt buộc)</span>
                    )}
                  </label>

                  {myCVs.length === 0 ? (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200/80 text-amber-800 text-xs sm:text-sm">
                      Bạn chưa có CV nào.{' '}
                      <Link to="/cv-builder" className="text-primary-600 font-semibold hover:underline">
                        Tạo CV ngay
                      </Link>
                      {!job.requireCV && (
                        <span className="block mt-1 text-slate-500">
                          Bạn vẫn có thể nộp đơn mà không cần đính kèm CV.
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {!job.requireCV && (
                        <label className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer hover:bg-slate-100 transition-colors">
                          <input
                            type="radio"
                            name="cvSelect"
                            value=""
                            checked={selectedCVId === ''}
                            onChange={() => setSelectedCVId('')}
                            className="w-4 h-4 text-primary-600"
                          />
                          <span className="text-sm font-medium text-slate-600">
                            Không đính kèm CV
                          </span>
                        </label>
                      )}

                      {myCVs.map((cv) => (
                        <label
                          key={cv.id}
                          className={`flex items-center gap-3 p-3.5 border rounded-xl cursor-pointer transition-all ${
                            selectedCVId === cv.id
                              ? 'border-primary-300 bg-sky-50/50'
                              : 'border-slate-200 hover:border-primary-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="cvSelect"
                            value={cv.id}
                            checked={selectedCVId === cv.id}
                            onChange={() => setSelectedCVId(cv.id)}
                            className="w-4 h-4 text-primary-600"
                          />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{cv.title}</p>
                            <p className="text-xs text-slate-400">
                              Mẫu: {cv.template} • Cập nhật:{' '}
                              {new Date(cv.updatedAt).toLocaleDateString('vi-VN')}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Đính kèm thêm file CV PDF từ máy tính */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Upload size={15} className="inline mr-1.5 text-primary-600" />
                    Tải file CV PDF từ máy tính{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (Hỗ trợ tệp .pdf tối đa 5MB — có thể dùng bổ sung hoặc thay thế CV trực tuyến)
                    </span>
                  </label>

                  {!pdfFile ? (
                    <label className="flex flex-col sm:flex-row items-center justify-center gap-2.5 p-4 border-2 border-dashed border-slate-200 hover:border-primary-400 bg-slate-50/70 hover:bg-sky-50/40 rounded-xl cursor-pointer transition-colors text-center">
                      <Upload size={18} className="text-primary-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-slate-600">
                        Nhấn để chọn file CV định dạng <strong className="text-slate-800">.pdf</strong> từ thiết bị của bạn
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                            setErrorMsg('Vui lòng chỉ chọn tệp định dạng PDF (.pdf).');
                            return;
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setErrorMsg('Dung lượng file PDF không được vượt quá 5MB.');
                            return;
                          }
                          setErrorMsg('');
                          setPdfFile(file);
                        }}
                      />
                    </label>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={18} className="text-primary-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                            {pdfFile.name}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {(pdfFile.size / 1024).toFixed(1)} KB • Sẵn sàng đính kèm
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 transition-colors shrink-0"
                        title="Gỡ tệp PDF"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Thư giới thiệu (Tuỳ chọn)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Giới thiệu ngắn gọn về kinh nghiệm và mong muốn của bạn..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 transition-all text-sm resize-none"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
                  >
                    Huỷ bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={applying}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {applying ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
                    {applying ? 'Đang gửi...' : 'Gửi hồ sơ ứng tuyển'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* THÔNG TIN CÔNG TY & BẢN ĐỒ */}
        {job.company && (
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 px-1">
              <Building2 size={20} className="text-primary-600" />
              <span>Thông tin doanh nghiệp & Địa điểm làm việc: {job.company.name}</span>
            </h2>
            <CompanyProfileWithMap
              name={job.company.name}
              description={job.company.description}
              location={job.company.location || job.location}
              website={job.company.website}
              logoUrl={job.company.logoUrl}
            />
          </div>
        )}

        {/* GỢI Ý VIỆC LÀM TƯƠNG TỰ */}
        {similarJobs.length > 0 && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={20} className="text-primary-600" />
                <span>Việc làm tương tự dành cho bạn</span>
              </h2>
              <Link
                to="/jobs"
                className="text-xs sm:text-sm font-semibold text-primary-600 hover:underline"
              >
                Xem tất cả việc làm &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {similarJobs.map((sim) => (
                <Link
                  key={sim.id}
                  to={`/jobs/${sim.id}`}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-primary-300 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 p-1.5">
                      {sim.company?.logoUrl ? (
                        <img
                          src={sim.company.logoUrl}
                          alt={sim.company.name}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <Building2 size={20} className="text-primary-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                        {sim.title}
                      </h3>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                        {sim.company?.name || 'Doanh nghiệp tuyển dụng'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-0.5 rounded-lg">
                        <DollarSign size={12} /> {sim.salary || 'Thỏa thuận'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <MapPin size={12} className="text-slate-400" /> {sim.location}
                      </span>
                    </div>
                    <span className="text-primary-600 font-semibold">Chi tiết &rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobDetailPage;
