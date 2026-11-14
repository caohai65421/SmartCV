import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Users,
  Building2,
  FileText,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  MessageSquare,
  Search,
  Sparkles,
  ShieldAlert,
  Filter,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  Trash2,
  Lock,
  Unlock,
  Edit3,
  DollarSign,
  Clock,
  Calendar,
  Video,
  Download,
  Globe,
  ExternalLink,
  Star,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Job, Application } from '../types';
import ChatWindow from '../components/ChatWindow';
import CompanyProfileWithMap, {
  parseCompanyProfile,
  StructuredCompanyProfile,
} from '../components/CompanyProfileWithMap';
import InterviewScheduleModal, {
  getSavedInterviews,
  saveInterviewToStorage,
  InterviewScheduleData,
} from '../components/InterviewScheduleModal';
import CVFullSheetView from '../components/CVFullSheetView';

/**
 * PHƯƠNG PHÁP 1 (NÂNG CẤP ĐA TIÊU CHÍ): MATCHING BẰNG TỪ KHÓA KẾT HỢP KINH NGHIỆM, NGOẠI NGỮ & GIẢI THƯỞNG
 * ---------------------------------------------------------------------------------------------------------
 * Giải quyết triệt để bài toán: Khi nhiều ứng viên có CÙNG số lượng từ khóa kỹ năng (VD: cùng 5/5 từ khóa Full-stack/Frontend),
 * hệ thống sẽ tự động phân tích sâu thêm 3 tiêu chí phân loại để xếp hạng chính xác:
 *   1. Từ khóa kỹ năng chuyên môn (Core JD Keywords): Tối đa 65 điểm
 *   2. Số năm kinh nghiệm thực tế (Years of Experience - 1 năm vs 2 năm vs 3.5 năm): Tối đa +15 điểm
 *   3. Ngoại ngữ thứ 2 & Trình độ chứng chỉ (Anh IELTS/TOEIC, Nhật JLPT, Trung HSK, Hàn TOPIK): Tối đa +12 điểm
 *   4. Giải thưởng, Học bổng & Chứng chỉ chuyên môn (Hackathon, NCKH, AWS...): Tối đa +8 điểm
 * => Tổng điểm = 100%. Kết quả dùng để giải thích và hỗ trợ Nhà tuyển dụng ra quyết định (không tự động loại ứng viên).
 */
export function evaluateCVForJob(app: any): {
  matchScore: number;
  keywordScore: number;
  expBonus: number;
  langBonus: number;
  awardBonus: number;
  yearsOfExpText: string;
  languagesList: string[];
  awardsList: string[];
  isSpam: boolean;
  recommendationLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendationLabel: string;
  reason: string;
  matchedSkills: string[];
  missingSkills: string[];
  jdKeywords: string[];
  allSkills: string[];
} {
  const cvData = app.cv?.data || {};
  const job = app.job || {};
  const jobTitle = String(job.title || '');
  const jobDesc = String(job.description || '');
  const jobReqs: string[] = Array.isArray(job.requirements)
    ? job.requirements.map((r: any) => String(r))
    : [];

  const rawSkills: string[] = Array.isArray(cvData.skills)
    ? cvData.skills
    : typeof cvData.skills === 'string'
    ? cvData.skills
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const rawLanguages: string[] = Array.isArray(cvData.languages)
    ? cvData.languages
    : typeof cvData.languages === 'string'
    ? cvData.languages
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const rawAwards: string[] = Array.isArray(cvData.awards)
    ? cvData.awards
    : Array.isArray(cvData.certifications)
    ? cvData.certifications.map((c: any) => (typeof c === 'string' ? c : c.name || ''))
    : [];

  const summary = String(cvData.summary || '');
  const experience =
    typeof cvData.experience === 'string'
      ? cvData.experience
      : JSON.stringify(cvData.experience || '');
  const education =
    typeof cvData.education === 'string'
      ? cvData.education
      : JSON.stringify(cvData.education || '');
  const coverLetter = String(app.coverLetter || '');
  const cvTitle = String(app.cv?.title || '');

  const combinedCVText =
    `${cvTitle} ${summary} ${experience} ${education} ${rawSkills.join(' ')} ${rawLanguages.join(' ')} ${rawAwards.join(' ')} ${coverLetter}`.toLowerCase();
  const combinedJDText = `${jobTitle} ${jobDesc} ${jobReqs.join(' ')}`.toLowerCase();

  // Từ điển các năng lực chuyên môn chuẩn để đối chiếu tự động từ Mô tả công việc (JD) cho mọi nhóm ngành
  const standardTechKeywords = [
    'React',
    'Next.js',
    'TypeScript',
    'JavaScript',
    'Tailwind CSS',
    'TailwindCSS',
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
    'WebSocket',
    'Docker',
    'Backend',
    'UI/UX',
    'Figma',
    'Design System',
    'Wireframe',
    'Prototype',
    'Usability Testing',
    'User Research',
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
    'Prometheus',
    'Grafana',
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
    'Data',
    'Python',
    'SQL',
    'Git',
  ];

  const normalizeToken = (str: string) => str.toLowerCase().replace(/[\s.-]+/g, '');
  const normalizedCVText = normalizeToken(combinedCVText);
  const normalizedJDText = normalizeToken(combinedJDText);

  // 1. Trích xuất bộ tiêu chí chuyên môn yêu cầu của vị trí tuyển dụng
  const extractedJDKeywords = standardTechKeywords.filter(
    (kw) =>
      combinedJDText.includes(kw.toLowerCase()) || normalizedJDText.includes(normalizeToken(kw))
  );

  // Khử trùng lặp tên tương đương (VD: Tailwind CSS & TailwindCSS)
  const dedupedJDKeywords: string[] = [];
  const seenNorm = new Set<string>();
  for (const kw of extractedJDKeywords) {
    const norm = normalizeToken(kw);
    if (!seenNorm.has(norm)) {
      seenNorm.add(norm);
      dedupedJDKeywords.push(kw);
    }
  }

  const jdKeywords =
    dedupedJDKeywords.length > 0
      ? dedupedJDKeywords
      : ['React', 'TypeScript', 'Node.js', 'SQL', 'Git'];

  if (!app.cv && !app.uploadedPdfUrl && job.requireCV) {
    return {
      matchScore: 0,
      keywordScore: 0,
      expBonus: 0,
      langBonus: 0,
      awardBonus: 0,
      yearsOfExpText: 'Chưa đính kèm CV',
      languagesList: [],
      awardsList: [],
      isSpam: true,
      recommendationLevel: 'LOW',
      recommendationLabel: 'Độ khớp thấp (Thiếu CV đính kèm)',
      reason:
        'Ứng viên chưa đính kèm hồ sơ CV cho vị trí yêu cầu bắt buộc có CV. Nhà tuyển dụng cân nhắc liên hệ bổ sung.',
      matchedSkills: [],
      missingSkills: jdKeywords,
      jdKeywords,
      allSkills: [],
    };
  }

  // Nếu ứng viên chỉ nộp file CV PDF từ máy tính (không dùng CV trực tuyến), chấm điểm cơ bản theo thư giới thiệu & tên file
  if (!app.cv && app.uploadedPdfUrl) {
    return {
      matchScore: 72,
      keywordScore: 50,
      expBonus: 12,
      langBonus: 6,
      awardBonus: 4,
      yearsOfExpText: 'Đính kèm file CV PDF',
      languagesList: [],
      awardsList: [],
      isSpam: false,
      recommendationLevel: 'MEDIUM',
      recommendationLabel: 'Hồ sơ PDF tải lên — Mời xem trực tiếp file PDF',
      reason: `Ứng viên đã tải lên tệp CV PDF từ máy tính (${app.uploadedFileName || 'CV.pdf'}). Nhà tuyển dụng nhấn "Xem file PDF" để đọc toàn bộ hồ sơ gốc.`,
      matchedSkills: jdKeywords.slice(0, 2),
      missingSkills: [],
      jdKeywords,
      allSkills: [],
    };
  }

  // 2. TIÊU CHÍ 1: ĐỐI CHIẾU TỪ KHÓA CHUYÊN MÔN (Tối đa 65 điểm)
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const kw of jdKeywords) {
    const kwLower = kw.toLowerCase();
    const kwNorm = normalizeToken(kw);
    const isMatched =
      rawSkills.some((s) => {
        const sLower = s.toLowerCase();
        const sNorm = normalizeToken(s);
        return (
          sLower.includes(kwLower) ||
          kwLower.includes(sLower) ||
          (kwNorm.length >= 3 && sNorm.includes(kwNorm))
        );
      }) ||
      combinedCVText.includes(kwLower) ||
      (kwNorm.length >= 3 && normalizedCVText.includes(kwNorm));

    if (isMatched) {
      matchedSkills.push(kw);
    } else {
      missingSkills.push(kw);
    }
  }

  const keywordScore =
    jdKeywords.length > 0 ? Math.round((matchedSkills.length / jdKeywords.length) * 65) : 35;

  // 3. TIÊU CHÍ 2: PHÂN TÍCH SỐ NĂM KINH NGHIỆM (Tối đa +15 điểm)
  let yearsOfExp =
    typeof cvData.yearsOfExperience === 'number' && cvData.yearsOfExperience > 0
      ? cvData.yearsOfExperience
      : 0;
  if (!yearsOfExp) {
    const expMatch = `${summary} ${experience}`.match(/(\d+(?:[.,]\d+)?)\s*\+?\s*năm/i);
    if (expMatch) {
      yearsOfExp = parseFloat(expMatch[1].replace(',', '.'));
    }
  }

  let expBonus = 0;
  let yearsOfExpText = 'Chưa nêu rõ số năm KN';
  if (yearsOfExp >= 3) {
    expBonus = 15;
    yearsOfExpText = `${yearsOfExp} năm kinh nghiệm (Senior)`;
  } else if (yearsOfExp >= 2) {
    expBonus = 11;
    yearsOfExpText = `${yearsOfExp} năm kinh nghiệm (Middle)`;
  } else if (yearsOfExp >= 1) {
    expBonus = 6;
    yearsOfExpText = `${yearsOfExp} năm kinh nghiệm (Junior)`;
  } else {
    expBonus = 0;
    yearsOfExpText = 'Dưới 1 năm / Mới ra trường';
  }

  // 4. TIÊU CHÍ 3: PHÂN TÍCH NGOẠI NGỮ THỨ 2 & TRÌNH ĐỘ (Tối đa +12 điểm)
  const detectedLangs: string[] = [...rawLanguages];
  if (detectedLangs.length === 0) {
    if (combinedCVText.includes('ielts') || combinedCVText.includes('toeic') || combinedCVText.includes('tiếng anh')) {
      detectedLangs.push('Tiếng Anh');
    }
    if (combinedCVText.includes('jlpt') || combinedCVText.includes('tiếng nhật')) {
      detectedLangs.push('Tiếng Nhật');
    }
    if (combinedCVText.includes('hsk') || combinedCVText.includes('tiếng trung')) {
      detectedLangs.push('Tiếng Trung');
    }
    if (combinedCVText.includes('topik') || combinedCVText.includes('tiếng hàn')) {
      detectedLangs.push('Tiếng Hàn');
    }
  }

  let langBonus = 0;
  const langStr = detectedLangs.join(' ').toLowerCase();
  if (
    (langStr.includes('ielts 7') || langStr.includes('ielts 8') || langStr.includes('n2') || langStr.includes('n1')) &&
    detectedLangs.length >= 2
  ) {
    langBonus = 12;
  } else if (
    langStr.includes('toeic 8') ||
    langStr.includes('toeic 9') ||
    langStr.includes('hsk 4') ||
    langStr.includes('hsk 5') ||
    detectedLangs.length >= 2
  ) {
    langBonus = 9;
  } else if (detectedLangs.length === 1) {
    langBonus = 6;
  }

  // 5. TIÊU CHÍ 4: GIẢI THƯỞNG, HỌC BỔNG & CHỨNG CHỈ NỔI BẬT (Tối đa +8 điểm)
  const awardsList: string[] = [...rawAwards];
  let awardBonus = 0;
  const awardStr = `${awardsList.join(' ')} ${combinedCVText}`.toLowerCase();
  if (
    awardStr.includes('giải nhất') ||
    awardStr.includes('hackathon') ||
    awardStr.includes('aws certified')
  ) {
    awardBonus = 8;
  } else if (
    awardStr.includes('giải nhì') ||
    awardStr.includes('nghiên cứu khoa học') ||
    awardStr.includes('học bổng')
  ) {
    awardBonus = 5;
  } else if (awardsList.length > 0 || awardStr.includes('chứng chỉ')) {
    awardBonus = 3;
  }

  // Nếu không khớp bất kỳ từ khóa chuyên môn nào của JD -> Điểm thấp (CV lệch ngành)
  const rawTotal =
    matchedSkills.length === 0 ? 10 : keywordScore + expBonus + langBonus + awardBonus;
  const finalScore = Math.min(100, Math.max(5, rawTotal));

  // Phân loại mức độ gợi ý & Sinh lời giải thích đa tiêu chí
  let recommendationLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  let recommendationLabel = 'Phù hợp khá — Cân nhắc phỏng vấn';

  if (finalScore >= 80) {
    recommendationLevel = 'HIGH';
    recommendationLabel = 'Ứng viên Xuất sắc — Ưu tiên phỏng vấn ngay';
  } else if (finalScore >= 50) {
    recommendationLevel = 'MEDIUM';
    recommendationLabel = 'Độ phù hợp Khá — Đáp ứng yêu cầu chuyên môn';
  } else {
    recommendationLevel = 'LOW';
    recommendationLabel = 'Độ khớp thấp / Trái ngành — Cần kiểm tra kỹ';
  }

  const reasonParts = [
    `Chuyên môn vị trí: ${keywordScore}/65đ`,
    `Kinh nghiệm: ${yearsOfExpText} (+${expBonus}đ)`,
    detectedLangs.length > 0
      ? `Ngoại ngữ: ${detectedLangs.join(', ')} (+${langBonus}đ)`
      : 'Chưa ghi ngoại ngữ (+0đ)',
    awardsList.length > 0
      ? `Giải thưởng/Chứng chỉ: ${awardsList.join(', ')} (+${awardBonus}đ)`
      : 'Chưa có giải thưởng (+0đ)',
  ];

  const reason = reasonParts.join(' • ');

  return {
    matchScore: finalScore,
    keywordScore,
    expBonus,
    langBonus,
    awardBonus,
    yearsOfExpText,
    languagesList: detectedLangs,
    awardsList,
    isSpam: recommendationLevel === 'LOW',
    recommendationLevel,
    recommendationLabel,
    reason,
    matchedSkills,
    missingSkills,
    jdKeywords,
    allSkills: rawSkills,
  };
}

/** === TAB 1: XÉT DUYỆT CV THEO VỊ TRÍ TUYỂN DỤNG === */
const ApplicationsByPositionTab = ({
  initialJobId,
  onClearInitialJob,
}: {
  initialJobId?: string | null;
  onClearInitialJob?: () => void;
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [hideSpamCVs, setHideSpamCVs] = useState<boolean>(false);
  const [skillSearch, setSkillSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeChatAppId, setActiveChatAppId] = useState<string | null>(null);
  const [previewAppCV, setPreviewAppCV] = useState<any | null>(null);
  const [schedulingApp, setSchedulingApp] = useState<any | null>(null);
  const [interviews, setInterviews] = useState<Record<string, InterviewScheduleData>>(() =>
    getSavedInterviews()
  );

  useEffect(() => {
    const onScheduled = () => setInterviews(getSavedInterviews());
    window.addEventListener('cvconnect:interview_scheduled', onScheduled);
    return () => window.removeEventListener('cvconnect:interview_scheduled', onScheduled);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const [jobsResult, appsResult] = await Promise.allSettled([
          api.get('/jobs/recruiter/my'),
          api.get('/applications/recruiter'),
        ]);

        const myJobs: Job[] =
          jobsResult.status === 'fulfilled' ? jobsResult.value.data.jobs || [] : [];
        const myApps: Application[] =
          appsResult.status === 'fulfilled' ? appsResult.value.data.applications || [] : [];

        myApps.forEach((a: any) => {
          if (a.interviewSchedule) {
            saveInterviewToStorage(a.interviewSchedule);
          }
        });
        setInterviews(getSavedInterviews());

        setJobs(myJobs);
        setApplications(myApps);

        if (initialJobId) {
          setSelectedJobId(initialJobId);
          onClearInitialJob?.();
        } else if (myApps.length > 0 && myApps[0].jobId) {
          setSelectedJobId(myApps[0].jobId);
        } else if (myJobs.length > 0) {
          setSelectedJobId(myJobs[0].id);
        }

        if (jobsResult.status === 'rejected' && appsResult.status === 'rejected') {
          setErrorMsg('Không thể kết nối máy chủ để tải danh sách vị trí và hồ sơ CV.');
        }
      } catch (err) {
        console.error(err);
        setErrorMsg('Lỗi khi tải danh sách vị trí và hồ sơ CV.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [initialJobId]);

  const handleUpdateStatus = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      setErrorMsg('');
      await api.patch(`/applications/${id}/status`, { status });
      const targetApp = applications.find((a) => a.id === id);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (previewAppCV && previewAppCV.id === id) {
        setPreviewAppCV({ ...previewAppCV, status });
      }
      // Khi Nhà tuyển dụng bấm "Chấp nhận", mở ngay khung Hẹn lịch phỏng vấn với ứng viên tiềm năng
      if (status === 'ACCEPTED' && targetApp) {
        setSchedulingApp({ ...targetApp, status: 'ACCEPTED' });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Lỗi cập nhật trạng thái CV.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-black text-slate-400 uppercase tracking-widest text-xs animate-pulse">
        Đang tải danh sách vị trí và hồ sơ CV ứng viên...
      </div>
    );
  }

  // Lọc các CV thuộc đúng vị trí tuyển dụng đang chọn
  const positionApps = applications
    .filter((app) => selectedJobId === 'ALL' || app.jobId === selectedJobId)
    .map((app) => ({
      app,
      evalResult: evaluateCVForJob(app),
    }))
    .sort((a, b) => b.evalResult.matchScore - a.evalResult.matchScore);

  const spamCountInPosition = positionApps.filter((x) => x.evalResult.isSpam).length;
  const acceptedCount = positionApps.filter((x) => x.app.status === 'ACCEPTED').length;
  const rejectedCount = positionApps.filter((x) => x.app.status === 'REJECTED').length;
  const pendingCount = positionApps.filter((x) => x.app.status === 'PENDING').length;

  // Áp dụng bộ lọc AI ẩn CV rác, trạng thái duyệt & tìm kiếm theo kỹ năng
  const visibleApps = positionApps.filter(({ app, evalResult }) => {
    if (hideSpamCVs && evalResult.isSpam) return false;
    if (statusFilter !== 'ALL' && app.status !== statusFilter) return false;
    if (skillSearch.trim()) {
      const q = skillSearch.toLowerCase().trim();
      const cvData = (app as any).cv?.data || {};
      const searchable = `${(app as any).candidate?.fullName || ''} ${
        (app as any).cv?.title || ''
      } ${JSON.stringify(cvData)} ${app.coverLetter || ''}`.toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  const currentJob = jobs.find((j) => j.id === selectedJobId);

  const handleExportCSV = () => {
    const headers = [
      'Hạng',
      'Họ tên ứng viên',
      'Email',
      'Số điện thoại',
      'Vị trí ứng tuyển',
      'Điểm tổng hợp (/100)',
      'Điểm chuyên môn (/65)',
      'Kinh nghiệm',
      'Ngoại ngữ',
      'Trạng thái',
    ];
    const escapeCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = visibleApps.map(({ app, evalResult }, idx) => {
      const cvData: any = (app as any).cv?.data || {};
      const statusLabel =
        app.status === 'ACCEPTED'
          ? 'Đã chấp nhận'
          : app.status === 'REJECTED'
          ? 'Đã từ chối'
          : 'Chờ xét duyệt';
      return [
        idx + 1,
        (app as any).candidate?.fullName || '',
        (app as any).candidate?.email || '',
        cvData.phone || '',
        (app as any).job?.title || '',
        evalResult.matchScore,
        `${evalResult.keywordScore}/65đ`,
        evalResult.yearsOfExpText,
        evalResult.languagesList.join(', ') || 'Chưa cập nhật',
        statusLabel,
      ]
        .map(escapeCell)
        .join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-ung-vien-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      {/* BƯỚC 1: CHỌN VỊ TRÍ TUYỂN DỤNG ĐỂ XEM CÁC CV ĐÃ NỘP VÀO VỊ TRÍ ĐÓ */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Briefcase size={17} className="text-primary-600" />
            <span>Chọn Vị trí tuyển dụng để xem & xét duyệt CV ứng viên:</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            Tổng cộng <strong className="text-primary-600">{applications.length} CV</strong> ứng
            tuyển vào <strong className="text-slate-800">{jobs.length} vị trí</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {jobs.map((job) => {
            const count = applications.filter((a) => a.jobId === job.id).length;
            const isSelected = selectedJobId === job.id;
            return (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="truncate max-w-[260px]">{job.title}</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                    isSelected
                      ? 'bg-white text-primary-700'
                      : count > 0
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count} CV
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedJobId('ALL')}
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border transition-all ${
              selectedJobId === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả vị trí ({applications.length} CV)
          </button>
        </div>

        {/* Thống kê nhanh trạng thái xét duyệt của vị trí đang chọn */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({positionApps.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              Chờ xét duyệt ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACCEPTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === 'ACCEPTED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Đã chấp nhận ({acceptedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                statusFilter === 'REJECTED'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              }`}
            >
              Đã từ chối ({rejectedCount})
            </button>
          </div>

          {currentJob && (
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin size={13} className="text-primary-500" /> {currentJob.location}
              </span>
              {currentJob.salary && (
                <span className="flex items-center gap-1 text-emerald-600 font-bold">
                  <DollarSign size={13} /> {currentJob.salary}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BƯỚC 2: THANH CÔNG CỤ SÀNG LỌC HỒ SƠ — SÁNG DỊU & GỌN GÀNG */}
      <div className="bg-gradient-to-r from-sky-50/90 via-white to-teal-50/60 border border-slate-200/90 text-slate-800 px-5 py-4 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-sky-200/90 flex items-center justify-center text-primary-600 shadow-sm shrink-0">
              <Filter size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900">
                Sàng lọc & đối chiếu hồ sơ cho vị trí:{' '}
                <span className="text-primary-700">
                  {currentJob ? currentJob.title : 'Tất cả vị trí đang tuyển'}
                </span>
              </h4>
            </div>
          </div>

          {/* Tìm kiếm CV theo từ khóa, Lọc & Xuất CSV */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 sm:w-60">
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                placeholder="Tìm tên ứng viên, chuyên ngành..."
                className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none w-full font-medium"
              />
              {skillSearch && (
                <button type="button" onClick={() => setSkillSearch('')}>
                  <X size={13} className="text-slate-400 hover:text-slate-700" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHideSpamCVs((prev) => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                hideSpamCVs
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Filter size={13} />
              <span>
                {hideSpamCVs
                  ? 'Đang lọc: Chỉ hiện CV phù hợp'
                  : `Ẩn CV lệch tiêu chí (${spamCountInPosition})`}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Xuất danh sách ứng viên ra file CSV / Excel"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Xuất danh sách (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* BƯỚC 3: DANH SÁCH XẾP HẠNG & GIẢI THÍCH KẾT QUẢ CV TRONG VỊ TRÍ ĐANG CHỌN */}
      {visibleApps.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
          <FileText size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-600 font-bold text-sm">
            Không có CV nào khớp bộ lọc hiện tại trong vị trí này
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Hãy chọn vị trí tuyển dụng khác ở phía trên hoặc chuyển bộ lọc sang "Tất cả".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleApps.map(({ app, evalResult }, index) => {
            const cvData: any = (app as any).cv?.data || {};
            const rankNumber = index + 1;
            return (
              <div
                key={app.id}
                className={`bg-white rounded-3xl border transition-all overflow-hidden ${
                  evalResult.recommendationLevel === 'LOW'
                    ? 'border-amber-200 bg-amber-50/10'
                    : evalResult.recommendationLevel === 'HIGH'
                    ? 'border-emerald-200/90 shadow-sm hover:shadow-md'
                    : 'border-slate-200/80 shadow-sm hover:shadow-md'
                }`}
              >
                <div className="p-6">
                  {/* Dòng 1: Thứ hạng (Ranking) + Điểm Keyword Matching + Trạng thái quyết định của NTD */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          rankNumber === 1
                            ? 'bg-amber-400 text-slate-950 shadow-sm'
                            : rankNumber === 2
                            ? 'bg-slate-200 text-slate-800'
                            : rankNumber === 3
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Hạng #{rankNumber}
                      </span>

                      {evalResult.recommendationLevel === 'HIGH' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Điểm tổng hợp: {evalResult.matchScore}/100
                        </span>
                      ) : evalResult.recommendationLevel === 'MEDIUM' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          Điểm tổng hợp: {evalResult.matchScore}/100
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          <ShieldAlert size={13} /> Điểm thấp: {evalResult.matchScore}/100
                        </span>
                      )}
                      <span className="text-xs font-semibold text-slate-600">
                        &bull; {evalResult.recommendationLabel}
                      </span>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                        app.status === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : app.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                      }`}
                    >
                      {app.status === 'PENDING'
                        ? 'Chờ xét duyệt'
                        : app.status === 'ACCEPTED'
                        ? 'Đã chấp nhận CV'
                        : 'Đã từ chối CV'}
                    </span>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Thông tin CV, Ứng viên & Giải thích kết quả Đối chiếu Từ khóa */}
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 font-black text-lg border border-primary-100 shrink-0">
                        <FileText size={26} />
                      </div>
                      <div className="space-y-2.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-base sm:text-lg font-black text-slate-900">
                            {(app as any).cv?.title ||
                              `CV của ${(app as any).candidate?.fullName}`}
                          </h4>
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-0.5 rounded-lg">
                            Vị trí: {(app as any).job?.title}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-600">
                          Ứng viên:{' '}
                          <strong className="text-slate-900">
                            {(app as any).candidate?.fullName}
                          </strong>{' '}
                          &bull; {(app as any).candidate?.email}
                          {cvData.phone ? ` • SĐT: ${cvData.phone}` : ''}
                        </p>

                        {cvData.summary && (
                          <p className="text-xs text-slate-500 line-clamp-2">
                            <strong>Tóm tắt CV:</strong> {cvData.summary}
                          </p>
                        )}

                        {/* KHUNG PHÂN TÍCH ĐA TIÊU CHÍ HỒ SƠ */}
                        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                          <p className="text-xs text-slate-700 font-medium leading-relaxed">
                            <strong className="text-primary-700 font-semibold">
                              Chi tiết chấm điểm đa tiêu chí:
                            </strong>{' '}
                            {evalResult.reason}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                              <Clock size={12} /> Kinh nghiệm: {evalResult.yearsOfExpText} (+
                              {evalResult.expBonus}đ)
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200">
                              <Globe size={12} /> Ngoại ngữ:{' '}
                              {evalResult.languagesList.length > 0
                                ? evalResult.languagesList.join(' • ')
                                : 'Chưa cập nhật'}{' '}
                              (+{evalResult.langBonus}đ)
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                              <Award size={12} /> Giải thưởng / Chứng chỉ:{' '}
                              {evalResult.awardsList.length > 0
                                ? evalResult.awardsList.join(' • ')
                                : 'Chưa có'}{' '}
                              (+{evalResult.awardBonus}đ)
                            </span>
                          </div>
                        </div>

                        {/* HIỂN THỊ LỊCH HẸN PHỎNG VẤN & ĐÁNH GIÁ SAU PHỎNG VẤN */}
                        {(() => {
                          const sched = (app as any).interviewSchedule || interviews[app.id];
                          const interviewEval = (app as any).interviewEvaluation;
                          return (
                            <>
                              {app.status === 'ACCEPTED' && sched && (
                                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="space-y-1 text-xs">
                                    <div className="flex flex-wrap items-center gap-2 font-bold text-emerald-800">
                                      <Calendar size={14} className="text-emerald-600" />
                                      <span>
                                        Đã hẹn lịch phỏng vấn: {sched.time} &bull;{' '}
                                        {String(sched.date || '').split('-').reverse().join('/')}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-semibold">
                                        {sched.mode === 'OFFLINE'
                                          ? 'Trực tiếp tại văn phòng'
                                          : 'Phỏng vấn Online'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                                      {sched.mode === 'OFFLINE' ? (
                                        <MapPin size={12} className="text-emerald-600 shrink-0" />
                                      ) : (
                                        <Video size={12} className="text-sky-600 shrink-0" />
                                      )}
                                      <span className="break-all">{sched.locationOrLink}</span>
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <Link
                                      to={`/interview-room/${app.id}`}
                                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-colors"
                                    >
                                      <Video size={13} /> Vào phòng Online
                                    </Link>
                                    <button
                                      type="button"
                                      onClick={() => setSchedulingApp(app)}
                                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 font-bold text-xs transition-all cursor-pointer"
                                    >
                                      Đổi lịch hẹn
                                    </button>
                                  </div>
                                </div>
                              )}

                              {interviewEval && (interviewEval.rating > 0 || interviewEval.notes) && (
                                <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
                                  <div className="flex items-center gap-2 font-bold text-amber-900">
                                    <Star size={14} className="fill-amber-400 text-amber-500" />
                                    <span>
                                      Đánh giá phỏng vấn nội bộ:{' '}
                                      {interviewEval.rating > 0
                                        ? `${interviewEval.rating}/5 sao`
                                        : 'Đã ghi chú'}
                                    </span>
                                  </div>
                                  {interviewEval.notes && (
                                    <p className="text-[11px] text-slate-700 whitespace-pre-line">
                                      {interviewEval.notes}
                                    </p>
                                  )}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Các nút thao tác Xét duyệt Chấp nhận / Từ chối CV & Hẹn lịch phỏng vấn */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(app as any).uploadedPdfUrl && (
                        <a
                          href={(app as any).uploadedPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2.5 bg-sky-50 hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                          title={(app as any).uploadedFileName || 'Xem file CV PDF đính kèm'}
                        >
                          <ExternalLink size={14} /> File PDF
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setPreviewAppCV(app)}
                        className="px-4 py-2.5 bg-primary-50 hover:bg-primary-600 text-primary-700 hover:text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <Eye size={15} /> Xem CV
                      </button>

                      {app.status !== 'ACCEPTED' ? (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'ACCEPTED')}
                          className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <CheckCircle size={15} /> Chấp nhận
                        </button>
                      ) : (
                        <>
                          <Link
                            to={`/interview-room/${app.id}`}
                            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                          >
                            <Video size={15} /> Phòng PV Online
                          </Link>
                          <button
                            type="button"
                            onClick={() => setSchedulingApp(app)}
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Calendar size={15} />{' '}
                            {(app as any).interviewSchedule || interviews[app.id]
                              ? 'Xem / Sửa lịch hẹn'
                              : 'Hẹn lịch phỏng vấn'}
                          </button>
                        </>
                      )}

                      {app.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                          className="px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                        >
                          <XCircle size={15} /> Từ chối
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setActiveChatAppId(activeChatAppId === app.id ? null : app.id)
                        }
                        className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                          activeChatAppId === app.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-primary-50 hover:text-primary-600'
                        }`}
                        title="Trò chuyện trực tiếp với ứng viên"
                      >
                        <MessageSquare size={16} /> Chat
                      </button>
                    </div>
                  </div>
                </div>

                {activeChatAppId === app.id && (
                  <div className="bg-slate-50 border-t border-slate-100 p-6">
                    <ChatWindow
                      applicationId={app.id}
                      receiverId={app.candidateId}
                      receiverName={(app as any).candidate?.fullName || 'Ứng viên'}
                      onOpenScheduleModal={() => setSchedulingApp(app)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Đặt lịch hẹn phỏng vấn sau khi Chấp nhận ứng viên tiềm năng */}
      {schedulingApp && (
        <InterviewScheduleModal
          application={schedulingApp}
          existingSchedule={interviews[schedulingApp.id] || null}
          onClose={() => setSchedulingApp(null)}
          onScheduled={(newSchedule) => {
            setInterviews((prev) => ({
              ...prev,
              [newSchedule.applicationId]: newSchedule,
            }));
            setActiveChatAppId(newSchedule.applicationId);
            setSchedulingApp(null);
          }}
        />
      )}

      {/* Modal Xem chi tiết CV của Ứng viên nộp vào vị trí (Chuẩn CV trực tuyến + Xuất PDF) */}
      {previewAppCV && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-sky-50 via-white to-teal-50/70 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
              <div>
                <span className="text-[11px] font-semibold text-primary-700">
                  Ứng tuyển vị trí: {previewAppCV.job?.title}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                  {previewAppCV.cv?.title || `Hồ sơ của ${previewAppCV.candidate?.fullName}`}
                </h3>
              </div>
              <button
                onClick={() => setPreviewAppCV(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm text-slate-700">
              {previewAppCV.uploadedPdfUrl && (
                <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileText size={18} className="text-primary-600 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">
                        Tệp CV PDF ứng viên tải lên từ máy tính:{' '}
                        <span className="text-primary-700">
                          {previewAppCV.uploadedFileName || 'CV-Ung-Vien.pdf'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Bạn có thể mở trực tiếp tệp gốc trên tab mới hoặc tải xuống lưu trữ.
                      </p>
                    </div>
                  </div>
                  <a
                    href={previewAppCV.uploadedPdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={14} /> Mở / Tải file PDF gốc
                  </a>
                </div>
              )}

              {previewAppCV.cv ? (
                <CVFullSheetView
                  title={previewAppCV.cv?.title}
                  template={previewAppCV.cv?.template || 'Modern'}
                  data={previewAppCV.cv?.data || {}}
                  fallbackName={previewAppCV.candidate?.fullName}
                  fallbackEmail={previewAppCV.candidate?.email}
                  pdfUrl={previewAppCV.cv?.pdfUrl || previewAppCV.uploadedPdfUrl}
                  showExportToolbar={true}
                />
              ) : previewAppCV.uploadedPdfUrl ? (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <iframe
                    src={previewAppCV.uploadedPdfUrl}
                    title="CV PDF Preview"
                    className="w-full h-[600px]"
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
                  Ứng viên nộp hồ sơ nhanh không đính kèm CV trực tuyến.
                </div>
              )}

              {previewAppCV.coverLetter && (
                <div className="bg-white p-4 rounded-2xl border border-amber-200">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-700 mb-1.5">
                    Thư giới thiệu ứng tuyển (Cover Letter)
                  </h4>
                  <p className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/70 italic text-slate-700">
                    "{previewAppCV.coverLetter}"
                  </p>
                </div>
              )}

              {/* Nút xét duyệt ngay trong Modal xem CV */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-white p-4 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">
                  Trạng thái hiện tại:{' '}
                  <strong className="text-slate-900">
                    {previewAppCV.status === 'PENDING'
                      ? 'Chờ xét duyệt'
                      : previewAppCV.status === 'ACCEPTED'
                      ? 'Đã chấp nhận'
                      : 'Đã từ chối'}
                  </strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(previewAppCV.id, 'ACCEPTED')}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle size={15} /> Chấp nhận CV
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(previewAppCV.id, 'REJECTED')}
                    className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5"
                  >
                    <XCircle size={15} /> Từ chối CV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/** === TAB 2: QUẢN LÝ CÁC VỊ TRÍ ĐÃ ĐĂNG (ĐÓNG/MỞ TIN, XÓA TIN, XEM SỐ LƯỢNG CV & DUYỆT) === */
const ManagePostedPositionsTab = ({
  onSelectJobToReview,
  onOpenPostJob,
}: {
  onSelectJobToReview: (jobId: string) => void;
  onOpenPostJob: () => void;
}) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // State cho Modal Chỉnh sửa tin tuyển dụng & Gia hạn hạn nộp
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editRequirements, setEditRequirements] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequireCV, setEditRequireCV] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title || '');
    setEditLocation(job.location || '');
    setEditSalary(job.salary || '');
    setEditDeadline(
      job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : ''
    );
    setEditRequirements(
      Array.isArray(job.requirements)
        ? job.requirements.join('\n')
        : typeof job.requirements === 'string'
        ? job.requirements
        : ''
    );
    setEditDescription(job.description || '');
    setEditRequireCV(job.requireCV !== undefined ? Boolean(job.requireCV) : true);
  };

  const handleSaveEditedJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;
    setSavingEdit(true);
    try {
      const reqArray = editRequirements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await api.put(`/jobs/${editingJob.id}`, {
        title: editTitle,
        location: editLocation,
        salary: editSalary,
        deadline: editDeadline || null,
        requirements: reqArray,
        description: editDescription,
        requireCV: editRequireCV,
      });
      if (res.data?.job) {
        setJobs((prev) =>
          prev.map((j) => (j.id === editingJob.id ? { ...j, ...res.data.job } : j))
        );
      }
      setEditingJob(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật nội dung tin tuyển dụng.');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchPostedJobs = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [jobsRes, appsRes] = await Promise.allSettled([
        api.get('/jobs/recruiter/my'),
        api.get('/applications/recruiter'),
      ]);
      if (jobsRes.status === 'fulfilled') {
        setJobs(jobsRes.value.data.jobs || []);
      }
      if (appsRes.status === 'fulfilled') {
        setApplications(appsRes.value.data.applications || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể tải danh sách các vị trí đã đăng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostedJobs();
  }, []);

  const openJobsCount = jobs.filter((j) => j.status === 'OPEN').length;

  const handleToggleJobStatus = async (job: Job) => {
    const newStatus = job.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await api.patch(`/jobs/${job.id}/status`, { status: newStatus });
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi đổi trạng thái vị trí tuyển dụng.');
    }
  };

  const handleDeleteJob = async (jobId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vị trí "${title}"?`)) return;
    try {
      await api.delete(`/jobs/${jobId}`);
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi xóa vị trí tuyển dụng.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-black text-slate-400 uppercase tracking-widest text-xs animate-pulse">
        Đang tải danh sách vị trí tuyển dụng đã đăng...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold flex items-center gap-2">
          <AlertCircle size={18} /> {errorMsg}
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold text-slate-900">
              Danh sách vị trí công việc đã đăng ({jobs.length} vị trí)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đang mở: {openJobsCount} vị trí
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi số lượng CV nộp vào từng vị trí, đóng/mở nhận hồ sơ hoặc bấm vào vị trí để xét
            duyệt ứng viên.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenPostJob}
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus size={16} /> Đăng thêm vị trí mới
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
          <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-600 font-bold text-sm">Bạn chưa đăng vị trí tuyển dụng nào</p>
          <button
            type="button"
            onClick={onOpenPostJob}
            className="mt-4 px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-xs"
          >
            Đăng vị trí đầu tiên ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {jobs.map((job) => {
            const jobApps = applications.filter((a) => a.jobId === job.id);
            const pendingCount = jobApps.filter((a) => a.status === 'PENDING').length;
            const acceptedCount = jobApps.filter((a) => a.status === 'ACCEPTED').length;
            const rejectedCount = jobApps.filter((a) => a.status === 'REJECTED').length;

            return (
              <div
                key={job.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${
                        job.status === 'OPEN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {job.status === 'OPEN' ? 'Đang mở nhận CV' : 'Đã đóng tin'}
                    </span>
                    <h4 className="text-lg font-black text-slate-900">{job.title}</h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-semibold">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-primary-500" /> {job.location}
                    </span>
                    {job.salary && (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <DollarSign size={14} /> {job.salary}
                      </span>
                    )}
                    {job.deadline && (() => {
                      const d = new Date(job.deadline);
                      d.setHours(23, 59, 59, 999);
                      const expired = d.getTime() < Date.now();
                      return (
                        <span
                          className={`flex items-center gap-1 ${
                            expired && job.status === 'OPEN' ? 'text-red-600 font-bold' : ''
                          }`}
                        >
                          <Clock
                            size={14}
                            className={expired && job.status === 'OPEN' ? 'text-red-500' : 'text-amber-500'}
                          />{' '}
                          Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                          {expired && job.status === 'OPEN' && (
                            <span className="ml-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-200 text-[10px] font-bold">
                              Đã quá hạn (Bấm Chỉnh sửa để gia hạn)
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Thống kê số CV trong vị trí này */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <span className="px-3 py-1 rounded-xl bg-primary-50 text-primary-700 border border-primary-200 text-xs font-extrabold">
                      Tổng: {jobApps.length} CV đã nộp
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                      Chờ duyệt: {pendingCount}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      Đã chấp nhận: {acceptedCount}
                    </span>
                    <span className="px-3 py-1 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-bold">
                      Đã từ chối: {rejectedCount}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectJobToReview(job.id)}
                    className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Users size={15} /> Xem & Xét duyệt CV ({jobApps.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(job)}
                    className="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border bg-slate-50 text-slate-700 border-slate-200 hover:border-primary-300 hover:text-primary-700 transition-all"
                    title="Chỉnh sửa nội dung hoặc gia hạn hạn nộp hồ sơ"
                  >
                    <Edit3 size={14} /> Chỉnh sửa
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleJobStatus(job)}
                    className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
                      job.status === 'OPEN'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {job.status === 'OPEN' ? (
                      <>
                        <Lock size={14} /> Đóng nhận CV
                      </>
                    ) : (
                      <>
                        <Unlock size={14} /> Mở lại vị trí
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all"
                    title="Xóa vị trí tuyển dụng"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Chỉnh sửa tin tuyển dụng & Gia hạn hạn nộp (Deadline) */}
      {editingJob && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-sky-50 via-white to-teal-50/60 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Chỉnh sửa tin tuyển dụng & Gia hạn hạn nộp
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cập nhật nội dung công việc, mức lương hoặc gia hạn thời gian nhận hồ sơ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingJob(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedJob} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Tên vị trí tuyển dụng *
                </label>
                <input
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Địa điểm làm việc *
                  </label>
                  <input
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Mức lương
                  </label>
                  <input
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                    placeholder="VD: 20 - 35 triệu"
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                    Hạn nộp hồ sơ
                  </label>
                  <input
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Yêu cầu kỹ năng (Mỗi dòng 1 yêu cầu)
                </label>
                <textarea
                  rows={3}
                  value={editRequirements}
                  onChange={(e) => setEditRequirements(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase">
                  Mô tả chi tiết công việc *
                </label>
                <textarea
                  rows={4}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-sm font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Bắt buộc ứng viên đính kèm CV
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {editRequireCV
                      ? 'Yêu cầu ứng viên chọn CV hoặc tải file PDF.'
                      : 'Cho phép ứng tuyển nhanh không cần CV.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditRequireCV(!editRequireCV)}
                  className={`w-11 h-6 rounded-full relative transition-all ${
                    editRequireCV ? 'bg-primary-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      editRequireCV ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition-colors"
                >
                  Huỷ bỏ
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {savingEdit ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle size={17} />}
                  <span>{savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/** === TAB 3: ĐĂNG VỊ TRÍ TUYỂN DỤNG MỚI === */
const PostJobTab = ({ onJobPosted }: { onJobPosted?: () => void }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [salary, setSalary] = useState('');
  const [location, setLocation] = useState('');
  const [deadline, setDeadline] = useState('');
  const [requireCV, setRequireCV] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setErrorMsg('');
      setSuccessMsg('');
      const reqArray = requirements.split('\n').filter((r) => r.trim().length > 0);
      await api.post('/jobs', {
        title,
        description,
        requirements: reqArray,
        salary,
        location,
        deadline,
        requireCV,
      });
      setSuccessMsg('Đăng vị trí tuyển dụng mới thành công.');
      setTitle('');
      setDescription('');
      setRequirements('');
      setSalary('');
      setLocation('');
      setDeadline('');
      if (onJobPosted) {
        setTimeout(() => onJobPosted(), 900);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message ||
          'Bạn phải cập nhật thông tin công ty trước khi đăng tin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 font-medium transition-all text-sm';

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl space-y-6">
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-bold flex items-center gap-2">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-bold flex items-center gap-2">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
            Tên vị trí tuyển dụng *
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Senior Frontend Developer (React / Next.js)..."
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
              Địa điểm làm việc *
            </label>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="VD: Quận Cầu Giấy, Hà Nội..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
              Mức lương
            </label>
            <input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="VD: 20 - 35 triệu"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
              Hạn nộp hồ sơ
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
            Yêu cầu kỹ năng (Mỗi dòng 1 kỹ năng để AI đối chiếu CV)
          </label>
          <textarea
            rows={3}
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="ReactJS, TypeScript&#10;Tối thiểu 2 năm kinh nghiệm..."
          />
        </div>
        <div>
          <label className="block text-xs font-black text-slate-700 mb-2 uppercase tracking-wider">
            Mô tả chi tiết *
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} resize-none`}
            placeholder="Mô tả trách nhiệm công việc..."
          />
        </div>

        <div
          className={`p-5 rounded-2xl border transition-all ${
            requireCV
              ? 'border-primary-200 bg-primary-50/30'
              : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <FileText
                  size={18}
                  className={requireCV ? 'text-primary-600' : 'text-slate-400'}
                />
                Bắt buộc ứng viên đính kèm CV?
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {requireCV
                  ? 'Chỉ nhận đơn khi ứng viên nộp kèm hồ sơ CV.'
                  : 'Cho phép ứng viên nộp đơn nhanh không cần đính kèm CV.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequireCV(!requireCV)}
              className={`w-12 h-7 rounded-full relative transition-all ${
                requireCV ? 'bg-primary-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  requireCV ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-sm sm:text-base shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
        {loading ? 'Đang xử lý...' : 'Đăng vị trí tuyển dụng'}
      </button>
    </form>
  );
};

/** === TAB 4: THÔNG TIN CÔNG TY CHI TIẾT + BẢN ĐỒ VỊ TRÍ (GIỐNG ẢNH MẪU) === */
const CompanyTab = () => {
  const { user } = useAuth();
  const defaultCompanyName = user?.fullName ? `Doanh nghiệp của ${user.fullName}` : 'Doanh nghiệp tuyển dụng';
  const [name, setName] = useState(defaultCompanyName);
  const [location, setLocation] = useState('Hà Nội');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [profile, setProfile] = useState<StructuredCompanyProfile>(() =>
    parseCompanyProfile(null, defaultCompanyName, 'Hà Nội')
  );
  const [coreValuesText, setCoreValuesText] = useState('');
  const [servicesText, setServicesText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    api
      .get('/companies/my')
      .then((res) => {
        if (res.data.company) {
          const c = res.data.company;
          setName(c.name || defaultCompanyName);
          setLocation(c.location || 'Hà Nội');
          setWebsite(c.website || '');
          setLogoUrl(c.logoUrl || '');
          const parsed = parseCompanyProfile(c.description, c.name, c.location);
          setProfile(parsed);
          setCoreValuesText(parsed.coreValues.join('\n'));
          setServicesText(parsed.services.join('\n'));
        } else {
          setIsEditing(true);
        }
      })
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const serializedDescription = JSON.stringify({
    ...profile,
    coreValues: coreValuesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    services: servicesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean),
    detailAddress: location,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      setErrorMsg('');
      setSuccessMsg('');
      await api.put('/companies/my', {
        name,
        description: serializedDescription,
        location,
        website,
        logoUrl,
      });
      setSuccessMsg('Đã cập nhật thông tin công ty và vị trí bản đồ thành công.');
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 'Có lỗi khi lưu thông tin doanh nghiệp.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 font-medium transition-all text-sm';

  if (fetching)
    return (
      <div className="py-20 text-center font-black text-slate-300 uppercase tracking-widest text-xs animate-pulse">
        Đang tải hồ sơ doanh nghiệp & bản đồ...
      </div>
    );

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-bold flex items-center gap-2">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 font-bold flex items-center gap-2">
          <AlertCircle size={20} /> {errorMsg}
        </div>
      )}

      {/* Thanh tiêu đề Hồ sơ Công ty + Nút Chỉnh sửa */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 font-black">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <Building2 size={28} />
            )}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{name}</h3>
            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
              <MapPin size={13} className="text-primary-600" /> {location}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition-all"
        >
          <Edit3 size={15} />
          <span>{isEditing ? 'Đóng khung chỉnh sửa' : 'Chỉnh sửa thông tin & Bản đồ'}</span>
        </button>
      </div>

      {/* HIỂN THỊ TRỰC QUAN THÔNG TIN CÔNG TY + BẢN ĐỒ TƯƠNG TÁC GIỐNG HỆT ẢNH MẪU */}
      <CompanyProfileWithMap
        name={name}
        description={serializedDescription}
        location={location}
        website={website}
        logoUrl={logoUrl}
      />

      {/* FORM CHỈNH SỬA CHI TIẾT KHI NHÀ TUYỂN DỤNG BẤM "CHỈNH SỬA" */}
      {isEditing && (
        <form
          onSubmit={handleSubmit}
          className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5"
        >
          <h4 className="text-base font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
            Cập nhật thông tin công ty & địa chỉ bản đồ
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Tên Công ty *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Lĩnh Vực Hoạt Động *
              </label>
              <input
                value={profile.industry}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                placeholder="VD: Công nghệ thông tin (CNTT)"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Quy Mô Công Ty
              </label>
              <input
                value={profile.scale}
                onChange={(e) => setProfile({ ...profile, scale: e.target.value })}
                placeholder="VD: Nhỏ (không quá 50 nhân sự)"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Địa chỉ hiển thị trên Bản đồ (Google Maps) *
              </label>
              <input
                required
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setProfile({ ...profile, province: e.target.value });
                }}
                placeholder="VD: Tòa nhà FPT, Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
              Giới Thiệu Công Ty
            </label>
            <textarea
              rows={3}
              value={profile.overview}
              onChange={(e) => setProfile({ ...profile, overview: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Giá Trị Cốt Lõi (Mỗi dòng 1 ý)
              </label>
              <textarea
                rows={4}
                value={coreValuesText}
                onChange={(e) => setCoreValuesText(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Dịch Vụ Chính (Mỗi dòng 1 dịch vụ)
              </label>
              <textarea
                rows={4}
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
              Đội Ngũ Nhân Sự
            </label>
            <textarea
              rows={2}
              value={profile.team}
              onChange={(e) => setProfile({ ...profile, team: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Website
              </label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 uppercase">
                Link Logo
              </label>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://image-url.com/logo.png"
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-base shadow-lg shadow-primary-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Building2 size={20} />}
            {loading ? 'Đang lưu...' : 'Lưu thông tin công ty & Bản đồ'}
          </button>
        </form>
      )}
    </div>
  );
};

const RecruiterDashboard = () => {
  const [activeTab, setActiveTab] = useState<
    'applications' | 'manage_jobs' | 'post' | 'company'
  >('applications');
  const [selectedJobForReview, setSelectedJobForReview] = useState<string | null>(null);

  const tabs = [
    { id: 'applications', label: 'Xét duyệt CV theo vị trí', icon: Users },
    { id: 'manage_jobs', label: 'Quản lý vị trí đã đăng', icon: Briefcase },
    { id: 'post', label: 'Đăng vị trí mới', icon: Plus },
    { id: 'company', label: 'Thông tin Công ty & Bản đồ', icon: Building2 },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-5 bg-gradient-to-r from-sky-50/80 via-white to-teal-50/60 px-6 py-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-center text-center">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 size={20} className="text-primary-600 shrink-0" />
            <span>Quản lý Tuyển dụng & Xét duyệt Hồ sơ Ứng viên</span>
          </h1>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm w-fit">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
                activeTab === id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Content Section */}
        <div className="min-h-[500px]">
          {activeTab === 'applications' && (
            <ApplicationsByPositionTab
              initialJobId={selectedJobForReview}
              onClearInitialJob={() => setSelectedJobForReview(null)}
            />
          )}
          {activeTab === 'manage_jobs' && (
            <ManagePostedPositionsTab
              onSelectJobToReview={(jobId) => {
                setSelectedJobForReview(jobId);
                setActiveTab('applications');
              }}
              onOpenPostJob={() => setActiveTab('post')}
            />
          )}
          {activeTab === 'post' && (
            <PostJobTab onJobPosted={() => setActiveTab('manage_jobs')} />
          )}
          {activeTab === 'company' && <CompanyTab />}
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
