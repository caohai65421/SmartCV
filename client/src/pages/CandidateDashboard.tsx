import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Briefcase,
  Plus,
  MessageCircle,
  Loader2,
  Bookmark,
  MapPin,
  DollarSign,
  Building2,
  ExternalLink,
  Trash2,
  Edit3,
  Calendar,
  Video,
} from 'lucide-react';
import api from '../services/api';
import { CV, Application, Job } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ChatWindow from '../components/ChatWindow';
import CVFullSheetView from '../components/CVFullSheetView';
import { getSavedJobIds, toggleSavedJobId } from '../utils/savedJobs';

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'saved-jobs'
      ? 'saved-jobs'
      : tabParam === 'applied-jobs'
      ? 'applied-jobs'
      : 'my-cv';

  const [activeTab, setActiveTab] = useState<'my-cv' | 'saved-jobs' | 'applied-jobs'>(initialTab);
  const [myCV, setMyCV] = useState<CV | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatAppId, setActiveChatAppId] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'saved-jobs' || tabParam === 'applied-jobs' || tabParam === 'my-cv') {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cvsRes, appsRes, jobsRes] = await Promise.all([
          api.get('/cvs/my'),
          api.get('/applications/my'),
          api.get('/jobs'),
        ]);
        const cvList: CV[] = cvsRes.data?.cvs || [];
        setMyCV(cvList[0] || null);
        setApplications(appsRes.data?.applications || []);

        const jobList: Job[] = jobsRes.data?.jobs || [];
        setAllJobs(jobList);
        setSavedJobIds(getSavedJobIds(user?.id));
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu của ứng viên:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const handleTabChange = (tab: 'my-cv' | 'saved-jobs' | 'applied-jobs') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setActiveChatAppId(null);
  };

  const savedJobs = allJobs.filter((j) => savedJobIds.includes(j.id));

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REJECTED: 'bg-red-50 text-red-600 border-red-200',
    };
    const labels: Record<string, string> = {
      PENDING: 'Đang chờ duyệt',
      ACCEPTED: 'Đã chấp nhận',
      REJECTED: 'Từ chối',
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${styles[status] || ''}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 size={38} className="animate-spin text-primary-600 mb-3" />
        <p className="font-semibold text-slate-400 text-xs">
          Đang tải hồ sơ CV của bạn...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header Quản lý Hồ sơ Ứng viên nhẹ nhàng */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-sky-50/80 via-white to-teal-50/60 p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-1">
              Quản lý CV cá nhân & Hồ sơ ứng tuyển
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Cập nhật hồ sơ trực tuyến, tùy chỉnh tông màu CV, xuất bản PDF A4 và theo dõi phản hồi từ nhà tuyển dụng.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={myCV ? `/cv-builder/${myCV.id}` : '/cv-builder'}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              {myCV ? (
                <>
                  <Edit3 size={15} /> Chỉnh sửa CV
                </>
              ) : (
                <>
                  <Plus size={15} /> Tạo CV mới
                </>
              )}
            </Link>
            <Link
              to="/jobs"
              className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors flex items-center gap-2"
            >
              <Briefcase size={15} /> Tìm việc làm
            </Link>
          </div>
        </div>

        {/* 3 Tab Quản lý */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm w-fit">
          <button
            type="button"
            onClick={() => handleTabChange('my-cv')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
              activeTab === 'my-cv'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText size={16} /> CV
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('saved-jobs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
              activeTab === 'saved-jobs'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Bookmark size={16} /> Vị trí đã lưu ({savedJobs.length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('applied-jobs')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
              activeTab === 'applied-jobs'
                ? 'bg-sky-700 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Briefcase size={16} /> Đã nộp & phản hồi ({applications.length})
          </button>
        </div>

        {/* TAB 1: CV CỦA MÌNH */}
        {activeTab === 'my-cv' && (
          <div className="space-y-6">
            {!myCV ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 border-dashed">
                <div className="w-14 h-14 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-primary-600">
                  <FileText size={28} />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Tài khoản của bạn chưa có CV
                </h3>
                <p className="text-xs text-slate-500 mb-5">
                  Hãy tạo hồ sơ CV cá nhân để bắt đầu ứng tuyển vào các vị trí phù hợp.
                </p>
                <Link
                  to="/cv-builder"
                  className="bg-primary-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-primary-700 inline-flex items-center gap-2"
                >
                  <Plus size={15} /> Tạo CV ngay
                </Link>
              </div>
            ) : (
              <CVFullSheetView
                title={myCV.title}
                template={myCV.template}
                data={myCV.data}
                pdfUrl={myCV.pdfUrl}
                showExportToolbar={true}
                allowThemePicker={true}
                userId={user?.id}
                onEditClick={() => navigate(`/cv-builder/${myCV.id}`)}
              />
            )}
          </div>
        )}

        {/* TAB 2: CÁC VỊ TRÍ ĐÃ LƯU */}
        {activeTab === 'saved-jobs' && (
          <div className="space-y-4">
            {savedJobs.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <Bookmark size={42} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-700 font-semibold text-sm">
                  Bạn chưa lưu vị trí công việc nào
                </p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Bấm vào biểu tượng Lưu trên trang Việc làm để đánh dấu vị trí quan tâm.
                </p>
                <Link
                  to="/jobs"
                  className="bg-teal-600 text-white font-semibold text-xs px-5 py-2.5 rounded-xl hover:bg-teal-700 inline-flex items-center gap-2"
                >
                  <Briefcase size={15} /> Xem việc làm
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-1">
                            {job.company?.logoUrl ? (
                              <img
                                src={job.company.logoUrl}
                                alt={job.company.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <Building2 size={20} className="text-teal-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/jobs/${job.id}`}
                              className="text-base font-bold text-slate-900 hover:text-teal-700 line-clamp-1"
                            >
                              {job.title}
                            </Link>
                            <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                              {job.company?.name || 'Doanh nghiệp tuyển dụng'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSavedJobIds(toggleSavedJobId(job.id, user?.id))}
                          title="Bỏ lưu vị trí này"
                          className="p-2 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                        <span className="inline-flex items-center gap-1 font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-lg">
                          <DollarSign size={13} /> {job.salary || 'Thỏa thuận'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <MapPin size={13} className="text-slate-400" /> {job.location}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-teal-600 flex items-center gap-1">
                        <Bookmark size={12} className="fill-teal-500" /> Đã lưu
                      </span>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <span>Ứng tuyển</span>
                        <ExternalLink size={13} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VỊ TRÍ ĐÃ ỨNG TUYỂN */}
        {activeTab === 'applied-jobs' && (
          <div className="space-y-4">
            {applications.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
                <MessageCircle size={42} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-600 font-semibold text-sm">
                  Bạn chưa nộp CV vào vị trí tuyển dụng nào
                </p>
                <Link
                  to="/jobs"
                  className="mt-3 text-primary-600 font-semibold hover:underline inline-block text-xs"
                >
                  Tìm việc làm và nộp hồ sơ &rarr;
                </Link>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5 mb-1">
                        <h3 className="text-base font-bold text-slate-900">
                          {app.job?.title}
                        </h3>
                        {getStatusBadge(app.status)}
                      </div>
                      <p className="text-xs font-semibold text-primary-600 mb-2">
                        {app.job?.company?.name}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg font-medium text-slate-700">
                          <FileText size={13} className="text-primary-600" />
                          Hồ sơ đã nộp: {(app as any).cv?.title || (app as any).uploadedFileName || myCV?.title || 'Hồ sơ ứng tuyển'}
                        </span>
                        {(app as any).uploadedPdfUrl && (
                          <a
                            href={(app as any).uploadedPdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-2.5 py-1 rounded-lg font-semibold transition-colors"
                          >
                            <ExternalLink size={12} />
                            <span>File PDF: {(app as any).uploadedFileName || 'Xem CV PDF'}</span>
                          </a>
                        )}
                        <span>
                          Ngày nộp: {new Date(app.appliedDate).toLocaleDateString('vi-VN')}
                        </span>
                      </div>

                      {(app as any).interviewSchedule && (
                        <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 font-bold text-emerald-800">
                              <Calendar size={14} className="text-emerald-600" />
                              <span>
                                Lịch hẹn phỏng vấn: {(app as any).interviewSchedule.time} •{' '}
                                {String((app as any).interviewSchedule.date || '')
                                  .split('-')
                                  .reverse()
                                  .join('/')}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[11px] font-semibold">
                                {(app as any).interviewSchedule.mode === 'ONLINE'
                                  ? 'Phỏng vấn Online'
                                  : 'Trực tiếp tại văn phòng'}
                              </span>
                            </div>
                            <p className="text-slate-600 flex items-center gap-1.5">
                              {(app as any).interviewSchedule.mode === 'ONLINE' ? (
                                <Video size={13} className="text-sky-600 shrink-0" />
                              ) : (
                                <MapPin size={13} className="text-emerald-600 shrink-0" />
                              )}
                              <span className="break-all">
                                {(app as any).interviewSchedule.locationOrLink}
                              </span>
                            </p>
                          </div>

                          <Link
                            to={`/interview-room/${app.id}`}
                            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
                          >
                            <Video size={14} /> Vào phòng phỏng vấn Online
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {app.status === 'ACCEPTED' && !(app as any).interviewSchedule && (
                        <Link
                          to={`/interview-room/${app.id}`}
                          className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-teal-600 hover:bg-teal-700 text-white inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Video size={14} /> Phòng PV Online
                        </Link>
                      )}
                      {app.job?.id && (
                        <Link
                          to={`/jobs/${app.job.id}`}
                          className="px-3.5 py-2 rounded-xl font-semibold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        >
                          Xem tin tuyển dụng
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveChatAppId(activeChatAppId === app.id ? null : app.id)
                        }
                        className={`px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 transition-colors ${
                          activeChatAppId === app.id
                            ? 'bg-slate-800 text-white'
                            : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-600 hover:text-white'
                        }`}
                      >
                        <MessageCircle size={15} />
                        Nhắn tin Nhà tuyển dụng
                      </button>
                    </div>
                  </div>

                  {activeChatAppId === app.id && (
                    <div className="mt-5 pt-5 border-t border-slate-100">
                      <ChatWindow
                        applicationId={app.id}
                        receiverId={app.job?.postedBy || ''}
                        receiverName={app.job?.company?.name || 'Nhà tuyển dụng'}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDashboard;
