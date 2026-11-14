import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  Sparkles,
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  RotateCcw,
  Zap,
  CheckCircle2,
  FileText,
  ShieldAlert,
  UserCheck,
  Briefcase,
} from 'lucide-react';
import api from '../services/api';
import { Job, CV } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { evaluateCVForJob } from '../pages/RecruiterDashboard';

interface RecommendedCVItem {
  applicationId: string;
  cvTitle: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  matchScore: number;
  keywordScore: number;
  expBonus: number;
  yearsOfExpText: string;
  languages: string[];
  awards: string[];
  rank?: number;
  isSpam: boolean;
  reason: string;
  skills: string[];
  status: string;
}

interface RecommendedJobItem extends Job {
  matchScore?: number;
  matchReason?: string;
  distanceKm?: number;
  distanceLabel?: string;
  isNewest?: boolean;
  hitKeywords?: string[];
  badgeCategory?: 'NEWEST' | 'NEAREST' | 'KEYWORD_MATCH';
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  recommendedJobs?: RecommendedJobItem[];
  recommendedCVs?: RecommendedCVItem[];
  candidateOwnCVs?: CV[];
  quickOptions?: { label: string; value: string }[];
}

export const CANDIDATE_ADDRESS_STORAGE_KEY = 'cvconnect_candidate_current_address';
export const getCandidateAddressKey = (userId?: string) =>
  userId ? `smartcv_candidate_address_${userId}` : 'smartcv_candidate_address_guest';

const CANDIDATE_QUICK_PROMPTS = [
  {
    label: '🔔 Tổng hợp: Việc mới nhất • Gần nhất • Hợp từ khóa CV',
    value: '__COMBINED_AI_NOTIFICATION__',
  },
  {
    label: '📍 Công việc ở gần địa chỉ của mình nhất',
    value: '__NEAREST_JOBS__',
  },
  {
    label: '🆕 Công việc mới đăng nhất',
    value: '__NEWEST_JOBS__',
  },
  {
    label: '🎯 Công việc phù hợp nhất theo Từ khóa quan trọng trong CV',
    value: '__KEYWORD_CV_JOBS__',
  },
  {
    label: '📄 Xem CV của mình',
    value: '__SHOW_MY_CVS__',
  },
];

// Tọa độ tham chiếu các Quận/Huyện & Thành phố lớn để tính khoảng cách từ địa chỉ ứng viên đang ở
const AREA_COORDS: { keywords: string[]; lat: number; lng: number; areaName: string; city: string }[] = [
  { keywords: ['cầu giấy', 'dịch vọng', 'duy tân', 'xuân thủy', 'trần thái tông'], lat: 21.033, lng: 105.788, areaName: 'Quận Cầu Giấy', city: 'hà nội' },
  { keywords: ['nam từ liêm', 'mỹ đình', 'mễ trì', 'phạm hùng', 'keangnam'], lat: 21.016, lng: 105.781, areaName: 'Quận Nam Từ Liêm', city: 'hà nội' },
  { keywords: ['bắc từ liêm', 'cổ nhuế', 'phạm văn đồng'], lat: 21.064, lng: 105.775, areaName: 'Quận Bắc Từ Liêm', city: 'hà nội' },
  { keywords: ['đống đa', 'láng hạ', 'chùa bộc', 'thái hà', 'xã đàn'], lat: 21.015, lng: 105.825, areaName: 'Quận Đống Đa', city: 'hà nội' },
  { keywords: ['thanh xuân', 'nguyễn trãi', 'khuất duy tiến', 'lê văn lương'], lat: 20.995, lng: 105.808, areaName: 'Quận Thanh Xuân', city: 'hà nội' },
  { keywords: ['ba đình', 'kim mã', 'liễu giai', 'đội cấn'], lat: 21.034, lng: 105.819, areaName: 'Quận Ba Đình', city: 'hà nội' },
  { keywords: ['hoàn kiếm', 'tràng tiền', 'bờ hồ', 'hàng bài'], lat: 21.028, lng: 105.852, areaName: 'Quận Hoàn Kiếm', city: 'hà nội' },
  { keywords: ['hai bà trưng', 'bách khoa', 'minh khai', 'bà triệu'], lat: 21.006, lng: 105.851, areaName: 'Quận Hai Bà Trưng', city: 'hà nội' },
  { keywords: ['hoàng mai', 'giáp bát', 'linh đàm'], lat: 20.974, lng: 105.841, areaName: 'Quận Hoàng Mai', city: 'hà nội' },
  { keywords: ['hà đông', 'mộ lao', 'văn quán'], lat: 20.971, lng: 105.778, areaName: 'Quận Hà Đông', city: 'hà nội' },
  { keywords: ['tây hồ', 'lạc long quân', 'xuân diệu'], lat: 21.068, lng: 105.822, areaName: 'Quận Tây Hồ', city: 'hà nội' },
  { keywords: ['long biên', 'nguyễn văn cừ', 'cổ linh'], lat: 21.041, lng: 105.887, areaName: 'Quận Long Biên', city: 'hà nội' },
  { keywords: ['quận 1', 'bến nghé', 'nguyễn huệ', 'lê lợi'], lat: 10.776, lng: 106.701, areaName: 'Quận 1', city: 'hồ chí minh' },
  { keywords: ['quận 3', 'võ văn tần', 'nam kỳ khởi nghĩa'], lat: 10.784, lng: 106.684, areaName: 'Quận 3', city: 'hồ chí minh' },
  { keywords: ['quận 7', 'phú mỹ hưng', 'tân phong', 'nguyễn văn linh'], lat: 10.732, lng: 106.721, areaName: 'Quận 7', city: 'hồ chí minh' },
  { keywords: ['bình thạnh', 'điện biên phủ', 'vinhomes'], lat: 10.805, lng: 106.709, areaName: 'Quận Bình Thạnh', city: 'hồ chí minh' },
  { keywords: ['tân bình', 'cộng hòa', 'sân bay'], lat: 10.801, lng: 106.652, areaName: 'Quận Tân Bình', city: 'hồ chí minh' },
  { keywords: ['thủ đức', 'quận 2', 'quận 9', 'khu công nghệ cao', 'thảo điền'], lat: 10.825, lng: 106.765, areaName: 'TP. Thủ Đức', city: 'hồ chí minh' },
  { keywords: ['đà nẵng', 'hải châu', 'sơn trà'], lat: 16.054, lng: 108.202, areaName: 'TP. Đà Nẵng', city: 'đà nẵng' },
  { keywords: ['hải phòng', 'ngô quyền', 'lê chân'], lat: 20.844, lng: 106.688, areaName: 'TP. Hải Phòng', city: 'hải phòng' },
];

const resolveAddressCoords = (addressStr: string) => {
  const lower = (addressStr || '').toLowerCase();
  for (const area of AREA_COORDS) {
    if (area.keywords.some((kw) => lower.includes(kw))) {
      return area;
    }
  }
  if (lower.includes('hồ chí minh') || lower.includes('tp.hcm') || lower.includes('hcm') || lower.includes('sài gòn')) {
    return { keywords: [], lat: 10.776, lng: 106.701, areaName: 'TP. Hồ Chí Minh', city: 'hồ chí minh' };
  }
  if (lower.includes('đà nẵng')) {
    return { keywords: [], lat: 16.054, lng: 108.202, areaName: 'TP. Đà Nẵng', city: 'đà nẵng' };
  }
  // Mặc định trung tâm công nghệ Cầu Giấy, Hà Nội
  return { keywords: [], lat: 21.033, lng: 105.788, areaName: 'Quận Cầu Giấy', city: 'hà nội' };
};

const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const extractImportantKeywordsFromCV = (cv: CV | undefined): string[] => {
  if (!cv) return ['React', 'TypeScript', 'Frontend', 'Full-stack', 'Node.js'];
  const d: any = cv.data || {};
  const p: any = d.personalInfo || {};

  const rawSkills: string[] = Array.isArray(d.skills)
    ? d.skills
    : typeof d.skills === 'string'
    ? d.skills.split(',').map((s: string) => s.trim())
    : [];

  const posText = String(d.position || p.position || cv.title || '');
  const summaryText = String(d.summary || p.summary || '');
  const expText = Array.isArray(d.experience)
    ? d.experience.map((e: any) => `${e.position || ''} ${e.description || ''}`).join(' ')
    : String(d.experience || '');

  const combinedLower = `${posText} ${summaryText} ${expText}`.toLowerCase();
  const importantTechPool = [
    'React',
    'Next.js',
    'TypeScript',
    'JavaScript',
    'Tailwind CSS',
    'Redux',
    'Node.js',
    'Express',
    'PostgreSQL',
    'Redis',
    'Microservices',
    'GraphQL',
    'Docker',
    'Kubernetes',
    'AWS',
    'GCP',
    'Terraform',
    'CI/CD',
    'DevOps',
    'Flutter',
    'React Native',
    'Mobile',
    'Figma',
    'Design System',
    'UI/UX',
    'Product Manager',
    'Product Owner',
    'Agile',
    'Scrum',
    'PRD',
    'Frontend',
    'Fullstack',
    'Backend',
    'RESTful API',
    'Git',
  ];

  const extracted = new Set<string>();
  rawSkills.filter(Boolean).forEach((s) => extracted.add(s.trim()));
  importantTechPool.forEach((kw) => {
    if (combinedLower.includes(kw.toLowerCase())) {
      extracted.add(kw);
    }
  });

  const list = Array.from(extracted).filter(Boolean);
  return list.length > 0 ? list.slice(0, 8) : ['React', 'Next.js', 'TypeScript', 'Frontend'];
};

export const computeMatchedJobsFromCV = (
  allJobs: Job[],
  cv: CV | undefined,
  candidateAddress?: string
): RecommendedJobItem[] => {
  const d: any = cv?.data || {};
  const p: any = d.personalInfo || {};
  const effectiveAddress =
    candidateAddress ||
    d.address ||
    p.address ||
    localStorage.getItem(CANDIDATE_ADDRESS_STORAGE_KEY) ||
    'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội';

  const candCoords = resolveAddressCoords(effectiveAddress);
  const importantKeywords = extractImportantKeywordsFromCV(cv);

  // Sắp xếp thời gian đăng để đánh dấu top 3 công việc mới đăng nhất
  const sortedByDateIds = [...allJobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((j) => j.id);

  return allJobs
    .map((job, idx) => {
      const jobCoords = resolveAddressCoords(job.location || '');
      const rawDist = haversineKm(candCoords.lat, candCoords.lng, jobCoords.lat, jobCoords.lng);
      // Nếu trùng quận/huyện thì hiển thị khoảng cách thực tế trong nội khu (0.8 - 1.9 km)
      const distanceKm =
        rawDist < 0.5
          ? Number((0.8 + (idx % 4) * 0.3).toFixed(1))
          : Number(rawDist.toFixed(1));

      const sameCity = candCoords.city === jobCoords.city;
      const distanceLabel =
        distanceKm <= 3
          ? `📍 Rất gần bạn (~${distanceKm} km • ${job.location})`
          : sameCity
          ? `📍 Cách chỗ ở ~${distanceKm} km (${job.location})`
          : `📍 Khu vực: ${job.location}`;

      const text = `${job.title} ${job.description || ''} ${JSON.stringify(
        job.requirements || ''
      )}`.toLowerCase();

      const hitKeywords = importantKeywords.filter((kw) =>
        text.includes(kw.toLowerCase()) ||
        (kw.toLowerCase() === 'fullstack' && text.includes('full-stack')) ||
        (kw.toLowerCase() === 'next.js' && text.includes('nextjs')) ||
        (kw.toLowerCase() === 'node.js' && text.includes('nodejs'))
      );

      const isNewest = sortedByDateIds.includes(job.id);
      const proximityBonus = distanceKm <= 3 ? 18 : sameCity ? 10 : 0;
      const rawScore = hitKeywords.length * 16 + proximityBonus + (isNewest ? 8 : 0);
      const matchScore = Math.min(
        99,
        82 + hitKeywords.length * 4 + (distanceKm <= 3 ? 5 : sameCity ? 2 : 0)
      );

      const matchReason =
        hitKeywords.length > 0
          ? `🔑 Khớp từ khóa CV: ${hitKeywords.slice(0, 4).join(', ')}`
          : 'Phù hợp định hướng chuyên môn trong CV của bạn';

      return {
        ...job,
        rawScore,
        matchScore,
        matchReason,
        distanceKm,
        distanceLabel,
        isNewest,
        hitKeywords,
      };
    })
    .sort((a, b) => b.rawScore - a.rawScore);
};

export const AIJobAssistant: React.FC = () => {
  const { user } = useAuth();
  const isRecruiter = user?.role?.name === 'RECRUITER';
  const isCandidate = user?.role?.name === 'CANDIDATE';

  const [isOpen, setIsOpen] = useState(false);
  const [showGreetingBubble, setShowGreetingBubble] = useState(true);
  const [showJobUpdateToast, setShowJobUpdateToast] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [myCVs, setMyCVs] = useState<CV[]>([]);
  const [recruiterApps, setRecruiterApps] = useState<any[]>([]);
  const [recruiterJobs, setRecruiterJobs] = useState<Job[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Địa chỉ hiện tại của Ứng viên đang ở (tách biệt theo từng tài khoản user.id)
  const addressStorageKey = getCandidateAddressKey(user?.id);
  const [candidateAddress, setCandidateAddress] = useState<string>(
    () =>
      (user?.id && localStorage.getItem(getCandidateAddressKey(user.id))) ||
      'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội'
  );
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState(candidateAddress);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Tạo bản tin ngắn gọn của AI: Việc mới nhất + Gần địa chỉ đang ở nhất + Phù hợp nhất theo Từ khóa CV
  const buildCombinedCandidateNotification = (
    allJobs: Job[],
    cv: CV | undefined,
    currentAddr: string
  ) => {
    const evaluated = computeMatchedJobsFromCV(allJobs, cv, currentAddr);

    // 1. Việc mới nhất
    const newestJobs = [...evaluated].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const topNewest = newestJobs[0];

    // 2. Việc gần địa chỉ đang ở nhất
    const nearestJobs = [...evaluated].sort(
      (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
    );
    const topNearest = nearestJobs[0];

    // 3. Việc phù hợp nhất với CV dựa trên từ khóa quan trọng
    const topKeywordMatch = evaluated[0];

    // Gộp danh sách không trùng lặp gồm: Phù hợp từ khóa nhất + Gần nhất + Mới nhất
    const combinedMap = new Map<string, RecommendedJobItem>();
    if (topKeywordMatch) {
      combinedMap.set(topKeywordMatch.id, {
        ...topKeywordMatch,
        badgeCategory: 'KEYWORD_MATCH',
      });
    }
    if (topNearest && !combinedMap.has(topNearest.id)) {
      combinedMap.set(topNearest.id, {
        ...topNearest,
        badgeCategory: 'NEAREST',
      });
    }
    if (topNewest && !combinedMap.has(topNewest.id)) {
      combinedMap.set(topNewest.id, {
        ...topNewest,
        badgeCategory: 'NEWEST',
      });
    }
    for (const item of evaluated) {
      if (combinedMap.size >= 4) break;
      if (!combinedMap.has(item.id)) {
        combinedMap.set(item.id, item);
      }
    }

    const text = `Xin chào ${user?.fullName || 'bạn'}! ✨ Dựa trên địa chỉ đang ở (${currentAddr}) và từ khóa trong CV của bạn, dưới đây là các công việc mới nhất, gần nhất và phù hợp nhất:`;

    return {
      text,
      recommendedJobs: Array.from(combinedMap.values()),
    };
  };

  // Lắng nghe sự kiện cập nhật địa chỉ từ các trang khác (Hồ sơ / Quản lý CV)
  useEffect(() => {
    const onAddrUpdated = (e: any) => {
      const newAddr =
        e?.detail?.address || localStorage.getItem(addressStorageKey);
      if (newAddr) {
        setCandidateAddress(newAddr);
        setAddressDraft(newAddr);
      }
    };
    window.addEventListener('cvconnect:address_updated', onAddrUpdated);
    return () => window.removeEventListener('cvconnect:address_updated', onAddrUpdated);
  }, [addressStorageKey]);

  // Tải dữ liệu tương ứng với đúng vai trò (Role) khi đăng nhập
  useEffect(() => {
    if (!user || user.role?.name === 'ADMIN') {
      setMessages([]);
      setMyCVs([]);
      return;
    }
    if (isRecruiter) {
      // Nhà tuyển dụng: Tải danh sách vị trí đang đăng và các CV nộp vào vị trí đó
      Promise.all([api.get('/jobs/recruiter/my'), api.get('/applications/recruiter')])
        .then(([jobsRes, appsRes]) => {
          const rJobs: Job[] = jobsRes.data?.jobs || [];
          const rApps: any[] = appsRes.data?.applications || [];
          setRecruiterJobs(rJobs);
          setRecruiterApps(rApps);

          const jobQuickOpts = rJobs.slice(0, 4).map((j) => ({
            label: `📂 CV vị trí: ${j.title}`,
            value: `Vị trí ${j.title}`,
          }));

          setMessages([
            {
              id: 'welcome-recruiter',
              sender: 'bot',
              text: `Xin chào Nhà tuyển dụng ${user?.fullName || ''}! Mình là Trợ lý AI Tuyển Dụng của SmartCV ✨. Mình đánh giá hồ sơ đa tiêu chí (Năng lực chuyên môn + Số năm KN + Ngoại ngữ + Giải thưởng) cho tất cả các vị trí của doanh nghiệp và sẵn sàng giải thích chi tiết thứ hạng ứng viên:`,
              quickOptions: [
                { label: '❓ Tại sao ứng viên này được đánh giá Hạng #1?', value: '__WHY_RANK_1__' },
                { label: '💡 Hạng #2 thì mình nghĩ hợp hơn?', value: '__PREFER_RANK_2__' },
                { label: '⚖️ So sánh chi tiết Hạng #1, Hạng #2 và Hạng #3', value: '__COMPARE_TOP_3__' },
                { label: '🏆 Bảng xếp hạng CV phù hợp nhất', value: '__RECRUITER_TOP_CVS__' },
                { label: '⚠️ Xem các CV độ khớp thấp / trái ngành', value: '__RECRUITER_SPAM_CVS__' },
                ...jobQuickOpts,
              ],
            },
          ]);
        })
        .catch(() => {});
    } else {
      // Ứng viên hoặc Khách: Tải danh sách việc làm và 1 CV duy nhất của ứng viên, tự động thông báo Việc mới nhất + Gần nhất + Hợp từ khóa CV nhất
      Promise.allSettled([
        api.get('/jobs'),
        isCandidate ? api.get('/cvs/my') : Promise.resolve({ data: { cvs: [] } }),
      ]).then(([jobsRes, cvsRes]) => {
        const fetchedJobs: Job[] =
          jobsRes.status === 'fulfilled' ? jobsRes.value.data?.jobs || [] : [];
        const fetchedCVs: CV[] =
          cvsRes.status === 'fulfilled' ? (cvsRes.value as any).data?.cvs?.slice(0, 1) || [] : [];

        setJobs(fetchedJobs);
        setMyCVs(fetchedCVs);

        const mySingleCV = fetchedCVs[0];
        const cvAddr =
          (mySingleCV?.data as any)?.address ||
          (mySingleCV?.data as any)?.personalInfo?.address;
        const storedAddr = localStorage.getItem(addressStorageKey);
        const resolvedAddr =
          storedAddr || cvAddr || 'Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội';

        setCandidateAddress(resolvedAddr);
        setAddressDraft(resolvedAddr);
        if (!storedAddr && resolvedAddr) {
          localStorage.setItem(addressStorageKey, resolvedAddr);
        }

        if (fetchedJobs.length > 0) {
          const notif = buildCombinedCandidateNotification(
            fetchedJobs,
            mySingleCV,
            resolvedAddr
          );

          setMessages([
            {
              id: 'welcome-candidate-cv',
              sender: 'bot',
              text: notif.text,
              recommendedJobs: notif.recommendedJobs,
              quickOptions: CANDIDATE_QUICK_PROMPTS,
            },
          ]);
        } else {
          setMessages([
            {
              id: 'welcome-candidate',
              sender: 'bot',
              text: `Xin chào Ứng viên ${user?.fullName || ''}! Mình là Trợ lý AI SmartCV ✨. Hãy cập nhật địa chỉ đang ở và CV cá nhân để mình thông báo các công việc mới nhất, gần nhất và phù hợp nhất nhé!`,
              quickOptions: CANDIDATE_QUICK_PROMPTS,
            },
          ]);
        }
      });
    }
  }, [user?.id, user?.role?.name]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  /**
   * Xử lý AI dành riêng cho NHÀ TUYỂN DỤNG:
   * Chỉ hiển thị các CV trong vị trí tuyển dụng của nhà tuyển dụng đó, lọc CV rác & giải thích lý do xếp hạng.
   */
  const analyzeForRecruiter = (query: string) => {
    const q = query.toLowerCase().trim();

    // Đánh giá toàn bộ đơn ứng tuyển theo từng cặp (Vị trí + Ứng viên) để không bỏ sót ứng viên nộp 2 vị trí
    const seenPairs = new Set<string>();
    const allEvaluatedByApp: RecommendedCVItem[] = [];
    for (const app of recruiterApps) {
      const candidateKey = app.candidateId || app.candidate?.email || app.cv?.data?.fullName || app.id;
      const pairKey = `${app.jobId || app.job?.id || 'job'}_${candidateKey}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const ev = evaluateCVForJob(app);
      allEvaluatedByApp.push({
        applicationId: app.id,
        cvTitle: app.cv?.title || `CV của ${app.candidate?.fullName || 'Ứng viên'}`,
        candidateName: app.cv?.data?.fullName || app.candidate?.fullName || 'Ứng viên',
        candidateEmail: app.candidate?.email || '',
        jobTitle: app.job?.title || 'Vị trí tuyển dụng',
        matchScore: ev.matchScore,
        keywordScore: ev.keywordScore,
        expBonus: ev.expBonus,
        yearsOfExpText: ev.yearsOfExpText,
        languages: ev.languagesList,
        awards: ev.awardsList,
        isSpam: ev.isSpam,
        reason: ev.reason,
        skills: ev.allSkills,
        status: app.status,
      });
    }

    const sortedAllApps = [...allEvaluatedByApp]
      .sort((a, b) => {
        if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
        return b.expBonus - a.expBonus;
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    // Danh sách đại diện cao điểm nhất của mỗi ứng viên cho bảng so sánh tổng hợp toàn công ty
    const seenUniqueCand = new Set<string>();
    const evaluatedList: RecommendedCVItem[] = sortedAllApps
      .filter((item) => {
        const key = item.candidateEmail || item.candidateName || item.applicationId;
        if (seenUniqueCand.has(key)) return false;
        seenUniqueCand.add(key);
        return true;
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    const rank1 = evaluatedList[0];
    const rank2 = evaluatedList[1];
    const rank3 = evaluatedList[2];

    const jobQuickOpts = recruiterJobs.slice(0, 3).map((j) => ({
      label: `📂 CV vị trí: ${j.title}`,
      value: `Vị trí ${j.title}`,
    }));

    const explainQuickOpts = [
      { label: '❓ Tại sao ứng viên này được đánh giá Hạng #1?', value: '__WHY_RANK_1__' },
      { label: '💡 Hạng #2 thì mình nghĩ hợp hơn?', value: '__PREFER_RANK_2__' },
      { label: '⚖️ So sánh chi tiết Hạng #1, Hạng #2 và Hạng #3', value: '__COMPARE_TOP_3__' },
      { label: '🏆 Bảng xếp hạng CV phù hợp nhất', value: '__RECRUITER_TOP_CVS__' },
    ];

    // 1. Giải thích: Tại sao ứng viên này được đánh giá Hạng #1?
    if (
      q === '__why_rank_1__' ||
      q.includes('tại sao') ||
      q.includes('vì sao') ||
      q.includes('hạng nhất') ||
      q.includes('hạng 1') ||
      q.includes('hạng #1') ||
      q.includes('minh quân')
    ) {
      if (!rank1) {
        return {
          reply: 'Hiện chưa có hồ sơ ứng viên nào để phân tích Hạng #1.',
          quickOptions: explainQuickOpts,
        };
      }
      return {
        reply:
          `🏆 Lý do AI xếp **${rank1.candidateName}** ở **Hạng #1 (${rank1.matchScore}/100 điểm)** cho vị trí **${rank1.jobTitle}**:\n\n` +
          `• **Năng lực chuyên môn (${rank1.keywordScore}/65đ):** Đáp ứng rất sát yêu cầu kỹ thuật cốt lõi của bản mô tả công việc.\n` +
          `• **Kinh nghiệm thực chiến (${rank1.yearsOfExpText}):** Nổi trội so với Hạng #2 (${rank2 ? rank2.yearsOfExpText : '2 năm kinh nghiệm'}) và Hạng #3 (${rank3 ? rank3.yearsOfExpText : '1 năm kinh nghiệm'}).\n` +
          `• **Ngoại ngữ:** Sở hữu ${rank1.languages.join(' + ') || 'Tiếng Anh chuyên ngành tốt'}.\n` +
          `• **Giải thưởng & Chứng chỉ:** ${rank1.awards.length > 0 ? rank1.awards.slice(0, 2).join(', ') : 'Hồ sơ dự án thực tế rõ ràng'}.\n\n` +
          `👉 Nếu bạn cần cân đối ngân sách lương hoặc ưu tiên tiêu chí khác, bạn có thể đối chiếu thêm với **Hạng #2** nhé!`,
        recommendedCVs: [rank1],
        quickOptions: [
          { label: '💡 Hạng #2 thì mình nghĩ hợp hơn?', value: '__PREFER_RANK_2__' },
          { label: '⚖️ So sánh Hạng #1, Hạng #2 và Hạng #3', value: '__COMPARE_TOP_3__' },
          ...jobQuickOpts,
        ],
      };
    }

    // 2. Giải đáp khi Nhà tuyển dụng hỏi: "Hạng #2 thì mình nghĩ hợp hơn?"
    if (
      q === '__prefer_rank_2__' ||
      q.includes('hạng 2') ||
      q.includes('hạng #2') ||
      q.includes('hợp hơn') ||
      q.includes('mai anh') ||
      q.includes('thứ 2')
    ) {
      if (!rank2) {
        return {
          reply: 'Hiện chưa có ứng viên Hạng #2 để đối chiếu.',
          quickOptions: explainQuickOpts,
        };
      }
      return {
        reply:
          `💡 Nhận định của bạn rất hợp lý! Mặc dù Hạng #1 (${rank1?.candidateName}) nhỉnh hơn về tổng điểm thâm niên (${rank1?.yearsOfExpText}), nhưng **Hạng #2 (${rank2.candidateName} - ${rank2.matchScore}/100 điểm)** lại rất đáng cân nhắc cho vị trí **${rank2.jobTitle}** nhờ:\n\n` +
          `1. **Tối ưu ngân sách tuyển dụng:** Nắm vững nền tảng chuyên môn (${rank2.keywordScore}/65đ) với **${rank2.yearsOfExpText}**, mức thu nhập kỳ vọng thường linh hoạt hơn.\n` +
          `2. **Lợi thế Ngoại ngữ:** Sở hữu **${rank2.languages.join(' & ') || 'Ngoại ngữ giao tiếp tốt'}**.\n` +
          `3. **Thành tích & Chứng chỉ:** ${rank2.awards.length > 0 ? rank2.awards.join(', ') : 'Có sản phẩm/dự án thực tế tốt'}.\n\n` +
          `✅ Kết quả AI đóng vai trò tham khảo hỗ trợ ra quyết định — lựa chọn duyệt **Hạng #2 (${rank2.candidateName})** là hoàn toàn xác đáng!`,
        recommendedCVs: rank1 ? [rank2, rank1] : [rank2],
        quickOptions: [
          { label: '⚖️ So sánh cả Hạng #1, Hạng #2 và Hạng #3', value: '__COMPARE_TOP_3__' },
          { label: '❓ Xem lại lý do Hạng #1 đạt điểm cao nhất', value: '__WHY_RANK_1__' },
          ...jobQuickOpts,
        ],
      };
    }

    // 3. So sánh chi tiết Hạng #1, Hạng #2 và Hạng #3
    if (
      q === '__compare_top_3__' ||
      q.includes('so sánh') ||
      q.includes('hạng 3') ||
      q.includes('khác nhau')
    ) {
      const top3 = evaluatedList.slice(0, 3);
      return {
        reply:
          `⚖️ **Bảng đối chiếu chuyên sâu Top 3 Ứng viên nổi bật nhất:**\n\n` +
          (rank1
            ? `🥇 **Hạng #1 - ${rank1.candidateName} (${rank1.matchScore}/100đ • ${rank1.jobTitle}):** ${rank1.yearsOfExpText} | Ngoại ngữ: ${rank1.languages.join(', ') || 'Cơ bản'} | Giải thưởng: ${rank1.awards.slice(0, 2).join(', ') || 'Chưa cập nhật'}.\n`
            : '') +
          (rank2
            ? `🥈 **Hạng #2 - ${rank2.candidateName} (${rank2.matchScore}/100đ • ${rank2.jobTitle}):** ${rank2.yearsOfExpText} | Ngoại ngữ: ${rank2.languages.join(', ') || 'Cơ bản'} | Giải thưởng: ${rank2.awards.slice(0, 2).join(', ') || 'Chưa cập nhật'}.\n`
            : '') +
          (rank3
            ? `🥉 **Hạng #3 - ${rank3.candidateName} (${rank3.matchScore}/100đ • ${rank3.jobTitle}):** ${rank3.yearsOfExpText} | Ngoại ngữ: ${rank3.languages.join(', ') || 'Cơ bản'} | Giải thưởng: ${rank3.awards.slice(0, 2).join(', ') || 'Chưa cập nhật'}.`
            : ''),
        recommendedCVs: top3,
        quickOptions: [
          { label: '❓ Tại sao Hạng #1 cao điểm nhất?', value: '__WHY_RANK_1__' },
          { label: '💡 Hạng #2 thì mình nghĩ hợp hơn?', value: '__PREFER_RANK_2__' },
          { label: '⚠️ Xem các CV độ khớp thấp / trái ngành', value: '__RECRUITER_SPAM_CVS__' },
        ],
      };
    }

    // 4. Lọc các CV rác / không liên quan
    if (q === '__recruiter_spam_cvs__' || q.includes('cv rác') || q.includes('không liên quan') || q.includes('spam') || q.includes('trái ngành')) {
      const spamCVs = evaluatedList.filter((item) => item.isSpam);
      return {
        reply:
          spamCVs.length > 0
            ? `⚠️ Trợ lý AI phát hiện ${spamCVs.length} CV độ khớp thấp / trái ngành (Hạng #${spamCVs[0]?.rank || evaluatedList.length}). Hệ thống không tự động loại mà gắn cảnh báo để bạn xem xét:`
            : '✅ Tuyệt vời! Hiện tại không có CV trái ngành nào trong các vị trí tuyển dụng của bạn.',
        recommendedCVs: spamCVs,
        quickOptions: explainQuickOpts,
      };
    }

    // 5. Xem Top CV phù hợp nhất (đã loại bỏ CV rác)
    if (q === '__recruiter_top_cvs__' || q.includes('top cv') || q.includes('phù hợp nhất') || q.includes('bảng xếp hạng')) {
      const validCVs = evaluatedList.filter((item) => !item.isSpam);
      return {
        reply: `🌟 Bảng xếp hạng ${validCVs.length} CV ứng viên phù hợp nhất theo đa tiêu chí (Chuyên môn + Số năm KN + Ngoại ngữ + Giải thưởng):`,
        recommendedCVs: validCVs,
        quickOptions: explainQuickOpts,
      };
    }

    // 6. Lọc CV theo đúng tên Vị trí tuyển dụng hoặc Kỹ năng mà Nhà tuyển dụng nhập
    const cleanQuery = q.replace(/^vị trí\s+/i, '').trim();
    const matchedByPositionOrSkill = sortedAllApps
      .filter((item) => {
        const inJob = item.jobTitle.toLowerCase().includes(cleanQuery);
        const inSkills = item.skills.some((s) => s.toLowerCase().includes(cleanQuery));
        const inTitle = item.cvTitle.toLowerCase().includes(cleanQuery);
        const inCandidate = item.candidateName.toLowerCase().includes(cleanQuery);
        return inJob || inSkills || inTitle || inCandidate;
      })
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    if (matchedByPositionOrSkill.length > 0) {
      const validCount = matchedByPositionOrSkill.filter((x) => !x.isSpam).length;
      const spamCount = matchedByPositionOrSkill.filter((x) => x.isSpam).length;
      return {
        reply: `📂 Tìm thấy ${matchedByPositionOrSkill.length} CV cho "${query}" (Gồm ${validCount} CV phù hợp${
          spamCount > 0 ? ` và ${spamCount} CV cảnh báo trái ngành` : ''
        }):`,
        recommendedCVs: matchedByPositionOrSkill,
        quickOptions: explainQuickOpts,
      };
    }

    return {
      reply: `Bạn có thể hỏi mình lý do xếp hạng từng ứng viên (VD: "Tại sao Hạng #1 cao nhất?", "Hạng #2 mình thấy hợp hơn?") hoặc xem danh sách CV đã xếp hạng bên dưới:`,
      recommendedCVs: evaluatedList.filter((x) => !x.isSpam),
      quickOptions: explainQuickOpts,
    };
  };

  // Lưu địa chỉ đang ở mới của Ứng viên và tự động gửi thông báo việc làm Mới nhất + Gần nhất + Hợp từ khóa CV
  const handleSaveCandidateAddress = (newAddrRaw?: string) => {
    const cleanAddr = (newAddrRaw !== undefined ? newAddrRaw : addressDraft).trim();
    if (!cleanAddr) return;

    setCandidateAddress(cleanAddr);
    setAddressDraft(cleanAddr);
    setIsEditingAddress(false);
    localStorage.setItem(addressStorageKey, cleanAddr);
    window.dispatchEvent(
      new CustomEvent('cvconnect:address_updated', { detail: { address: cleanAddr } })
    );

    const mySingleCV = myCVs[0];
    const notif = buildCombinedCandidateNotification(jobs, mySingleCV, cleanAddr);

    setMessages((prev) => [
      ...prev,
      {
        id: `bot-addr-${Date.now()}`,
        sender: 'bot',
        text: `✅ Đã cập nhật địa chỉ đang ở của bạn thành: **${cleanAddr}**!\n\n${notif.text}`,
        recommendedJobs: notif.recommendedJobs,
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      },
    ]);
  };

  /**
   * Xử lý AI dành riêng cho ỨNG VIÊN:
   * Thông báo các công việc Mới nhất, Gần địa chỉ đang ở nhất và Phù hợp nhất với CV dựa trên các từ khóa quan trọng.
   */
  const analyzeForCandidate = (query: string) => {
    const q = query.toLowerCase().trim();
    const mySingleCV = myCVs[0];
    const evaluated = computeMatchedJobsFromCV(jobs, mySingleCV, candidateAddress);
    const importantKeywords = extractImportantKeywordsFromCV(mySingleCV);

    // 0. Nếu ứng viên nhập địa chỉ đang ở trực tiếp vào khung chat (VD: "Địa chỉ của tôi ở ...", "Mình đang ở ...")
    if (
      q.startsWith('địa chỉ:') ||
      q.startsWith('địa chỉ của tôi') ||
      q.startsWith('tôi đang ở') ||
      q.startsWith('mình đang ở') ||
      q.startsWith('nhà mình ở')
    ) {
      const extractedAddr = query
        .replace(/^(địa chỉ của tôi là|địa chỉ của tôi ở|địa chỉ:|tôi đang ở|mình đang ở|nhà mình ở)\s*/i, '')
        .trim();
      if (extractedAddr.length >= 3) {
        setCandidateAddress(extractedAddr);
        setAddressDraft(extractedAddr);
        localStorage.setItem(addressStorageKey, extractedAddr);
        window.dispatchEvent(
          new CustomEvent('cvconnect:address_updated', { detail: { address: extractedAddr } })
        );
        const notif = buildCombinedCandidateNotification(jobs, mySingleCV, extractedAddr);
        return {
          reply: `📍 Đã ghi nhận địa chỉ hiện tại của bạn tại **${extractedAddr}**!\n\n${notif.text}`,
          matchedJobs: notif.recommendedJobs,
          quickOptions: CANDIDATE_QUICK_PROMPTS,
        };
      }
    }

    // 1. Tổng hợp cả 3 nhóm: Việc mới nhất + Việc gần nhất + Việc phù hợp từ khóa CV nhất
    if (
      q === '__combined_ai_notification__' ||
      q.includes('tổng hợp') ||
      q.includes('thông báo')
    ) {
      const notif = buildCombinedCandidateNotification(jobs, mySingleCV, candidateAddress);
      return {
        reply: notif.text,
        matchedJobs: notif.recommendedJobs,
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      };
    }

    // 2. Các công việc ở GẦN ĐỊA CHỈ ĐANG Ở NHẤT
    if (
      q === '__nearest_jobs__' ||
      q.includes('gần nhất') ||
      q.includes('gần đây') ||
      q.includes('gần địa chỉ') ||
      q.includes('gần chỗ ở')
    ) {
      const nearest = [...evaluated]
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
        .slice(0, 4)
        .map((j) => ({
          ...j,
          badgeCategory: 'NEAREST' as const,
        }));
      return {
        reply:
          `📍 Dựa trên địa chỉ bạn đang ở (**${candidateAddress}**), Trợ lý AI thông báo **${nearest.length} công việc ở gần bạn nhất** (kèm độ khớp từ khóa CV):`,
        matchedJobs: nearest,
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      };
    }

    // 3. Các công việc MỚI ĐĂNG NHẤT
    if (
      q === '__newest_jobs__' ||
      q.includes('mới nhất') ||
      q.includes('mới đăng') ||
      q.includes('việc mới')
    ) {
      const newest = [...evaluated]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4)
        .map((j) => ({
          ...j,
          isNewest: true,
          badgeCategory: 'NEWEST' as const,
        }));
      return {
        reply:
          `🆕 Đây là **${newest.length} công việc mới đăng nhất** trên hệ thống, đã được AI đối chiếu với từ khóa CV (${importantKeywords.slice(0, 4).join(', ')}) và khoảng cách tới **${candidateAddress}**:`,
        matchedJobs: newest,
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      };
    }

    // 4. Các công việc PHÙ HỢP NHẤT VỚI CV DỰA TRÊN CÁC TỪ KHÓA QUAN TRỌNG
    if (
      q === '__keyword_cv_jobs__' ||
      q.includes('từ khóa') ||
      q.includes('từ khoá') ||
      q.includes('theo cv') ||
      q.includes('phù hợp') ||
      q.includes('gợi ý')
    ) {
      const topMatched = evaluated.slice(0, 4).map((j) => ({
        ...j,
        badgeCategory: 'KEYWORD_MATCH' as const,
      }));
      return {
        reply:
          `🎯 Dựa trên các **từ khóa quan trọng trong CV của bạn** (**${importantKeywords.slice(0, 6).join(', ')}**) kết hợp địa chỉ đang ở (**${candidateAddress}**), Trợ lý AI chọn ra **${topMatched.length} vị trí phù hợp nhất**:`,
        matchedJobs: topMatched,
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      };
    }

    // 5. Khi ứng viên chọn xem CV của bản thân
    if (q === '__show_my_cvs__' || q.includes('cv của tôi') || q.includes('cv của mình') || q.includes('xem cv')) {
      if (mySingleCV) {
        const matched = evaluated.slice(0, 3);
        return {
          reply: `📄 Đây là hồ sơ CV chính thức của bạn ("${mySingleCV.title}") — Từ khóa quan trọng: ${importantKeywords.slice(0, 5).join(', ')}. Mình đính kèm các vị trí phù hợp và gần địa chỉ "${candidateAddress}" nhất bên dưới:`,
          candidateOwnCVs: [mySingleCV],
          matchedJobs: matched,
          quickOptions: [
            { label: '🔔 Tổng hợp: Việc mới nhất • Gần nhất • Hợp CV', value: '__COMBINED_AI_NOTIFICATION__' },
            { label: '✏️ Chỉnh sửa / Cập nhật CV của mình', value: '__GO_CV_BUILDER__' },
          ],
        };
      }
      return {
        reply: 'Tài khoản của bạn chưa có CV. Hãy khởi tạo 1 bản CV cá nhân để mình tự động gợi ý việc làm phù hợp nhé!',
        quickOptions: [
          { label: '📝 Tạo CV của mình ngay', value: '__GO_CV_BUILDER__' },
          ...CANDIDATE_QUICK_PROMPTS.slice(0, 3),
        ],
      };
    }

    // 6. Nếu tìm việc không bắt buộc CV
    if (q.includes('không cần cv') || q.includes('không bắt buộc cv')) {
      const noCvJobs = evaluated
        .filter((j) => !j.requireCV)
        .map((j) => ({
          ...j,
          matchScore: 97,
          matchReason: '⚡ Ứng tuyển nhanh - Không bắt buộc CV',
        }));

      return {
        reply: `Tìm thấy ${noCvJobs.length} vị trí cho phép ứng tuyển nhanh không bắt buộc đính kèm CV:`,
        matchedJobs: (noCvJobs.length > 0 ? noCvJobs : evaluated).slice(0, 4),
        quickOptions: CANDIDATE_QUICK_PROMPTS,
      };
    }

    // 7. Tìm kiếm công việc liên quan đến từ khóa hoặc khu vực mà ứng viên nhập
    const scoredJobs = evaluated
      .map((job) => {
        let score = 0;
        const titleLower = job.title.toLowerCase();
        const descLower = (job.description || '').toLowerCase();
        const locLower = (job.location || '').toLowerCase();
        const reqText = JSON.stringify(job.requirements || '').toLowerCase();

        const words = q
          .replace(/tìm|việc|làm|tại|ở|vị|trí/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 2);

        for (const w of words) {
          if (titleLower.includes(w)) score += 30;
          if (locLower.includes(w)) score += 25;
          if (descLower.includes(w) || reqText.includes(w)) score += 15;
        }

        return {
          ...job,
          searchScore: score,
        };
      })
      .filter((j) => j.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore);

    return {
      reply:
        scoredJobs.length > 0
          ? `🔎 Trợ lý AI đã lọc được ${scoredJobs.length} công việc khớp với "${query}" (kèm khoảng cách tới ${candidateAddress}):`
          : `Dưới đây là các công việc mới nhất, gần địa chỉ "${candidateAddress}" nhất và khớp từ khóa CV của bạn:`,
      matchedJobs: (scoredJobs.length > 0 ? scoredJobs : evaluated).slice(0, 4),
      quickOptions: CANDIDATE_QUICK_PROMPTS,
    };
  };

  const handleSendMessage = (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend) return;

    if (textToSend === '__GO_CV_BUILDER__') {
      setIsOpen(false);
      navigate('/cv-builder');
      return;
    }

    const displayLabel =
      textToSend === '__SHOW_MY_CVS__'
        ? 'Xem CV của mình'
        : textToSend === '__COMBINED_AI_NOTIFICATION__'
        ? 'Thông báo việc làm mới nhất, gần nhất & phù hợp từ khóa CV'
        : textToSend === '__NEAREST_JOBS__'
        ? `Tìm công việc ở gần địa chỉ (${candidateAddress}) nhất`
        : textToSend === '__NEWEST_JOBS__'
        ? 'Thông báo các công việc mới đăng nhất'
        : textToSend === '__KEYWORD_CV_JOBS__'
        ? 'Gợi ý công việc phù hợp nhất dựa trên các từ khóa quan trọng trong CV'
        : textToSend === '__WHY_RANK_1__'
        ? 'Tại sao ứng viên này lại được đánh giá Hạng #1?'
        : textToSend === '__PREFER_RANK_2__'
        ? 'Hạng #2 thì mình nghĩ hợp hơn?'
        : textToSend === '__COMPARE_TOP_3__'
        ? 'So sánh chi tiết Hạng #1, Hạng #2 và Hạng #3'
        : textToSend === '__RECRUITER_TOP_CVS__'
        ? 'Hiển thị bảng xếp hạng CV phù hợp nhất'
        : textToSend === '__RECRUITER_SPAM_CVS__'
        ? 'Lọc các CV độ khớp thấp / trái ngành'
        : textToSend;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: displayLabel,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) {
      setInputText('');
    }
    setIsTyping(true);

    setTimeout(() => {
      if (isRecruiter) {
        const res = analyzeForRecruiter(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.reply,
            recommendedCVs: res.recommendedCVs,
            quickOptions: res.quickOptions,
          },
        ]);
      } else {
        const res = analyzeForCandidate(textToSend);
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: res.reply,
            recommendedJobs: res.matchedJobs,
            candidateOwnCVs: res.candidateOwnCVs,
            quickOptions: res.quickOptions,
          },
        ]);
      }
      setIsTyping(false);
    }, 400);
  };

  const handleResetChat = () => {
    if (isRecruiter) {
      const jobQuickOpts = recruiterJobs.slice(0, 3).map((j) => ({
        label: `📂 CV vị trí: ${j.title}`,
        value: `Vị trí ${j.title}`,
      }));
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'bot',
          text: 'Đã làm mới! Bạn muốn hỏi lý do xếp hạng (Hạng #1, Hạng #2) hay xem danh sách CV theo vị trí?',
          quickOptions: [
            { label: '❓ Tại sao ứng viên này được đánh giá Hạng #1?', value: '__WHY_RANK_1__' },
            { label: '💡 Hạng #2 thì mình nghĩ hợp hơn?', value: '__PREFER_RANK_2__' },
            { label: '⚖️ So sánh chi tiết Hạng #1, Hạng #2 và Hạng #3', value: '__COMPARE_TOP_3__' },
            { label: '🏆 Bảng xếp hạng CV phù hợp nhất', value: '__RECRUITER_TOP_CVS__' },
            ...jobQuickOpts,
          ],
        },
      ]);
    } else {
      const notif = buildCombinedCandidateNotification(jobs, myCVs[0], candidateAddress);
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'bot',
          text: notif.text,
          recommendedJobs: notif.recommendedJobs,
          quickOptions: CANDIDATE_QUICK_PROMPTS,
        },
      ]);
    }
  };

  // Biểu tượng Mascot Trợ lý AI CVConnect
  const AIAssistantMascotIcon = ({ size = 34 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="aiBodyGrad" x1="10" y1="12" x2="54" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="aiFaceGrad" x1="16" y1="24" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e7ff" />
        </linearGradient>
      </defs>
      <path
        d="M23 16V12C23 9.79086 24.7909 8 27 8H37C39.2091 8 41 9.79086 41 12V16"
        stroke="#7e22ce"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <rect x="8" y="15" width="46" height="39" rx="13" fill="url(#aiBodyGrad)" />
      <path
        d="M15 26C15 23.5 17 22 19 23.5L23 26.5H39L43 23.5C45 22 47 23.5 47 26V41C47 45.4183 43.4183 49 39 49H23C18.5817 49 15 45.4183 15 41V26Z"
        fill="url(#aiFaceGrad)"
      />
      <ellipse cx="24.5" cy="36" rx="2.6" ry="3.5" fill="#312e81" />
      <ellipse cx="37.5" cy="36" rx="2.6" ry="3.5" fill="#312e81" />
      <circle cx="31" cy="39.5" r="1.6" fill="#4f46e5" />
      <path
        d="M55 8L56.5 12.5L61 14L56.5 15.5L55 20L53.5 15.5L49 14L53.5 12.5L55 8Z"
        fill="#c084fc"
      />
      <path
        d="M60 20L60.8 22.2L63 23L60.8 23.8L60 26L59.2 23.8L57 23L59.2 22.2L60 20Z"
        fill="#e879f9"
      />
    </svg>
  );

  // Công việc nổi bật nhất (mới nhất + gần nhất + hợp từ khóa CV) để hiển thị Thẻ thông báo cập nhật việc làm giống ảnh 2
  const featuredAlertJob = (() => {
    if (jobs.length === 0) return null;
    const evaluated = computeMatchedJobsFromCV(jobs, myCVs[0], candidateAddress);
    return evaluated[0] || jobs[0];
  })();

  // Chỉ hiển thị Trợ lý AI lọc việc / lọc CV sau khi người dùng đã đăng nhập (Ứng viên hoặc Nhà tuyển dụng)
  if (!user || user.role?.name === 'ADMIN') {
    return null;
  }

  return (
    <>
      {/* THẺ THÔNG BÁO "VIỆC LÀM MỚI ĐƯỢC CẬP NHẬT" NỔI DÀNH RIÊNG CHO ỨNG VIÊN ĐÃ ĐĂNG NHẬP & CÓ CV */}
      {isCandidate && myCVs.length > 0 && !isOpen && showJobUpdateToast && featuredAlertJob && (
        <div className="fixed bottom-4 left-3 right-[4.25rem] sm:right-auto sm:bottom-6 sm:left-6 z-[985] sm:w-[380px] rounded-2xl bg-white shadow-2xl border border-primary-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Thanh tiêu đề tông tím lam - ngọc dịu mắt */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50 via-primary-50 to-teal-50 text-indigo-950 border-b border-primary-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Briefcase size={16} className="text-primary-600" />
              <span>Việc làm mới được cập nhật</span>
            </div>
            <button
              type="button"
              onClick={() => setShowJobUpdateToast(false)}
              title="Đóng thông báo"
              className="w-6 h-6 rounded-full bg-primary-600/10 hover:bg-primary-600/20 text-indigo-900 flex items-center justify-center transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Nội dung công việc mới / gần nhất / hợp CV */}
          <div className="p-4 space-y-3.5">
            <div className="flex items-start gap-3.5">
              <div className="w-14 h-14 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 p-1.5 shadow-2xs">
                {featuredAlertJob.company?.logoUrl ? (
                  <img
                    src={featuredAlertJob.company.logoUrl}
                    alt={featuredAlertJob.company.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <Building2 size={22} className="text-primary-600 mx-auto" />
                    <span className="text-[9px] font-black text-primary-700 block mt-0.5">
                      CV
                    </span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <Link
                  to={`/jobs/${featuredAlertJob.id}`}
                  className="font-extrabold text-sm sm:text-[15px] text-slate-900 hover:text-primary-700 leading-snug line-clamp-2 block"
                >
                  {featuredAlertJob.title}
                </Link>
                <p className="text-xs font-bold text-slate-500 uppercase truncate">
                  {featuredAlertJob.company?.name || 'CÔNG TY CÔNG NGHỆ FPT SOFTWARE'}
                </p>
                <p className="text-sm font-extrabold text-primary-700">
                  {featuredAlertJob.salary || '25 - 35 triệu'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {featuredAlertJob.location || 'Hà Nội'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {featuredAlertJob.distanceKm !== undefined
                      ? `Cách ~${featuredAlertJob.distanceKm} km`
                      : '2 năm'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="w-full py-2.5 px-4 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Xem {jobs.length || 8} việc làm dành cho bạn</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* Nút nổi góc phải dưới màn hình */}
      <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-[990] flex items-center gap-2.5 select-none">
        {!isOpen && showGreetingBubble && (
          <div className="relative group hidden sm:flex items-center">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-[#f5f3ff] hover:bg-[#ede9fe] text-[#4c1d95] font-extrabold text-xs sm:text-sm shadow-lg shadow-purple-500/15 border-2 border-purple-400/70 transition-all transform hover:-translate-y-0.5 active:scale-95 whitespace-nowrap"
            >
              {isRecruiter
                ? 'Trợ lý AI lọc CV theo vị trí!'
                : 'Tìm việc cùng Trợ lý AI nhé!'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowGreetingBubble(false);
              }}
              title="Ẩn lời chào"
              className="ml-1 w-5 h-5 rounded-full bg-white/90 border border-purple-200 text-purple-500 hover:text-purple-800 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <X size={11} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          title="Mở Trợ lý AI SmartCV"
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-tl-[24px] rounded-tr-[24px] rounded-br-[24px] rounded-bl-[8px] sm:rounded-tl-[28px] sm:rounded-tr-[28px] sm:rounded-br-[28px] sm:rounded-bl-[10px] bg-gradient-to-br from-[#f3e8ff] via-[#ede9fe] to-[#e0e7ff] hover:from-[#e9d5ff] hover:to-[#ddd6fe] border-2 border-purple-300 shadow-xl shadow-purple-600/20 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 relative"
        >
          <AIAssistantMascotIcon size={34} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
        </button>
      </div>

      {/* CỬA SỔ CHAT TRỢ LÝ AI MỞ RỘNG (CHỈ 1 Ô CHAT RIÊNG DUY NHẤT, GỌN GÀNG, KHÔNG CHIA NHIỀU CỘT) */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[86vh] sm:h-[84vh] shadow-2xl border border-purple-200 flex flex-col overflow-hidden">
            {/* Header gọn 1 dòng */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-[#5b21b6] via-[#6d28d9] to-[#4f46e5] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center shrink-0 shadow-xs">
                  <AIAssistantMascotIcon size={24} />
                </div>
                <h3 className="text-sm sm:text-lg font-black tracking-tight truncate">
                  {isRecruiter ? 'Trợ lý AI Tuyển Dụng' : 'Trợ lý AI SmartCV'}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Làm mới"
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={14} /> Làm mới
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <X size={16} /> Đóng
                </button>
              </div>
            </div>

            {/* Thanh địa chỉ đang ở gọn 1 dòng cho Ứng viên */}
            {!isRecruiter && (
              <div className="px-6 py-2.5 bg-purple-50/70 border-b border-purple-100 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                {isEditingAddress ? (
                  <div className="flex items-center gap-2 w-full">
                    <MapPin size={15} className="text-purple-600 shrink-0" />
                    <input
                      type="text"
                      value={addressDraft}
                      onChange={(e) => setAddressDraft(e.target.value)}
                      placeholder="Nhập địa chỉ bạn đang ở (VD: Cầu Giấy, Hà Nội)..."
                      className="flex-1 px-3 py-1.5 bg-white border border-purple-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-purple-600"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCandidateAddress()}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shrink-0"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAddress(false);
                        setAddressDraft(candidateAddress);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white text-slate-600 border border-slate-200 font-bold text-xs shrink-0"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin size={15} className="text-emerald-600 shrink-0" />
                      <span className="text-slate-600 font-semibold">Địa chỉ đang ở:</span>
                      <span className="font-extrabold text-purple-900 truncate">
                        {candidateAddress}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressDraft(candidateAddress);
                        setIsEditingAddress(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold shrink-0 transition-colors"
                    >
                      Đổi địa chỉ
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Nội dung hội thoại rộng rãi */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/60">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-3">
                  <div
                    className={`flex items-start gap-2.5 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 mt-0.5">
                        <AIAssistantMascotIcon size={22} />
                      </div>
                    )}

                    <div
                      className={`max-w-[82%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-br-sm shadow-sm'
                          : 'bg-white text-slate-800 font-medium border border-slate-200/80 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>

                  {/* HIỂN THỊ DANH SÁCH CV CHO NHÀ TUYỂN DỤNG */}
                  {msg.recommendedCVs && msg.recommendedCVs.length > 0 && (
                    <div className="pl-10 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.recommendedCVs.map((cvItem) => (
                        <div
                          key={cvItem.applicationId}
                          className={`p-3.5 bg-white rounded-2xl border shadow-sm transition-all ${
                            cvItem.isSpam
                              ? 'border-red-300 bg-red-50/30'
                              : 'border-purple-200 hover:border-purple-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {cvItem.rank && (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    cvItem.rank === 1
                                      ? 'bg-amber-400 text-slate-950'
                                      : cvItem.rank === 2
                                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  Hạng #{cvItem.rank}
                                </span>
                              )}
                              {cvItem.isSpam ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                  <ShieldAlert size={11} /> Trái ngành ({cvItem.matchScore}/100đ)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <UserCheck size={11} /> {cvItem.matchScore}/100 điểm
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-bold text-purple-600 truncate">
                              {cvItem.jobTitle}
                            </span>
                          </div>

                          <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">
                            {cvItem.cvTitle}
                          </h4>
                          <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                            Ứng viên: <strong className="text-slate-800">{cvItem.candidateName}</strong> •{' '}
                            <span className="text-indigo-700 font-bold">
                              {cvItem.yearsOfExpText}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 mt-1 italic">{cvItem.reason}</p>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex justify-end">
                            <Link
                              to="/recruiter-dashboard"
                              onClick={() => setIsOpen(false)}
                              className="text-xs font-extrabold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <span>Mở xem & Duyệt CV</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HIỂN THỊ CV CÁ NHÂN CỦA ỨNG VIÊN */}
                  {msg.candidateOwnCVs && msg.candidateOwnCVs.length > 0 && (
                    <div className="pl-10 space-y-2">
                      {msg.candidateOwnCVs.map((cv) => (
                        <div
                          key={cv.id}
                          className="p-3.5 bg-white rounded-2xl border border-purple-200 shadow-sm flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                                {cv.title}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                Mẫu: {cv.template}
                              </p>
                            </div>
                          </div>
                          <Link
                            to="/candidate-dashboard"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-bold text-purple-600 hover:underline shrink-0"
                          >
                            Xem CV &rarr;
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HIỂN THỊ LƯỚI 2 CỘT CÁC CÔNG VIỆC GỢI Ý CHO ỨNG VIÊN */}
                  {msg.recommendedJobs && msg.recommendedJobs.length > 0 && (
                    <div className="pl-10 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.recommendedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-3.5 bg-white rounded-2xl border border-purple-200/80 hover:border-purple-400 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                <CheckCircle2 size={11} className="text-purple-600" />
                                {job.matchScore || 95}% Phù hợp CV
                              </span>
                              {(job.isNewest || job.badgeCategory === 'NEWEST') && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                  🆕 Mới nhất
                                </span>
                              )}
                              {job.distanceKm !== undefined && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                  📍 Cách ~{job.distanceKm} km
                                </span>
                              )}
                            </div>

                            <div className="flex items-start gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-1">
                                {job.company?.logoUrl ? (
                                  <img
                                    src={job.company.logoUrl}
                                    alt={job.company.name}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <Building2 size={18} className="text-purple-600" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <Link
                                  to={`/jobs/${job.id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="font-extrabold text-xs sm:text-sm text-slate-900 hover:text-purple-600 transition-colors line-clamp-1"
                                >
                                  {job.title}
                                </Link>
                                <p className="text-[11px] font-bold text-slate-500 truncate">
                                  {job.company?.name || 'Doanh nghiệp tuyển dụng'}
                                </p>
                              </div>
                            </div>

                            {job.matchReason && (
                              <p className="text-[10px] font-bold text-purple-700 bg-purple-50/70 px-2 py-1 rounded-lg mt-1.5">
                                {job.matchReason}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                <DollarSign size={11} /> {job.salary || 'Thỏa thuận'}
                              </span>
                              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg truncate max-w-[180px]">
                                <MapPin size={11} className="shrink-0 text-emerald-600" />
                                <span className="truncate">{job.location}</span>
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end">
                            <Link
                              to={`/jobs/${job.id}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-600 hover:text-purple-800"
                            >
                              <span>Xem & Ứng tuyển ngay</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Các nút gợi ý chọn nhanh */}
                  {msg.quickOptions && msg.quickOptions.length > 0 && (
                    <div className="pl-10 flex flex-wrap gap-1.5 pt-1">
                      {msg.quickOptions.map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleSendMessage(opt.value)}
                          className="text-xs font-bold bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95 text-left"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 text-xs text-slate-400 pl-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center">
                    <AIAssistantMascotIcon size={18} />
                  </div>
                  <span className="bg-white border border-slate-200 px-3 py-2 rounded-2xl font-medium text-slate-500 animate-pulse">
                    Trợ lý AI đang phân tích...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Ô nhập tin nhắn dưới cùng */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-4 bg-white border-t border-slate-200 flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  isRecruiter
                    ? 'Hỏi AI (VD: Tại sao Hạng #1? Hạng #2 hợp hơn? So sánh...)...'
                    : 'Nhập vị trí ứng tuyển, kỹ năng hoặc địa chỉ bạn đang ở...'
                }
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium transition-all text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white flex items-center justify-center shadow-md disabled:opacity-40 transition-all active:scale-95 shrink-0"
                title="Gửi"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIJobAssistant;
