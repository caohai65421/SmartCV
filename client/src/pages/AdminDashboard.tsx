import { useState, useEffect } from 'react';
import {
  LayoutGrid,
  GraduationCap,
  ListChecks,
  Users,
  Search,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Building2,
  FileText,
  Fan,
  X,
  Trophy,
  TrendingUp,
  Briefcase,
  Award,
  Download,
  Headphones,
  Send,
  Mail,
  Bot,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import CVFullSheetView from '../components/CVFullSheetView';

type AdminMenuId =
  | 'stats'
  | 'recruiters'
  | 'candidates'
  | 'jobs'
  | 'users'
  | 'support';

interface HotPositionItem {
  rank: number;
  title: string;
  category: string;
  jobCount: number;
  cvCount: number;
  avgSalary: string;
}

interface TopRecruiterMonthItem {
  rank: number;
  companyName: string;
  recruiterName: string;
  focusRole: string;
  jobsPosted: number;
  cvsReceived: number;
  acceptRate: string;
}

const extractYearsExpLabel = (cvData: any): string => {
  if (!cvData) return 'Chưa cập nhật KN';
  if (cvData.yearsOfExperience !== undefined && cvData.yearsOfExperience !== '') {
    return `${cvData.yearsOfExperience} năm kinh nghiệm`;
  }
  const text = `${cvData.summary || ''} ${cvData.experience || ''}`;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*\+?\s*năm/i);
  if (match) {
    return `${match[1]} năm kinh nghiệm`;
  }
  if (/thực tập|fresher|sinh viên|mới tốt nghiệp/i.test(text)) {
    return 'Fresher / Thực tập sinh';
  }
  return '1 - 2 năm kinh nghiệm';
};

const buildNiceAxisSteps = (rawMax: number, minTop = 8): { top: number; steps: number[] } => {
  const target = Math.max(minTop, rawMax);
  const stepSize = target <= 8 ? 2 : target <= 20 ? 5 : Math.ceil(target / 4 / 5) * 5;
  const top = Math.ceil(target / stepSize) * stepSize;
  const count = Math.round(top / stepSize);
  const steps: number[] = [];
  for (let i = count; i >= 0; i--) {
    steps.push(i * stepSize);
  }
  return { top, steps };
};

const AdminDashboard = () => {
  const [activeMenu, setActiveMenu] = useState<AdminMenuId>('stats');
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalJobs: 0,
    totalCVs: 0,
    totalApplications: 0,
    applications: [],
  });
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<
    'OPEN' | 'AI' | 'ADMIN_RESOLVED' | 'ALL'
  >('OPEN');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendEmailOnReply, setSendEmailOnReply] = useState<boolean>(true);
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [appliedYear, setAppliedYear] = useState<string>('2026');
  // 0 = Toàn bộ năm (tổng khớp 100% với 6 ô thống kê), 1..12 = Xem riêng từng tháng
  const [pendingMonth, setPendingMonth] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [previewCV, setPreviewCV] = useState<any | null>(null);

  const handleSelectMonthBar = (m: number) => {
    const nextMonth = selectedMonth === m ? 0 : m;
    setSelectedMonth(nextMonth);
    setPendingMonth(nextMonth);
  };

  const fetchAllAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, jobsRes, cvsRes, ticketsRes] = await Promise.allSettled([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/jobs'),
        api.get('/admin/cvs'),
        api.get('/admin/support-tickets'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data?.stats) {
        setStats(statsRes.value.data.stats);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.users) {
        setUsers(usersRes.value.data.users);
      }
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.jobs) {
        setJobs(jobsRes.value.data.jobs);
      }
      if (cvsRes.status === 'fulfilled' && cvsRes.value.data?.cvs) {
        setCvs(cvsRes.value.data.cvs);
      }
      if (ticketsRes.status === 'fulfilled' && ticketsRes.value.data?.tickets) {
        setSupportTickets(ticketsRes.value.data.tickets);
      }
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu quản trị:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, []);

  // Khi Admin bấm nút "Quản trị hệ thống" trên thanh điều hướng -> trở về Thống Kê Tổng Quan
  // Hoặc khi bấm thông báo phiếu CSKH mới từ Chuông thông báo -> mở tab QL Hỗ Trợ CSKH
  useEffect(() => {
    const handleResetToStats = () => {
      setActiveMenu('stats');
      setSearchTerm('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleOpenAdminMenu = (e: any) => {
      const targetMenu = e.detail as AdminMenuId;
      if (targetMenu) {
        setActiveMenu(targetMenu);
        setSearchTerm('');
        fetchAllAdminData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('smartcv:admin_go_stats', handleResetToStats);
    window.addEventListener('smartcv:admin_open_menu', handleOpenAdminMenu);
    return () => {
      window.removeEventListener('smartcv:admin_go_stats', handleResetToStats);
      window.removeEventListener('smartcv:admin_open_menu', handleOpenAdminMenu);
    };
  }, []);

  const refreshStatsOnly = async () => {
    try {
      const res = await api.get('/admin/stats');
      if (res.data?.stats) setStats(res.data.stats);
    } catch {
      // ignore
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Xác nhận xoá người dùng này?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setCvs((prev) => prev.filter((c) => c.userId !== id));
      setJobs((prev) => prev.filter((j) => j.postedBy !== id));
      await refreshStatsOnly();
    } catch {
      alert('Không thể xoá người dùng này.');
    }
  };

  const handleChangeUserRole = async (id: string, roleName: string) => {
    try {
      const res = await api.patch(`/admin/users/${id}/role`, { roleName });
      if (res.data?.user) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: res.data.user.role } : u)));
      }
      await refreshStatsOnly();
    } catch {
      alert('Lỗi khi cập nhật phân quyền.');
    }
  };

  const handleUpdateJobStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      await api.patch(`/admin/jobs/${id}/status`, { status: newStatus });
      setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)));
    } catch {
      alert('Lỗi khi cập nhật trạng thái tin.');
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!window.confirm('Xác nhận xoá tin tuyển dụng này?')) return;
    try {
      await api.delete(`/admin/jobs/${id}`);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      await refreshStatsOnly();
    } catch {
      alert('Lỗi khi xoá tin tuyển dụng.');
    }
  };

  const handleDeleteCV = async (id: string) => {
    if (!window.confirm('Xác nhận xoá hồ sơ CV này?')) return;
    try {
      await api.delete(`/admin/cvs/${id}`);
      setCvs((prev) => prev.filter((c) => c.id !== id));
      await refreshStatsOnly();
    } catch {
      alert('Lỗi khi xoá CV.');
    }
  };

  const candidateUsers = users.filter((u) => u.role?.name === 'CANDIDATE');
  const recruiterUsers = users.filter((u) => u.role?.name === 'RECRUITER');
  const allApplications: any[] = Array.isArray(stats?.applications) ? stats.applications : [];

  const recruiterRows = recruiterUsers.map((rec) => {
    const recJobs = jobs.filter(
      (j) => j.postedBy === rec.id || j.author?.email === rec.email || j.authorId === rec.id
    );
    const recJobIds = new Set(recJobs.map((j) => j.id));
    const recApps = allApplications.filter((a) => recJobIds.has(a.jobId));
    const openJobsCount = recJobs.filter((j) => j.status === 'OPEN').length;
    const totalApps =
      recApps.length > 0
        ? recApps.length
        : recJobs.reduce((sum, j) => sum + (j._count?.applications || 0), 0);
    const acceptedApps = recApps.filter((a) => a.status === 'ACCEPTED').length;
    const companyName =
      rec.company?.name ||
      recJobs.find((j) => j.company?.name)?.company?.name ||
      'Doanh nghiệp tuyển dụng';
    const location =
      rec.company?.location ||
      recJobs.find((j) => j.location)?.location ||
      'Việt Nam';
    const mainPositions =
      recJobs
        .slice(0, 2)
        .map((j) => j.title)
        .join(', ') || 'Chưa đăng tin';

    return {
      id: rec.id,
      fullName: rec.fullName,
      email: rec.email,
      companyName,
      location,
      totalJobs: recJobs.length,
      openJobsCount,
      totalApps,
      acceptedApps,
      mainPositions,
      createdAt: rec.createdAt,
    };
  });

  const candidateRows = candidateUsers.map((cand) => {
    const userCV = cvs.find(
      (c) => c.userId === cand.id || c.user?.email === cand.email
    );
    const cvData = userCV?.data || {};
    const skills: string[] = Array.isArray(cvData.skills) ? cvData.skills : [];
    const languages: string[] = Array.isArray(cvData.languages)
      ? cvData.languages
      : [];
    const yearsExp = extractYearsExpLabel(cvData);

    return {
      id: cand.id,
      fullName: cand.fullName,
      email: cand.email,
      cv: userCV || null,
      cvTitle: userCV?.title || 'Chưa tạo CV',
      template: userCV?.template || 'Modern',
      yearsExp,
      skills,
      languages,
      createdAt: cand.createdAt,
    };
  });

  const formatTwoDigits = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  const sidebarItems: {
    id: AdminMenuId;
    label: string;
    icon: any;
    badge?: number;
  }[] = [
    { id: 'stats', label: 'Thống Kê Tổng Quan', icon: LayoutGrid },
    {
      id: 'recruiters',
      label: 'QL Nhà Tuyển Dụng',
      icon: Building2,
      badge: recruiterRows.length,
    },
    {
      id: 'candidates',
      label: 'QL Ứng Viên & Hồ Sơ CV',
      icon: GraduationCap,
      badge: cvs.length,
    },
    {
      id: 'jobs',
      label: 'QL Tin Tuyển Dụng',
      icon: ListChecks,
      badge: jobs.length,
    },
    {
      id: 'users',
      label: 'QL Tài Khoản Người Dùng',
      icon: Users,
      badge: users.length,
    },
    {
      id: 'support',
      label: 'QL Hỗ Trợ CSKH',
      icon: Headphones,
      badge: supportTickets.filter((t) => t.status === 'OPEN').length,
    },
  ];

  const handleReplyTicket = async (ticket: any) => {
    const draft = (replyDrafts[ticket.id] ?? ticket.adminReply ?? '').trim();
    if (!draft) {
      alert('Vui lòng nhập nội dung phản hồi CSKH trước khi gửi.');
      return;
    }
    setReplyingTicketId(ticket.id);
    try {
      const res = await api.patch(`/admin/support-tickets/${ticket.id}`, {
        adminReply: draft,
        status: 'RESOLVED',
        sendEmailNotification: sendEmailOnReply,
      });
      if (res.data?.ticket) {
        setSupportTickets((prev) =>
          prev.map((t) => (t.id === ticket.id ? res.data.ticket : t))
        );
      }
      alert(res.data?.message || 'Đã gửi phản hồi CSKH thành công.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi gửi phản hồi CSKH.');
    } finally {
      setReplyingTicketId(null);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Xác nhận xoá phiếu hỗ trợ CSKH này?')) return;
    try {
      await api.delete(`/admin/support-tickets/${id}`);
      setSupportTickets((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert('Không thể xoá phiếu hỗ trợ CSKH.');
    }
  };

  // =========================================================================
  // TÍNH TOÁN BIỂU ĐỒ 12 THÁNG & XẾP HẠNG TRỰC TIẾP TỪ DỮ LIỆU THẬT POSTGRESQL
  // Đảm bảo tổng số cột trên biểu đồ khớp 100% với 6 ô KPI và các bảng quản lý
  // =========================================================================
  const yearNum = Number(appliedYear) || 2026;

  const monthlyApplications = Array.from({ length: 12 }, (_, mIdx) =>
    allApplications.filter((a) => {
      const d = new Date(a.appliedDate);
      return d.getFullYear() === yearNum && d.getMonth() === mIdx;
    }).length
  );

  const monthlyJobs = Array.from({ length: 12 }, (_, mIdx) =>
    jobs.filter((j) => {
      const d = new Date(j.createdAt);
      return d.getFullYear() === yearNum && d.getMonth() === mIdx;
    }).length
  );

  const monthlyRecruiters = Array.from({ length: 12 }, (_, mIdx) =>
    recruiterUsers.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === yearNum && d.getMonth() === mIdx;
    }).length
  );

  const monthlyCandidates = Array.from({ length: 12 }, (_, mIdx) =>
    candidateUsers.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getFullYear() === yearNum && d.getMonth() === mIdx;
    }).length
  );

  const yearAppsTotal = monthlyApplications.reduce((s, v) => s + v, 0);
  const yearJobsTotal = monthlyJobs.reduce((s, v) => s + v, 0);
  const yearRecTotal = monthlyRecruiters.reduce((s, v) => s + v, 0);
  const yearCandTotal = monthlyCandidates.reduce((s, v) => s + v, 0);

  const appAxis = buildNiceAxisSteps(Math.max(...monthlyApplications, 1), 8);
  const maxAppsCount = appAxis.top;
  const appYAxisSteps = appAxis.steps;

  const jobAxis = buildNiceAxisSteps(Math.max(...monthlyJobs, 1), 6);
  const maxJobCount = jobAxis.top;
  const jobYAxisSteps = jobAxis.steps;

  const peopleAxis = buildNiceAxisSteps(
    Math.max(...monthlyCandidates, ...monthlyRecruiters, 1),
    6
  );
  const maxPeopleCount = peopleAxis.top;
  const peopleYAxisSteps = peopleAxis.steps;

  const periodLabel =
    selectedMonth === 0
      ? `Cả năm ${appliedYear}`
      : `Tháng ${formatTwoDigits(selectedMonth)} / ${appliedYear}`;

  // Xếp hạng Vị trí & Nhà tuyển dụng tính trực tiếp từ dữ liệu thật trong kỳ đang chọn
  const monthDrilldown = (() => {
    const inPeriod = (dateRaw: any) => {
      const d = new Date(dateRaw);
      if (d.getFullYear() !== yearNum) return false;
      return selectedMonth === 0 ? true : d.getMonth() + 1 === selectedMonth;
    };

    const periodApps = allApplications.filter((a) => inPeriod(a.appliedDate));
    const periodJobs = jobs.filter((j) => inPeriod(j.createdAt));

    // Nếu người dùng bấm vào một tháng chưa phát sinh dữ liệu, hiển thị đúng số 0 của tháng đó
    const rankedJobs: HotPositionItem[] = jobs
      .map((j) => {
        const cvCount =
          selectedMonth === 0
            ? allApplications.filter((a) => a.jobId === j.id).length ||
              j._count?.applications ||
              0
            : periodApps.filter((a) => a.jobId === j.id).length;
        const jobInPeriod = selectedMonth === 0 ? 1 : inPeriod(j.createdAt) ? 1 : 0;
        return {
          title: j.title,
          category: `${j.company?.name || 'Doanh nghiệp'} • ${j.location || 'Việt Nam'}`,
          jobCount: jobInPeriod,
          cvCount,
          avgSalary: j.salary || 'Thỏa thuận',
        };
      })
      .filter((item) => (selectedMonth === 0 ? true : item.cvCount > 0 || item.jobCount > 0))
      .sort((a, b) => b.cvCount - a.cvCount || b.jobCount - a.jobCount)
      .slice(0, 4)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));

    const rankedRecruiters: TopRecruiterMonthItem[] = recruiterRows
      .map((rec) => {
        const recJobsAll = jobs.filter(
          (j) => j.postedBy === rec.id || j.author?.email === rec.email
        );
        const recJobIds = new Set(recJobsAll.map((j) => j.id));
        const jobsInScope =
          selectedMonth === 0
            ? recJobsAll.length
            : recJobsAll.filter((j) => inPeriod(j.createdAt)).length;
        const appsInScope =
          selectedMonth === 0
            ? allApplications.filter((a) => recJobIds.has(a.jobId))
            : periodApps.filter((a) => recJobIds.has(a.jobId));
        const acceptedInScope = appsInScope.filter((a) => a.status === 'ACCEPTED').length;
        const ratePct =
          appsInScope.length > 0
            ? `${Math.round((acceptedInScope / appsInScope.length) * 100)}%`
            : '0%';

        return {
          companyName: rec.companyName,
          recruiterName: rec.fullName,
          focusRole: rec.mainPositions,
          jobsPosted: jobsInScope,
          cvsReceived: appsInScope.length,
          acceptRate: ratePct,
        };
      })
      .filter((r) => (selectedMonth === 0 ? true : r.jobsPosted > 0 || r.cvsReceived > 0))
      .sort((a, b) => b.cvsReceived - a.cvsReceived || b.jobsPosted - a.jobsPosted)
      .map((r, idx) => ({
        ...r,
        rank: idx + 1,
      }));

    const summaryJobsCount = selectedMonth === 0 ? jobs.length : periodJobs.length;
    const summaryAppsCount =
      selectedMonth === 0
        ? allApplications.length || stats.totalApplications || 0
        : periodApps.length;

    const topJobTitle = rankedJobs[0]?.title;
    return {
      hotPositions: rankedJobs,
      topRecruiters: rankedRecruiters,
      highlightSummary: topJobTitle
        ? `${periodLabel}: ${summaryJobsCount} tin tuyển dụng • ${summaryAppsCount} lượt nộp CV. Vị trí thu hút nhất: "${topJobTitle}".`
        : `${periodLabel}: Chưa phát sinh tin tuyển dụng hoặc hồ sơ ứng tuyển mới trong tháng này.`,
    };
  })();

  // Xuất báo cáo thống kê tổng quan & theo tháng ra tệp CSV tương thích Microsoft Excel (UTF-8 BOM)
  const handleExportAdminReportCSV = () => {
    const escapeCell = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const summaryRows = [
      ['BÁO CÁO THỐNG KÊ HỆ THỐNG TUYỂN DỤNG SMARTCV'],
      [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`, `Kỳ đang xem: ${periodLabel}`],
      [],
      ['1. CHỈ SỐ TỔNG QUAN TOÀN HỆ THỐNG', 'SỐ LƯỢNG'],
      ['Tổng tài khoản người dùng', users.length || stats.totalUsers || 0],
      ['Tài khoản Ứng viên', candidateRows.length],
      ['Nhà tuyển dụng / Doanh nghiệp', recruiterRows.length],
      ['Tin tuyển dụng đã đăng', jobs.length || stats.totalJobs || 0],
      ['Hồ sơ CV chuẩn A4 đã khởi tạo', cvs.length || stats.totalCVs || 0],
      ['Tổng lượt nộp hồ sơ ứng tuyển', allApplications.length || stats.totalApplications || 0],
      ['Phiếu yêu cầu hỗ trợ CSKH', supportTickets.length],
      [],
      [`2. THỐNG KÊ HOẠT ĐỘNG 12 THÁNG NĂM ${appliedYear}`],
      ['Tháng', 'Tin tuyển dụng mở mới', 'Lượt nộp hồ sơ CV', 'Nhà tuyển dụng mới', 'Ứng viên mới'],
      ...Array.from({ length: 12 }, (_, idx) => [
        `Tháng ${formatTwoDigits(idx + 1)}/${appliedYear}`,
        monthlyJobs[idx] || 0,
        monthlyApplications[idx] || 0,
        monthlyRecruiters[idx] || 0,
        monthlyCandidates[idx] || 0,
      ]),
      [],
      [`3. TOP VỊ TRÍ TUYỂN DỤNG NỔI BẬT (${periodLabel})`],
      ['Hạng', 'Vị trí tuyển dụng', 'Doanh nghiệp & Khu vực', 'Số tin mở', 'Số CV ứng tuyển', 'Mức lương'],
      ...monthDrilldown.hotPositions.map((p) => [
        p.rank,
        p.title,
        p.category,
        p.jobCount,
        p.cvCount,
        p.avgSalary,
      ]),
    ];

    const csvString =
      '\uFEFF' + summaryRows.map((row) => row.map(escapeCell).join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-thong-ke-smartcv-${appliedYear}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#f8f9fc] to-indigo-50/40 pt-16 sm:pt-20 flex flex-col lg:flex-row">
      {/* =========================================================================
          SIDEBAR BÊN TRÁI (TỰ ĐỘNG CHUYỂN THÀNH THANH CUỘN NGANG TRÊN MOBILE)
          ========================================================================= */}
      <aside className="w-full lg:w-64 bg-white/95 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-indigo-100 shrink-0 lg:min-h-[calc(100vh-5rem)] flex flex-col select-none shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setActiveMenu('stats');
            setSearchTerm('');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="hidden lg:block w-full px-6 py-5 border-b border-indigo-50 text-center bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-teal-50/70 hover:from-indigo-100/70 hover:to-teal-100/70 transition-colors cursor-pointer"
        >
          <div className="inline-flex items-center justify-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center shadow-md shadow-blue-500/25">
              CV
            </div>
            <span className="text-xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
              SmartCV
            </span>
          </div>
          <p className="text-xs font-extrabold text-indigo-500 mt-1">
            Trang Quản Trị Hệ Thống
          </p>
        </button>

        <nav className="p-2.5 lg:p-3 flex lg:flex-col gap-1.5 overflow-x-auto no-scrollbar lg:flex-1">
          {sidebarItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            const iconColorClasses = [
              'text-indigo-600 bg-indigo-50',
              'text-blue-600 bg-blue-50',
              'text-rose-600 bg-rose-50',
              'text-teal-600 bg-teal-50',
              'text-purple-600 bg-purple-50',
              'text-amber-600 bg-amber-50',
            ];
            const iconColor = iconColorClasses[idx % iconColorClasses.length];

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveMenu(item.id);
                  setSearchTerm('');
                }}
                className={`shrink-0 lg:w-full flex items-center justify-between gap-2 px-3.5 py-2.5 lg:py-3 rounded-xl text-xs sm:text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white shadow-md shadow-indigo-500/25'
                    : 'text-slate-700 hover:bg-indigo-50/60'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white/20 text-white' : iconColor
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* =========================================================================
          KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI
          ========================================================================= */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={42} />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Đang tải dữ liệu hệ thống quản trị...
            </p>
          </div>
        ) : (
          <>
            {/* =================================================================
                1. TRANG THỐNG KÊ TỔNG QUAN
                ================================================================= */}
            {activeMenu === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Thanh tiêu đề tông màu nhẹ nhàng, dịu mắt (Đã xóa dòng phụ theo yêu cầu) */}
                <div className="rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/80 to-amber-50/70 border border-teal-200/70 p-4 sm:p-5 text-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-700 flex items-center justify-center border border-teal-200">
                      <Fan size={22} />
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-teal-950 tracking-tight">
                      Thống Kê Tổng Quan Hệ Thống
                    </h1>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="px-3.5 py-1.5 rounded-xl bg-white/90 text-teal-800 text-xs font-black border border-teal-200 shadow-2xs">
                      Kỳ đang xem: {periodLabel}
                    </div>
                    <button
                      type="button"
                      onClick={handleExportAdminReportCSV}
                      className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Xuất báo cáo Excel (CSV)</span>
                    </button>
                  </div>
                </div>

                {/* Lưới 2 Cột cân đối */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* CỘT TRÁI (5/12): 6 Ô MÀU KPI GRADIENT + BIỂU ĐỒ THỐNG KÊ NHÀ TUYỂN DỤNG & ỨNG VIÊN */}
                  <div className="xl:col-span-5 space-y-5">
                    {/* 6 Ô KPI MÀU SẮC CHUYỂN SẮC NỔI BẬT */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Ô 1: Tin tuyển dụng */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('jobs')}
                        className="bg-gradient-to-br from-teal-500 to-emerald-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-teal-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(jobs.length || stats.totalJobs || 0)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Tin tuyển dụng đang đăng
                        </span>
                      </button>

                      {/* Ô 2: Nhà tuyển dụng */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('recruiters')}
                        className="bg-gradient-to-br from-blue-500 to-indigo-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-blue-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(recruiterRows.length)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Nhà tuyển dụng / Công ty
                        </span>
                      </button>

                      {/* Ô 3: Ứng viên */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('candidates')}
                        className="bg-gradient-to-br from-rose-500 to-pink-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-rose-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(candidateRows.length)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Tài khoản Ứng viên
                        </span>
                      </button>

                      {/* Ô 4: Hồ sơ CV */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('candidates')}
                        className="bg-gradient-to-br from-violet-500 to-purple-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-purple-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(cvs.length || stats.totalCVs || 0)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Hồ sơ CV chuẩn A4 đã tạo
                        </span>
                      </button>

                      {/* Ô 5: Lượt nộp CV */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('jobs')}
                        className="bg-gradient-to-br from-amber-500 to-orange-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-amber-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(allApplications.length || stats.totalApplications || 0)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Lượt nộp CV & Đánh giá AI
                        </span>
                      </button>

                      {/* Ô 6: Tổng tài khoản hệ thống */}
                      <button
                        type="button"
                        onClick={() => setActiveMenu('users')}
                        className="bg-gradient-to-br from-lime-500 to-emerald-600 hover:brightness-105 text-white p-5 rounded-xl shadow-md shadow-emerald-500/20 text-left transition-all transform hover:-translate-y-0.5 min-h-[115px] flex flex-col justify-center cursor-pointer"
                      >
                        <span className="text-3xl font-black tracking-tight">
                          {formatTwoDigits(users.length || stats.totalUsers || 0)}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-white/95 mt-1.5">
                          Tổng tài khoản người dùng
                        </span>
                      </button>
                    </div>

                    {/* BIỂU ĐỒ THỐNG KÊ NHÀ TUYỂN DỤNG & ỨNG VIÊN HÀNG THÁNG */}
                    <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm border-t-4 border-t-indigo-500 space-y-6">
                      <div>
                        <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide mb-2">
                          BIỂU ĐỒ THỐNG KÊ NHÀ TUYỂN DỤNG & ỨNG VIÊN HÀNG THÁNG
                        </h3>

                        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-3 rounded-xs bg-gradient-to-r from-blue-500 to-indigo-600 inline-block" />
                            <span>Nhà tuyển dụng ({yearRecTotal})</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-3 rounded-xs bg-gradient-to-r from-rose-500 to-pink-500 inline-block" />
                            <span>Ứng viên ({yearCandTotal})</span>
                          </div>
                        </div>

                        <div className="relative pl-10 pr-1 pt-4 pb-7">
                          <div className="h-44 flex flex-col justify-between relative border-l border-b border-slate-200">
                            {peopleYAxisSteps.map((stepVal) => (
                              <div
                                key={stepVal}
                                className="w-full border-t border-slate-100 relative flex items-center"
                              >
                                <span className="absolute -left-10 text-[10px] text-slate-500 w-8 text-right">
                                  {stepVal}
                                </span>
                              </div>
                            ))}

                            {/* 12 Tháng: Mỗi tháng gồm 2 cột (Nhà tuyển dụng + Ứng viên) */}
                            <div className="absolute inset-0 grid grid-cols-12 items-end px-1.5 gap-1.5">
                              {monthlyCandidates.map((candVal, idx) => {
                                const monthNum = idx + 1;
                                const recVal = monthlyRecruiters[idx] || 0;
                                const isSelected = selectedMonth === monthNum;
                                const recHeightPct =
                                  recVal > 0
                                    ? Math.max(8, Math.round((recVal / maxPeopleCount) * 100))
                                    : 0;
                                const candHeightPct =
                                  candVal > 0
                                    ? Math.max(8, Math.round((candVal / maxPeopleCount) * 100))
                                    : 0;

                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectMonthBar(monthNum)}
                                    className="h-full flex flex-col justify-end items-center group relative focus:outline-none cursor-pointer"
                                  >
                                    <div
                                      className={`transition-opacity absolute -top-7 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none ${
                                        isSelected
                                          ? 'opacity-100 bg-indigo-600 text-white shadow'
                                          : 'opacity-0 group-hover:opacity-100 bg-slate-900 text-white'
                                      }`}
                                    >
                                      {recVal} NTD • {candVal} UV
                                    </div>
                                    <div className="w-full h-full flex items-end justify-center gap-0.5">
                                      {/* Cột Nhà tuyển dụng */}
                                      <div
                                        style={{ height: `${recHeightPct}%` }}
                                        className={`w-1/2 transition-all duration-300 rounded-t-xs ${
                                          isSelected
                                            ? 'bg-indigo-600 ring-1 ring-indigo-400'
                                            : 'bg-blue-500 hover:brightness-110'
                                        }`}
                                      />
                                      {/* Cột Ứng viên */}
                                      <div
                                        style={{ height: `${candHeightPct}%` }}
                                        className={`w-1/2 transition-all duration-300 rounded-t-xs ${
                                          isSelected
                                            ? 'bg-rose-600 ring-1 ring-rose-400'
                                            : 'bg-rose-400 hover:brightness-110'
                                        }`}
                                      />
                                    </div>
                                    <span
                                      className={`absolute -bottom-5 text-[9px] whitespace-nowrap ${
                                        isSelected
                                          ? 'font-black text-indigo-600'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      T{monthNum}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI (7/12): BỘ LỌC NĂM + THÁNG BÊN CẠNH + 2 BIỂU ĐỒ CỘT TƯƠNG TÁC */}
                  <div className="xl:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 border-t-4 border-t-blue-500 space-y-6">
                    {/* Thanh chọn Năm + Chọn Tháng bên cạnh + Nút XÁC NHẬN */}
                    <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-teal-50/60 p-3.5 rounded-xl border border-blue-100">
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-36 px-3.5 py-2 bg-white border border-blue-200 rounded-lg text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs"
                      >
                        <option value="2026">Năm 2026</option>
                        <option value="2025">Năm 2025</option>
                        <option value="2024">Năm 2024</option>
                      </select>

                      {/* Ô chọn Tháng (Mặc định Cả năm để khớp tổng thể hệ thống) */}
                      <select
                        value={pendingMonth}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          setPendingMonth(m);
                          setSelectedMonth(m);
                        }}
                        className="w-44 px-3.5 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-bold text-indigo-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
                      >
                        <option value={0}>Cả năm (Tổng 12 tháng)</option>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            Tháng {formatTwoDigits(m)}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setAppliedYear(selectedYear);
                          setSelectedMonth(pendingMonth);
                        }}
                        className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase rounded-lg shadow-sm shadow-blue-500/20 transition-all"
                      >
                        XÁC NHẬN
                      </button>
                    </div>

                    {/* BIỂU ĐỒ 1: BIỂU ĐỒ SỐ LƯỢNG HỒ SƠ ỨNG TUYỂN HÀNG THÁNG */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-indigo-950 uppercase tracking-wide mb-2">
                        BIỂU ĐỒ LƯỢT NỘP CV & SÀNG LỌC AI HÀNG THÁNG
                      </h3>

                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-600 mb-3">
                        <span className="w-7 h-3 rounded-xs bg-gradient-to-r from-sky-400 to-blue-500 border border-blue-500 inline-block" />
                        <span>
                          Số hồ sơ CV ứng tuyển theo tháng — Tổng năm {appliedYear}:{' '}
                          <strong className="text-indigo-700">{yearAppsTotal} hồ sơ</strong>
                        </span>
                      </div>

                      <div className="relative pl-14 pr-2 pt-3 pb-7">
                        <div className="h-44 flex flex-col justify-between relative border-l border-b border-slate-200">
                          {appYAxisSteps.map((stepVal) => (
                            <div
                              key={stepVal}
                              className="w-full border-t border-slate-100 relative flex items-center"
                            >
                              <span className="absolute -left-14 text-[11px] text-slate-500 w-12 text-right">
                                {stepVal} CV
                              </span>
                            </div>
                          ))}

                          <div className="absolute inset-0 grid grid-cols-12 items-end px-2 gap-2">
                            {monthlyApplications.map((val, idx) => {
                              const monthNum = idx + 1;
                              const isSelected = selectedMonth === monthNum;
                              const heightPct =
                                val > 0 ? Math.max(8, Math.round((val / maxAppsCount) * 100)) : 0;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectMonthBar(monthNum)}
                                  className="h-full flex flex-col justify-end items-center group relative focus:outline-none cursor-pointer"
                                >
                                  <div
                                    className={`transition-opacity absolute -top-6 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none ${
                                      isSelected
                                        ? 'opacity-100 bg-indigo-600 text-white shadow'
                                        : 'opacity-0 group-hover:opacity-100 bg-slate-900 text-white'
                                    }`}
                                  >
                                    {val} hồ sơ
                                  </div>
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full transition-all duration-300 rounded-t-md ${
                                      isSelected
                                        ? 'bg-gradient-to-t from-blue-600 to-indigo-500 border-2 border-indigo-700 ring-2 ring-indigo-300/70'
                                        : 'bg-gradient-to-t from-sky-300 to-blue-400 hover:from-sky-400 hover:to-blue-500 border border-blue-400'
                                    }`}
                                  />
                                  <span
                                    className={`absolute -bottom-5 text-[10px] whitespace-nowrap ${
                                      isSelected
                                        ? 'font-black text-indigo-700'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Tháng {monthNum}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BIỂU ĐỒ 2: BIỂU ĐỒ SỐ TIN TUYỂN DỤNG HÀNG THÁNG */}
                    <div className="pt-3 border-t border-slate-100">
                      <h3 className="text-sm sm:text-base font-black text-teal-950 uppercase tracking-wide mb-2">
                        BIỂU ĐỒ THỐNG KÊ SỐ TIN TUYỂN DỤNG HÀNG THÁNG
                      </h3>

                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-600 mb-3">
                        <span className="w-7 h-3 rounded-xs bg-gradient-to-r from-teal-400 to-emerald-500 border border-teal-500 inline-block" />
                        <span>
                          Số tin tuyển dụng mở mới theo tháng — Tổng năm {appliedYear}:{' '}
                          <strong className="text-teal-700">{yearJobsTotal} tin đăng</strong>
                        </span>
                      </div>

                      <div className="relative pl-14 pr-2 pt-3 pb-7">
                        <div className="h-44 flex flex-col justify-between relative border-l border-b border-slate-200">
                          {jobYAxisSteps.map((stepVal) => (
                            <div
                              key={stepVal}
                              className="w-full border-t border-slate-100 relative flex items-center"
                            >
                              <span className="absolute -left-14 text-[11px] text-slate-500 w-12 text-right">
                                {stepVal} tin
                              </span>
                            </div>
                          ))}

                          <div className="absolute inset-0 grid grid-cols-12 items-end px-2 gap-2">
                            {monthlyJobs.map((val, idx) => {
                              const monthNum = idx + 1;
                              const isSelected = selectedMonth === monthNum;
                              const heightPct =
                                val > 0 ? Math.max(8, Math.round((val / maxJobCount) * 100)) : 0;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectMonthBar(monthNum)}
                                  className="h-full flex flex-col justify-end items-center group relative focus:outline-none cursor-pointer"
                                >
                                  <div
                                    className={`transition-opacity absolute -top-6 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none ${
                                      isSelected
                                        ? 'opacity-100 bg-teal-700 text-white shadow'
                                        : 'opacity-0 group-hover:opacity-100 bg-slate-900 text-white'
                                    }`}
                                  >
                                    {val} tin đăng
                                  </div>
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full transition-all duration-300 rounded-t-md ${
                                      isSelected
                                        ? 'bg-gradient-to-t from-teal-600 to-emerald-500 border-2 border-teal-800 ring-2 ring-teal-300/70'
                                        : 'bg-gradient-to-t from-cyan-300 to-teal-400 hover:from-cyan-400 hover:to-teal-500 border border-teal-400'
                                    }`}
                                  />
                                  <span
                                    className={`absolute -bottom-5 text-[10px] whitespace-nowrap ${
                                      isSelected
                                        ? 'font-black text-teal-800'
                                        : 'text-slate-500'
                                    }`}
                                  >
                                    Tháng {monthNum}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* KHỐI XẾP HẠNG CHI TIẾT THÁNG ĐƯỢC CHỌN */}
                <div className="bg-white p-6 rounded-2xl border border-indigo-100 border-t-4 border-t-amber-500 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-amber-50/80 via-indigo-50/40 to-emerald-50/70 px-4 py-3 rounded-xl border border-amber-200/70">
                    <div className="flex items-center gap-2 text-sm font-black text-indigo-900">
                      <Trophy size={18} className="text-amber-500" />
                      <span>
                        XẾP HẠNG CHI TIẾT ({periodLabel.toUpperCase()})
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {monthDrilldown.highlightSummary}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Xếp hạng Ngành / Vị trí đang săn nhiều nhất */}
                    <div className="border border-emerald-200/80 rounded-xl overflow-hidden shadow-2xs bg-emerald-50/15">
                      <div className="px-4 py-3 bg-gradient-to-r from-emerald-100/90 via-teal-50 to-emerald-50 text-emerald-900 border-b border-emerald-200/70 flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-600" />
                        <span className="text-xs sm:text-sm font-black">
                          Vị Trí Nhận Nhiều Hồ Sơ CV Nhất ({periodLabel})
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {monthDrilldown.hotPositions.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            Chưa có dữ liệu vị trí mở mới hoặc ứng tuyển trong tháng này.
                          </div>
                        ) : (
                          monthDrilldown.hotPositions.slice(0, 4).map((pos) => (
                            <div
                              key={pos.rank}
                              className="p-3.5 hover:bg-emerald-50/40 transition-colors flex items-start gap-3"
                            >
                              <span
                                className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                  pos.rank === 1
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                    : pos.rank === 2
                                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                                    : pos.rank === 3
                                    ? 'bg-gradient-to-br from-rose-400 to-pink-500 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                #{pos.rank}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {pos.title}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {pos.category}
                                </p>
                                <div className="flex items-center justify-between text-xs font-bold mt-1.5">
                                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                                    {pos.jobCount} tin đăng
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600">
                                    {pos.cvCount} CV nộp
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                    {pos.avgSalary}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Xếp hạng Nhà tuyển dụng tích cực nhất */}
                    <div className="border border-amber-200/80 rounded-xl overflow-hidden shadow-2xs bg-amber-50/15">
                      <div className="px-4 py-3 bg-gradient-to-r from-amber-100/80 via-orange-50 to-rose-50 text-amber-950 border-b border-amber-200/70 flex items-center gap-2">
                        <Award size={16} className="text-amber-600" />
                        <span className="text-xs sm:text-sm font-black">
                          Nhà Tuyển Dụng Tích Cực Nhất ({periodLabel})
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {monthDrilldown.topRecruiters.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            Chưa có hoạt động tuyển dụng trong tháng này.
                          </div>
                        ) : (
                          monthDrilldown.topRecruiters.map((rec) => (
                            <div
                              key={rec.rank}
                              className="p-3.5 hover:bg-amber-50/40 transition-colors flex items-start gap-3"
                            >
                              <span
                                className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                  rec.rank === 1
                                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                                    : rec.rank === 2
                                    ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                                    : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                                }`}
                              >
                                #{rec.rank}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {rec.companyName}
                                </p>
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                  <Briefcase size={12} className="text-amber-600 shrink-0" />
                                  <span className="truncate">{rec.focusRole}</span>
                                </p>
                                <div className="flex items-center justify-between text-xs font-bold mt-1.5">
                                  <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700">
                                    {rec.jobsPosted} vị trí
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600">
                                    {rec.cvsReceived} CV nhận
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                                    Duyệt {rec.acceptRate}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                2. QL NHÀ TUYỂN DỤNG
                ================================================================= */}
            {activeMenu === 'recruiters' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Quản lý Nhà Tuyển Dụng & Doanh Nghiệp ({recruiterRows.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Theo dõi chi tiết các nhà tuyển dụng, khu vực hoạt động và số vị trí đang mở tuyển
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Công ty / Tổ chức</th>
                        <th className="px-6 py-3.5">Người đại diện</th>
                        <th className="px-6 py-3.5">Khu vực</th>
                        <th className="px-6 py-3.5">Vị trí tiêu biểu</th>
                        <th className="px-6 py-3.5 text-center">Tin đang mở</th>
                        <th className="px-6 py-3.5 text-center">Tổng CV nhận</th>
                        <th className="px-6 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recruiterRows.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2.5">
                            <Building2 size={18} className="text-[#4f61dc] shrink-0" />
                            <span>{rec.companyName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-800">{rec.fullName}</p>
                            <p className="text-xs text-slate-400">{rec.email}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600">{rec.location}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-700 max-w-xs">
                            {rec.mainPositions}
                          </td>
                          <td className="px-6 py-4 text-center font-black text-[#4f61dc]">
                            {rec.openJobsCount} / {rec.totalJobs} vị trí
                          </td>
                          <td className="px-6 py-4 text-center font-black text-emerald-600">
                            {rec.totalApps} hồ sơ
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveMenu('jobs')}
                                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-[#4f61dc] text-[#4f61dc] hover:text-white font-bold text-xs transition-all cursor-pointer"
                              >
                                Xem tin đăng
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================
                3. QL ỨNG VIÊN & HỒ SƠ CV
                ================================================================= */}
            {activeMenu === 'candidates' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Quản lý Ứng Viên & Hồ Sơ CV ({cvs.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Xem chi tiết CV chuẩn A4 của từng ứng viên và kiểm duyệt hồ sơ trên hệ thống
                    </p>
                  </div>
                  <div className="relative w-64">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Tìm tên ứng viên hoặc tiêu đề CV..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#4f61dc]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Ứng viên</th>
                        <th className="px-6 py-3.5">Tiêu đề Hồ sơ CV</th>
                        <th className="px-6 py-3.5">Kinh nghiệm & Ngoại ngữ</th>
                        <th className="px-6 py-3.5">Kỹ năng chính</th>
                        <th className="px-6 py-3.5">Ngày cập nhật</th>
                        <th className="px-6 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cvs
                        .filter(
                          (c) =>
                            c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.user?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((c) => {
                          const data = c.data || {};
                          const skills: string[] = Array.isArray(data.skills)
                            ? data.skills
                            : [];
                          const languages: string[] = Array.isArray(data.languages)
                            ? data.languages
                            : [];
                          const expLabel = extractYearsExpLabel(data);
                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-900">{c.user?.fullName}</p>
                                <p className="text-xs text-slate-400">{c.user?.email}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <FileText size={14} className="text-[#4f61dc] shrink-0" />
                                  <span>{c.title}</span>
                                </p>
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-700">
                                  Mẫu: {c.template || 'Modern'}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-amber-700">{expLabel}</p>
                                {languages.length > 0 && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {languages.join(' • ')}
                                  </p>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1 max-w-xs">
                                  {skills.slice(0, 5).map((sk) => (
                                    <span
                                      key={sk}
                                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-bold"
                                    >
                                      {sk}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-xs">
                                {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewCV(c)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-[#4f61dc] text-[#4f61dc] hover:text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <Eye size={14} /> Xem CV
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCV(c.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Xóa CV"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================
                4. QL TIN TUYỂN DỤNG
                ================================================================= */}
            {activeMenu === 'jobs' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Quản lý Tin Tuyển Dụng ({jobs.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Kiểm duyệt trạng thái Đóng/Mở hoặc xóa các tin tuyển dụng trên hệ thống
                    </p>
                  </div>
                  <div className="relative w-64">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Tìm kiếm vị trí tuyển dụng..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#4f61dc]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Vị trí & Công ty</th>
                        <th className="px-6 py-3.5">Nhà tuyển dụng</th>
                        <th className="px-6 py-3.5">Khu vực</th>
                        <th className="px-6 py-3.5">Số CV nộp</th>
                        <th className="px-6 py-3.5">Trạng thái</th>
                        <th className="px-6 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs
                        .filter((j) =>
                          j.title.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((j) => (
                          <tr key={j.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-900">{j.title}</p>
                              <p className="text-xs font-semibold text-[#4f61dc]">
                                {j.company?.name}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-700">
                                {j.author?.fullName}
                              </p>
                              <p className="text-xs text-slate-400">{j.author?.email}</p>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              {j.location}
                            </td>
                            <td className="px-6 py-4 font-black text-slate-900">
                              {j._count?.applications || 0} CV
                            </td>
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                onClick={() => handleUpdateJobStatus(j.id, j.status)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                  j.status === 'OPEN'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                {j.status === 'OPEN' ? (
                                  <CheckCircle size={13} />
                                ) : (
                                  <XCircle size={13} />
                                )}
                                {j.status === 'OPEN' ? 'Đang mở' : 'Đã đóng'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteJob(j.id)}
                                className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                title="Xóa tin tuyển dụng"
                              >
                                <Trash2 size={17} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================
                5. QL TÀI KHOẢN NGƯỜI DÙNG
                ================================================================= */}
            {activeMenu === 'users' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h2 className="text-lg font-black text-slate-800">
                      Quản lý Danh Sách Tài Khoản ({users.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Quản lý tài khoản Ứng viên, Nhà tuyển dụng, phân quyền hoặc xóa tài khoản vi phạm
                    </p>
                  </div>
                  <div className="relative w-64">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      size={16}
                    />
                    <input
                      type="text"
                      placeholder="Tìm tên hoặc email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-[#4f61dc]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                      <tr>
                        <th className="px-6 py-3.5">Thành viên</th>
                        <th className="px-6 py-3.5">Vai trò hiện tại</th>
                        <th className="px-6 py-3.5">Phân quyền nhanh</th>
                        <th className="px-6 py-3.5">Ngày tham gia</th>
                        <th className="px-6 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users
                        .filter(
                          (u) =>
                            u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-50 text-[#4f61dc] flex items-center justify-center font-black text-xs">
                                  {u.fullName?.[0] || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{u.fullName}</p>
                                  <p className="text-xs text-slate-400">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                                  u.role?.name === 'ADMIN'
                                    ? 'bg-red-50 text-red-600'
                                    : u.role?.name === 'RECRUITER'
                                    ? 'bg-indigo-50 text-indigo-600'
                                    : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                {u.role?.name}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={u.role?.name}
                                onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f61dc]"
                              >
                                <option value="CANDIDATE">CANDIDATE</option>
                                <option value="RECRUITER">RECRUITER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 text-slate-500">
                              {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {u.role?.name !== 'ADMIN' && (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Xóa người dùng"
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================
                6. QUẢN LÝ PHIẾU HỖ TRỢ CHĂM SÓC KHÁCH HÀNG (CSKH 2 TẦNG: AI + ADMIN)
                ================================================================= */}
            {activeMenu === 'support' && (() => {
              const openAdminCount = supportTickets.filter((t) => t.status === 'OPEN').length;
              const aiAutoCount = supportTickets.filter(
                (t) => t.status === 'RESOLVED' && t.handledBy === 'AI'
              ).length;
              const adminResolvedCount = supportTickets.filter(
                (t) => t.status === 'RESOLVED' && t.handledBy !== 'AI'
              ).length;

              const matchTicketFilter = (t: any) => {
                if (ticketStatusFilter === 'OPEN') return t.status === 'OPEN';
                if (ticketStatusFilter === 'AI') {
                  return t.status === 'RESOLVED' && t.handledBy === 'AI';
                }
                if (ticketStatusFilter === 'ADMIN_RESOLVED') {
                  return t.status === 'RESOLVED' && t.handledBy !== 'AI';
                }
                return true;
              };

              const visibleTickets = supportTickets
                .filter(matchTicketFilter)
                .filter((t) =>
                  `${t.ticketCode} ${t.fullName} ${t.email} ${t.content} ${t.aiCategory || ''}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                );

              return (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Headphones size={20} className="text-primary-600" />
                        <span>Quản lý Hỗ Trợ Chăm Sóc Khách Hàng (AI + Chuyên viên)</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Trợ lý AI CSKH tự động giải đáp 24/7 các câu hỏi phổ biến; Admin chỉ cần xử lý các yêu cầu xác minh, báo cáo vi phạm hoặc phiếu chuyển cấp.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          {
                            id: 'OPEN',
                            label: `Cần Admin xử lý (${openAdminCount})`,
                          },
                          {
                            id: 'AI',
                            label: `AI tự động giải đáp (${aiAutoCount})`,
                          },
                          {
                            id: 'ADMIN_RESOLVED',
                            label: `Admin đã phản hồi (${adminResolvedCount})`,
                          },
                          {
                            id: 'ALL',
                            label: `Tất cả (${supportTickets.length})`,
                          },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTicketStatusFilter(tab.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            ticketStatusFilter === tab.id
                              ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Khung thông báo cơ chế phân luồng thông minh bằng AI */}
                  <div className="rounded-2xl bg-gradient-to-r from-sky-50/90 via-teal-50/60 to-emerald-50/70 border border-teal-200/80 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-white border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                        <Bot size={17} />
                      </span>
                      <span>
                        <strong>Phân luồng CSKH tự động:</strong> Đã có{' '}
                        <strong className="text-teal-800">{aiAutoCount} câu hỏi thường gặp</strong>{' '}
                        được AI trả lời tức thì mà không làm gián đoạn công việc của Admin. Hiện còn{' '}
                        <strong className="text-amber-700">{openAdminCount} phiếu</strong> cần Admin kiểm tra trực tiếp.
                      </span>
                    </div>
                  </div>

                  {/* Tìm kiếm & Tuỳ chọn gửi kèm email khi phản hồi */}
                  <div className="bg-white rounded-2xl border border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm theo mã phiếu #CSKH, chủ đề AI, tên người gửi, email hoặc nội dung..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sendEmailOnReply}
                        onChange={(e) => setSendEmailOnReply(e.target.checked)}
                        className="w-4 h-4 rounded text-primary-600"
                      />
                      <Mail size={14} className="text-primary-600" />
                      <span>Gửi kèm phản hồi tới Gmail người dùng</span>
                    </label>
                  </div>

                  {visibleTickets.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
                      {ticketStatusFilter === 'OPEN'
                        ? 'Tuyệt vời! Hiện không có phiếu CSKH nào tồn đọng chờ Admin xử lý (các câu hỏi thường gặp đã được AI giải đáp tự động).'
                        : 'Không có phiếu yêu cầu hỗ trợ CSKH nào phù hợp bộ lọc.'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visibleTickets.map((ticket) => {
                        const isAIHandled =
                          ticket.status === 'RESOLVED' && ticket.handledBy === 'AI';
                        return (
                          <div
                            key={ticket.id}
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
                                    #{ticket.ticketCode}
                                  </span>
                                  {isAIHandled ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                                      <Bot size={12} /> AI đã giải đáp tự động
                                    </span>
                                  ) : ticket.status === 'RESOLVED' ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      Admin đã phản hồi
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                      Cần Admin xử lý
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-semibold">
                                    {ticket.roleName === 'RECRUITER'
                                      ? 'Nhà tuyển dụng'
                                      : ticket.roleName === 'CANDIDATE'
                                      ? 'Ứng viên'
                                      : 'Khách'}
                                  </span>
                                  {ticket.aiCategory && (
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-semibold">
                                      Chủ đề: {ticket.aiCategory}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-bold text-slate-900">
                                  {ticket.fullName}{' '}
                                  <span className="text-xs font-medium text-slate-500">
                                    ({ticket.email})
                                  </span>
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  Thời gian gửi:{' '}
                                  {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(ticket.id)}
                                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Xóa phiếu hỗ trợ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              <span className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                                Nội dung người dùng hỏi:
                              </span>
                              {ticket.content}
                            </div>

                            <div className="space-y-2.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="block text-xs font-bold text-slate-700">
                                  {isAIHandled
                                    ? 'Nội dung Trợ lý AI CSKH đã tự động trả lời (Admin có thể ghi đè nếu muốn bổ sung):'
                                    : 'Phản hồi từ Quản trị viên / Chuyên viên CSKH:'}
                                </label>
                                {!isAIHandled && ticket.suggestedReply && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyDrafts((prev) => ({
                                        ...prev,
                                        [ticket.id]: ticket.suggestedReply,
                                      }))
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors cursor-pointer"
                                  >
                                    <Sparkles size={12} />
                                    <span>Gợi ý câu trả lời nhanh (AI)</span>
                                  </button>
                                )}
                              </div>
                              <textarea
                                rows={3}
                                value={replyDrafts[ticket.id] ?? ticket.adminReply ?? ''}
                                onChange={(e) =>
                                  setReplyDrafts((prev) => ({
                                    ...prev,
                                    [ticket.id]: e.target.value,
                                  }))
                                }
                                placeholder="Nhập nội dung hướng dẫn / xác minh cho người dùng..."
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-primary-500 resize-none"
                              />
                              <div className="flex justify-end">
                                <button
                                  type="button"
                                  disabled={replyingTicketId === ticket.id}
                                  onClick={() => handleReplyTicket(ticket)}
                                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
                                >
                                  {replyingTicketId === ticket.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Send size={14} />
                                  )}
                                  <span>
                                    {isAIHandled
                                      ? 'Gửi bổ sung từ Admin'
                                      : ticket.status === 'RESOLVED'
                                      ? 'Cập nhật phản hồi'
                                      : 'Gửi phản hồi & Hoàn tất'}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </main>

      {/* Modal Xem chi tiết CV chuẩn A4 cho Admin */}
      {previewCV && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-20">
              <div>
                <span className="text-xs font-bold text-amber-300">
                  Hồ sơ CV của: {previewCV.user?.fullName} ({previewCV.user?.email})
                </span>
                <h3 className="text-base font-black text-white">{previewCV.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewCV(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <CVFullSheetView
                title={previewCV.title}
                template={previewCV.template || 'Modern'}
                data={previewCV.data || {}}
                fallbackName={previewCV.user?.fullName}
                fallbackEmail={previewCV.user?.email}
                pdfUrl={previewCV.pdfUrl}
                showExportToolbar={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
