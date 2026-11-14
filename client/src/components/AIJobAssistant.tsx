import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  X,
  Send,
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  FileText,
  ShieldAlert,
  UserCheck,
  Briefcase,
  Target,
} from 'lucide-react';
import api from '../services/api';
import { Job, CV } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  AIConversationContext,
  EnrichedCandidateProfile,
  CandidateMatchedJob,
  analyzeRecruiterConversation,
  analyzeCandidateConversation,
} from '../utils/aiConversationalEngine';

type RecommendedJobItem = CandidateMatchedJob;

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  recommendedJobs?: RecommendedJobItem[];
  recommendedCVs?: EnrichedCandidateProfile[];
  candidateOwnCVs?: CV[];
  quickOptions?: { label: string; value: string }[];
}

/**
 * Hiển thị văn bản giàu định dạng (**in đậm**, *in nghiêng*) an toàn không dùng dangerouslySetInnerHTML.
 */
const renderFormattedMessage = (text: string): React.ReactNode => {
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  const parts = String(text || '').split(tokenRegex);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-extrabold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={idx} className="italic text-slate-600">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
};

export const CANDIDATE_ADDRESS_STORAGE_KEY = 'cvconnect_candidate_current_address';
export const getCandidateAddressKey = (userId?: string) =>
  userId ? `smartcv_candidate_address_${userId}` : 'smartcv_candidate_address_guest';

const CANDIDATE_QUICK_PROMPTS = [
  {
    label: '🔔 Tổng hợp: Việc mới nhất • Gần nhất • Hợp CV',
    value: '__COMBINED_AI_NOTIFICATION__',
  },
  {
    label: '📍 Việc gần chỗ ở nhất',
    value: '__NEAREST_JOBS__',
  },
  {
    label: '💰 Việc lương cao nhất',
    value: 'Tìm các vị trí có mức lương cao nhất hiện nay',
  },
  {
    label: '📄 Phân tích & Gợi ý nâng cấp CV của mình',
    value: 'Đánh giá CV của mình và gợi ý bổ sung kỹ năng',
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

  const sortedByDateIds = [...allJobs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
    .map((j) => j.id);

  return allJobs
    .map((job, idx) => {
      const jobCoords = resolveAddressCoords(job.location || '');
      const rawDist = haversineKm(candCoords.lat, candCoords.lng, jobCoords.lat, jobCoords.lng);
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

      const hitKeywords = importantKeywords.filter(
        (kw) =>
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
    .sort((a, b) => (b.rawScore || 0) - (a.rawScore || 0));
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
  const [llmConfigured, setLlmConfigured] = useState(false);

  // Bộ nhớ ngữ cảnh hội thoại đa lượt (giữ vị trí đang xem, ứng viên vừa trao đổi...)
  const [aiContext, setAiContext] = useState<AIConversationContext>({});
  const aiContextRef = useRef<AIConversationContext>({});

  const updateAiContext = (next: AIConversationContext) => {
    aiContextRef.current = next;
    setAiContext(next);
  };

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

  const buildCombinedCandidateNotification = (
    allJobs: Job[],
    cv: CV | undefined,
    currentAddr: string
  ) => {
    const evaluated = computeMatchedJobsFromCV(allJobs, cv, currentAddr);

    const newestJobs = [...evaluated].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const topNewest = newestJobs[0];

    const nearestJobs = [...evaluated].sort(
      (a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999)
    );
    const topNearest = nearestJobs[0];
    const topKeywordMatch = evaluated[0];

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

    const text = `Xin chào **${user?.fullName || 'bạn'}**! ✨ Dựa trên địa chỉ đang ở (**${currentAddr}**) và kỹ năng thực tế trong CV của bạn, dưới đây là các công việc phù hợp nhất. Bạn có thể hỏi tự nhiên về bất kỳ vị trí, mức lương, yêu cầu kỹ năng hay nhờ mình nhận xét CV nhé:`;

    return {
      text,
      recommendedJobs: Array.from(combinedMap.values()),
    };
  };

  const buildRecruiterWelcomeMessage = (rJobs: Job[], rApps: any[]): ChatMessage => {
    const jobQuickOpts = rJobs.slice(0, 4).map((j) => ({
      label: `📂 Vị trí: ${j.title}`,
      value: `Xem ứng viên vị trí ${j.title}`,
    }));

    return {
      id: `welcome-recruiter-${Date.now()}`,
      sender: 'bot',
      text:
        `Xin chào Nhà tuyển dụng **${user?.fullName || ''}**! ✨ Mình đã đồng bộ trực tiếp **${rJobs.length} vị trí tuyển dụng** và **${rApps.length} hồ sơ ứng viên** của doanh nghiệp.\n` +
        `Bạn có thể hỏi tự nhiên bất kỳ thông tin gì *(VD: hỏi trực tiếp tên ứng viên, so sánh 2 ứng viên, lọc theo ngoại ngữ/kinh nghiệm/trường học, lý do chấm điểm theo từng vị trí hoặc gợi ý câu hỏi phỏng vấn)*:`,
      quickOptions: [
        { label: '📊 Báo cáo tổng quan tuyển dụng', value: 'Tổng quan tình hình tuyển dụng hiện tại' },
        { label: '🏆 Bảng xếp hạng CV toàn công ty', value: 'Tổng hợp bảng xếp hạng tất cả các vị trí của công ty' },
        ...jobQuickOpts,
      ],
    };
  };

  useEffect(() => {
    const onAddrUpdated = (e: any) => {
      const newAddr = e?.detail?.address || localStorage.getItem(addressStorageKey);
      if (newAddr) {
        setCandidateAddress(newAddr);
        setAddressDraft(newAddr);
      }
    };
    window.addEventListener('cvconnect:address_updated', onAddrUpdated);
    return () => window.removeEventListener('cvconnect:address_updated', onAddrUpdated);
  }, [addressStorageKey]);

  // Kiểm tra trạng thái tích hợp LLM phía server (nếu có GEMINI_API_KEY / OPENAI_API_KEY)
  useEffect(() => {
    if (!user || user.role?.name === 'ADMIN') return;
    api
      .get('/ai/status')
      .then((res) => setLlmConfigured(Boolean(res.data?.llmConfigured)))
      .catch(() => setLlmConfigured(false));
  }, [user?.id, user?.role?.name]);

  // Tải dữ liệu ban đầu khi đăng nhập
  useEffect(() => {
    updateAiContext({});
    if (!user || user.role?.name === 'ADMIN') {
      setMessages([]);
      setMyCVs([]);
      return;
    }
    if (isRecruiter) {
      Promise.all([api.get('/jobs/recruiter/my'), api.get('/applications/recruiter')])
        .then(([jobsRes, appsRes]) => {
          const rJobs: Job[] = jobsRes.data?.jobs || [];
          const rApps: any[] = appsRes.data?.applications || [];
          setRecruiterJobs(rJobs);
          setRecruiterApps(rApps);
          setMessages([buildRecruiterWelcomeMessage(rJobs, rApps)]);
        })
        .catch(() => {});
    } else {
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
          updateAiContext({
            lastShownJobIds: notif.recommendedJobs.map((j) => j.id),
            activeCandidateJobId: notif.recommendedJobs[0]?.id || null,
          });
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
              text: `Xin chào Ứng viên **${user?.fullName || ''}**! ✨ Hãy cập nhật địa chỉ đang ở và CV cá nhân để mình tư vấn các công việc phù hợp nhất nhé!`,
              quickOptions: CANDIDATE_QUICK_PROMPTS,
            },
          ]);
        }
      });
    }
  }, [user?.id, user?.role?.name]);

  // Tự động làm mới dữ liệu ngầm mỗi khi mở hộp thoại Trợ lý AI để luôn phản ánh hồ sơ/tin đăng mới nhất
  useEffect(() => {
    if (!isOpen || !user || user.role?.name === 'ADMIN') return;
    if (isRecruiter) {
      Promise.all([api.get('/jobs/recruiter/my'), api.get('/applications/recruiter')])
        .then(([jobsRes, appsRes]) => {
          setRecruiterJobs(jobsRes.data?.jobs || []);
          setRecruiterApps(appsRes.data?.applications || []);
        })
        .catch(() => {});
    } else {
      Promise.allSettled([
        api.get('/jobs'),
        isCandidate ? api.get('/cvs/my') : Promise.resolve({ data: { cvs: [] } }),
      ]).then(([jobsRes, cvsRes]) => {
        if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value.data?.jobs || []);
        if (cvsRes.status === 'fulfilled') {
          setMyCVs((cvsRes.value as any).data?.cvs?.slice(0, 1) || []);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

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
    updateAiContext({
      ...aiContextRef.current,
      lastShownJobIds: notif.recommendedJobs.map((j) => j.id),
      activeCandidateJobId: notif.recommendedJobs[0]?.id || null,
    });

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

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend || isTyping) return;

    if (textToSend === '__GO_CV_BUILDER__') {
      setIsOpen(false);
      navigate('/cv-builder');
      return;
    }

    const displayLabel =
      textToSend === '__SHOW_MY_CVS__'
        ? 'Xem & đánh giá CV của mình'
        : textToSend === '__COMBINED_AI_NOTIFICATION__'
        ? 'Tổng hợp việc làm mới nhất, gần nhất & phù hợp CV'
        : textToSend === '__NEAREST_JOBS__'
        ? `Tìm công việc ở gần địa chỉ (${candidateAddress}) nhất`
        : textToSend === '__NEWEST_JOBS__'
        ? 'Thông báo các công việc mới đăng nhất'
        : textToSend === '__KEYWORD_CV_JOBS__'
        ? 'Gợi ý công việc phù hợp nhất theo từ khóa CV'
        : textToSend;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: displayLabel,
    };

    const historySnapshot = [...messages.slice(-6), userMsg].map((m) => ({
      sender: m.sender,
      text: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) {
      setInputText('');
    }
    setIsTyping(true);

    try {
      const currentCtx = aiContextRef.current;

      if (isRecruiter) {
        const localRes = analyzeRecruiterConversation(
          displayLabel,
          recruiterJobs,
          recruiterApps,
          currentCtx
        );
        updateAiContext(localRes.nextContext);

        let finalReply = localRes.reply;
        if (llmConfigured) {
          try {
            const llmRes = await api.post('/ai/chat', {
              message: displayLabel,
              history: historySnapshot,
              activeContext: localRes.nextContext,
            });
            if (llmRes.data?.handledByLLM && llmRes.data?.reply) {
              finalReply = llmRes.data.reply;
            }
          } catch {
            // Giữ câu trả lời từ bộ suy luận dữ liệu nội bộ
          }
        } else {
          await new Promise((r) => setTimeout(r, 220));
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: finalReply,
            recommendedCVs: localRes.recommendedCVs,
            quickOptions: localRes.quickOptions,
          },
        ]);
      } else {
        const mySingleCV = myCVs[0];
        const evaluated = computeMatchedJobsFromCV(jobs, mySingleCV, candidateAddress);
        const importantKeywords = extractImportantKeywordsFromCV(mySingleCV);

        const localRes = analyzeCandidateConversation({
          rawQuery: textToSend,
          allJobs: jobs,
          evaluatedJobs: evaluated,
          mySingleCV,
          importantKeywords,
          candidateAddress,
          prevContext: currentCtx,
          buildCombinedNotification: (addr) =>
            buildCombinedCandidateNotification(jobs, mySingleCV, addr),
          candidateQuickPrompts: CANDIDATE_QUICK_PROMPTS,
        });

        updateAiContext(localRes.nextContext);

        if (localRes.updatedAddress) {
          setCandidateAddress(localRes.updatedAddress);
          setAddressDraft(localRes.updatedAddress);
          localStorage.setItem(addressStorageKey, localRes.updatedAddress);
          window.dispatchEvent(
            new CustomEvent('cvconnect:address_updated', {
              detail: { address: localRes.updatedAddress },
            })
          );
        }

        let finalReply = localRes.reply;
        if (llmConfigured && !textToSend.startsWith('__')) {
          try {
            const llmRes = await api.post('/ai/chat', {
              message: displayLabel,
              history: historySnapshot,
              activeContext: localRes.nextContext,
            });
            if (llmRes.data?.handledByLLM && llmRes.data?.reply) {
              finalReply = llmRes.data.reply;
            }
          } catch {
            // Giữ câu trả lời từ bộ suy luận dữ liệu nội bộ
          }
        } else {
          await new Promise((r) => setTimeout(r, 220));
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: finalReply,
            recommendedJobs: localRes.matchedJobs,
            candidateOwnCVs: localRes.candidateOwnCVs,
            quickOptions: localRes.quickOptions,
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleClearActiveJobScope = () => {
    const cleared: AIConversationContext = {
      ...aiContextRef.current,
      activeJobId: null,
      activeJobTitle: null,
    };
    updateAiContext(cleared);
  };

  const handleResetChat = () => {
    updateAiContext({});
    if (isRecruiter) {
      setMessages([buildRecruiterWelcomeMessage(recruiterJobs, recruiterApps)]);
    } else {
      const notif = buildCombinedCandidateNotification(jobs, myCVs[0], candidateAddress);
      updateAiContext({
        lastShownJobIds: notif.recommendedJobs.map((j) => j.id),
        activeCandidateJobId: notif.recommendedJobs[0]?.id || null,
      });
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

  const featuredAlertJob = (() => {
    if (jobs.length === 0) return null;
    const evaluated = computeMatchedJobsFromCV(jobs, myCVs[0], candidateAddress);
    return evaluated[0] || jobs[0];
  })();

  if (!user || user.role?.name === 'ADMIN') {
    return null;
  }

  return (
    <>
      {/* THẺ THÔNG BÁO "VIỆC LÀM MỚI ĐƯỢC CẬP NHẬT" NỔI DÀNH RIÊNG CHO ỨNG VIÊN */}
      {isCandidate && myCVs.length > 0 && !isOpen && showJobUpdateToast && featuredAlertJob && (
        <div className="fixed bottom-4 left-3 right-[4.25rem] sm:right-auto sm:bottom-6 sm:left-6 z-[985] sm:w-[380px] rounded-2xl bg-white shadow-2xl border border-primary-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
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
                ? 'Trợ lý AI phân tích CV!'
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

      {/* CỬA SỔ CHAT TRỢ LÝ AI */}
      {isOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[86vh] sm:h-[84vh] shadow-2xl border border-purple-200 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-gradient-to-r from-[#5b21b6] via-[#6d28d9] to-[#4f46e5] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/95 flex items-center justify-center shrink-0 shadow-xs">
                  <AIAssistantMascotIcon size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-lg font-black tracking-tight truncate">
                    {isRecruiter ? 'Trợ lý AI Tuyển Dụng' : 'Trợ lý AI SmartCV'}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Làm mới hội thoại"
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

            {/* Thanh hiển thị ngữ cảnh vị trí đang phân tích cho Nhà tuyển dụng */}
            {isRecruiter && aiContext.activeJobTitle && (
              <div className="px-4 sm:px-6 py-2 bg-purple-50/90 border-b border-purple-100 flex items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Target size={14} className="text-purple-600 shrink-0" />
                  <span className="text-slate-600 font-semibold">Đang tập trung vị trí:</span>
                  <span className="font-extrabold text-purple-900 truncate">
                    {aiContext.activeJobTitle}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClearActiveJobScope}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold shrink-0 flex items-center gap-1 transition-colors"
                >
                  <span>Tất cả vị trí</span>
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Thanh địa chỉ đang ở cho Ứng viên */}
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

            {/* Nội dung hội thoại */}
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
                      className={`max-w-[84%] px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-br-sm shadow-sm'
                          : 'bg-white text-slate-800 font-medium border border-slate-200/80 rounded-tl-sm shadow-sm'
                      }`}
                    >
                      {msg.sender === 'bot' ? renderFormattedMessage(msg.text) : msg.text}
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

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSendMessage(`Phân tích chi tiết hồ sơ ${cvItem.candidateName}`)
                              }
                              className="text-[11px] font-bold text-slate-600 hover:text-purple-700 transition-colors"
                            >
                              Hỏi sâu ứng viên này
                            </button>
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

                  {/* HIỂN THỊ CÁC CÔNG VIỆC GỢI Ý CHO ỨNG VIÊN */}
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

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSendMessage(`Chi tiết yêu cầu của vị trí ${job.title}`)
                              }
                              className="text-[11px] font-bold text-slate-600 hover:text-purple-700 transition-colors"
                            >
                              Hỏi AI về tin này
                            </button>
                            <Link
                              to={`/jobs/${job.id}`}
                              onClick={() => setIsOpen(false)}
                              className="inline-flex items-center gap-1 text-xs font-extrabold text-purple-600 hover:text-purple-800"
                            >
                              <span>Xem & Ứng tuyển</span>
                              <ExternalLink size={12} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Các gợi ý nối tiếp theo đúng ngữ cảnh hiện tại */}
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
                    Trợ lý AI đang tổng hợp dữ liệu...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Ô nhập tin nhắn tự do */}
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
                    ? 'Hỏi tự nhiên về bất kỳ ứng viên, vị trí, học vấn, kinh nghiệm, so sánh, câu hỏi phỏng vấn...'
                    : 'Hỏi tự nhiên về công việc, mức lương, yêu cầu kỹ năng, đánh giá CV hoặc địa chỉ của bạn...'
                }
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-500 font-medium transition-all text-xs sm:text-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
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
