import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Check, X, ChevronDown, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import {
  VIETNAM_PROVINCES,
  Province,
  AdminUnit,
  fetchDistrictsByProvinceCode,
  fetchWardsByDistrictId,
} from '../data/vietnamProvinces';

interface ProvinceSelectDropdownProps {
  value: string;
  onChange: (locationValue: string) => void;
  placeholder?: string;
}

export const ProvinceSelectDropdown: React.FC<ProvinceSelectDropdownProps> = ({
  value,
  onChange,
  placeholder = 'Chọn Tỉnh/Thành, Quận/Huyện...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Province | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<AdminUnit | null>(null);
  const [districts, setDistricts] = useState<AdminUnit[]>([]);
  const [wards, setWards] = useState<AdminUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Khi bấm chọn 1 Tỉnh/Thành phố -> tải danh sách Quận/Huyện của tỉnh đó
  const handleProvinceClick = async (province: Province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setSearchTerm('');
    setLoadingUnits(true);
    const list = await fetchDistrictsByProvinceCode(province.code);
    setDistricts(list);
    setLoadingUnits(false);
  };

  // Khi bấm xem Phường/Xã của 1 Quận/Huyện
  const handleDistrictExpand = async (district: AdminUnit) => {
    setSelectedDistrict(district);
    setSearchTerm('');
    setLoadingUnits(true);
    const list = await fetchWardsByDistrictId(district.id);
    setWards(list);
    setLoadingUnits(false);
  };

  // Chọn kết quả cuối cùng và đóng menu
  const handleConfirmSelection = (locationString: string) => {
    onChange(locationString);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSearchTerm('');
  };

  const filteredProvinces = VIETNAM_PROVINCES.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDistricts = districts.filter((d) =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredWards = wards.filter((w) =>
    w.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative flex-1 z-40">
      {/* Ô hiển thị và kích hoạt dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 rounded-xl cursor-pointer transition-colors group h-full"
      >
        <MapPin size={17} className="text-primary-600 shrink-0 group-hover:scale-110 transition-transform" />
        <div className="flex-1 truncate text-left">
          {value ? (
            <span className="text-xs sm:text-sm font-bold text-slate-800">{value}</span>
          ) : (
            <span className="text-xs sm:text-sm font-normal text-slate-400">{placeholder}</span>
          )}
        </div>

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            title="Xóa địa điểm"
          >
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={15} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Popover chọn Tỉnh/Thành -> Quận/Huyện -> Phường/Xã */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-[999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header điều hướng cấp bậc (Breadcrumb) */}
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between gap-2 mb-2">
              {selectedDistrict && selectedProvince ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDistrict(null);
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại Quận/Huyện ({selectedProvince.name})</span>
                </button>
              ) : selectedProvince ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvince(null);
                    setSearchTerm('');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-700"
                >
                  <ArrowLeft size={14} />
                  <span>Quay lại 63 Tỉnh/Thành phố</span>
                </button>
              ) : (
                <span className="text-xs font-extrabold text-slate-700">
                  📍 Tích chọn Tỉnh/Thành phố & Quận/Huyện
                </span>
              )}

              {value && (
                <button
                  type="button"
                  onClick={() => handleConfirmSelection('')}
                  className="text-[11px] font-bold text-red-500 hover:underline"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            {/* Ô lọc nhanh trong danh sách đang mở */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  selectedDistrict
                    ? `Tìm Phường/Xã thuộc ${selectedDistrict.full_name}...`
                    : selectedProvince
                    ? `Tìm Quận/Huyện thuộc ${selectedProvince.name}...`
                    : 'Tìm nhanh trong 63 Tỉnh/Thành phố...'
                }
                className="w-full text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
              />
              {searchTerm && (
                <button type="button" onClick={() => setSearchTerm('')}>
                  <X size={13} className="text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>
          </div>

          {/* Nội dung danh sách theo từng cấp */}
          <div className="max-h-72 overflow-y-auto p-2 divide-y divide-slate-100">
            {loadingUnits ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={22} className="animate-spin text-primary-600" />
                <span className="text-xs font-semibold">Đang tải danh sách đơn vị hành chính...</span>
              </div>
            ) : selectedDistrict && selectedProvince ? (
              /* CẤP 3: DANH SÁCH PHƯỜNG / XÃ CỦA QUẬN ĐÃ CHỌN */
              <div>
                <button
                  type="button"
                  onClick={() => handleConfirmSelection(`${selectedDistrict.full_name}, ${selectedProvince.name}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 mb-1 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      readOnly
                      checked={value === `${selectedDistrict.full_name}, ${selectedProvince.name}`}
                      className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                    />
                    <span>Tất cả {selectedDistrict.full_name}, {selectedProvince.name}</span>
                  </span>
                  <Check size={14} className="text-primary-600" />
                </button>

                <div className="px-2.5 py-1 text-[11px] font-black uppercase text-slate-400">
                  Tích chọn Phường / Xã / Thị trấn ({filteredWards.length})
                </div>

                <div className="space-y-0.5">
                  {filteredWards.map((ward) => {
                    const fullLabel = `${ward.full_name}, ${selectedDistrict.full_name}, ${selectedProvince.name}`;
                    const isChecked = value === fullLabel;
                    return (
                      <button
                        key={ward.id}
                        type="button"
                        onClick={() => handleConfirmSelection(fullLabel)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                          isChecked ? 'bg-primary-600 text-white font-bold' : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            readOnly
                            checked={isChecked}
                            className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                          />
                          <span>{ward.full_name}</span>
                        </span>
                        {isChecked && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedProvince ? (
              /* CẤP 2: DANH SÁCH QUẬN / HUYỆN / THÀNH PHỐ / THỊ XÃ CỦA TỈNH ĐÃ CHỌN */
              <div>
                <button
                  type="button"
                  onClick={() => handleConfirmSelection(selectedProvince.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 mb-1 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      readOnly
                      checked={value === selectedProvince.name}
                      className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                    />
                    <span>Tất cả khu vực tại {selectedProvince.name}</span>
                  </span>
                  <Check size={14} className="text-primary-600" />
                </button>

                <div className="px-2.5 py-1 text-[11px] font-black uppercase text-slate-400">
                  Quận / Huyện / Thành phố thuộc {selectedProvince.name} ({filteredDistricts.length})
                </div>

                <div className="space-y-0.5">
                  {filteredDistricts.map((dist) => {
                    const distLabel = `${dist.full_name}, ${selectedProvince.name}`;
                    const isChecked = value === distLabel || value.endsWith(distLabel);
                    return (
                      <div
                        key={dist.id}
                        className={`flex items-center justify-between rounded-xl px-2 py-1 transition-colors ${
                          isChecked ? 'bg-primary-50 border border-primary-200' : 'hover:bg-slate-100'
                        }`}
                      >
                        {/* Bấm vào tên/ô tích để chọn ngay Quận/Huyện này */}
                        <button
                          type="button"
                          onClick={() => handleConfirmSelection(distLabel)}
                          className="flex-1 flex items-center gap-2.5 py-1.5 px-1 text-left text-xs font-semibold text-slate-800"
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked={isChecked}
                            className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                          />
                          <span>{dist.full_name}</span>
                        </button>

                        {/* Nút mở tiếp Phường/Xã của Quận/Huyện này */}
                        <button
                          type="button"
                          onClick={() => handleDistrictExpand(dist)}
                          className="text-[11px] font-bold text-primary-600 hover:bg-primary-100 px-2 py-1 rounded-lg flex items-center gap-0.5 shrink-0"
                          title="Chọn chi tiết tới Phường/Xã"
                        >
                          <span>Phường/Xã</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* CẤP 1: DANH SÁCH 63 TỈNH / THÀNH PHỐ */
              <div>
                <div className="pb-1.5">
                  <button
                    type="button"
                    onClick={() => handleConfirmSelection('')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                      !value
                        ? 'bg-primary-50 text-primary-700 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        readOnly
                        checked={!value}
                        className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                      />
                      <span>🌍 Tất cả tỉnh thành (Toàn quốc)</span>
                    </span>
                    {!value && <Check size={14} className="text-primary-600" />}
                  </button>
                </div>

                <div className="pt-2">
                  <div className="px-2.5 pb-1.5 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                    Chọn Tỉnh / Thành phố để xem Quận / Huyện ({filteredProvinces.length})
                  </div>

                  {filteredProvinces.length === 0 ? (
                    <div className="px-3 py-4 text-center text-xs text-slate-400">
                      Không tìm thấy tỉnh thành phù hợp
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredProvinces.map((province) => {
                        const isSelected = value.includes(province.name);
                        return (
                          <div
                            key={province.id}
                            className={`flex items-center justify-between px-2 py-1 rounded-xl transition-colors ${
                              isSelected ? 'bg-primary-50/80 border border-primary-100' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Click vào Tỉnh sẽ mở danh sách Quận/Huyện của Tỉnh đó */}
                            <button
                              type="button"
                              onClick={() => handleProvinceClick(province)}
                              className="flex-1 flex items-center justify-between py-1.5 px-1.5 text-xs font-semibold text-slate-800 text-left"
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={isSelected}
                                  className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                                />
                                <span>{province.name}</span>
                                <span
                                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                    province.region === 'Bắc'
                                      ? 'bg-blue-50 text-blue-600'
                                      : province.region === 'Trung'
                                      ? 'bg-amber-50 text-amber-600'
                                      : 'bg-emerald-50 text-emerald-600'
                                  }`}
                                >
                                  {province.region}
                                </span>
                              </span>
                              <span className="text-[11px] font-bold text-primary-600 flex items-center gap-0.5">
                                Chọn Quận/Huyện <ChevronRight size={14} />
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProvinceSelectDropdown;
