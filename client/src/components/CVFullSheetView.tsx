import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Sparkles,
  FolderGit2,
  Printer,
  Download,
  FileText,
  ExternalLink,
  Edit3,
  Palette,
} from 'lucide-react';

export type CVColorThemeKey = 'classic' | 'emerald' | 'slate' | 'amber';

interface ThemeConfig {
  key: CVColorThemeKey;
  label: string;
  dotClass: string;
  headerBgClass: string;
  roleTextClass: string;
  metaIconClass: string;
  badgeBgClass: string;
  skillChipClass: string;
  pdfHeaderGradient: string;
  pdfAccentHex: string;
  pdfSoftBgHex: string;
  pdfSoftBorderHex: string;
  pdfRoleHex: string;
}

const CV_THEMES: Record<CVColorThemeKey, ThemeConfig> = {
  classic: {
    key: 'classic',
    label: 'Tím Lam thanh lịch',
    dotClass: 'bg-primary-600',
    headerBgClass: 'bg-gradient-to-r from-indigo-800 via-primary-700 to-teal-800',
    roleTextClass: 'text-primary-200',
    metaIconClass: 'text-primary-300',
    badgeBgClass: 'bg-primary-500/25 text-primary-100 border border-primary-300/30',
    skillChipClass: 'bg-white text-primary-700 border-primary-200',
    pdfHeaderGradient: 'linear-gradient(135deg, #36429e, #4f61dc)',
    pdfAccentHex: '#4f61dc',
    pdfSoftBgHex: '#f4f6ff',
    pdfSoftBorderHex: '#d5ddfd',
    pdfRoleHex: '#d5ddfd',
  },
  emerald: {
    key: 'emerald',
    label: 'Tím mận sang trọng',
    dotClass: 'bg-emerald-600',
    headerBgClass: 'bg-gradient-to-r from-emerald-800 via-indigo-800 to-slate-800',
    roleTextClass: 'text-emerald-200',
    metaIconClass: 'text-emerald-300',
    badgeBgClass: 'bg-emerald-500/25 text-emerald-100 border border-emerald-300/30',
    skillChipClass: 'bg-white text-emerald-700 border-emerald-200',
    pdfHeaderGradient: 'linear-gradient(135deg, #482b70, #693ca6)',
    pdfAccentHex: '#693ca6',
    pdfSoftBgHex: '#f8f5fd',
    pdfSoftBorderHex: '#e2d5f7',
    pdfRoleHex: '#e2d5f7',
  },
  slate: {
    key: 'slate',
    label: 'Xám than ấm áp',
    dotClass: 'bg-slate-700',
    headerBgClass: 'bg-gradient-to-r from-slate-800 via-slate-700 to-stone-800',
    roleTextClass: 'text-slate-200',
    metaIconClass: 'text-slate-300',
    badgeBgClass: 'bg-white/15 text-slate-100 border border-white/25',
    skillChipClass: 'bg-white text-slate-700 border-slate-300',
    pdfHeaderGradient: 'linear-gradient(135deg, #2b2622, #423b35)',
    pdfAccentHex: '#423b35',
    pdfSoftBgHex: '#faf8f5',
    pdfSoftBorderHex: '#d4cac0',
    pdfRoleHex: '#e6dfd7',
  },
  amber: {
    key: 'amber',
    label: 'Nâu hổ phách',
    dotClass: 'bg-amber-700',
    headerBgClass: 'bg-gradient-to-r from-stone-800 via-amber-900 to-stone-800',
    roleTextClass: 'text-amber-200',
    metaIconClass: 'text-amber-300',
    badgeBgClass: 'bg-amber-500/25 text-amber-100 border border-amber-300/30',
    skillChipClass: 'bg-white text-amber-800 border-amber-200',
    pdfHeaderGradient: 'linear-gradient(135deg, #292524, #78350f)',
    pdfAccentHex: '#92400e',
    pdfSoftBgHex: '#fffbeb',
    pdfSoftBorderHex: '#fde68a',
    pdfRoleHex: '#fde68a',
  },
};

interface CVFullSheetViewProps {
  title?: string;
  template?: string;
  data: any;
  fallbackName?: string;
  fallbackEmail?: string;
  pdfUrl?: string | null;
  showExportToolbar?: boolean;
  onEditClick?: () => void;
  allowThemePicker?: boolean;
  userId?: string | null;
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
];

export const CVFullSheetView: React.FC<CVFullSheetViewProps> = ({
  title,
  template = 'Modern',
  data = {},
  fallbackName = 'Ứng viên',
  fallbackEmail = 'candidate@example.com',
  pdfUrl,
  showExportToolbar = true,
  onEditClick,
  allowThemePicker = false,
  userId,
}) => {
  const storageKey = `smartcv_cv_theme_${userId || 'guest'}`;
  const [selectedTheme, setSelectedTheme] = useState<CVColorThemeKey>(() => {
    const saved = localStorage.getItem(storageKey) as CVColorThemeKey | null;
    if (saved && CV_THEMES[saved]) return saved;
    return 'classic';
  });

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as CVColorThemeKey | null;
    if (saved && CV_THEMES[saved]) {
      setSelectedTheme(saved);
    } else {
      setSelectedTheme('classic');
    }
  }, [storageKey]);

  const theme = CV_THEMES[selectedTheme] || CV_THEMES.classic;

  const handleSelectTheme = (key: CVColorThemeKey) => {
    setSelectedTheme(key);
    localStorage.setItem(storageKey, key);
  };

  const personal = data?.personalInfo || {};
  const fullName = data?.fullName || personal?.fullName || fallbackName;
  const position =
    data?.position ||
    personal?.position ||
    title?.replace(/^CV\s+/i, '').split('-')[0]?.trim() ||
    'Chuyên viên phát triển phần mềm';
  const avatar =
    data?.avatar ||
    personal?.avatarUrl ||
    DEFAULT_AVATARS[fullName.length % DEFAULT_AVATARS.length];
  const dob = data?.dob || personal?.dob || '15/08/1999';
  const gender = data?.gender || personal?.gender || 'Nam';
  const email = data?.email || personal?.email || fallbackEmail;
  const phone = data?.phone || personal?.phone || '0987 654 321';
  const address = data?.address || personal?.address || 'Hà Nội, Việt Nam';
  const website =
    data?.website ||
    data?.github ||
    personal?.website ||
    personal?.github ||
    'github.com/smartcv-portfolio';
  const websiteLinks = String(website)
    .split(/[•|,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const summary = data?.summary || personal?.summary || '';

  const skills: string[] = Array.isArray(data?.skills)
    ? data.skills.filter(Boolean)
    : typeof data?.skills === 'string'
    ? data.skills
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const languages: string[] = Array.isArray(data?.languages)
    ? data.languages.filter(Boolean)
    : typeof data?.languages === 'string' && data.languages.trim()
    ? [data.languages]
    : [];

  const awards: string[] = Array.isArray(data?.awards)
    ? data.awards.filter(Boolean)
    : typeof data?.awards === 'string' && data.awards.trim()
    ? [data.awards]
    : [];

  const formatSectionText = (raw: any): string => {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) {
      return raw
        .map((item) => {
          if (typeof item === 'string') return `• ${item}`;
          const head = [item.position || item.degree, item.company || item.school]
            .filter(Boolean)
            .join(' tại ');
          const time = [item.startDate, item.endDate].filter(Boolean).join(' - ');
          const desc = item.description || item.field || '';
          return `• ${time ? `${time}: ` : ''}${head}${desc ? `\n  ${desc}` : ''}`;
        })
        .join('\n\n');
    }
    return JSON.stringify(raw, null, 2);
  };

  const experienceText = formatSectionText(data?.experience);
  const projectsText = formatSectionText(data?.projects);
  const educationText = formatSectionText(data?.education);

  /**
   * Xuất bản CV chuẩn A4 ra cửa sổ PDF / In ấn hỗ trợ tiếng Việt và đồng bộ tông màu đã chọn
   */
  const handlePrintOrDownloadPDF = () => {
    const printWin = window.open('', '_blank', 'width=900,height=1100');
    if (!printWin) {
      window.print();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>CV - ${fullName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            padding: 28px 36px;
            line-height: 1.55;
          }
          .header {
            display: flex;
            align-items: center;
            gap: 24px;
            background: ${theme.pdfHeaderGradient};
            color: #ffffff;
            padding: 24px;
            border-radius: 14px;
            margin-bottom: 20px;
          }
          .avatar {
            width: 96px;
            height: 96px;
            border-radius: 14px;
            object-fit: cover;
            border: 3px solid #ffffff;
          }
          .name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
          .pos { font-size: 14px; color: ${theme.pdfRoleHex}; font-weight: 600; margin-bottom: 10px; }
          .meta { font-size: 12px; color: #e2e8f0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
          .section { margin-bottom: 16px; }
          .sec-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            color: ${theme.pdfAccentHex};
            border-bottom: 2px solid ${theme.pdfSoftBorderHex};
            padding-bottom: 4px;
            margin-bottom: 8px;
            letter-spacing: 0.4px;
          }
          .content { font-size: 13px; white-space: pre-line; color: #334155; }
          .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
          .tag {
            background: ${theme.pdfSoftBgHex};
            color: ${theme.pdfAccentHex};
            border: 1px solid ${theme.pdfSoftBorderHex};
            padding: 3px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
          }
          @media print {
            body { padding: 0; }
            .header, .tag { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="avatar" src="${avatar}" alt="${fullName}" />
          <div style="flex:1">
            <div class="name">${fullName}</div>
            <div class="pos">${position}</div>
            <div class="meta">
              <div>Ngày sinh: ${dob} (${gender})</div>
              <div>Điện thoại: ${phone}</div>
              <div>Email: ${email}</div>
              <div>Địa chỉ: ${address}</div>
              ${website ? `<div style="grid-column: span 2">Liên kết: ${website}</div>` : ''}
            </div>
          </div>
        </div>

        ${
          summary
            ? `<div class="section"><div class="sec-title">Mục tiêu nghề nghiệp</div><div class="content">${summary}</div></div>`
            : ''
        }

        ${
          skills.length > 0
            ? `<div class="section"><div class="sec-title">Kỹ năng chuyên môn</div><div class="tags">${skills
                .map((s) => `<span class="tag">${s}</span>`)
                .join('')}</div></div>`
            : ''
        }

        ${
          experienceText
            ? `<div class="section"><div class="sec-title">Kinh nghiệm làm việc</div><div class="content">${experienceText}</div></div>`
            : ''
        }

        ${
          projectsText
            ? `<div class="section"><div class="sec-title">Dự án tiêu biểu</div><div class="content">${projectsText}</div></div>`
            : ''
        }

        ${
          educationText
            ? `<div class="section"><div class="sec-title">Học vấn</div><div class="content">${educationText}</div></div>`
            : ''
        }

        ${
          languages.length > 0
            ? `<div class="section"><div class="sec-title">Ngoại ngữ & Chứng chỉ</div><div class="content">${languages
                .map((l) => `• ${l}`)
                .join('\n')}</div></div>`
            : ''
        }

        ${
          awards.length > 0
            ? `<div class="section"><div class="sec-title">Giải thưởng & Thành tích</div><div class="content">${awards
                .map((a) => `• ${a}`)
                .join('\n')}</div></div>`
            : ''
        }

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Thanh công cụ sáng nhẹ nhàng: Tông màu CV + Chỉnh sửa + Xuất PDF */}
      {showExportToolbar && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200/90 text-slate-700 px-5 py-3.5 rounded-2xl shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800">
              <FileText size={17} className="text-primary-600 shrink-0" />
              <span>Hồ sơ CV trực tuyến (Mẫu {template})</span>
            </div>

            {allowThemePicker && (
              <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-3 sm:border-l border-slate-200">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Palette size={14} className="text-slate-400" /> Tông màu:
                </span>
                <div className="flex items-center gap-1.5">
                  {(Object.values(CV_THEMES) as ThemeConfig[]).map((item) => {
                    const active = selectedTheme === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectTheme(item.key)}
                        title={`Tông màu: ${item.label}`}
                        className={`relative w-6 h-6 rounded-full ${item.dotClass} flex items-center justify-center transition-all cursor-pointer ${
                          active
                            ? 'ring-2 ring-offset-2 ring-primary-500 scale-105'
                            : 'opacity-75 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit3 size={14} /> Chỉnh sửa CV
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintOrDownloadPDF}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer size={14} /> Xuất / Tải bản PDF (A4)
            </button>
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <Download size={14} /> File PDF gốc
              </a>
            )}
          </div>
        </div>
      )}

      {/* Tờ CV chuẩn A4 trực quan */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Header CV */}
        <div
          className={`${theme.headerBgClass} text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6 transition-colors`}
        >
          <div className="relative shrink-0">
            <img
              src={avatar}
              alt={fullName}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-2 border-white/90 shadow-md bg-slate-700"
            />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {fullName}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${theme.badgeBgClass}`}>
                Mẫu {template}
              </span>
            </div>
            <p className={`text-sm sm:text-base font-semibold ${theme.roleTextClass} mb-4`}>
              {position}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-100/90">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Calendar size={14} className={`${theme.metaIconClass} shrink-0`} />
                <span>
                  Ngày sinh: <strong className="text-white font-semibold">{dob}</strong> ({gender})
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Phone size={14} className={`${theme.metaIconClass} shrink-0`} />
                <span>
                  SĐT: <strong className="text-white font-semibold">{phone}</strong>
                </span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Mail size={14} className={`${theme.metaIconClass} shrink-0`} />
                <span className="truncate">{email}</span>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <MapPin size={14} className={`${theme.metaIconClass} shrink-0`} />
                <span className="truncate">{address}</span>
              </div>
              {websiteLinks.length > 0 && (
                <div className="sm:col-span-2 flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                  <Globe size={14} className={`${theme.metaIconClass} shrink-0`} />
                  {websiteLinks.map((rawUrl, i) => {
                    const href = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white font-medium transition-colors"
                        title={`Mở liên kết ${rawUrl}`}
                      >
                        <span>{rawUrl}</span>
                        <ExternalLink size={11} />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nội dung 2 cột chuẩn CV */}
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200/80">
          {/* CỘT TRÁI (5/12): Kỹ năng, Ngoại ngữ, Giải thưởng & Học vấn */}
          <div className="lg:col-span-5 p-6 bg-slate-50/60 space-y-6">
            {skills.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                  <Sparkles size={14} className="text-primary-600" /> Kỹ năng chuyên môn
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((sk, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 font-semibold text-xs rounded-lg border shadow-sm ${theme.skillChipClass}`}
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                <Globe size={14} className="text-teal-600" /> Ngoại ngữ & Chứng chỉ
              </h4>
              {languages.length > 0 ? (
                <div className="space-y-2">
                  {languages.map((lang, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/90 text-slate-700 font-medium text-xs flex items-start gap-2"
                    >
                      <span className="text-teal-600 font-bold">•</span>
                      <span>{lang}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Tiếng Anh giao tiếp cơ bản (Chưa cập nhật chứng chỉ)
                </p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                <Award size={14} className="text-amber-600" /> Giải thưởng & Thành tích
              </h4>
              {awards.length > 0 ? (
                <div className="space-y-2">
                  {awards.map((aw, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-slate-800 font-medium text-xs flex items-start gap-2"
                    >
                      <Award size={13} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>{aw}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa cập nhật giải thưởng chuyên môn</p>
              )}
            </div>

            {educationText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                  <GraduationCap size={14} className="text-sky-600" /> Học vấn
                </h4>
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed">
                  {educationText}
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI (7/12): Mục tiêu, Kinh nghiệm & Dự án */}
          <div className="lg:col-span-7 p-6 space-y-6 bg-white">
            {summary && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                  <User size={14} className="text-primary-600" /> Mục tiêu nghề nghiệp
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  {summary}
                </p>
              </div>
            )}

            {experienceText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                  <Briefcase size={14} className="text-primary-600" /> Kinh nghiệm làm việc
                </h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100 whitespace-pre-line">
                  {experienceText}
                </div>
              </div>
            )}

            {projectsText && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 pb-2 mb-3 border-b border-slate-200">
                  <FolderGit2 size={14} className="text-sky-600" /> Dự án tiêu biểu
                </h4>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-sky-50/40 p-4 rounded-2xl border border-sky-100 whitespace-pre-line">
                  {projectsText}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVFullSheetView;
