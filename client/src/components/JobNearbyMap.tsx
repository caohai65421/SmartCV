import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Crosshair,
  DollarSign,
  ExternalLink,
  AlertCircle,
  Compass,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
  Loader2,
} from 'lucide-react';
import { Job } from '../types';
import {
  calculateDistanceKm,
  estimateCoordsFromLocation,
  VIETNAM_PROVINCES,
  Province,
  AdminUnit,
  fetchDistrictsByProvinceCode,
  fetchWardsByDistrictId,
} from '../data/vietnamProvinces';
import { Link } from 'react-router-dom';

// Fix icon mặc định của Leaflet trong Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom Icon cho vị trí người dùng (tông tím mận ấm nổi bật)
const userLocationIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(144, 78, 164, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #7d4bc3; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Custom Icon cho vị trí công việc (màu đỏ cam tuyển dụng)
const jobLocationIcon = L.divIcon({
  className: 'custom-job-marker',
  html: `
    <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(220,38,38,0.4); border: 2px solid white;">
      <svg style="transform: rotate(45deg); width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <rect width="20" height="14" x="2" y="7" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30],
});

interface JobNearbyMapProps {
  jobs: Job[];
  onSelectJob?: (job: Job) => void;
}

export interface JobWithDistance extends Job {
  coords: { lat: number; lng: number };
  distanceKm: number;
}

export const JobNearbyMap: React.FC<JobNearbyMapProps> = ({ jobs, onSelectJob }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleRadiusRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Vị trí người dùng đang chọn (Mặc định: Quận Cầu Giấy, Hà Nội)
  const [userAddress, setUserAddress] = useState('Quận Cầu Giấy, Hà Nội');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number }>({
    lat: 21.0333,
    lng: 105.7937,
  });
  const [radiusKm, setRadiusKm] = useState<number>(10); // 5, 10, 15, 20 km
  const [nearbyJobs, setNearbyJobs] = useState<JobWithDistance[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithDistance | null>(null);

  // State cho bộ chọn tích 3 cấp: Tỉnh/Thành -> Quận/Huyện -> Phường/Xã
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'PROVINCE' | 'DISTRICT' | 'WARD'>('PROVINCE');
  const [selectedProvince, setSelectedProvince] = useState<Province>(VIETNAM_PROVINCES[0]); // Mặc định Hà Nội
  const [selectedDistrict, setSelectedDistrict] = useState<AdminUnit | null>(null);
  const [selectedWard, setSelectedWard] = useState<AdminUnit | null>(null);
  const [districts, setDistricts] = useState<AdminUnit[]>([]);
  const [wards, setWards] = useState<AdminUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [menuFilter, setMenuFilter] = useState('');

  const addressBoxRef = useRef<HTMLDivElement>(null);

  // Tải sẵn danh sách Quận/Huyện của tỉnh mặc định (Hà Nội) khi khởi tạo
  useEffect(() => {
    fetchDistrictsByProvinceCode(selectedProvince.code).then((list) => {
      setDistricts(list);
      const cauGiay = list.find((d) => d.name.toLowerCase().includes('cầu giấy'));
      if (cauGiay) setSelectedDistrict(cauGiay);
    });
  }, []);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addressBoxRef.current && !addressBoxRef.current.contains(e.target as Node)) {
        setShowLocationMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [userCoords.lat, userCoords.lng],
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Cho phép click trực tiếp lên bản đồ để ghim vị trí
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        setUserCoords({ lat, lng });
        setUserAddress(`Điểm ghim trên bản đồ (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      });

      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Tính toán khoảng cách và lọc việc làm theo bán kính
  useEffect(() => {
    const calculated: JobWithDistance[] = jobs.map((job) => {
      const coords = estimateCoordsFromLocation(job.location);
      const distanceKm = calculateDistanceKm(
        userCoords.lat,
        userCoords.lng,
        coords.lat,
        coords.lng
      );
      return {
        ...job,
        coords,
        distanceKm,
      };
    });

    const filtered = calculated
      .filter((j) => j.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setNearbyJobs(filtered);
  }, [jobs, userCoords, radiusKm]);

  // 3. Cập nhật Marker và Vòng tròn bán kính trên bản đồ
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    map.setView([userCoords.lat, userCoords.lng], getZoomLevelForRadius(radiusKm), {
      animate: true,
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }
    const userMarker = L.marker([userCoords.lat, userCoords.lng], {
      icon: userLocationIcon,
      title: 'Vị trí của bạn',
    })
      .bindPopup(
        `<div style="font-weight: 700; font-size: 13px; color: #1e293b;">
          📍 Vị trí đã chọn: <br/><span style="font-weight: 600; color: #4f61dc;">${userAddress}</span>
        </div>`
      )
      .addTo(map);
    userMarkerRef.current = userMarker;

    if (circleRadiusRef.current) {
      circleRadiusRef.current.remove();
    }
    const circle = L.circle([userCoords.lat, userCoords.lng], {
      radius: radiusKm * 1000,
      color: '#4f61dc',
      fillColor: '#6378eb',
      fillOpacity: 0.12,
      weight: 2,
      dashArray: '6, 8',
    }).addTo(map);
    circleRadiusRef.current = circle;

    nearbyJobs.forEach((job) => {
      const marker = L.marker([job.coords.lat, job.coords.lng], {
        icon: jobLocationIcon,
        title: job.title,
      });

      const popupContent = `
        <div style="min-width: 200px; padding: 4px;">
          <div style="font-weight: 800; font-size: 14px; color: #0f172a; margin-bottom: 2px;">
            ${job.title}
          </div>
          <div style="font-weight: 600; font-size: 12px; color: #4f61dc; margin-bottom: 6px;">
            ${job.company?.name || 'Công ty'}
          </div>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b; margin-bottom: 4px;">
            📍 ${job.location}
          </div>
          <div style="display: inline-block; background: #f4f6ff; color: #414fc2; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 9999px; margin-bottom: 8px;">
            Cách bạn: ~${job.distanceKm} km
          </div>
          <br/>
          <a href="/jobs/${job.id}" style="display: inline-block; width: 100%; text-align: center; background: #4f61dc; color: white; font-weight: 700; font-size: 12px; padding: 6px 12px; border-radius: 8px; text-decoration: none;">
            Xem chi tiết việc làm
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setSelectedJob(job);
        if (onSelectJob) onSelectJob(job);
      });

      marker.addTo(markersLayer);
    });
  }, [userCoords, radiusKm, nearbyJobs, userAddress]);

  const getZoomLevelForRadius = (km: number) => {
    if (km <= 5) return 13;
    if (km <= 10) return 12;
    if (km <= 15) return 11;
    return 10;
  };

  // Lấy vị trí thực tế của người dùng bằng Geolocation API
  const handleGetCurrentLocation = () => {
    setShowLocationMenu(false);
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        setUserAddress('Vị trí GPS hiện tại của bạn');
        setIsLocating(false);
      },
      (error) => {
        console.warn('Không lấy được vị trí GPS:', error);
        alert('Không thể truy cập GPS. Vui lòng tích chọn Tỉnh / Quận / Phường trong danh sách.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // KHI ỨNG VIÊN TÍCH CHỌN 1 TỈNH / THÀNH PHỐ -> Tự động tải đúng Quận/Huyện/TP của tỉnh đó
  const handleTickProvince = async (prov: Province) => {
    setSelectedProvince(prov);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setWards([]);
    setMenuFilter('');

    // Cập nhật ngay vị trí bản đồ về trung tâm Tỉnh đó
    setUserAddress(prov.name);
    setUserCoords({ lat: prov.lat, lng: prov.lng });

    // Chuyển sang tab Quận/Huyện của đúng Tỉnh vừa chọn
    setActiveTab('DISTRICT');
    setLoadingUnits(true);
    const list = await fetchDistrictsByProvinceCode(prov.code);
    setDistricts(list);
    setLoadingUnits(false);
  };

  // KHI ỨNG VIÊN TÍCH CHỌN 1 QUẬN / HUYỆN / THÀNH PHỐ / THỊ XÃ -> Tự động tải Phường/Xã của Quận đó
  const handleTickDistrict = async (dist: AdminUnit) => {
    setSelectedDistrict(dist);
    setSelectedWard(null);
    setMenuFilter('');

    // Cập nhật ngay vị trí bản đồ về đúng tọa độ Quận/Huyện đó
    const fullAddr = `${dist.full_name}, ${selectedProvince.name}`;
    setUserAddress(fullAddr);
    setUserCoords({ lat: dist.latitude, lng: dist.longitude });

    // Chuyển sang tab Phường/Xã của đúng Quận/Huyện vừa chọn
    setActiveTab('WARD');
    setLoadingUnits(true);
    const list = await fetchWardsByDistrictId(dist.id);
    setWards(list);
    setLoadingUnits(false);
  };

  // KHI ỨNG VIÊN TÍCH CHỌN 1 PHƯỜNG / XÃ / THỊ TRẤN CỤ THỂ -> Cập nhật tọa độ chính xác và đóng bảng
  const handleTickWard = (ward: AdminUnit) => {
    setSelectedWard(ward);
    setMenuFilter('');
    const fullAddr = `${ward.full_name}, ${selectedDistrict?.full_name}, ${selectedProvince.name}`;
    setUserAddress(fullAddr);
    setUserCoords({ lat: ward.latitude, lng: ward.longitude });
    setShowLocationMenu(false);
  };

  const filteredProvinces = VIETNAM_PROVINCES.filter(
    (p) =>
      p.name.toLowerCase().includes(menuFilter.toLowerCase()) ||
      p.shortName.toLowerCase().includes(menuFilter.toLowerCase())
  );

  const filteredDistricts = districts.filter((d) =>
    d.full_name.toLowerCase().includes(menuFilter.toLowerCase())
  );

  const filteredWards = wards.filter((w) =>
    w.full_name.toLowerCase().includes(menuFilter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-10 relative z-10">
      {/* Header điều khiển bản đồ tông sáng nhẹ nhàng */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-50/90 via-white to-teal-50/60 border-b border-slate-200 text-slate-800 rounded-t-2xl relative z-30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              title="Nhấn để định vị GPS vị trí của bạn"
              className="w-10 h-10 rounded-xl bg-primary-50 hover:bg-primary-100 border border-primary-200 flex items-center justify-center text-primary-600 transition-all cursor-pointer active:scale-95"
            >
              <Compass size={20} />
            </button>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Bản đồ việc làm gần vị trí của bạn
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã để tìm các công việc quanh khu vực bạn ở
              </p>
            </div>
          </div>

          {/* Nút bấm GPS 1 chạm */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="flex items-center justify-center gap-2 bg-white hover:bg-primary-50 text-primary-700 border border-primary-200 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <Crosshair size={15} className={isLocating ? 'animate-spin' : ''} />
            {isLocating ? 'Đang định vị...' : 'Lấy vị trí hiện tại (GPS)'}
          </button>
        </div>

        {/* Thanh chọn vị trí 3 cấp & Chọn bán kính */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Hộp tích chọn vị trí cụ thể: Tỉnh/Thành -> Quận/Huyện -> Phường/Xã */}
          <div ref={addressBoxRef} className="md:col-span-7 relative">
            <div
              onClick={() => setShowLocationMenu((prev) => !prev)}
              className="flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-primary-400 rounded-xl px-3.5 py-2.5 transition-all cursor-pointer select-none shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-600 shrink-0">
                  <MapPin size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-slate-500">
                    Khu vực đang chọn
                  </div>
                  <div className="text-sm font-bold text-slate-800 truncate">
                    {userAddress}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all">
                  <span>Đổi khu vực</span>
                  <ChevronDown size={14} className={`transition-transform ${showLocationMenu ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </div>

            {/* BẢNG TÍCH CHỌN 3 CẤP: TỈNH/THÀNH -> QUẬN/HUYỆN -> PHƯỜNG/XÃ */}
            {showLocationMenu && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-[900] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Thanh Tabs 3 bước rõ ràng */}
                <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                    {/* Bước 1: Tỉnh/Thành phố */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('PROVINCE');
                        setMenuFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0 ${
                        activeTab === 'PROVINCE'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <span>1. Tỉnh/Thành:</span>
                      <span className="underline">{selectedProvince.shortName}</span>
                    </button>

                    <ChevronRight size={14} className="text-slate-400 shrink-0" />

                    {/* Bước 2: Quận/Huyện/TP thuộc Tỉnh đã chọn */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('DISTRICT');
                        setMenuFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0 ${
                        activeTab === 'DISTRICT'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <span>2. Quận/Huyện:</span>
                      <span className="underline">
                        {selectedDistrict ? selectedDistrict.name : 'Chọn Quận/Huyện'}
                      </span>
                    </button>

                    <ChevronRight size={14} className="text-slate-400 shrink-0" />

                    {/* Bước 3: Phường/Xã thuộc Quận đã chọn */}
                    <button
                      type="button"
                      disabled={!selectedDistrict}
                      onClick={() => {
                        if (selectedDistrict) {
                          setActiveTab('WARD');
                          setMenuFilter('');
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-40 ${
                        activeTab === 'WARD'
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <span>3. Phường/Xã:</span>
                      <span className="underline">
                        {selectedWard ? selectedWard.name : 'Chọn Phường/Xã'}
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLocationMenu(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg"
                    title="Đóng bảng chọn"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Thanh tìm nhanh trong cấp đang mở */}
                <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex-1">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={menuFilter}
                      onChange={(e) => setMenuFilter(e.target.value)}
                      placeholder={
                        activeTab === 'PROVINCE'
                          ? 'Tìm nhanh Tỉnh / Thành phố...'
                          : activeTab === 'DISTRICT'
                          ? `Tìm Quận / Huyện / Thành phố thuộc ${selectedProvince.name}...`
                          : `Tìm Phường / Xã / Thị trấn thuộc ${selectedDistrict?.full_name || ''}...`
                      }
                      className="w-full text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                    {menuFilter && (
                      <button type="button" onClick={() => setMenuFilter('')}>
                        <X size={13} className="text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowLocationMenu(false)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-sm transition-colors shrink-0"
                  >
                    Xác nhận vị trí
                  </button>
                </div>

                {/* Danh sách đơn vị hành chính có ô tích (Checkbox) */}
                <div className="max-h-72 overflow-y-auto p-3">
                  {loadingUnits ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 size={24} className="animate-spin text-primary-600" />
                      <span className="text-xs font-bold">
                        Đang tải danh sách đơn vị hành chính của {selectedProvince.name}...
                      </span>
                    </div>
                  ) : activeTab === 'PROVINCE' ? (
                    /* TAB 1: TÍCH CHỌN 63 TỈNH / THÀNH PHỐ */
                    <div>
                      <div className="mb-2 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                        Bước 1: Tích chọn Tỉnh / Thành phố ({filteredProvinces.length})
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {filteredProvinces.map((prov) => {
                          const isChecked = selectedProvince.id === prov.id;
                          return (
                            <button
                              key={prov.id}
                              type="button"
                              onClick={() => handleTickProvince(prov)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                                isChecked
                                  ? 'bg-primary-50 text-primary-700 border-primary-300 font-bold shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200/70 hover:bg-slate-50 hover:border-primary-200'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={isChecked}
                                  className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                                />
                                <span className="truncate">{prov.name}</span>
                              </span>
                              <ChevronRight size={13} className="text-slate-400 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : activeTab === 'DISTRICT' ? (
                    /* TAB 2: TÍCH CHỌN QUẬN / HUYỆN / THÀNH PHỐ / THỊ XÃ CỦA ĐÚNG TỈNH ĐÓ */
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                          Bước 2: Quận / Huyện / Thành phố thuộc <strong className="text-primary-600">{selectedProvince.name}</strong> ({filteredDistricts.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('PROVINCE')}
                          className="text-xs font-bold text-primary-600 hover:underline"
                        >
                          &larr; Đổi Tỉnh khác
                        </button>
                      </div>

                      {filteredDistricts.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Không tìm thấy Quận/Huyện nào khớp từ khóa
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {filteredDistricts.map((dist) => {
                            const isChecked = selectedDistrict?.id === dist.id;
                            return (
                              <button
                                key={dist.id}
                                type="button"
                                onClick={() => handleTickDistrict(dist)}
                                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-left border transition-all ${
                                  isChecked
                                    ? 'bg-primary-600 text-white border-primary-600 font-bold shadow-sm'
                                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-primary-300'
                                }`}
                              >
                                <span className="flex items-center gap-2.5 truncate">
                                  <input
                                    type="checkbox"
                                    readOnly
                                    checked={isChecked}
                                    className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                                  />
                                  <span className="truncate">{dist.full_name}</span>
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                  isChecked ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  Chọn Phường/Xã &rarr;
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* TAB 3: TÍCH CHỌN PHƯỜNG / XÃ / THỊ TRẤN CỤ THỂ CỦA QUẬN ĐÓ */
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
                          Bước 3: Phường / Xã thuộc <strong className="text-primary-600">{selectedDistrict?.full_name}, {selectedProvince.name}</strong> ({filteredWards.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('DISTRICT')}
                          className="text-xs font-bold text-primary-600 hover:underline"
                        >
                          &larr; Đổi Quận/Huyện khác
                        </button>
                      </div>

                      {/* Tùy chọn giữ nguyên toàn bộ Quận/Huyện */}
                      {selectedDistrict && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWard(null);
                            setUserAddress(`${selectedDistrict.full_name}, ${selectedProvince.name}`);
                            setUserCoords({ lat: selectedDistrict.latitude, lng: selectedDistrict.longitude });
                            setShowLocationMenu(false);
                          }}
                          className="w-full mb-2 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-all"
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              readOnly
                              checked={!selectedWard}
                              className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                            />
                            <span>📍 Lấy trung tâm toàn {selectedDistrict.full_name}, {selectedProvince.name}</span>
                          </span>
                          <Check size={14} />
                        </button>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {filteredWards.map((ward) => {
                          const isChecked = selectedWard?.id === ward.id;
                          return (
                            <button
                              key={ward.id}
                              type="button"
                              onClick={() => handleTickWard(ward)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left border transition-all ${
                                isChecked
                                  ? 'bg-primary-600 text-white border-primary-600 font-bold shadow-sm'
                                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-primary-300'
                              }`}
                            >
                              <span className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  readOnly
                                  checked={isChecked}
                                  className="rounded text-primary-600 focus:ring-0 pointer-events-none"
                                />
                                <span className="truncate">{ward.full_name}</span>
                              </span>
                              {isChecked && <Check size={13} className="shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Chọn bán kính (Pills 5km, 10km, 15km, 20km) */}
          <div className="md:col-span-5 flex items-center justify-between md:justify-end gap-2">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">Bán kính:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {[5, 10, 15, 20].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => setRadiusKm(km)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    radiusKm === km
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Phần thân: Bản đồ và Danh sách việc làm gần */}
      <div className="grid grid-cols-1 lg:grid-cols-12 rounded-b-2xl overflow-hidden">
        {/* Bản đồ Leaflet */}
        <div className="lg:col-span-7 h-[380px] lg:h-[500px] relative">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Chú thích trên bản đồ */}
          <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-md border border-slate-200 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span> Vị trí của bạn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span> Việc làm ({nearbyJobs.length})
            </span>
          </div>
        </div>

        {/* Danh sách công việc gần bạn */}
        <div className="lg:col-span-5 h-[380px] lg:h-[500px] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-100 bg-slate-50/50">
          <div className="p-4 border-b border-slate-200/80 bg-white flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Có <strong className="text-primary-600 font-black">{nearbyJobs.length} việc làm</strong> trong {radiusKm}km
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Sắp xếp theo khoảng cách</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {nearbyJobs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <AlertCircle size={40} className="mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-600">Không có việc làm trong bán kính {radiusKm}km</p>
                <p className="text-xs mt-1 text-slate-400">
                  Hãy thử tăng bán kính lên 15km hoặc 20km, hoặc chọn Quận/Tỉnh khác.
                </p>
              </div>
            ) : (
              nearbyJobs.map((job) => {
                const isSelected = selectedJob?.id === job.id;
                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      setSelectedJob(job);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([job.coords.lat, job.coords.lng], 14, {
                          animate: true,
                        });
                      }
                    }}
                    className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary-500 ring-2 ring-primary-100 shadow-md'
                        : 'border-slate-200/80 hover:border-primary-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-black text-sm text-slate-900 hover:text-primary-600 transition-colors line-clamp-1">
                        {job.title}
                      </h4>
                      <span className="shrink-0 bg-blue-50 text-blue-700 text-[11px] font-black px-2 py-0.5 rounded-full border border-blue-100">
                        ~{job.distanceKm} km
                      </span>
                    </div>

                    <p className="text-xs font-bold text-primary-600 mb-2">{job.company?.name}</p>

                    <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </span>
                      {job.salary && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-600 shrink-0">
                          <DollarSign size={12} /> {job.salary}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">
                        {job.requireCV ? '📄 Yêu cầu CV' : '⚡ CV không bắt buộc'}
                      </span>
                      <Link
                        to={`/jobs/${job.id}`}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        Xem chi tiết <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobNearbyMap;
