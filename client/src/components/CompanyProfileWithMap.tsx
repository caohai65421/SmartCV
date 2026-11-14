import React from 'react';
import { MapPin, Briefcase, Globe } from 'lucide-react';

export interface StructuredCompanyProfile {
  industry: string;
  scale: string;
  overview: string;
  coreValues: string[];
  services: string[];
  team: string;
  province: string;
  detailAddress: string;
}

export const DEFAULT_COMPANY_PROFILE: StructuredCompanyProfile = {
  industry: 'Công nghệ thông tin (CNTT)',
  scale: 'Nhỏ (không quá 50 nhân sự)',
  overview:
    'Công Ty Công Nghệ FPT Software là một doanh nghiệp chuyên về lĩnh vực công nghệ thông tin, với mục tiêu mang đến các giải pháp công nghệ tiên tiến và hiệu quả cho khách hàng. Mặc dù quy mô tinh gọn, công ty luôn chú trọng đến chất lượng dịch vụ và sự hài lòng của khách hàng.',
  coreValues: [
    'Chất Lượng: Luôn đặt chất lượng sản phẩm và dịch vụ lên hàng đầu.',
    'Sáng Tạo: Không ngừng tìm kiếm và áp dụng các giải pháp công nghệ mới.',
    'Khách Hàng: Luôn lắng nghe và đáp ứng nhu cầu của khách hàng một cách tốt nhất.',
    'Nhân Sự: Đề cao sự phát triển của nhân viên, tạo môi trường làm việc chuyên nghiệp và thân thiện.',
  ],
  services: [
    'Phát triển phần mềm',
    'Tư vấn và triển khai hệ thống CNTT',
    'Dịch vụ quản trị và bảo trì hệ thống',
    'Giải pháp công nghệ đám mây',
    'An ninh mạng',
  ],
  team:
    'Công ty tự hào có một đội ngũ chuyên gia giàu kinh nghiệm, năng động và đầy nhiệt huyết. Với quy mô không quá 50 nhân sự, công ty tạo điều kiện để từng cá nhân phát huy tối đa khả năng của mình và cùng nhau xây dựng một môi trường làm việc thân thiện, sáng tạo.',
  province: 'Quận Cầu Giấy, Hà Nội',
  detailAddress: 'Tòa nhà FPT, Số 10 Phạm Văn Bạch, Quận Cầu Giấy, Hà Nội',
};

/**
 * Giải mã dữ liệu mô tả công ty (hỗ trợ cả JSON có cấu trúc hoặc chuỗi văn bản cũ)
 */
export function parseCompanyProfile(
  rawDescription?: string | null,
  companyName?: string,
  companyLocation?: string | null
): StructuredCompanyProfile {
  if (rawDescription) {
    try {
      const parsed = JSON.parse(rawDescription);
      if (parsed && typeof parsed === 'object' && parsed.overview) {
        return {
          industry: parsed.industry || DEFAULT_COMPANY_PROFILE.industry,
          scale: parsed.scale || DEFAULT_COMPANY_PROFILE.scale,
          overview: parsed.overview,
          coreValues: Array.isArray(parsed.coreValues)
            ? parsed.coreValues
            : DEFAULT_COMPANY_PROFILE.coreValues,
          services: Array.isArray(parsed.services)
            ? parsed.services
            : DEFAULT_COMPANY_PROFILE.services,
          team: parsed.team || DEFAULT_COMPANY_PROFILE.team,
          province: parsed.province || companyLocation || DEFAULT_COMPANY_PROFILE.province,
          detailAddress:
            parsed.detailAddress || companyLocation || DEFAULT_COMPANY_PROFILE.detailAddress,
        };
      }
    } catch {
      // Nếu là chuỗi văn bản thường, dùng làm overview và giữ các mục chuẩn
      return {
        ...DEFAULT_COMPANY_PROFILE,
        overview: rawDescription,
        province: companyLocation || DEFAULT_COMPANY_PROFILE.province,
        detailAddress: companyLocation || DEFAULT_COMPANY_PROFILE.detailAddress,
      };
    }
  }

  return {
    ...DEFAULT_COMPANY_PROFILE,
    overview: companyName
      ? `${companyName} là doanh nghiệp chuyên về lĩnh vực công nghệ thông tin, với mục tiêu mang đến các giải pháp công nghệ tiên tiến và hiệu quả cho khách hàng. Công ty luôn chú trọng đến chất lượng dịch vụ và sự hài lòng của khách hàng.`
      : DEFAULT_COMPANY_PROFILE.overview,
    province: companyLocation || DEFAULT_COMPANY_PROFILE.province,
    detailAddress: companyLocation || DEFAULT_COMPANY_PROFILE.detailAddress,
  };
}

interface CompanyProfileWithMapProps {
  name: string;
  description?: string | null;
  location?: string | null;
  website?: string | null;
  logoUrl?: string | null;
}

export const CompanyProfileWithMap: React.FC<CompanyProfileWithMapProps> = ({
  name,
  description,
  location,
  website,
}) => {
  const profile = parseCompanyProfile(description, name, location);
  const mapAddress = location || profile.detailAddress || profile.province || 'Cầu Giấy, Hà Nội';
  const googleMapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    mapAddress
  )}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  const googleMapsExternalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    mapAddress
  )}`;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT TRÁI (8/12): CHI TIẾT THÔNG TIN CÔNG TY (GIỐNG ẢNH MẪU) */}
        <div className="lg:col-span-8 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p>
            <strong className="font-extrabold text-slate-800">Lĩnh Vực Hoạt Động:</strong>{' '}
            {profile.industry}
          </p>

          <p>
            <strong className="font-extrabold text-slate-800">Quy Mô:</strong> {profile.scale}
          </p>

          <p>
            <strong className="font-extrabold text-slate-800">Giới Thiệu:</strong>{' '}
            {profile.overview}
          </p>

          {profile.coreValues.length > 0 && (
            <div>
              <p className="font-extrabold text-slate-800 mb-2">Giá Trị Cốt Lõi:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                {profile.coreValues.map((item, idx) => {
                  const colonIdx = item.indexOf(':');
                  if (colonIdx !== -1) {
                    const head = item.slice(0, colonIdx + 1);
                    const rest = item.slice(colonIdx + 1);
                    return (
                      <li key={idx}>
                        <strong className="font-extrabold text-slate-800">{head}</strong>
                        {rest}
                      </li>
                    );
                  }
                  return <li key={idx}>{item}</li>;
                })}
              </ul>
            </div>
          )}

          {profile.services.length > 0 && (
            <div>
              <p className="font-extrabold text-slate-800 mb-2">Dịch Vụ Chính:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                {profile.services.map((srv, idx) => (
                  <li key={idx}>{srv}</li>
                ))}
              </ul>
            </div>
          )}

          {profile.team && (
            <p>
              <strong className="font-extrabold text-slate-800">Đội Ngũ:</strong> {profile.team}
            </p>
          )}
        </div>

        {/* CỘT PHẢI (4/12): VỊ TRÍ ĐỊA ĐIỂM + BẢN ĐỒ TƯƠNG TÁC + THÔNG TIN TÓM TẮT */}
        <div className="lg:col-span-4 space-y-4 lg:border-l lg:border-slate-100 lg:pl-6">
          {/* Địa điểm ngắn trên cùng */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 pb-3 border-b border-slate-100">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <span>{profile.province || mapAddress}</span>
          </div>

          {/* Bản đồ Google Maps trực quan kèm thẻ địa chỉ nổi và nút "Xem bản đồ lớn hơn" */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm h-[300px] bg-slate-100">
            <iframe
              title={`Bản đồ ${name}`}
              src={googleMapsEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border border-slate-200 max-w-[210px] pointer-events-auto">
              <p className="text-xs font-bold text-slate-900 truncate">{name || mapAddress}</p>
              <a
                href={googleMapsExternalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-blue-600 hover:underline block mt-0.5"
              >
                Xem bản đồ lớn hơn
              </a>
            </div>
          </div>

          {/* Thông tin Lĩnh vực hoạt động & Địa chỉ phía dưới bản đồ */}
          <div className="pt-2 border-t border-slate-100 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <Briefcase size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-500 font-medium">Lĩnh vực hoạt động</p>
                <p className="font-extrabold text-slate-900 mt-0.5">{profile.industry}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-500 font-medium">Địa chỉ</p>
                <p className="font-extrabold text-slate-900 mt-0.5">Tỉnh/Thành phố:</p>
                <p className="text-slate-700 font-semibold mt-0.5">{mapAddress}</p>
              </div>
            </div>

            {website && (
              <div className="flex items-start gap-3">
                <Globe size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-500 font-medium">Website công ty</p>
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-primary-600 hover:underline mt-0.5 block break-all"
                  >
                    {website}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileWithMap;
