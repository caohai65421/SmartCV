import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User, BookOpen, Briefcase,
  Plus, Trash2, Save, Loader2, CheckCircle, AlertCircle, FileText, UploadCloud, ArrowLeft
} from 'lucide-react';
import api from '../services/api';
import { CVData } from '../types';

/**
 * Trang CV Builder - Tích hợp Xuất PDF & Lưu trữ Cloudinary.
 */

const defaultCVData: CVData = {
  personalInfo: {
    fullName: '', email: '', phone: '', address: '', summary: '',
  },
  education: [{ school: '', degree: '', field: '', startDate: '', endDate: '' }],
  experience: [{ company: '', position: '', description: '', startDate: '', endDate: '' }],
  skills: [''],
};

const CVBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cvId, setCvId] = useState<string | null>(null); // Lưu ID sau khi tạo JSON lần đầu
  const [cvTitle, setCVTitle] = useState('');
  const [template, setTemplate] = useState('modern');
  const [cvData, setCVData] = useState<CVData>(defaultCVData);
  const [saving, setSaving] = useState(false);
  const [exporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const normalizeLoadedCV = (cv: any) => {
      if (!cv) return;
      setCvId(cv.id);
      setCVTitle(cv.title || 'CV Cá nhân');
      setTemplate((cv.template || 'Modern').toLowerCase());
      const raw = cv.data || {};
      const p = raw.personalInfo || {};

      const eduArr = Array.isArray(raw.education)
        ? raw.education
        : typeof raw.education === 'string' && raw.education.trim()
        ? [{ school: raw.education, degree: 'Cử nhân / Kỹ sư', field: 'Công nghệ Thông tin', startDate: '2017', endDate: '2021' }]
        : [{ school: '', degree: '', field: '', startDate: '', endDate: '' }];

      const expArr = Array.isArray(raw.experience)
        ? raw.experience
        : typeof raw.experience === 'string' && raw.experience.trim()
        ? [{ company: 'Kinh nghiệm làm việc thực tế', position: raw.position || 'Developer', description: raw.experience, startDate: '2021', endDate: 'Hiện tại' }]
        : [{ company: '', position: '', description: '', startDate: '', endDate: '' }];

      const skillsArr = Array.isArray(raw.skills) && raw.skills.length > 0
        ? raw.skills
        : typeof raw.skills === 'string'
        ? raw.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [''];

      setCVData({
        ...raw,
        personalInfo: {
          fullName: raw.fullName || p.fullName || '',
          position: raw.position || p.position || '',
          email: raw.email || p.email || '',
          phone: raw.phone || p.phone || '',
          dob: raw.dob || p.dob || '',
          gender: raw.gender || p.gender || '',
          address: raw.address || p.address || '',
          website: raw.website || raw.github || p.website || p.github || '',
          avatarUrl: raw.avatar || p.avatarUrl || '',
          summary: raw.summary || p.summary || '',
        },
        education: eduArr,
        experience: expArr,
        skills: skillsArr,
      } as any);
    };

    if (id) {
      api.get(`/cvs/${id}`)
        .then((res) => normalizeLoadedCV(res.data.cv))
        .catch((err) => console.error('Lỗi khi tải CV:', err));
    } else {
      // Tự động tải 1 CV duy nhất của tài khoản nếu đã có
      api.get('/cvs/my')
        .then((res) => {
          const first = res.data?.cvs?.[0];
          if (first) normalizeLoadedCV(first);
        })
        .catch(() => {});
    }
  }, [id]);

  /** 1. Lưu thông tin JSON vào Database */
  const handleSaveJson = async () => {
    if (!cvTitle.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho hồ sơ CV trước khi lưu.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return null;
    }
    setErrorMsg('');
    setSaving(true);
    try {
      const pInfo: any = cvData.personalInfo || {};
      const payloadData = {
        ...cvData,
        fullName: pInfo.fullName,
        position: pInfo.position,
        email: pInfo.email,
        phone: pInfo.phone,
        dob: pInfo.dob,
        gender: pInfo.gender,
        address: pInfo.address,
        website: pInfo.website,
        avatar: pInfo.avatarUrl,
        summary: pInfo.summary,
      };
      let res;
      if (cvId) {
        res = await api.put(`/cvs/${cvId}`, { title: cvTitle, template, data: payloadData });
      } else {
        res = await api.post('/cvs', { title: cvTitle, template, data: payloadData });
        setCvId(res.data.cv.id);
      }
      setSuccessMsg('✅ Đã lưu cập nhật CV cá nhân thành công!');
      return res.data.cv;
    } catch (err) {
      console.error('Lỗi khi lưu JSON:', err);
      return null;
    } finally {
      setSaving(false);
    }
  };

  /** 2. Hoàn tất chỉnh sửa CV và trở về ngay trang Quản lý CV (/candidate-dashboard) */
  const handleCompleteAndReturn = async () => {
    const savedCV = await handleSaveJson();
    if (!savedCV) return;
    navigate('/candidate-dashboard');
  };

  /** 3. Xử lý khi ứng viên chọn tệp ảnh chân dung từ máy tính */
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP...).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
          updatePersonalInfo('avatarUrl', compressedDataUrl);
        } else if (typeof reader.result === 'string') {
          updatePersonalInfo('avatarUrl', reader.result);
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const inputCls = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-primary-50 focus:border-primary-400 font-medium transition-all text-sm";

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
      {/* Header với 2 nút: Lưu bản nháp & Hoàn tất trở về trang CV */}
        <Link
          to="/candidate-dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-500 hover:text-primary-600 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản lý CV</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">SmartCV <span className="text-primary-600">Builder</span></h1>
            <p className="text-slate-500 font-medium mt-1">Tạo và cập nhật hồ sơ CV chuyên nghiệp chỉ trong vài phút.</p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveJson}
              disabled={saving || exporting}
              className="flex items-center gap-2 px-6 py-3.5 bg-white text-slate-700 border-2 border-slate-100 rounded-2xl font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} className="text-slate-400" />}
              Lưu nháp
            </button>
            <button
              type="button"
              onClick={handleCompleteAndReturn}
              disabled={saving || exporting}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black shadow-xl shadow-primary-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
              {saving ? 'Đang lưu...' : 'Hoàn tất'}
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-6 p-5 bg-green-50 border border-green-200 rounded-2xl text-green-700 font-bold flex items-center gap-3 animate-slide-up">
            <CheckCircle size={24} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-bold flex items-center gap-3 animate-slide-up">
            <AlertCircle className="text-red-600" size={24} /> {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* Thông tin CV */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                <FileText size={18} />
              </div>
              Bắt đầu với tiêu đề
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Tiêu đề CV của bạn *</label>
                <input className={inputCls} placeholder="VD: Senior React Developer 2026"
                  value={cvTitle} onChange={(e) => setCVTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Mẫu thiết kế PDF</label>
                <select className={inputCls} value={template} onChange={(e) => setTemplate(e.target.value)}>
                  <option value="modern">Modern - Thanh lịch & Hiện đại</option>
                  <option value="classic">Classic - Truyền thống</option>
                  <option value="minimal">Minimal - Tối giản</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Thông tin cá nhân */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                <User size={18} />
              </div>
              Thông tin cá nhân
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Họ và tên *', field: 'fullName', placeholder: 'Nguyễn Minh Quân' },
                { label: 'Vị trí ứng tuyển / Chức danh', field: 'position', placeholder: 'Senior Frontend Developer (React / Next.js)' },
                { label: 'Email liên hệ *', field: 'email', placeholder: 'candidate@example.com' },
                { label: 'Số điện thoại', field: 'phone', placeholder: '0987 654 321' },
                { label: 'Ngày sinh', field: 'dob', placeholder: '15/08/1999' },
                { label: 'Giới tính', field: 'gender', placeholder: 'Nam / Nữ' },
                { label: 'Địa chỉ hiện tại', field: 'address', placeholder: 'Quận Cầu Giấy, Hà Nội' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="block text-sm font-bold text-slate-600 mb-2">{label}</label>
                  <input
                    className={inputCls}
                    placeholder={placeholder}
                    value={(cvData.personalInfo as any)[field] || ''}
                    onChange={(e) => updatePersonalInfo(field, e.target.value)}
                  />
                </div>
              ))}

              {/* Ô chọn tệp ảnh chân dung tải lên từ máy tính (thay cho nhập link URL) */}
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Ảnh chân dung CV (Chọn tệp ảnh tải lên)
                </label>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                  <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                    {cvData.personalInfo.avatarUrl ? (
                      <img
                        src={cvData.personalInfo.avatarUrl}
                        alt="Ảnh chân dung CV"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold cursor-pointer transition-all shadow-2xs">
                      <UploadCloud size={15} />
                      <span>Chọn tệp ảnh</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 font-medium mt-1 truncate">
                      Hỗ trợ ảnh JPG, PNG, WEBP từ máy tính
                    </p>
                  </div>
                </div>
              </div>

              {/* Ô nhập Link GitHub / Portfolio / LinkedIn */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-600 mb-2">
                  Link GitHub / Portfolio / LinkedIn
                </label>
                <div className="relative flex items-center gap-2">
                  <input
                    className={inputCls}
                    placeholder="https://github.com/minhquan-dev"
                    value={(cvData.personalInfo as any).website || ''}
                    onChange={(e) => updatePersonalInfo('website', e.target.value)}
                  />
                  {(cvData.personalInfo as any).website && (
                    <a
                      href={
                        /^https?:\/\//i.test(
                          String((cvData.personalInfo as any).website)
                            .split(/[•|,]+/)[0]
                            .trim()
                        )
                          ? String((cvData.personalInfo as any).website)
                              .split(/[•|,]+/)[0]
                              .trim()
                          : `https://${String((cvData.personalInfo as any).website)
                              .split(/[•|,]+/)[0]
                              .trim()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs whitespace-nowrap transition-all"
                    >
                      🔗 Mở link GitHub
                    </a>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-600 mb-2">Giới thiệu ngắn gọn bản thân</label>
                <textarea rows={4} className={`${inputCls} resize-none`}
                  placeholder="Chia sẻ về đam mê, mục tiêu nghề nghiệp và những gì tốt nhất của bạn..."
                  value={cvData.personalInfo.summary}
                  onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Học vấn */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600">
                  <BookOpen size={18} />
                </div>
                Quá trình học vấn
              </h2>
              <button onClick={addEducation} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                <Plus size={16} /> Thêm trường học
              </button>
            </div>
            <div className="space-y-6">
              {cvData.education.map((edu, idx) => (
                <div key={idx} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md">
                  <button onClick={() => removeEducation(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Tên trường học</label>
                      <input className={inputCls} placeholder="Đại học Bách Khoa"
                        value={edu.school} onChange={(e) => updateEducation(idx, 'school', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Chuyên ngành</label>
                      <input className={inputCls} placeholder="Khoa học Máy tính"
                        value={edu.field} onChange={(e) => updateEducation(idx, 'field', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Bằng cấp</label>
                      <input className={inputCls} placeholder="Kỹ sư / Cử nhân"
                        value={edu.degree} onChange={(e) => updateEducation(idx, 'degree', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Thời gian bắt đầu</label>
                      <input className={inputCls} placeholder="09/2020"
                        value={edu.startDate} onChange={(e) => updateEducation(idx, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Thời gian kết thúc</label>
                      <input className={inputCls} placeholder="Hiện tại / 06/2024"
                        value={edu.endDate} onChange={(e) => updateEducation(idx, 'endDate', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kinh nghiệm */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                  <Briefcase size={18} />
                </div>
                Kinh nghiệm làm việc
              </h2>
              <button onClick={addExperience} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition-all flex items-center gap-2">
                <Plus size={16} /> Thêm công việc
              </button>
            </div>
            <div className="space-y-6">
              {cvData.experience.map((exp, idx) => (
                <div key={idx} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md">
                  <button onClick={() => removeExperience(idx)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={18} />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Tên công ty</label>
                      <input className={inputCls} placeholder="Example Tech Corp"
                        value={exp.company} onChange={(e) => updateExperience(idx, 'company', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Vị trí đảm nhiệm</label>
                      <input className={inputCls} placeholder="Full Stack Developer"
                        value={exp.position} onChange={(e) => updateExperience(idx, 'position', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Từ ngày</label>
                      <input className={inputCls} placeholder="01/2022"
                        value={exp.startDate} onChange={(e) => updateExperience(idx, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Đến ngày</label>
                      <input className={inputCls} placeholder="Hiện tại"
                        value={exp.endDate} onChange={(e) => updateExperience(idx, 'endDate', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1 block">Mô tả công việc & dự án đã làm</label>
                      <textarea rows={4} className={`${inputCls} resize-none`}
                        placeholder="Nêu bật kết quả từ công việc này..."
                        value={exp.description} onChange={(e) => updateExperience(idx, 'description', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kỹ năng */}
          <div className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                  <UploadCloud size={18} />
                </div>
                Kỹ năng chuyên môn
              </h2>
              <button
                onClick={() => setCVData((prev) => ({ ...prev, skills: [...prev.skills, ''] }))}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cvData.skills.map((skill, idx) => (
                <div key={idx} className="relative group">
                  <input
                    className={inputCls} placeholder={`Kỹ năng ${idx + 1}`}
                    value={skill} onChange={(e) => updateSkill(idx, e.target.value)}
                  />
                  {cvData.skills.length > 1 && (
                    <button
                      onClick={() => setCVData((prev) => ({ ...prev, skills: prev.skills.filter((_, i) => i !== idx) }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Nút Hoàn tất cuối trang: Lưu CV và trở về ngay trang Quản lý CV (/candidate-dashboard) */}
        <div className="mt-12 flex justify-center pb-10">
          <button
            type="button"
            onClick={handleCompleteAndReturn}
            disabled={exporting || saving}
            className="flex items-center gap-3 px-12 py-5 bg-primary-600 hover:bg-primary-700 text-white rounded-[24px] font-black text-xl shadow-2xl shadow-primary-200 transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle size={24} />}
            {saving ? 'Đang lưu CV...' : 'Hoàn tất'}
          </button>
        </div>
      </div>
    </div>
  );

  /** Hàm tiện ích cập nhật thông tin */
  function updatePersonalInfo(field: string, value: string) {
    setCVData((prev) => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value },
    }));
  };
  function updateEducation(idx: number, field: string, value: string) {
    setCVData((prev) => {
      const updated = [...prev.education];
      (updated[idx] as any)[field] = value;
      return { ...prev, education: updated };
    });
  };
  function addEducation() {
    setCVData((prev) => ({
      ...prev,
      education: [...prev.education, { school: '', degree: '', field: '', startDate: '', endDate: '' }],
    }));
  };
  function removeEducation(idx: number) {
    setCVData((prev) => ({ ...prev, education: prev.education.filter((_, i) => i !== idx) }));
  };
  function updateExperience(idx: number, field: string, value: string) {
    setCVData((prev) => {
      const updated = [...prev.experience];
      (updated[idx] as any)[field] = value;
      return { ...prev, experience: updated };
    });
  };
  function addExperience() {
    setCVData((prev) => ({
      ...prev,
      experience: [...prev.experience, { company: '', position: '', description: '', startDate: '', endDate: '' }],
    }));
  };
  function removeExperience(idx: number) {
    setCVData((prev) => ({ ...prev, experience: prev.experience.filter((_, i) => i !== idx) }));
  };
  function updateSkill(idx: number, value: string) {
    setCVData((prev) => {
      const updated = [...prev.skills];
      updated[idx] = value;
      return { ...prev, skills: updated };
    });
  };
};

export default CVBuilderPage;
