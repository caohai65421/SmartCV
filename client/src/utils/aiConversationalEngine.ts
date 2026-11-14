import { Job, CV } from '../types';
import { evaluateCVForJob } from '../pages/RecruiterDashboard';

export interface EnrichedCandidateProfile {
  applicationId: string;
  candidateId: string;
  cvTitle: string;
  candidateName: string;
  candidateEmail: string;
  phone: string;
  address: string;
  dob: string;
  website: string;
  position: string;
  summary: string;
  educationText: string;
  experienceText: string;
  projectsText: string;
  coverLetter: string;
  jobId: string;
  jobTitle: string;
  jobSalary: string;
  jobLocation: string;
  jobRequirementsText: string;
  matchScore: number;
  keywordScore: number;
  expBonus: number;
  langBonus: number;
  awardBonus: number;
  yearsOfExpNum: number;
  yearsOfExpText: string;
  languages: string[];
  awards: string[];
  matchedSkills: string[];
  missingSkills: string[];
  jdKeywords: string[];
  skills: string[];
  rank?: number;
  jobRank: number;
  jobTotalCandidates: number;
  companyRank: number;
  isSpam: boolean;
  reason: string;
  status: string;
  appliedDate: string;
  fullSearchableText: string;
}

export interface AIConversationContext {
  activeJobId?: string | null;
  activeJobTitle?: string | null;
  lastShownApplicationIds?: string[];
  focusedApplicationIds?: string[];
  activeCandidateJobId?: string | null;
  lastShownJobIds?: string[];
}

export interface RecruiterAIResponse {
  reply: string;
  recommendedCVs?: EnrichedCandidateProfile[];
  quickOptions?: { label: string; value: string }[];
  nextContext: AIConversationContext;
}

export interface CandidateMatchedJob extends Job {
  rawScore?: number;
  matchScore?: number;
  matchReason?: string;
  distanceKm?: number;
  distanceLabel?: string;
  isNewest?: boolean;
  hitKeywords?: string[];
  missingKeywords?: string[];
  badgeCategory?: 'NEWEST' | 'NEAREST' | 'KEYWORD_MATCH';
}

export interface CandidateAIResponse {
  reply: string;
  matchedJobs?: CandidateMatchedJob[];
  candidateOwnCVs?: CV[];
  quickOptions?: { label: string; value: string }[];
  nextContext: AIConversationContext;
  updatedAddress?: string;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt không dấu để nhận diện thực thể chính xác cả khi người dùng gõ thiếu dấu / viết thường.
 */
export const toVietnameseAscii = (input: string): string =>
  String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const formatStructuredField = (raw: any, type: 'edu' | 'exp' | 'proj'): string => {
  if (!raw) return '';
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (!item || typeof item !== 'object') return '';
        if (type === 'edu') {
          const parts = [
            item.school,
            item.degree || item.field ? `${item.degree || ''} ${item.field || ''}`.trim() : '',
            item.startDate || item.endDate ? `(${item.startDate || ''} - ${item.endDate || ''})` : '',
          ].filter(Boolean);
          return parts.join(' — ');
        }
        if (type === 'exp') {
          const header = [
            item.position,
            item.company ? `tại ${item.company}` : '',
            item.startDate || item.endDate ? `(${item.startDate || ''} - ${item.endDate || ''})` : '',
          ]
            .filter(Boolean)
            .join(' ');
          return [header, item.description].filter(Boolean).join(': ');
        }
        return item.name || item.title || item.description || JSON.stringify(item);
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(raw);
};

const parseYearsNumber = (cvData: any, yearsText: string): number => {
  if (typeof cvData?.yearsOfExperience === 'number' && !Number.isNaN(cvData.yearsOfExperience)) {
    return cvData.yearsOfExperience;
  }
  const m = String(yearsText || '').match(/(\d+(?:[.,]\d+)?)\s*năm/i);
  if (m) return parseFloat(m[1].replace(',', '.'));
  if (/thực tập|fresher|mới tốt nghiệp/i.test(yearsText)) return 0.5;
  return 0;
};

const statusToVietnamese = (status: string): string => {
  if (status === 'ACCEPTED') return 'Đã duyệt hồ sơ (ACCEPTED)';
  if (status === 'REJECTED') return 'Chưa phù hợp / Từ chối (REJECTED)';
  return 'Đang chờ xét duyệt (PENDING)';
};

/**
 * Tách phần khẳng định (thực thể người dùng ĐANG HỎI) và phần phủ định (thực thể người dùng LOẠI TRỪ, VD: "chứ không phải Hoàng Gia Huy").
 */
export const splitPositiveAndNegatedQuery = (rawQuery: string): {
  positiveRaw: string;
  negatedRaw: string;
  positiveAscii: string;
  negatedAscii: string;
  isCorrection: boolean;
} => {
  const asciiFull = toVietnameseAscii(rawQuery);
  const negationRegex =
    /\b(chu khong phai la|chu khong phai|chu ko phai|chu k phai|khong phai la|khong phai hoi|khong phai|ko phai|k phai|thay vi|dung lay|bo qua|ngoai tru)\b/i;

  const match = asciiFull.match(negationRegex);
  let positiveAscii = asciiFull;
  let negatedAscii = '';

  if (match && match.index !== undefined) {
    positiveAscii = asciiFull.slice(0, match.index).trim();
    negatedAscii = asciiFull.slice(match.index + match[0].length).trim();
  }

  // Trường hợp câu bắt đầu bằng phủ định ở vế đầu: "Không phải Hoàng Gia Huy, mình hỏi Ngô Đức Thịnh"
  if (!positiveAscii && negatedAscii) {
    const commaIdx = negatedAscii.search(/[,;.]|\b(ma la|minh dang hoi|minh hoi|y minh la|co)\b/);
    if (commaIdx !== -1) {
      const firstNeg = negatedAscii.slice(0, commaIdx).trim();
      const restPos = negatedAscii.slice(commaIdx).replace(/^[,;.\s]+/, '').trim();
      if (restPos) {
        positiveAscii = restPos;
        negatedAscii = firstNeg;
      }
    }
  }

  const isCorrection =
    Boolean(negatedAscii) ||
    /\b(minh dang hoi|y minh la|nham roi|sai roi|khong dung|hoi nham|tra loi nham)\b/.test(asciiFull);

  return {
    positiveRaw: rawQuery.trim(),
    negatedRaw: negatedAscii,
    positiveAscii: positiveAscii || asciiFull,
    negatedAscii,
    isCorrection,
  };
};

/**
 * Xây dựng kho tri thức giàu ngữ nghĩa cho toàn bộ hồ sơ ứng tuyển của Nhà tuyển dụng.
 */
export const buildRecruiterKnowledgeGraph = (recruiterApps: any[]): EnrichedCandidateProfile[] => {
  const seenPairs = new Set<string>();
  const rawProfiles: Omit<EnrichedCandidateProfile, 'jobRank' | 'jobTotalCandidates' | 'companyRank'>[] = [];

  for (const app of recruiterApps) {
    const d: any = app.cv?.data || {};
    const p: any = d.personalInfo || {};
    const job: any = app.job || {};
    const jobId = String(app.jobId || job.id || 'unknown-job');
    const candidateKey = String(app.candidateId || app.candidate?.email || d.fullName || p.fullName || app.id);
    const pairKey = `${jobId}_${candidateKey}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const ev = evaluateCVForJob(app);
    const candidateName = String(d.fullName || p.fullName || app.candidate?.fullName || 'Ứng viên').trim();
    const candidateEmail = String(d.email || p.email || app.candidate?.email || '').trim();
    const phone = String(d.phone || p.phone || '').trim();
    const address = String(d.address || p.address || '').trim();
    const dob = String(d.dob || p.dob || '').trim();
    const website = String(d.website || d.github || p.website || p.github || '').trim();
    const position = String(d.position || p.position || app.cv?.title || '').trim();
    const summary = String(d.summary || p.summary || '').trim();
    const educationText = formatStructuredField(d.education, 'edu');
    const experienceText = formatStructuredField(d.experience, 'exp');
    const projectsText = formatStructuredField(d.projects, 'proj');
    const coverLetter = String(app.coverLetter || '').trim();
    const jobTitle = String(job.title || 'Vị trí tuyển dụng').trim();
    const jobSalary = String(job.salary || 'Thỏa thuận').trim();
    const jobLocation = String(job.location || '').trim();
    const jobReqs = Array.isArray(job.requirements)
      ? job.requirements.join('; ')
      : String(job.requirements || '');
    const yearsOfExpNum = parseYearsNumber(d, ev.yearsOfExpText);

    const fullSearchableText = toVietnameseAscii(
      [
        candidateName,
        candidateEmail,
        phone,
        address,
        position,
        summary,
        educationText,
        experienceText,
        projectsText,
        coverLetter,
        jobTitle,
        jobLocation,
        ev.allSkills.join(' '),
        ev.languagesList.join(' '),
        ev.awardsList.join(' '),
      ].join(' ')
    );

    rawProfiles.push({
      applicationId: app.id,
      candidateId: String(app.candidateId || candidateKey),
      cvTitle: app.cv?.title || `CV của ${candidateName}`,
      candidateName,
      candidateEmail,
      phone,
      address,
      dob,
      website,
      position,
      summary,
      educationText,
      experienceText,
      projectsText,
      coverLetter,
      jobId,
      jobTitle,
      jobSalary,
      jobLocation,
      jobRequirementsText: jobReqs,
      matchScore: ev.matchScore,
      keywordScore: ev.keywordScore,
      expBonus: ev.expBonus,
      langBonus: ev.langBonus,
      awardBonus: ev.awardBonus,
      yearsOfExpNum,
      yearsOfExpText: ev.yearsOfExpText,
      languages: ev.languagesList,
      awards: ev.awardsList,
      matchedSkills: ev.matchedSkills,
      missingSkills: ev.missingSkills,
      jdKeywords: ev.jdKeywords,
      skills: ev.allSkills,
      isSpam: ev.isSpam,
      reason: ev.reason,
      status: app.status || 'PENDING',
      appliedDate: app.appliedDate || '',
      fullSearchableText,
    });
  }

  // Sắp xếp chuẩn theo điểm tổng -> điểm kinh nghiệm -> số năm KN
  const sortedGlobal = [...rawProfiles].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    if (b.expBonus !== a.expBonus) return b.expBonus - a.expBonus;
    return b.yearsOfExpNum - a.yearsOfExpNum;
  });

  // Tính thứ hạng trong từng vị trí (jobRank) và tổng số CV của vị trí đó
  const byJobMap = new Map<string, typeof sortedGlobal>();
  for (const item of sortedGlobal) {
    const list = byJobMap.get(item.jobId) || [];
    list.push(item);
    byJobMap.set(item.jobId, list);
  }

  return sortedGlobal.map((item, globalIdx) => {
    const jobPeers = byJobMap.get(item.jobId) || [item];
    const jIdx = jobPeers.findIndex((p) => p.applicationId === item.applicationId);
    const jobRank = jIdx >= 0 ? jIdx + 1 : 1;
    return {
      ...item,
      companyRank: globalIdx + 1,
      jobRank,
      jobTotalCandidates: jobPeers.length,
      rank: jobRank,
    };
  });
};

/**
 * Nhận diện tên ứng viên được nhắc đến trong một đoạn văn bản (hỗ trợ cả họ tên đầy đủ, tên đệm + tên, hoặc tên riêng).
 */
const matchCandidateNamesInText = (
  asciiSegment: string,
  profiles: EnrichedCandidateProfile[]
): string[] => {
  if (!asciiSegment) return [];
  const padded = ` ${asciiSegment.replace(/[.,?!:;()"']/g, ' ')} `.replace(/\s+/g, ' ');
  const matchedNames = new Set<string>();

  // 1. Ưu tiên khớp họ tên đầy đủ hoặc 2 từ cuối (VD: "ngo duc thinh" hoặc "duc thinh")
  for (const p of profiles) {
    const nameAscii = toVietnameseAscii(p.candidateName);
    const parts = nameAscii.split(' ').filter(Boolean);
    if (parts.length === 0) continue;

    if (padded.includes(` ${nameAscii} `)) {
      matchedNames.add(p.candidateName);
      continue;
    }
    if (parts.length >= 2) {
      const lastTwo = parts.slice(-2).join(' ');
      if (lastTwo.length >= 5 && padded.includes(` ${lastTwo} `)) {
        matchedNames.add(p.candidateName);
      }
    }
  }

  if (matchedNames.size > 0) return Array.from(matchedNames);

  // 2. Nếu chỉ gọi bằng tên riêng 1 từ (VD: "Thịnh", "Khiêm", "bạn Quân", "hồ sơ Đạt"), chống trùng từ đồng âm không dấu tiếng Việt
  const homographGivenNames = new Set([
    'anh', 'em', 'minh', 'ban', 'nam', 'nu', 'quan', 'bao', 'dat', 'dang', 'chau', 'duc',
    'son', 'hai', 'thanh', 'binh', 'long', 'tay', 'bac', 'dong', 'hoa', 'tam', 'phuc', 'loc',
    'tuyen', 'dung', 'tot', 'hon', 'cao', 'thap', 'moi', 'gan', 'ung', 'vien',
  ]);
  for (const p of profiles) {
    const parts = toVietnameseAscii(p.candidateName).split(' ').filter(Boolean);
    const givenName = parts[parts.length - 1];
    if (!givenName || givenName.length < 2) continue;

    if (!homographGivenNames.has(givenName) && givenName.length >= 3) {
      if (padded.includes(` ${givenName} `)) {
        matchedNames.add(p.candidateName);
      }
    } else {
      // Với các tên dễ trùng từ thông dụng (Quân/Quận, Đạt/Đạt điểm, Đăng/Đang, Bảo/Báo...), chỉ khớp khi đi sau danh xưng chỉ người
      const personContextRegex = new RegExp(
        `\\b(?:ban|ung vien|uv|ho so|cv|anh|chi|cua|hoi|so sanh|va)\\s+${givenName}\\b`,
        'i'
      );
      if (personContextRegex.test(padded)) {
        matchedNames.add(p.candidateName);
      }
    }
  }

  return Array.from(matchedNames);
};

/**
 * Nhận diện Vị trí tuyển dụng được nhắc tới trong câu hỏi của Nhà tuyển dụng.
 */
const matchJobFromQuery = (
  positiveAscii: string,
  negatedAscii: string,
  recruiterJobs: Job[]
): Job | null => {
  if (!positiveAscii || recruiterJobs.length === 0) return null;

  let bestJob: Job | null = null;
  let bestScore = 0;

  // Nhóm từ khóa chuyên biệt theo từng vị trí
  const jobDomainAliases: { patterns: string[]; jobKeywords: string[] }[] = [
    { patterns: ['mobile', 'di dong', 'flutter', 'react native', 'dart', 'ios', 'android'], jobKeywords: ['mobile', 'flutter', 'react native'] },
    { patterns: ['devops', 'cloud', 'aws', 'gcp', 'kubernetes', 'k8s', 'terraform', 'sre', 'ha tang'], jobKeywords: ['devops', 'cloud', 'aws'] },
    { patterns: ['product manager', 'product owner', 'edtech', 'quan tri san pham', 'prd'], jobKeywords: ['product manager', 'edtech'] },
    { patterns: ['ui/ux', 'ui ux', 'designer', 'thiet ke', 'figma', 'wireframe'], jobKeywords: ['ui/ux', 'designer'] },
    { patterns: ['thuc tap', 'fresher', 'intern', 'sinh vien'], jobKeywords: ['thuc tap', 'fresher'] },
    { patterns: ['fullstack', 'full-stack', 'full stack'], jobKeywords: ['fullstack', 'full-stack'] },
    { patterns: ['frontend', 'front-end', 'next.js', 'nextjs'], jobKeywords: ['frontend'] },
    { patterns: ['backend', 'back-end', 'express', 'microservices', 'nestjs'], jobKeywords: ['backend'] },
  ];

  for (const job of recruiterJobs) {
    const titleAscii = toVietnameseAscii(job.title);
    if (negatedAscii && negatedAscii.includes(titleAscii)) continue;

    let score = 0;
    if (positiveAscii.includes(titleAscii)) {
      score += 120;
    }

    // Khớp từ có nghĩa trong tiêu đề vị trí
    const stopWords = new Set(['vi', 'tri', 'senior', 'junior', 'engineer', 'developer', 'lap', 'trinh', 'vien', 'ky', 'su', 'va', 'cho']);
    const titleTokens = titleAscii
      .replace(/[()/,-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !stopWords.has(t));

    for (const tk of titleTokens) {
      if (negatedAscii && negatedAscii.includes(tk) && !positiveAscii.includes(tk)) {
        score -= 50;
        continue;
      }
      if (positiveAscii.includes(tk)) {
        score += 28;
      }
    }

    for (const alias of jobDomainAliases) {
      const queryHitsAlias = alias.patterns.some((pat) => positiveAscii.includes(pat));
      const negHitsAlias = negatedAscii ? alias.patterns.some((pat) => negatedAscii.includes(pat)) : false;
      const jobMatchesAlias = alias.jobKeywords.some((jk) => titleAscii.includes(jk));
      if (queryHitsAlias && !negHitsAlias && jobMatchesAlias) {
        score += 45;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestJob = job;
    }
  }

  return bestScore >= 28 ? bestJob : null;
};

/**
 * Sinh bộ câu hỏi phỏng vấn thực chiến bám sát đúng CV và các kỹ năng còn thiếu của ứng viên.
 */
const buildTailoredInterviewQuestions = (cand: EnrichedCandidateProfile): string => {
  const questions: string[] = [];

  if (cand.projectsText || cand.experienceText) {
    const highlightSource = (cand.projectsText || cand.experienceText).split('\n')[0].replace(/^[•\-\d.\s]+/, '').trim();
    questions.push(
      `1. **Đào sâu dự án thực tế:** Trong hồ sơ bạn có nêu *"${highlightSource.slice(0, 95)}${highlightSource.length > 95 ? '...' : ''}"* — thách thức kỹ thuật khó nhất bạn trực tiếp giải quyết ở dự án này là gì và bạn đo lường hiệu quả ra sao?`
    );
  } else {
    questions.push(
      `1. **Kinh nghiệm thực chiến (${cand.yearsOfExpText}):** Hãy chia sẻ một tình huống xử lý sự cố hoặc tối ưu hiệu năng đáng nhớ nhất liên quan tới **${cand.jobTitle}**.`
    );
  }

  if (cand.matchedSkills.length > 0) {
    const core = cand.matchedSkills.slice(0, 3).join(', ');
    questions.push(
      `2. **Kiểm tra chuyên môn cốt lõi (${core}):** Bạn tổ chức kiến trúc code, quản lý state/dữ liệu và đảm bảo chất lượng kiểm thử như thế nào khi làm việc với **${core}** ở quy mô sản phẩm thật?`
    );
  }

  if (cand.missingSkills.length > 0) {
    const gap = cand.missingSkills.slice(0, 3).join(', ');
    questions.push(
      `3. **Đánh giá điểm khuyết so với JD (${gap}):** Vị trí **${cand.jobTitle}** có yêu cầu thêm về **${gap}** (hiện chưa thấy nêu sâu trong CV). Bạn đã từng tiếp xúc hoặc có lộ trình làm chủ nhóm công nghệ này trong 1–2 tháng đầu như thế nào?`
    );
  } else {
    questions.push(
      `3. **Tư duy thiết kế hệ thống & mở rộng:** Nếu sản phẩm tăng gấp 5 lần lượng người dùng đồng thời, bạn sẽ ưu tiên tối ưu những tầng nào trước cho vị trí **${cand.jobTitle}**?`
    );
  }

  if (cand.languages.length > 0) {
    questions.push(
      `4. **Phối hợp & Ngoại ngữ (${cand.languages[0]}):** Thử trao đổi nhanh 2–3 phút bằng ngoại ngữ về quy trình làm việc nhóm (Code Review / Agile) hoặc đọc hiểu tài liệu kỹ thuật.`
    );
  } else {
    questions.push(
      `4. **Phối hợp đội ngũ & Văn hóa:** Bạn thường xử lý bất đồng quan điểm kỹ thuật khi review code hoặc khi deadline gấp như thế nào?`
    );
  }

  return (
    `🎯 **Gợi ý câu hỏi phỏng vấn thiết kế riêng cho ${cand.candidateName}** *(Vị trí: ${cand.jobTitle} • ${cand.matchScore}/100đ)*:\n\n` +
    questions.join('\n\n')
  );
};

/**
 * Tổng hợp câu trả lời chi tiết về 1 ứng viên dựa đúng vào khía cạnh Nhà tuyển dụng đang hỏi (hoặc tổng quan đầy đủ nếu hỏi chung).
 */
const buildCandidateFocusedAnswer = (
  cand: EnrichedCandidateProfile,
  positiveAscii: string,
  peersInJob: EnrichedCandidateProfile[],
  isCorrection: boolean
): string => {
  const askEdu = /\b(truong|hoc van|dai hoc|tot nghiep|chuyen nganh|gpa|bang cap|hoc o dau)\b/.test(positiveAscii);
  const askExp = /\b(kinh nghiem|lam o dau|cong ty cu|may nam|bao nhieu nam|du an|project|thuc chien|tung lam)\b/.test(positiveAscii);
  const askSkills = /\b(ky nang|skill|cong nghe|tech|chuyen mon|thieu gi|con thieu|diem yeu|nhuoc diem|diem manh|uu diem)\b/.test(positiveAscii);
  const askLang = /\b(ngoai ngu|tieng anh|tieng nhat|tieng han|tieng trung|ielts|toeic|jlpt|topik|hsk)\b/.test(positiveAscii);
  const askAward = /\b(giai thuong|chung chi|thanh tich|hoc bong|certificate|award)\b/.test(positiveAscii);
  const askContact = /\b(lien he|email|gmail|so dien thoai|sdt|dien thoai|phone|dia chi|o dau|nha o|github|website|portfolio|ngay sinh|nam sinh|tuoi)\b/.test(positiveAscii);
  const askStatus = /\b(trang thai|duyet chua|phong van chua|thu gioi thieu|cover letter|ngay nop)\b/.test(positiveAscii);
  const askInterview = /\b(cau hoi phong van|hoi gi khi phong van|phong van ban nay|kiem tra ky thuat|goi y phong van)\b/.test(positiveAscii);

  if (askInterview) {
    return buildTailoredInterviewQuestions(cand);
  }

  const hasSpecificAspect = askEdu || askExp || askSkills || askLang || askAward || askContact || askStatus;
  const prefix = isCorrection
    ? `Dạ mình chuyển sang đúng thông tin của **${cand.candidateName}** *(Hạng #${cand.jobRank}/${cand.jobTotalCandidates} vị trí **${cand.jobTitle}** — **${cand.matchScore}/100 điểm**)*:\n\n`
    : `📌 Thông tin trích xuất từ hồ sơ của **${cand.candidateName}** *(Hạng #${cand.jobRank}/${cand.jobTotalCandidates} vị trí **${cand.jobTitle}** — **${cand.matchScore}/100 điểm**)*:\n\n`;

  if (hasSpecificAspect) {
    const sections: string[] = [];
    if (askEdu) {
      sections.push(
        `• **Học vấn & Bằng cấp:** ${cand.educationText || 'Ứng viên chưa cập nhật chi tiết trường đại học trong CV.'}`
      );
    }
    if (askExp) {
      sections.push(
        `• **Kinh nghiệm thực tế (${cand.yearsOfExpText} — +${cand.expBonus}/15đ):**\n  ${
          cand.experienceText || cand.summary || 'Chưa mô tả chi tiết công ty cũ.'
        }` + (cand.projectsText ? `\n• **Dự án tiêu biểu:**\n  ${cand.projectsText}` : '')
      );
    }
    if (askSkills) {
      sections.push(
        `• **Kỹ năng chuyên môn (${cand.keywordScore}/65đ):** ${cand.skills.join(', ') || 'Chưa liệt kê'}.\n` +
          `  - **Khớp yêu cầu JD:** ${cand.matchedSkills.length > 0 ? cand.matchedSkills.join(', ') : 'Đáp ứng nền tảng cơ bản'}.\n` +
          `  - **Điểm cần lưu ý / Kỹ năng JD chưa nêu rõ:** ${
            cand.missingSkills.length > 0
              ? cand.missingSkills.join(', ')
              : 'Khớp đầy đủ 100% từ khóa kỹ thuật cốt lõi của JD!'
          }`
      );
    }
    if (askLang) {
      sections.push(
        `• **Ngoại ngữ (+${cand.langBonus}/12đ):** ${
          cand.languages.length > 0 ? cand.languages.join('; ') : 'Chưa cập nhật chứng chỉ ngoại ngữ trong CV.'
        }`
      );
    }
    if (askAward) {
      sections.push(
        `• **Giải thưởng & Chứng chỉ (+${cand.awardBonus}/8đ):** ${
          cand.awards.length > 0 ? cand.awards.join('; ') : 'Chưa ghi nhận giải thưởng/chứng chỉ phụ.'
        }`
      );
    }
    if (askContact) {
      const contactParts = [
        cand.candidateEmail ? `Email: **${cand.candidateEmail}**` : '',
        cand.phone ? `SĐT: **${cand.phone}**` : '',
        cand.address ? `Địa chỉ: **${cand.address}**` : '',
        cand.dob ? `Ngày sinh: ${cand.dob}` : '',
        cand.website ? `Portfolio/GitHub: ${cand.website}` : '',
      ].filter(Boolean);
      sections.push(`• **Thông tin liên hệ:** ${contactParts.join(' • ') || 'Chưa cập nhật'}`);
    }
    if (askStatus) {
      sections.push(
        `• **Trạng thái đơn ứng tuyển:** **${statusToVietnamese(cand.status)}**` +
          (cand.coverLetter ? `\n• **Thư giới thiệu (Cover Letter):** *"${cand.coverLetter}"*` : '')
      );
    }
    return prefix + sections.join('\n\n');
  }

  // Hồ sơ tổng hợp đầy đủ từ dữ liệu thật của ứng viên
  const lines: string[] = [
    `• **Điểm đánh giá tổng hợp:** **${cand.matchScore}/100 điểm** *(Chuyên môn ${cand.keywordScore}/65đ • Kinh nghiệm +${cand.expBonus}/15đ • Ngoại ngữ +${cand.langBonus}/12đ • Giải thưởng/Chứng chỉ +${cand.awardBonus}/8đ)*.`,
    `• **Kinh nghiệm (${cand.yearsOfExpText}):** ${
      cand.experienceText ? cand.experienceText.replace(/\n+/g, ' | ') : cand.summary || 'Đã có kinh nghiệm thực tế.'
    }`,
  ];

  if (cand.projectsText) {
    lines.push(`• **Dự án nổi bật:** ${cand.projectsText.replace(/\n+/g, ' — ')}`);
  }
  if (cand.skills.length > 0) {
    lines.push(
      `• **Kỹ năng (${cand.skills.slice(0, 7).join(', ')}):** ${
        cand.missingSkills.length > 0
          ? `Khớp tốt ${cand.matchedSkills.join(', ')}; có thể hỏi thêm về *${cand.missingSkills.slice(0, 3).join(', ')}* khi phỏng vấn.`
          : 'Đáp ứng trọn vẹn 100% nhóm kỹ năng cốt lõi của vị trí.'
      }`
    );
  }
  if (cand.educationText) {
    lines.push(`• **Học vấn:** ${cand.educationText.replace(/\n+/g, ' — ')}`);
  }
  if (cand.languages.length > 0) {
    lines.push(`• **Ngoại ngữ:** ${cand.languages.join(' • ')}`);
  }
  if (cand.awards.length > 0) {
    lines.push(`• **Giải thưởng / Chứng chỉ:** ${cand.awards.join(' • ')}`);
  }
  const contactSummary = [cand.candidateEmail, cand.phone, cand.address].filter(Boolean).join(' • ');
  if (contactSummary) {
    lines.push(`• **Liên hệ & Trạng thái:** ${contactSummary} — *${statusToVietnamese(cand.status)}*.`);
  }

  if (peersInJob.length > 1) {
    const otherPeer = peersInJob.find((p) => p.applicationId !== cand.applicationId);
    if (otherPeer) {
      const diff = cand.matchScore - otherPeer.matchScore;
      lines.push(
        `\n💡 *Đối chiếu nhanh trong cùng vị trí **${cand.jobTitle}**:* **${cand.candidateName}** đang ${
          diff > 0
            ? `nhỉnh hơn **${otherPeer.candidateName}** (Hạng #${otherPeer.jobRank}, ${otherPeer.matchScore}đ) **+${diff} điểm**`
            : diff < 0
            ? `kém **${otherPeer.candidateName}** (Hạng #${otherPeer.jobRank}, ${otherPeer.matchScore}đ) **${Math.abs(diff)} điểm**`
            : `bằng điểm với **${otherPeer.candidateName}** (${otherPeer.matchScore}đ)`
        }.`
      );
    }
  }

  return prefix + lines.join('\n');
};

/**
 * Giải thích chính xác về mặt toán học & dữ liệu thật lý do xếp hạng của 1 ứng viên so với các ứng viên CÙNG VỊ TRÍ (hoặc nhóm đang xem).
 */
const buildAccurateRankExplanation = (
  target: EnrichedCandidateProfile,
  scopePeers: EnrichedCandidateProfile[],
  scopeLabel: string
): string => {
  const rankDisplay = target.rank || target.jobRank;
  const comparePeer = scopePeers.find((p) => p.applicationId !== target.applicationId);

  const reasons: string[] = [
    `• **Chuyên môn kỹ thuật (${target.keywordScore}/65đ):** Thành thạo ${
      target.matchedSkills.length > 0 ? target.matchedSkills.join(', ') : target.skills.slice(0, 5).join(', ')
    }${
      target.missingSkills.length === 0
        ? ' — khớp 100% tiêu chí kỹ thuật cốt lõi của JD.'
        : ` (còn thiếu ${target.missingSkills.slice(0, 2).join(', ')}).`
    }`,
  ];

  // So sánh số năm kinh nghiệm THẬT, không bao giờ nói 3.5 năm > 4 năm!
  if (comparePeer) {
    const expDiff = target.yearsOfExpNum - comparePeer.yearsOfExpNum;
    const expComparisonNote =
      expDiff > 0
        ? `nhiều hơn **${comparePeer.candidateName}** (${comparePeer.yearsOfExpText}, +${comparePeer.expBonus}đ) **+${
            target.expBonus - comparePeer.expBonus
          }đ**`
        : expDiff < 0
        ? `dù ít thời gian hơn **${comparePeer.candidateName}** (${comparePeer.yearsOfExpText}) nhưng vẫn đạt **+${target.expBonus}/15đ**`
        : `ngang mức thâm niên với **${comparePeer.candidateName}** (+${target.expBonus}/15đ)`;

    reasons.push(
      `• **Kinh nghiệm thực chiến (${target.yearsOfExpText} — +${target.expBonus}/15đ):** ${expComparisonNote}.${
        target.experienceText ? ` Nổi bật: ${target.experienceText.split('\n')[0].replace(/^[•\-\s]+/, '')}` : ''
      }`
    );
  } else {
    reasons.push(
      `• **Kinh nghiệm thực chiến (${target.yearsOfExpText} — +${target.expBonus}/15đ):** ${
        target.experienceText ? target.experienceText.split('\n')[0].replace(/^[•\-\s]+/, '') : target.summary
      }`
    );
  }

  reasons.push(
    `• **Ngoại ngữ (+${target.langBonus}/12đ):** ${
      target.languages.length > 0 ? target.languages.join(' + ') : 'Đáp ứng đọc hiểu tài liệu cơ bản'
    }${
      comparePeer && target.langBonus > comparePeer.langBonus
        ? ` *(vượt +${target.langBonus - comparePeer.langBonus}đ so với ${comparePeer.candidateName})*`
        : ''
    }.`
  );

  reasons.push(
    `• **Giải thưởng & Chứng chỉ (+${target.awardBonus}/8đ):** ${
      target.awards.length > 0 ? target.awards.join('; ') : 'Hồ sơ dự án thực tế rõ ràng'
    }${
      comparePeer && target.awardBonus > comparePeer.awardBonus
        ? ` *(hơn +${target.awardBonus - comparePeer.awardBonus}đ so với ${comparePeer.candidateName})*`
        : ''
    }.`
  );

  if (target.educationText) {
    reasons.push(`• **Nền tảng học vấn:** ${target.educationText.split('\n')[0]}.`);
  }

  const deltaFooter = comparePeer
    ? `\n👉 **Kết luận đối chiếu:** Trong phạm vi **${scopeLabel}**, **${target.candidateName}** đạt **${target.matchScore}/100đ** (${
        target.matchScore >= comparePeer.matchScore
          ? `hơn **${comparePeer.candidateName}** (${comparePeer.matchScore}/100đ) **+${
              target.matchScore - comparePeer.matchScore
            } điểm**`
          : `so với **${comparePeer.candidateName}** đạt ${comparePeer.matchScore}/100đ`
      }). Bạn có thể hỏi tiếp về dự án, học vấn, thông tin liên hệ hoặc câu hỏi phỏng vấn cho ứng viên này!`
    : `\n👉 Hiện **${target.candidateName}** là ứng viên duy nhất trong phạm vi đang xem (**${scopeLabel}**).`;

  return (
    `🏆 Phân tích chi tiết điểm số của **${target.candidateName}** — **Hạng #${rankDisplay} (${target.matchScore}/100 điểm)** tại vị trí **${target.jobTitle}**:\n\n` +
    reasons.join('\n') +
    deltaFooter
  );
};

/**
 * So sánh khách quan từ 2 đến 3 ứng viên bất kỳ (theo danh sách được hỏi hoặc theo vị trí đang xem).
 */
const buildDynamicComparison = (
  candidates: EnrichedCandidateProfile[],
  scopeLabel: string
): string => {
  if (candidates.length === 0) {
    return 'Hiện chưa có đủ hồ sơ ứng viên để thực hiện so sánh.';
  }
  if (candidates.length === 1) {
    return (
      `Hiện tại phạm vi **${scopeLabel}** chỉ có 1 ứng viên là **${candidates[0].candidateName}** (${candidates[0].matchScore}/100đ).\n\n` +
      buildCandidateFocusedAnswer(candidates[0], '', candidates, false)
    );
  }

  const medals = ['🥇', '🥈', '🥉', '🔹'];
  const rows = candidates.slice(0, 4).map((c, idx) => {
    const rankTag = c.rank ? `Hạng #${c.rank}` : `Ứng viên ${idx + 1}`;
    return (
      `${medals[idx] || '🔹'} **${rankTag} — ${c.candidateName} (${c.matchScore}/100đ • ${c.jobTitle}):**\n` +
      `  • Chuyên môn: **${c.keywordScore}/65đ** (${c.skills.slice(0, 4).join(', ')})\n` +
      `  • Kinh nghiệm: **${c.yearsOfExpText}** (+${c.expBonus}/15đ)${
        c.educationText ? ` | Học vấn: ${c.educationText.split('\n')[0]}` : ''
      }\n` +
      `  • Ngoại ngữ (+${c.langBonus}đ): ${c.languages.join(', ') || 'Cơ bản'} | Thành tích (+${c.awardBonus}đ): ${
        c.awards[0] || 'Dự án thực tế'
      }`
    );
  });

  const first = candidates[0];
  const second = candidates[1];
  let advice = '';
  if (first && second) {
    advice =
      `\n\n💡 **Nhận xét hỗ trợ ra quyết định:**\n` +
      `• Chọn **${first.candidateName}** nếu bạn ưu tiên mức độ đáp ứng toàn diện cao nhất (**${first.matchScore}đ**, ${first.yearsOfExpText}${
        first.awards[0] ? `, có ${first.awards[0]}` : ''
      }).\n` +
      `• Chọn **${second.candidateName}** (**${second.matchScore}đ**, ${second.yearsOfExpText}) nếu bạn muốn cân đối ngân sách lương linh hoạt hơn hoặc đánh giá cao trải nghiệm dự án riêng trong CV của bạn ấy.`;
  }

  return `⚖️ **Đối chiếu trực tiếp ${Math.min(candidates.length, 4)} ứng viên (${scopeLabel}):**\n\n` + rows.join('\n\n') + advice;
};

/**
 * Tạo gợi ý câu hỏi tiếp theo dựa ĐÚNG trên ngữ cảnh vị trí và các ứng viên đang hiển thị.
 */
const buildContextualRecruiterSuggestions = (
  shownCVs: EnrichedCandidateProfile[],
  activeJobTitle: string | null | undefined,
  recruiterJobs: Job[]
): { label: string; value: string }[] => {
  const opts: { label: string; value: string }[] = [];
  const top1 = shownCVs[0];
  const top2 = shownCVs[1];

  if (top1) {
    opts.push({
      label: `❓ Vì sao ${top1.candidateName} đạt ${top1.matchScore}đ?`,
      value: `Vì sao ${top1.candidateName} được đánh giá cao nhất ở vị trí ${top1.jobTitle}?`,
    });
    opts.push({
      label: `🎯 Câu hỏi phỏng vấn ${top1.candidateName}`,
      value: `Gợi ý câu hỏi phỏng vấn cho ${top1.candidateName}`,
    });
  }
  if (top1 && top2) {
    opts.push({
      label: `⚖️ So sánh ${top1.candidateName} & ${top2.candidateName}`,
      value: `So sánh chi tiết ${top1.candidateName} và ${top2.candidateName}`,
    });
  }
  if (activeJobTitle) {
    opts.push({
      label: '🌐 Xem bảng xếp hạng tất cả vị trí',
      value: 'Tổng hợp tất cả các vị trí tuyển dụng của công ty',
    });
  } else {
    recruiterJobs.slice(0, 2).forEach((j) => {
      opts.push({
        label: `📂 Vị trí: ${j.title}`,
        value: `Xem ứng viên vị trí ${j.title}`,
      });
    });
  }

  return opts.slice(0, 4);
};

/**
 * BỘ SUY LUẬN ĐA LƯỢT DÀNH CHO NHÀ TUYỂN DỤNG:
 * Hiểu ngôn ngữ tự nhiên, xử lý phủ định ("chứ không phải..."), giữ ngữ cảnh vị trí/ứng viên đang trao đổi,
 * và tự tổng hợp câu trả lời trực tiếp từ dữ liệu CV + Tin tuyển dụng thực tế.
 */
export const analyzeRecruiterConversation = (
  rawQuery: string,
  recruiterJobs: Job[],
  recruiterApps: any[],
  prevContext: AIConversationContext
): RecruiterAIResponse => {
  const allProfiles = buildRecruiterKnowledgeGraph(recruiterApps);

  if (allProfiles.length === 0) {
    return {
      reply:
        recruiterJobs.length > 0
          ? `Doanh nghiệp hiện đang đăng **${recruiterJobs.length} vị trí tuyển dụng** nhưng chưa có hồ sơ ứng viên nào nộp vào. Ngay khi có ứng viên nộp CV, mình sẽ phân tích chi tiết kỹ năng, học vấn, kinh nghiệm và xếp hạng cho bạn!`
          : 'Hiện doanh nghiệp chưa đăng vị trí tuyển dụng nào. Hãy đăng tin tuyển dụng đầu tiên tại Bảng điều khiển để thu hút ứng viên nhé!',
      nextContext: prevContext,
    };
  }

  // Ánh xạ legacy quick tokens nếu còn được gọi
  let normalizedInput = rawQuery.trim();
  if (normalizedInput === '__WHY_RANK_1__') normalizedInput = 'Tại sao ứng viên Hạng #1 được đánh giá cao nhất?';
  if (normalizedInput === '__PREFER_RANK_2__') normalizedInput = 'Ứng viên Hạng #2 thì có điểm gì phù hợp hơn?';
  if (normalizedInput === '__COMPARE_TOP_3__') normalizedInput = 'So sánh chi tiết các ứng viên hàng đầu';
  if (normalizedInput === '__RECRUITER_TOP_CVS__') normalizedInput = 'Tổng hợp bảng xếp hạng tất cả các vị trí của công ty';
  if (normalizedInput === '__RECRUITER_SPAM_CVS__') normalizedInput = 'Lọc các CV độ khớp thấp hoặc trái ngành';

  const { positiveAscii, negatedAscii, isCorrection } = splitPositiveAndNegatedQuery(normalizedInput);

  // 1. Kiểm tra xem người dùng có yêu cầu mở rộng ra toàn bộ công ty không
  const wantsGlobalScope =
    /\b(tat ca vi tri|tat ca cac vi tri|toan cong ty|toan bo vi tri|bang xep hang chung|tong hop tat ca|xem tat ca cv)\b/.test(
      positiveAscii
    );

  // 2. Nhận diện thực thể Ứng viên và Vị trí trong phần KHẲNG ĐỊNH (loại trừ phần PHỦ ĐỊNH!)
  const negatedCandidateNames = new Set(matchCandidateNamesInText(negatedAscii, allProfiles));
  const mentionedCandidateNames = matchCandidateNamesInText(positiveAscii, allProfiles).filter(
    (name) => !negatedCandidateNames.has(name)
  );
  const explicitlyMatchedJob = wantsGlobalScope
    ? null
    : matchJobFromQuery(positiveAscii, negatedAscii, recruiterJobs);

  // 3. Xác định ngữ cảnh vị trí tuyển dụng đang hoạt động (Active Job Scope)
  let nextActiveJobId: string | null = wantsGlobalScope ? null : prevContext.activeJobId || null;
  let nextActiveJobTitle: string | null = wantsGlobalScope ? null : prevContext.activeJobTitle || null;

  if (explicitlyMatchedJob) {
    nextActiveJobId = explicitlyMatchedJob.id;
    nextActiveJobTitle = explicitlyMatchedJob.title;
  } else if (mentionedCandidateNames.length === 1) {
    // Nếu người dùng hỏi đích danh 1 ứng viên (VD: "mình đang hỏi Ngô Đức Thịnh chứ không phải Hoàng Gia Huy")
    const candApps = allProfiles.filter((p) => p.candidateName === mentionedCandidateNames[0]);
    const inCurrentJob = nextActiveJobId ? candApps.find((p) => p.jobId === nextActiveJobId) : null;
    const chosenApp = inCurrentJob || candApps[0];
    if (chosenApp) {
      nextActiveJobId = chosenApp.jobId;
      nextActiveJobTitle = chosenApp.jobTitle;
    }
  }

  // Tập hồ sơ theo phạm vi hiện tại (Theo vị trí đang xem HOẶC toàn công ty nếu chưa chọn vị trí)
  const buildUniqueCompanyLeaderboard = () => {
    const seen = new Set<string>();
    return allProfiles
      .filter((p) => !negatedCandidateNames.has(p.candidateName))
      .filter((p) => {
        const key = p.candidateEmail || p.candidateName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((p, i) => ({ ...p, rank: i + 1 }));
  };

  const scopedPool: EnrichedCandidateProfile[] = nextActiveJobId
    ? allProfiles
        .filter((p) => p.jobId === nextActiveJobId && !negatedCandidateNames.has(p.candidateName))
        .map((p, idx) => ({ ...p, rank: idx + 1 }))
    : buildUniqueCompanyLeaderboard();

  const scopeLabel = nextActiveJobTitle ? `vị trí ${nextActiveJobTitle}` : 'toàn bộ vị trí của công ty';

  // =========================================================================
  // NHÁNH A: NGƯỜI DÙNG NHẮC ĐÍCH DANH 1 HOẶC NHIỀU ỨNG VIÊN CỤ THỂ
  // (VD: "mình đang hỏi ngô đức thịnh chứ không phải hoàng gia huy", "so sánh Thịnh và Khiêm", "email của Thịnh")
  // =========================================================================
  if (mentionedCandidateNames.length >= 2) {
    const selected = mentionedCandidateNames
      .map((name) => {
        const inJob = nextActiveJobId
          ? allProfiles.find((p) => p.candidateName === name && p.jobId === nextActiveJobId)
          : null;
        return inJob || allProfiles.find((p) => p.candidateName === name)!;
      })
      .filter(Boolean);

    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: selected.every((s) => s.jobId === selected[0]?.jobId) ? selected[0]?.jobId : nextActiveJobId,
      activeJobTitle: selected.every((s) => s.jobId === selected[0]?.jobId) ? selected[0]?.jobTitle : nextActiveJobTitle,
      lastShownApplicationIds: selected.map((s) => s.applicationId),
      focusedApplicationIds: selected.map((s) => s.applicationId),
    };

    return {
      reply: buildDynamicComparison(selected, selected.every((s) => s.jobId === selected[0]?.jobId) ? selected[0].jobTitle : 'đối chiếu theo yêu cầu'),
      recommendedCVs: selected,
      quickOptions: buildContextualRecruiterSuggestions(selected, nextCtx.activeJobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  if (mentionedCandidateNames.length === 1) {
    const targetName = mentionedCandidateNames[0];
    const target =
      scopedPool.find((p) => p.candidateName === targetName) ||
      allProfiles.find((p) => p.candidateName === targetName)!;
    const jobPeers = allProfiles
      .filter((p) => p.jobId === target.jobId)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    const asksWhyRank = /\b(tai sao|vi sao|ly do|xep hang|cham diem|diem cao|hang 1|hang #1|cao nhat)\b/.test(
      positiveAscii
    );

    const reply = asksWhyRank
      ? buildAccurateRankExplanation(target, jobPeers, `vị trí ${target.jobTitle}`)
      : buildCandidateFocusedAnswer(target, positiveAscii, jobPeers, isCorrection);

    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: target.jobId,
      activeJobTitle: target.jobTitle,
      lastShownApplicationIds: [target.applicationId],
      focusedApplicationIds: [target.applicationId],
    };

    return {
      reply,
      recommendedCVs: [target],
      quickOptions: buildContextualRecruiterSuggestions(jobPeers, target.jobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // =========================================================================
  // NHÁNH B: NGƯỜI DÙNG CHỌN / HỎI VỀ MỘT VỊ TRÍ TUYỂN DỤNG CỤ THỂ
  // (VD: "CV vị trí Mobile App Developer", "ai ứng tuyển DevOps?", "vị trí Fullstack có mấy CV?")
  // =========================================================================
  const hasRankOrCompareIntent =
    /\b(tai sao|vi sao|ly do|so sanh|doi chieu|khac nhau|hang 1|hang #1|hang 2|hang #2|hang 3|hang #3|hop hon|nen chon ai|nen duyet ai|cau hoi phong van|hoi gi khi phong van)\b/.test(
      positiveAscii
    );

  if (explicitlyMatchedJob && !hasRankOrCompareIntent) {
    const jobCVs = allProfiles
      .filter((p) => p.jobId === explicitlyMatchedJob.id && !negatedCandidateNames.has(p.candidateName))
      .map((p, i) => ({ ...p, rank: i + 1 }));

    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: explicitlyMatchedJob.id,
      activeJobTitle: explicitlyMatchedJob.title,
      lastShownApplicationIds: jobCVs.map((c) => c.applicationId),
      focusedApplicationIds: jobCVs[0] ? [jobCVs[0].applicationId] : [],
    };

    if (jobCVs.length === 0) {
      return {
        reply: `📂 Vị trí **${explicitlyMatchedJob.title}** *(Mức lương: ${explicitlyMatchedJob.salary || 'Thỏa thuận'} • ${explicitlyMatchedJob.location})* hiện chưa có hồ sơ ứng viên nào nộp vào.`,
        quickOptions: buildContextualRecruiterSuggestions([], null, recruiterJobs),
        nextContext: nextCtx,
      };
    }

    const validCount = jobCVs.filter((x) => !x.isSpam).length;
    const spamCount = jobCVs.filter((x) => x.isSpam).length;
    const leader = jobCVs[0];
    const runnerUp = jobCVs[1];

    const summaryLines = [
      `📂 Vị trí **${explicitlyMatchedJob.title}** *(${explicitlyMatchedJob.salary || 'Thỏa thuận'} • ${explicitlyMatchedJob.location})* hiện có **${jobCVs.length} hồ sơ** (${validCount} phù hợp${spamCount > 0 ? `, ${spamCount} cảnh báo trái ngành` : ''}):`,
      `• **Dẫn đầu (Hạng #1):** **${leader.candidateName}** (**${leader.matchScore}/100đ** — ${leader.yearsOfExpText}${leader.languages[0] ? `, ${leader.languages[0].split('—')[0].trim()}` : ''}).`,
    ];
    if (runnerUp) {
      summaryLines.push(
        `• **Theo sát (Hạng #2):** **${runnerUp.candidateName}** (**${runnerUp.matchScore}/100đ** — ${runnerUp.yearsOfExpText}).`
      );
    }
    summaryLines.push(
      `\nBạn có thể hỏi tự nhiên bất kỳ thông tin gì về các ứng viên vị trí này *(VD: vì sao xếp Hạng #1, so sánh 2 bạn, học trường gì, câu hỏi phỏng vấn...)*!`
    );

    return {
      reply: summaryLines.join('\n'),
      recommendedCVs: jobCVs,
      quickOptions: buildContextualRecruiterSuggestions(jobCVs, explicitlyMatchedJob.title, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // =========================================================================
  // NHÁNH C: CÂU HỎI NỐI TIẾP THEO THỨ HẠNG / ĐẠI TỪ TRONG ĐÚNG NGỮ CẢNH ĐANG XEM
  // (VD: "Tại sao ứng viên này được đánh giá Hạng #1?", "Hạng #2 hợp hơn?", "So sánh", "Học trường nào?")
  // =========================================================================
  const rankMatch = positiveAscii.match(/\b(?:hang|top|thu|so)\s*#?(\d+)\b/);
  const requestedRankNum = rankMatch
    ? parseInt(rankMatch[1], 10)
    : /\b(hang nhat|dau tien|cao diem nhat|ung vien dau)\b/.test(positiveAscii)
    ? 1
    : /\b(thu hai)\b/.test(positiveAscii)
    ? 2
    : /\b(thu ba)\b/.test(positiveAscii)
    ? 3
    : null;

  // 1. So sánh (Compare) trong đúng phạm vi vị trí đang mở!
  if (/\b(so sanh|doi chieu|khac nhau|khac biet|phan van)\b/.test(positiveAscii)) {
    const compareList = scopedPool.filter((x) => !x.isSpam).slice(0, 3);
    const finalList = compareList.length > 0 ? compareList : scopedPool.slice(0, 3);
    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: nextActiveJobId,
      activeJobTitle: nextActiveJobTitle,
      lastShownApplicationIds: finalList.map((c) => c.applicationId),
      focusedApplicationIds: finalList.slice(0, 2).map((c) => c.applicationId),
    };
    return {
      reply: buildDynamicComparison(finalList, scopeLabel),
      recommendedCVs: finalList,
      quickOptions: buildContextualRecruiterSuggestions(finalList, nextActiveJobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // 2. Hỏi cân nhắc Hạng #2 / "Hạng 2 hợp hơn?" / "Nên chọn ai?"
  if (
    (requestedRankNum === 2 && /\b(hop hon|tot hon|nghi|can nhac|chon|sao)\b/.test(positiveAscii)) ||
    /\b(nen chon ai|nen duyet ai|chon ban nao|ai hop hon)\b/.test(positiveAscii)
  ) {
    const first = scopedPool[0];
    const second = scopedPool[1];
    if (!second) {
      return {
        reply: `Trong phạm vi **${scopeLabel}** hiện chỉ có 1 ứng viên là **${first?.candidateName || 'duy nhất'}**, chưa có ứng viên Hạng #2 để đối chiếu.`,
        recommendedCVs: first ? [first] : [],
        quickOptions: buildContextualRecruiterSuggestions(scopedPool, nextActiveJobTitle, recruiterJobs),
        nextContext: prevContext,
      };
    }

    const reply =
      `💡 Góc nhìn của bạn về **${second.candidateName}** *(Hạng #2 — **${second.matchScore}/100đ** tại **${second.jobTitle}**)* hoàn toàn có cơ sở thực tế!\n\n` +
      `• **Chuyên môn kỹ thuật (${second.keywordScore}/65đ):** Nắm vững ${second.skills.slice(0, 5).join(', ')}${
        second.keywordScore === first.keywordScore
          ? ` — **ngang bằng điểm chuyên môn (${first.keywordScore}/65đ)** với Hạng #1 (${first.candidateName})!`
          : '.'
      }\n` +
      `• **Tối ưu ngân sách & độ gắn bó (${second.yearsOfExpText}):** So với **${first.candidateName}** (${first.yearsOfExpText}), ứng viên **${second.candidateName}** thường có kỳ vọng thu nhập linh hoạt hơn và dư địa phát triển lâu dài cùng sản phẩm.\n` +
      `• **Điểm sáng riêng trong CV:** ${
        second.experienceText ? second.experienceText.split('\n')[0].replace(/^[•\-\s]+/, '') : second.summary
      }${second.languages[0] ? ` | Ngoại ngữ: ${second.languages.join(', ')}` : ''}${
        second.awards[0] ? ` | Thành tích: ${second.awards[0]}` : ''
      }.\n\n` +
      `✅ Điểm AI chỉ đóng vai trò tham chiếu — bạn hoàn toàn có thể mời phỏng vấn cả **${second.candidateName}** và **${first.candidateName}** để đánh giá độ hợp văn hóa đội ngũ!`;

    const shown = [second, first];
    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: second.jobId,
      activeJobTitle: second.jobTitle,
      lastShownApplicationIds: shown.map((c) => c.applicationId),
      focusedApplicationIds: [second.applicationId],
    };

    return {
      reply,
      recommendedCVs: shown,
      quickOptions: buildContextualRecruiterSuggestions(scopedPool, second.jobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // 3. Giải thích lý do xếp hạng (VD: "Tại sao ứng viên này lại được đánh giá Hạng #1?" -> giữ ĐÚNG vị trí đang mở!)
  if (
    /\b(tai sao|vi sao|ly do|cham diem|cach tinh diem)\b/.test(positiveAscii) ||
    requestedRankNum !== null
  ) {
    const targetIdx = requestedRankNum ? Math.max(0, requestedRankNum - 1) : 0;
    const target = scopedPool[targetIdx] || scopedPool[0];
    if (!target) {
      return {
        reply: `Trong phạm vi **${scopeLabel}** hiện chỉ có ${scopedPool.length} hồ sơ ứng viên.`,
        recommendedCVs: scopedPool,
        nextContext: prevContext,
      };
    }

    const asksSpecificDetailInsteadOfWhy =
      !/\b(tai sao|vi sao|ly do|cham diem)\b/.test(positiveAscii) &&
      /\b(truong|hoc van|kinh nghiem|du an|ky nang|ngoai ngu|lien he|email|sdt|dien thoai|phong van)\b/.test(positiveAscii);

    const reply = asksSpecificDetailInsteadOfWhy
      ? buildCandidateFocusedAnswer(target, positiveAscii, scopedPool, false)
      : buildAccurateRankExplanation(target, scopedPool, scopeLabel);

    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: nextActiveJobId || target.jobId,
      activeJobTitle: nextActiveJobTitle || target.jobTitle,
      lastShownApplicationIds: [target.applicationId],
      focusedApplicationIds: [target.applicationId],
    };

    return {
      reply,
      recommendedCVs: [target],
      quickOptions: buildContextualRecruiterSuggestions(scopedPool, nextCtx.activeJobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // 4. Hỏi tiếp bằng đại từ nhân xưng ("ứng viên này học trường gì?", "gợi ý câu hỏi phỏng vấn bạn này", "sđt liên hệ?")
  const asksCandidateAspectFollowUp =
    /\b(ung vien nay|ban nay|ho so nay|ban do|truong|hoc van|dai hoc|gpa|du an|project|email|sdt|so dien thoai|dien thoai|lien he|cover letter|thu gioi thieu|cau hoi phong van|hoi gi khi phong van|con thieu|diem yeu)\b/.test(
      positiveAscii
    );

  if (asksCandidateAspectFollowUp) {
    const focusedId = prevContext.focusedApplicationIds?.[0] || prevContext.lastShownApplicationIds?.[0];
    const focusedCand =
      (focusedId ? allProfiles.find((p) => p.applicationId === focusedId) : null) || scopedPool[0];

    if (focusedCand) {
      const peers = allProfiles
        .filter((p) => p.jobId === focusedCand.jobId)
        .map((p, i) => ({ ...p, rank: i + 1 }));
      const nextCtx: AIConversationContext = {
        ...prevContext,
        activeJobId: focusedCand.jobId,
        activeJobTitle: focusedCand.jobTitle,
        focusedApplicationIds: [focusedCand.applicationId],
      };
      return {
        reply: buildCandidateFocusedAnswer(focusedCand, positiveAscii, peers, false),
        recommendedCVs: [focusedCand],
        quickOptions: buildContextualRecruiterSuggestions(peers, focusedCand.jobTitle, recruiterJobs),
        nextContext: nextCtx,
      };
    }
  }

  // =========================================================================
  // NHÁNH D: LỌC ĐA TIÊU CHÍ TỰ ĐỘNG TRÊN DỮ LIỆU THẬT
  // (VD: "CV trái ngành", "ai biết tiếng Nhật / IELTS?", "ứng viên ở TP.HCM", "trên 3 năm KN", "hồ sơ chưa duyệt", "tổng quan")
  // =========================================================================
  if (/\b(cv rac|spam|trai nganh|do khop thap|khong phu hop)\b/.test(positiveAscii)) {
    const spamCVs = (nextActiveJobId ? scopedPool : allProfiles).filter((p) => p.isSpam);
    return {
      reply:
        spamCVs.length > 0
          ? `⚠️ Phát hiện **${spamCVs.length} hồ sơ độ khớp thấp / trái ngành** trong ${scopeLabel}. Hệ thống gắn nhãn cảnh báo để bạn kiểm tra nhanh:`
          : `✅ Trong **${scopeLabel}** hiện không có CV nào bị cảnh báo trái ngành — tất cả hồ sơ đều có chuyên môn liên quan!`,
      recommendedCVs: spamCVs,
      quickOptions: buildContextualRecruiterSuggestions(scopedPool, nextActiveJobTitle, recruiterJobs),
      nextContext: prevContext,
    };
  }

  if (/\b(tong quan|thong ke|bao nhieu vi tri|bao nhieu ho so|bao nhieu ung vien|tinh hinh tuyen dung)\b/.test(positiveAscii)) {
    const openJobs = recruiterJobs.filter((j) => j.status === 'OPEN').length;
    const acceptedCount = allProfiles.filter((p) => p.status === 'ACCEPTED').length;
    const pendingCount = allProfiles.filter((p) => p.status === 'PENDING').length;
    const spamCount = allProfiles.filter((p) => p.isSpam).length;

    const perJobBreakdown = recruiterJobs
      .map((j) => {
        const jApps = allProfiles.filter((p) => p.jobId === j.id);
        const top = jApps[0];
        return `• **${j.title}:** ${jApps.length} CV${top ? ` *(Dẫn đầu: ${top.candidateName} — ${top.matchScore}đ)*` : ' *(Chưa có CV)*'}`;
      })
      .join('\n');

    return {
      reply:
        `📊 **Báo cáo tổng quan dữ liệu tuyển dụng hiện tại của doanh nghiệp:**\n\n` +
        `• **Vị trí tuyển dụng:** ${recruiterJobs.length} vị trí (${openJobs} đang mở nhận hồ sơ).\n` +
        `• **Tổng đơn ứng tuyển:** ${allProfiles.length} hồ sơ *(Đã duyệt: ${acceptedCount} • Đang chờ duyệt: ${pendingCount} • Cảnh báo trái ngành: ${spamCount})*.\n\n` +
        `**Chi tiết từng vị trí:**\n${perJobBreakdown}`,
      recommendedCVs: buildUniqueCompanyLeaderboard().filter((x) => !x.isSpam).slice(0, 4),
      quickOptions: buildContextualRecruiterSuggestions(buildUniqueCompanyLeaderboard(), null, recruiterJobs),
      nextContext: { ...prevContext, activeJobId: null, activeJobTitle: null },
    };
  }

  if (wantsGlobalScope || /\b(top cv|phu hop nhat|bang xep hang)\b/.test(positiveAscii)) {
    const valid = scopedPool.filter((x) => !x.isSpam);
    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: wantsGlobalScope ? null : nextActiveJobId,
      activeJobTitle: wantsGlobalScope ? null : nextActiveJobTitle,
      lastShownApplicationIds: valid.map((v) => v.applicationId),
      focusedApplicationIds: valid[0] ? [valid[0].applicationId] : [],
    };
    return {
      reply: `🌟 Bảng xếp hạng **${valid.length} hồ sơ phù hợp nhất** (${wantsGlobalScope ? 'toàn công ty' : scopeLabel}) chấm theo 4 tiêu chí thực tế (Chuyên môn 65đ + Kinh nghiệm 15đ + Ngoại ngữ 12đ + Giải thưởng 8đ):`,
      recommendedCVs: valid,
      quickOptions: buildContextualRecruiterSuggestions(valid, nextCtx.activeJobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // Lọc theo số năm kinh nghiệm tối thiểu, trạng thái duyệt, ngoại ngữ, trường học, khu vực hoặc từ khóa bất kỳ trong CV!
  const minYearsMatch = positiveAscii.match(/(?:tren|tu|hon|>=?)\s*(\d+(?:[.,]\d+)?)\s*nam/);
  const minYears = minYearsMatch ? parseFloat(minYearsMatch[1].replace(',', '.')) : null;
  const filterAccepted = /\b(da duyet|da chap nhan|accepted)\b/.test(positiveAscii);
  const filterPending = /\b(chua duyet|dang cho|cho duyet|pending)\b/.test(positiveAscii);

  const stopSearchTokens = new Set([
    'ung', 'vien', 'nao', 'ai', 'co', 'biet', 'tim', 'cho', 'minh', 'hoi', 'xem', 'ho', 'so', 'cv', 'nhung', 'cac',
    'ban', 'anh', 'chi', 'em', 'trong', 'tai', 'o', 'voi', 'va', 'hoac', 'la', 'duoc', 'khong', 'phai', 'chu',
    'dang', 'tren', 'tu', 'nam', 'kinh', 'nghiem', 'da', 'chua', 'duyet', 'cho', 'dang',
  ]);
  const queryKeywords = positiveAscii
    .replace(/[.,?!:;()"']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopSearchTokens.has(w) && !/^\d+$/.test(w));

  const searchBase = nextActiveJobId ? scopedPool : buildUniqueCompanyLeaderboard();
  const performFilter = (pool: EnrichedCandidateProfile[], requireAllKeywords: boolean) =>
    pool
      .map((item) => {
        if (negatedCandidateNames.has(item.candidateName)) return null;
        if (minYears !== null && item.yearsOfExpNum < minYears) return null;
        if (filterAccepted && item.status !== 'ACCEPTED') return null;
        if (filterPending && item.status !== 'PENDING') return null;

        let kwHits = 0;
        for (const kw of queryKeywords) {
          if (item.fullSearchableText.includes(kw)) kwHits++;
        }
        if (queryKeywords.length > 0) {
          const minRequired = requireAllKeywords
            ? queryKeywords.length
            : Math.max(1, Math.ceil(queryKeywords.length * 0.6));
          if (kwHits < minRequired) return null;
        }

        return { item, kwHits };
      })
      .filter((x): x is { item: EnrichedCandidateProfile; kwHits: number } => Boolean(x))
      .sort((a, b) => b.kwHits - a.kwHits || b.item.matchScore - a.item.matchScore)
      .map((x, idx) => ({ ...x.item, rank: idx + 1 }));

  const uniqueAll = buildUniqueCompanyLeaderboard();
  let filteredResults = performFilter(searchBase, true);
  let searchedAcrossAll = false;

  if (filteredResults.length === 0 && nextActiveJobId) {
    // Ưu tiên tìm khớp đầy đủ 100% từ khóa trên toàn bộ vị trí công ty trước khi nới lỏng từ khóa
    const strictGlobal = performFilter(uniqueAll, true);
    if (strictGlobal.length > 0) {
      filteredResults = strictGlobal;
      searchedAcrossAll = true;
    }
  }
  if (filteredResults.length === 0 && queryKeywords.length > 1) {
    filteredResults = performFilter(searchBase, false);
    if (filteredResults.length === 0 && nextActiveJobId) {
      filteredResults = performFilter(uniqueAll, false);
      if (filteredResults.length > 0) searchedAcrossAll = true;
    }
  }

  if (filteredResults.length > 0) {
    const top = filteredResults[0];
    const nextCtx: AIConversationContext = {
      ...prevContext,
      activeJobId: searchedAcrossAll ? null : nextActiveJobId,
      activeJobTitle: searchedAcrossAll ? null : nextActiveJobTitle,
      lastShownApplicationIds: filteredResults.slice(0, 6).map((c) => c.applicationId),
      focusedApplicationIds: [top.applicationId],
    };

    const briefDetails = filteredResults
      .slice(0, 4)
      .map(
        (c, i) =>
          `${i + 1}. **${c.candidateName}** *(${c.jobTitle} • ${c.matchScore}/100đ)* — ${c.yearsOfExpText}${
            c.languages[0] ? ` • ${c.languages.join(', ')}` : ''
          }${c.address ? ` • ${c.address}` : ''}`
      )
      .join('\n');

    return {
      reply:
        `🔎 Tìm thấy **${filteredResults.length} hồ sơ ứng viên** khớp với yêu cầu *"${normalizedInput}"*${
          searchedAcrossAll ? ' *(đã mở rộng tìm trên toàn bộ vị trí của công ty)*' : ` trong **${scopeLabel}**`
        }:\n\n${briefDetails}`,
      recommendedCVs: filteredResults.slice(0, 6),
      quickOptions: buildContextualRecruiterSuggestions(filteredResults, nextCtx.activeJobTitle, recruiterJobs),
      nextContext: nextCtx,
    };
  }

  // Trường hợp câu hỏi không khớp bất kỳ dữ liệu nào trong hệ thống -> Phản hồi trung thực dựa trên dữ liệu hiện có
  const availableCandidateSample = scopedPool
    .slice(0, 4)
    .map((c) => `**${c.candidateName}** (${c.jobTitle})`)
    .join(', ');

  return {
    reply:
      `Mình đã tra cứu toàn bộ dữ liệu hồ sơ hiện có trong **${scopeLabel}** nhưng chưa tìm thấy thông tin khớp với *"${normalizedInput}"*.\n\n` +
      `• **Các ứng viên hiện có trong phạm vi đang xem:** ${availableCandidateSample}.\n` +
      `• Bạn có thể hỏi trực tiếp tên bất kỳ ứng viên nào, tên vị trí tuyển dụng, kỹ năng, ngoại ngữ, trường đại học, kinh nghiệm hoặc yêu cầu gợi ý câu hỏi phỏng vấn nhé!`,
    recommendedCVs: scopedPool.slice(0, 4),
    quickOptions: buildContextualRecruiterSuggestions(scopedPool, nextActiveJobTitle, recruiterJobs),
    nextContext: prevContext,
  };
};

/**
 * BỘ SUY LUẬN ĐA LƯỢT DÀNH CHO ỨNG VIÊN:
 * Phân tích thực chất CV của ứng viên đối chiếu với toàn bộ tin tuyển dụng đang mở, mức lương, khoảng cách,
 * kỹ năng còn thiếu và hỗ trợ viết thư giới thiệu / chuẩn bị phỏng vấn.
 */
export const analyzeCandidateConversation = (params: {
  rawQuery: string;
  allJobs: Job[];
  evaluatedJobs: CandidateMatchedJob[];
  mySingleCV: CV | undefined;
  importantKeywords: string[];
  candidateAddress: string;
  prevContext: AIConversationContext;
  buildCombinedNotification: (addr: string) => { text: string; recommendedJobs: CandidateMatchedJob[] };
  candidateQuickPrompts: { label: string; value: string }[];
}): CandidateAIResponse => {
  const {
    rawQuery,
    allJobs,
    evaluatedJobs,
    mySingleCV,
    importantKeywords,
    candidateAddress,
    prevContext,
    buildCombinedNotification,
    candidateQuickPrompts,
  } = params;

  const qTrim = rawQuery.trim();
  const qLower = qTrim.toLowerCase();
  const { positiveAscii, negatedAscii } = splitPositiveAndNegatedQuery(qTrim);

  // 1. Cập nhật địa chỉ đang ở nếu ứng viên gõ trực tiếp trong khung chat
  if (
    /^(dia chi cua toi|dia chi:|toi dang o|minh dang o|nha minh o|doi dia chi sang)\b/.test(positiveAscii)
  ) {
    const extractedAddr = qTrim
      .replace(/^(địa chỉ của tôi là|địa chỉ của tôi ở|địa chỉ:|tôi đang ở|mình đang ở|nhà mình ở|đổi địa chỉ sang)\s*/i, '')
      .trim();
    if (extractedAddr.length >= 3) {
      const notif = buildCombinedNotification(extractedAddr);
      return {
        reply: `📍 Đã cập nhật địa chỉ hiện tại của bạn thành **${extractedAddr}**!\n\n${notif.text}`,
        matchedJobs: notif.recommendedJobs,
        quickOptions: candidateQuickPrompts,
        nextContext: {
          ...prevContext,
          lastShownJobIds: notif.recommendedJobs.map((j) => j.id),
          activeCandidateJobId: notif.recommendedJobs[0]?.id || null,
        },
        updatedAddress: extractedAddr,
      };
    }
  }

  // 2. Xử lý các lệnh nhanh chuẩn
  if (qLower === '__combined_ai_notification__') {
    const notif = buildCombinedNotification(candidateAddress);
    return {
      reply: notif.text,
      matchedJobs: notif.recommendedJobs,
      quickOptions: candidateQuickPrompts,
      nextContext: {
        ...prevContext,
        lastShownJobIds: notif.recommendedJobs.map((j) => j.id),
        activeCandidateJobId: notif.recommendedJobs[0]?.id || null,
      },
    };
  }

  if (qLower === '__nearest_jobs__' || /\b(gan nhat|gan cho o|gan dia chi|quanh day)\b/.test(positiveAscii)) {
    const nearest = [...evaluatedJobs]
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      .slice(0, 4)
      .map((j) => ({ ...j, badgeCategory: 'NEAREST' as const }));
    return {
      reply: `📍 Dựa trên địa chỉ bạn đang ở (**${candidateAddress}**), đây là **${nearest.length} công việc gần bạn nhất** kèm độ khớp kỹ năng CV:`,
      matchedJobs: nearest,
      quickOptions: candidateQuickPrompts,
      nextContext: {
        ...prevContext,
        lastShownJobIds: nearest.map((j) => j.id),
        activeCandidateJobId: nearest[0]?.id || null,
      },
    };
  }

  if (qLower === '__newest_jobs__' || /\b(moi nhat|moi dang|viec moi)\b/.test(positiveAscii)) {
    const newest = [...evaluatedJobs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4)
      .map((j) => ({ ...j, isNewest: true, badgeCategory: 'NEWEST' as const }));
    return {
      reply: `🆕 Đây là **${newest.length} vị trí mới đăng nhất** trên hệ thống, đã đối chiếu với từ khóa CV (**${importantKeywords.slice(0, 4).join(', ')}**) và khoảng cách tới **${candidateAddress}**:`,
      matchedJobs: newest,
      quickOptions: candidateQuickPrompts,
      nextContext: {
        ...prevContext,
        lastShownJobIds: newest.map((j) => j.id),
        activeCandidateJobId: newest[0]?.id || null,
      },
    };
  }

  if (qLower === '__keyword_cv_jobs__') {
    const topMatched = evaluatedJobs.slice(0, 4).map((j) => ({
      ...j,
      badgeCategory: 'KEYWORD_MATCH' as const,
    }));
    return {
      reply: `🎯 Dựa trên các kỹ năng nổi bật trong CV của bạn (**${importantKeywords.slice(0, 6).join(', ')}**) và vị trí tại **${candidateAddress}**, đây là **${topMatched.length} công việc phù hợp nhất**:`,
      matchedJobs: topMatched,
      quickOptions: candidateQuickPrompts,
      nextContext: {
        ...prevContext,
        lastShownJobIds: topMatched.map((j) => j.id),
        activeCandidateJobId: topMatched[0]?.id || null,
      },
    };
  }

  // 3. Đánh giá CV của bản thân / Tư vấn cải thiện CV / Xem CV
  if (
    qLower === '__show_my_cvs__' ||
    /\b(xem cv|cv cua minh|cv cua toi|danh gia cv|nhan xet cv|cai thien cv|sua cv|bo sung ky nang)\b/.test(positiveAscii)
  ) {
    if (!mySingleCV) {
      return {
        reply:
          'Hiện tài khoản của bạn chưa khởi tạo CV trực tuyến trên SmartCV. Hãy bấm **"Tạo CV của mình ngay"** bên dưới để mình phân tích điểm mạnh và đối chiếu tự động với các tin tuyển dụng nhé!',
        quickOptions: [
          { label: '📝 Tạo CV của mình ngay', value: '__GO_CV_BUILDER__' },
          ...candidateQuickPrompts.slice(0, 3),
        ],
        nextContext: prevContext,
      };
    }

    const d: any = mySingleCV.data || {};
    const p: any = d.personalInfo || {};
    const topJob = evaluatedJobs[0];
    const eduInfo = formatStructuredField(d.education, 'edu');
    const expInfo = formatStructuredField(d.experience, 'exp');

    // Phân tích các từ khóa thị trường đang cần mà CV ứng viên chưa có
    const marketDemandSkills = ['TypeScript', 'Docker', 'PostgreSQL', 'Next.js', 'CI/CD', 'AWS', 'Unit Test'];
    const cvTextLower = JSON.stringify(d).toLowerCase();
    const suggestedAdditions = marketDemandSkills.filter((sk) => !cvTextLower.includes(sk.toLowerCase())).slice(0, 4);

    const reply =
      `📄 **Phân tích hồ sơ CV của bạn ("${mySingleCV.title}"):**\n\n` +
      `• **Họ tên & Định hướng:** **${d.fullName || p.fullName || 'Ứng viên'}** — ${d.position || p.position || mySingleCV.title}\n` +
      `• **Từ khóa kỹ năng mạnh hiện có:** **${importantKeywords.join(', ')}**\n` +
      (expInfo ? `• **Kinh nghiệm ghi nhận:** ${expInfo.split('\n')[0]}\n` : '') +
      (eduInfo ? `• **Học vấn:** ${eduInfo.split('\n')[0]}\n` : '') +
      (suggestedAdditions.length > 0
        ? `• **Gợi ý nâng cấp CV:** Nhiều doanh nghiệp trên hệ thống đang ưu tiên thêm **${suggestedAdditions.join(', ')}** — nếu bạn đã từng làm qua, hãy bổ sung vào mục Kỹ năng/Dự án để tăng điểm khớp JD!\n`
        : '• **Độ hoàn thiện kỹ năng:** Rất đầy đủ so với nhu cầu thị trường hiện tại!\n') +
      (topJob ? `\n👇 Dưới đây là các vị trí khớp cao nhất với hồ sơ của bạn lúc này:` : '');

    return {
      reply,
      candidateOwnCVs: [mySingleCV],
      matchedJobs: evaluatedJobs.slice(0, 3),
      quickOptions: [
        { label: '✏️ Chỉnh sửa / Cập nhật CV', value: '__GO_CV_BUILDER__' },
        ...candidateQuickPrompts.slice(0, 3),
      ],
      nextContext: {
        ...prevContext,
        lastShownJobIds: evaluatedJobs.slice(0, 3).map((j) => j.id),
      },
    };
  }

  // 4. Nhận diện xem ứng viên có đang hỏi sâu về 1 công việc cụ thể (theo tên hoặc thứ tự "vị trí đầu tiên / công việc số 2 / công việc này") không
  const lastShownJobs = (prevContext.lastShownJobIds || [])
    .map((id) => evaluatedJobs.find((j) => j.id === id))
    .filter((j): j is CandidateMatchedJob => Boolean(j));

  let targetJob: CandidateMatchedJob | null = matchJobFromQuery(positiveAscii, negatedAscii, evaluatedJobs) as CandidateMatchedJob | null;
  if (!targetJob) {
    const ordMatch = positiveAscii.match(/\b(?:vi tri|cong viec|tin|job)\s*(?:so|thu|#)?\s*(\d+)\b/);
    if (ordMatch && lastShownJobs.length > 0) {
      const idx = Math.max(0, parseInt(ordMatch[1], 10) - 1);
      targetJob = lastShownJobs[idx] || null;
    } else if (/\b(vi tri dau tien|cong viec dau tien)\b/.test(positiveAscii) && lastShownJobs[0]) {
      targetJob = lastShownJobs[0];
    } else if (
      /\b(vi tri nay|cong viec nay|job nay|tin nay)\b/.test(positiveAscii) &&
      (prevContext.activeCandidateJobId || lastShownJobs[0])
    ) {
      targetJob =
        evaluatedJobs.find((j) => j.id === prevContext.activeCandidateJobId) || lastShownJobs[0] || null;
    }
  }

  const asksJobDeepQuestion =
    /\b(yeu cau gi|can ky nang gi|mo ta|chi tiet|han nop|deadline|co hop voi|thieu ky nang|viet thu|cover letter|phong van)\b/.test(
      positiveAscii
    );

  if (targetJob && asksJobDeepQuestion) {
    const reqList = Array.isArray(targetJob.requirements)
      ? targetJob.requirements
      : targetJob.requirements
      ? [String(targetJob.requirements)]
      : [];

    if (/\b(viet thu|cover letter|thu gioi thieu|thu ung tuyen)\b/.test(positiveAscii)) {
      const candName = (mySingleCV?.data as any)?.fullName || (mySingleCV?.data as any)?.personalInfo?.fullName || 'Ứng viên';
      const skillsStr = importantKeywords.slice(0, 4).join(', ');
      return {
        reply:
          `✍️ **Gợi ý Thư giới thiệu (Cover Letter) ứng tuyển vị trí ${targetJob.title} tại ${targetJob.company?.name || 'Doanh nghiệp'}:**\n\n` +
          `*"Kính gửi Bộ phận Tuyển dụng ${targetJob.company?.name || 'Quý Công ty'},\n` +
          `Tôi là ${candName}. Qua tìm hiểu thông tin tuyển dụng vị trí **${targetJob.title}** trên SmartCV, tôi nhận thấy định hướng và kinh nghiệm làm việc của mình với **${skillsStr}** rất phù hợp với yêu cầu phát triển sản phẩm của Quý công ty. Tôi đính kèm hồ sơ CV chi tiết và rất mong có cơ hội trao đổi sâu hơn trong buổi phỏng vấn. Trân trọng cảm ơn!"*`,
        matchedJobs: [targetJob],
        quickOptions: candidateQuickPrompts,
        nextContext: { ...prevContext, activeCandidateJobId: targetJob.id, lastShownJobIds: [targetJob.id] },
      };
    }

    return {
      reply:
        `📌 **Phân tích chi tiết vị trí ${targetJob.title}** — **${targetJob.company?.name || 'Doanh nghiệp'}**:\n\n` +
        `• **Mức lương:** **${targetJob.salary || 'Thỏa thuận'}** | **Địa điểm:** ${targetJob.location} *(Cách bạn ~${targetJob.distanceKm ?? '?'} km)*\n` +
        `• **Hình thức hồ sơ:** ${targetJob.requireCV ? 'Yêu cầu đính kèm CV' : '⚡ Cho phép ứng tuyển nhanh (không bắt buộc CV)'}\n` +
        `• **Mô tả công việc:** ${targetJob.description}\n` +
        (reqList.length > 0 ? `• **Yêu cầu chính:**\n  - ${reqList.join('\n  - ')}\n` : '') +
        `• **Độ tương thích với CV của bạn:** **${targetJob.matchScore || 90}%** — ${targetJob.matchReason || 'Phù hợp chuyên môn'}.`,
      matchedJobs: [targetJob],
      quickOptions: [
        { label: `✍️ Soạn Cover Letter cho vị trí này`, value: `Viết thư ứng tuyển cho vị trí ${targetJob.title}` },
        ...candidateQuickPrompts.slice(0, 3),
      ],
      nextContext: { ...prevContext, activeCandidateJobId: targetJob.id, lastShownJobIds: [targetJob.id] },
    };
  }

  // 5. Lọc theo mức lương cao nhất / trên X triệu / không cần CV / từ khóa công nghệ & khu vực
  const parseMaxSalaryMillion = (salaryStr?: string | null): number => {
    if (!salaryStr) return 0;
    const nums = String(salaryStr).match(/\d+/g);
    if (!nums || nums.length === 0) return 0;
    return Math.max(...nums.map((n) => parseInt(n, 10)));
  };

  if (/\b(luong cao nhat|thu nhap cao nhat|dai ngo cao)\b/.test(positiveAscii)) {
    const highestPaid = [...evaluatedJobs]
      .sort((a, b) => parseMaxSalaryMillion(b.salary) - parseMaxSalaryMillion(a.salary))
      .slice(0, 4);
    return {
      reply: `💰 Đây là **${highestPaid.length} vị trí có mức lương đề xuất cao nhất** đang mở tuyển trên hệ thống (kèm độ khớp với CV của bạn):`,
      matchedJobs: highestPaid,
      quickOptions: candidateQuickPrompts,
      nextContext: {
        ...prevContext,
        lastShownJobIds: highestPaid.map((j) => j.id),
        activeCandidateJobId: highestPaid[0]?.id || null,
      },
    };
  }

  if (/\b(khong can cv|khong bat buoc cv|ung tuyen nhanh)\b/.test(positiveAscii)) {
    const noCvJobs = evaluatedJobs
      .filter((j) => !j.requireCV)
      .map((j) => ({ ...j, matchScore: 97, matchReason: '⚡ Ứng tuyển nhanh — Không bắt buộc đính kèm CV' }));
    return {
      reply:
        noCvJobs.length > 0
          ? `⚡ Tìm thấy **${noCvJobs.length} vị trí** cho phép ứng tuyển nhanh không bắt buộc đính kèm CV:`
          : 'Hiện tất cả vị trí đang mở đều yêu cầu đính kèm CV. Dưới đây là các vị trí khớp nhất với hồ sơ của bạn:',
      matchedJobs: (noCvJobs.length > 0 ? noCvJobs : evaluatedJobs).slice(0, 4),
      quickOptions: candidateQuickPrompts,
      nextContext: prevContext,
    };
  }

  const salaryThresholdMatch = positiveAscii.match(/(?:luong|thu nhap|muc luong)?\s*(?:tren|tu|hon|>=?)\s*(\d+)\s*(?:trieu|tr|cu)/);
  const minSalaryMillion = salaryThresholdMatch ? parseInt(salaryThresholdMatch[1], 10) : null;

  const stopCandidateWords = new Set([
    'tim', 'viec', 'lam', 'cong', 'tai', 'o', 'vi', 'tri', 'cho', 'minh', 'toi', 'co', 'nao', 'khong', 'phai',
    'luong', 'tren', 'tu', 'trieu', 'muc', 'cac', 'nhung', 'can', 'tuyen', 'gan', 'khu', 'vuc', 'thanh', 'pho', 'quan',
  ]);
  const kwTokens = positiveAscii
    .replace(/[.,?!:;()"']/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopCandidateWords.has(w) && !/^\d+$/.test(w));

  const filteredJobs = evaluatedJobs
    .map((job) => {
      if (minSalaryMillion !== null && parseMaxSalaryMillion(job.salary) < minSalaryMillion) {
        return null;
      }
      const haystack = toVietnameseAscii(
        `${job.title} ${job.company?.name || ''} ${job.location || ''} ${job.description || ''} ${JSON.stringify(
          job.requirements || ''
        )}`
      );
      if (negatedAscii) {
        const negTokens = negatedAscii.split(/\s+/).filter((w) => w.length >= 3);
        if (negTokens.some((nt) => haystack.includes(nt) && !positiveAscii.includes(nt))) {
          return null;
        }
      }

      let score = 0;
      const titleAsc = toVietnameseAscii(job.title);
      const locAsc = toVietnameseAscii(job.location || '');
      const compAsc = toVietnameseAscii(job.company?.name || '');

      for (const w of kwTokens) {
        if (titleAsc.includes(w)) score += 35;
        if (compAsc.includes(w)) score += 30;
        if (locAsc.includes(w)) score += 28;
        if (haystack.includes(w)) score += 12;
      }

      if (kwTokens.length > 0 && score === 0) return null;
      return { job, score: score + (job.rawScore || 0) * 0.2 };
    })
    .filter((x): x is { job: CandidateMatchedJob; score: number } => Boolean(x))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.job);

  if (filteredJobs.length > 0) {
    return {
      reply: `🔎 Tìm thấy **${filteredJobs.length} vị trí công việc** khớp với yêu cầu *"${qTrim}"*${
        minSalaryMillion ? ` *(mức lương đáp ứng từ ${minSalaryMillion} triệu)*` : ''
      } (kèm khoảng cách tới **${candidateAddress}**):`,
      matchedJobs: filteredJobs.slice(0, 4),
      quickOptions: [
        {
          label: `📌 Chi tiết yêu cầu: ${filteredJobs[0].title}`,
          value: `Chi tiết yêu cầu của vị trí ${filteredJobs[0].title}`,
        },
        ...candidateQuickPrompts.slice(0, 3),
      ],
      nextContext: {
        ...prevContext,
        lastShownJobIds: filteredJobs.slice(0, 4).map((j) => j.id),
        activeCandidateJobId: filteredJobs[0]?.id || null,
      },
    };
  }

  return {
    reply:
      `Hiện trên hệ thống chưa có tin tuyển dụng nào khớp chính xác với từ khóa *"${qTrim}"* (Tổng số tin đang mở: **${allJobs.length} vị trí**).\n\n` +
      `Dưới đây là các vị trí gần địa chỉ **${candidateAddress}** và phù hợp nhất với kỹ năng trong CV của bạn để bạn tham khảo:`,
    matchedJobs: evaluatedJobs.slice(0, 4),
    quickOptions: candidateQuickPrompts,
    nextContext: {
      ...prevContext,
      lastShownJobIds: evaluatedJobs.slice(0, 4).map((j) => j.id),
      activeCandidateJobId: evaluatedJobs[0]?.id || null,
    },
  };
};
