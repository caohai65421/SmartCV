/**
 * Danh sách 63 tỉnh thành Việt Nam (kèm mã hành chính GSO 2 chữ số và tọa độ trung tâm)
 * Hỗ trợ chọn 3 cấp: Tỉnh/Thành phố -> Quận/Huyện/Thành phố/Thị xã -> Phường/Xã/Thị trấn
 */

export interface Province {
  id: string;
  code: string; // Mã tỉnh 2 chữ số chuẩn Tổng cục Thống kê (dùng lấy Quận/Huyện/Phường/Xã)
  name: string;
  shortName: string;
  region: 'Bắc' | 'Trung' | 'Nam';
  isMajor?: boolean;
  lat: number;
  lng: number;
}

export interface AdminUnit {
  id: string;
  name: string;
  full_name: string;
  latitude: number;
  longitude: number;
}

export const VIETNAM_PROVINCES: Province[] = [
  // Đô thị trực thuộc Trung ương & Trọng điểm
  { id: 'HN', code: '01', name: 'Hà Nội', shortName: 'Hà Nội', region: 'Bắc', isMajor: true, lat: 21.0285, lng: 105.8542 },
  { id: 'HCM', code: '79', name: 'TP. Hồ Chí Minh', shortName: 'TP.HCM', region: 'Nam', isMajor: true, lat: 10.7764, lng: 106.7011 },
  { id: 'DN', code: '48', name: 'Đà Nẵng', shortName: 'Đà Nẵng', region: 'Trung', isMajor: true, lat: 16.0680, lng: 108.2120 },
  { id: 'HP', code: '31', name: 'Hải Phòng', shortName: 'Hải Phòng', region: 'Bắc', isMajor: true, lat: 20.8589, lng: 106.6750 },
  { id: 'CT', code: '92', name: 'Cần Thơ', shortName: 'Cần Thơ', region: 'Nam', isMajor: true, lat: 10.0365, lng: 105.7876 },
  { id: 'BD', code: '74', name: 'Bình Dương', shortName: 'Bình Dương', region: 'Nam', isMajor: true, lat: 11.1837, lng: 106.7032 },
  { id: 'DNAI', code: '75', name: 'Đồng Nai', shortName: 'Đồng Nai', region: 'Nam', isMajor: true, lat: 11.0356, lng: 107.1881 },
  { id: 'VT', code: '77', name: 'Bà Rịa - Vũng Tàu', shortName: 'Vũng Tàu', region: 'Nam', isMajor: true, lat: 10.5739, lng: 107.3284 },
  { id: 'BN', code: '27', name: 'Bắc Ninh', shortName: 'Bắc Ninh', region: 'Bắc', isMajor: true, lat: 21.0956, lng: 106.1265 },
  { id: 'QN', code: '22', name: 'Quảng Ninh', shortName: 'Quảng Ninh', region: 'Bắc', isMajor: true, lat: 21.1718, lng: 107.2013 },

  // Miền Bắc
  { id: 'BG', code: '24', name: 'Bắc Giang', shortName: 'Bắc Giang', region: 'Bắc', lat: 21.3170, lng: 106.4380 },
  { id: 'BK', code: '06', name: 'Bắc Kạn', shortName: 'Bắc Kạn', region: 'Bắc', lat: 22.2572, lng: 105.8204 },
  { id: 'CB', code: '04', name: 'Cao Bằng', shortName: 'Cao Bằng', region: 'Bắc', lat: 22.7427, lng: 106.1061 },
  { id: 'DB', code: '11', name: 'Điện Biên', shortName: 'Điện Biên', region: 'Bắc', lat: 21.6547, lng: 103.2169 },
  { id: 'HD', code: '30', name: 'Hải Dương', shortName: 'Hải Dương', region: 'Bắc', lat: 20.8931, lng: 106.3725 },
  { id: 'HGI', code: '02', name: 'Hà Giang', shortName: 'Hà Giang', region: 'Bắc', lat: 22.7336, lng: 105.0027 },
  { id: 'HNAM', code: '35', name: 'Hà Nam', shortName: 'Hà Nam', region: 'Bắc', lat: 20.5340, lng: 105.9810 },
  { id: 'HB', code: '17', name: 'Hòa Bình', shortName: 'Hòa Bình', region: 'Bắc', lat: 20.6763, lng: 105.3760 },
  { id: 'HY', code: '33', name: 'Hưng Yên', shortName: 'Hưng Yên', region: 'Bắc', lat: 20.7834, lng: 106.0699 },
  { id: 'LC', code: '12', name: 'Lai Châu', shortName: 'Lai Châu', region: 'Bắc', lat: 22.2922, lng: 103.1799 },
  { id: 'LCAI', code: '10', name: 'Lào Cai', shortName: 'Lào Cai', region: 'Bắc', lat: 22.3069, lng: 104.1830 },
  { id: 'LS', code: '20', name: 'Lạng Sơn', shortName: 'Lạng Sơn', region: 'Bắc', lat: 21.8488, lng: 106.6141 },
  { id: 'ND', code: '36', name: 'Nam Định', shortName: 'Nam Định', region: 'Bắc', lat: 20.2686, lng: 106.2289 },
  { id: 'NB', code: '37', name: 'Ninh Bình', shortName: 'Ninh Bình', region: 'Bắc', lat: 20.2051, lng: 105.9281 },
  { id: 'PT', code: '25', name: 'Phú Thọ', shortName: 'Phú Thọ', region: 'Bắc', lat: 21.3008, lng: 105.1350 },
  { id: 'SL', code: '14', name: 'Sơn La', shortName: 'Sơn La', region: 'Bắc', lat: 21.2277, lng: 104.1576 },
  { id: 'TB', code: '34', name: 'Thái Bình', shortName: 'Thái Bình', region: 'Bắc', lat: 20.5297, lng: 106.3876 },
  { id: 'TN', code: '19', name: 'Thái Nguyên', shortName: 'Thái Nguyên', region: 'Bắc', lat: 21.6499, lng: 105.8351 },
  { id: 'TQ', code: '08', name: 'Tuyên Quang', shortName: 'Tuyên Quang', region: 'Bắc', lat: 22.0748, lng: 105.2584 },
  { id: 'VP', code: '26', name: 'Vĩnh Phúc', shortName: 'Vĩnh Phúc', region: 'Bắc', lat: 21.3779, lng: 105.5758 },
  { id: 'YB', code: '15', name: 'Yên Bái', shortName: 'Yên Bái', region: 'Bắc', lat: 21.8269, lng: 104.6631 },

  // Miền Trung & Tây Nguyên
  { id: 'TH', code: '38', name: 'Thanh Hóa', shortName: 'Thanh Hóa', region: 'Trung', lat: 19.9782, lng: 105.4816 },
  { id: 'NA', code: '40', name: 'Nghệ An', shortName: 'Nghệ An', region: 'Trung', lat: 19.1976, lng: 105.0607 },
  { id: 'HT', code: '42', name: 'Hà Tĩnh', shortName: 'Hà Tĩnh', region: 'Trung', lat: 18.3505, lng: 105.7623 },
  { id: 'QB', code: '44', name: 'Quảng Bình', shortName: 'Quảng Bình', region: 'Trung', lat: 17.5096, lng: 106.4004 },
  { id: 'QT', code: '45', name: 'Quảng Trị', shortName: 'Quảng Trị', region: 'Trung', lat: 16.7898, lng: 106.9797 },
  { id: 'TTH', code: '46', name: 'Thừa Thiên Huế', shortName: 'Huế', region: 'Trung', lat: 16.3481, lng: 107.5399 },
  { id: 'QNAM', code: '49', name: 'Quảng Nam', shortName: 'Quảng Nam', region: 'Trung', lat: 15.5762, lng: 108.0527 },
  { id: 'QNG', code: '51', name: 'Quảng Ngãi', shortName: 'Quảng Ngãi', region: 'Trung', lat: 14.9954, lng: 108.6917 },
  { id: 'BDINH', code: '52', name: 'Bình Định', shortName: 'Bình Định', region: 'Trung', lat: 14.0779, lng: 108.9899 },
  { id: 'PY', code: '54', name: 'Phú Yên', shortName: 'Phú Yên', region: 'Trung', lat: 13.1913, lng: 109.1274 },
  { id: 'KH', code: '56', name: 'Khánh Hòa', shortName: 'Khánh Hòa (Nha Trang)', region: 'Trung', lat: 12.2981, lng: 108.9950 },
  { id: 'NT', code: '58', name: 'Ninh Thuận', shortName: 'Ninh Thuận', region: 'Trung', lat: 11.6966, lng: 108.8928 },
  { id: 'BT', code: '60', name: 'Bình Thuận', shortName: 'Bình Thuận (Phan Thiết)', region: 'Trung', lat: 11.1042, lng: 108.1833 },
  { id: 'KT', code: '62', name: 'Kon Tum', shortName: 'Kon Tum', region: 'Trung', lat: 14.6995, lng: 107.9324 },
  { id: 'GL', code: '64', name: 'Gia Lai', shortName: 'Gia Lai', region: 'Trung', lat: 13.8177, lng: 108.2004 },
  { id: 'DL', code: '66', name: 'Đắk Lắk', shortName: 'Đắk Lắk (Buôn Ma Thuột)', region: 'Trung', lat: 12.8292, lng: 108.2999 },
  { id: 'DNO', code: '67', name: 'Đắk Nông', shortName: 'Đắk Nông', region: 'Trung', lat: 12.2819, lng: 107.7302 },
  { id: 'LD', code: '68', name: 'Lâm Đồng', shortName: 'Lâm Đồng (Đà Lạt)', region: 'Trung', lat: 11.6615, lng: 108.1335 },

  // Miền Nam & Tây Nam Bộ
  { id: 'BP', code: '70', name: 'Bình Phước', shortName: 'Bình Phước', region: 'Nam', lat: 11.7543, lng: 106.9266 },
  { id: 'TNI', code: '72', name: 'Tây Ninh', shortName: 'Tây Ninh', region: 'Nam', lat: 11.4019, lng: 106.1627 },
  { id: 'LA', code: '80', name: 'Long An', shortName: 'Long An', region: 'Nam', lat: 10.6984, lng: 106.1884 },
  { id: 'TG', code: '82', name: 'Tiền Giang', shortName: 'Tiền Giang', region: 'Nam', lat: 10.4030, lng: 106.3616 },
  { id: 'BTR', code: '83', name: 'Bến Tre', shortName: 'Bến Tre', region: 'Nam', lat: 10.1094, lng: 106.4812 },
  { id: 'TV', code: '84', name: 'Trà Vinh', shortName: 'Trà Vinh', region: 'Nam', lat: 9.8038, lng: 106.3257 },
  { id: 'VL', code: '86', name: 'Vĩnh Long', shortName: 'Vĩnh Long', region: 'Nam', lat: 10.1203, lng: 106.0126 },
  { id: 'DT', code: '87', name: 'Đồng Tháp', shortName: 'Đồng Tháp', region: 'Nam', lat: 10.5904, lng: 105.6802 },
  { id: 'AG', code: '89', name: 'An Giang', shortName: 'An Giang', region: 'Nam', lat: 10.5392, lng: 105.2313 },
  { id: 'KG', code: '91', name: 'Kiên Giang', shortName: 'Kiên Giang (Phú Quốc)', region: 'Nam', lat: 9.9905, lng: 105.2435 },
  { id: 'HG', code: '93', name: 'Hậu Giang', shortName: 'Hậu Giang', region: 'Nam', lat: 9.7985, lng: 105.6380 },
  { id: 'ST', code: '94', name: 'Sóc Trăng', shortName: 'Sóc Trăng', region: 'Nam', lat: 9.5628, lng: 105.9494 },
  { id: 'BL', code: '95', name: 'Bạc Liêu', shortName: 'Bạc Liêu', region: 'Nam', lat: 9.3298, lng: 105.5099 },
  { id: 'CM', code: '96', name: 'Cà Mau', shortName: 'Cà Mau', region: 'Nam', lat: 9.0180, lng: 105.0870 }
];

// Cache dữ liệu Quận/Huyện và Phường/Xã để phản hồi tức thì
const districtCache: Record<string, AdminUnit[]> = {};
const wardCache: Record<string, AdminUnit[]> = {};

/**
 * Lấy danh sách Quận / Huyện / Thành phố / Thị xã thuộc một Tỉnh/Thành phố (theo mã code 2 số)
 */
export async function fetchDistrictsByProvinceCode(provinceCode: string): Promise<AdminUnit[]> {
  if (districtCache[provinceCode]) {
    return districtCache[provinceCode];
  }
  try {
    const res = await fetch(`https://esgoo.net/api-tinhthanh/2/${provinceCode}.htm`);
    const json = await res.json();
    if (json && json.error === 0 && Array.isArray(json.data)) {
      const units: AdminUnit[] = json.data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        full_name: item.full_name,
        latitude: parseFloat(item.latitude) || 21.0285,
        longitude: parseFloat(item.longitude) || 105.8542,
      }));
      districtCache[provinceCode] = units;
      return units;
    }
  } catch (err) {
    console.warn('Không lấy được danh sách Quận/Huyện từ API:', err);
  }
  return [];
}

/**
 * Lấy danh sách Phường / Xã / Thị trấn thuộc một Quận/Huyện (theo mã districtId 3 số)
 */
export async function fetchWardsByDistrictId(districtId: string): Promise<AdminUnit[]> {
  if (wardCache[districtId]) {
    return wardCache[districtId];
  }
  try {
    const res = await fetch(`https://esgoo.net/api-tinhthanh/3/${districtId}.htm`);
    const json = await res.json();
    if (json && json.error === 0 && Array.isArray(json.data)) {
      const units: AdminUnit[] = json.data.map((item: any) => ({
        id: String(item.id),
        name: item.name,
        full_name: item.full_name,
        latitude: parseFloat(item.latitude) || 21.0285,
        longitude: parseFloat(item.longitude) || 105.8542,
      }));
      wardCache[districtId] = units;
      return units;
    }
  } catch (err) {
    console.warn('Không lấy được danh sách Phường/Xã từ API:', err);
  }
  return [];
}

/**
 * Tính khoảng cách đường chim bay giữa 2 điểm tọa độ (công thức Haversine)
 * @returns Khoảng cách theo km (làm tròn 1 chữ số thập phân)
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Bán kính trái đất tính bằng km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Tọa độ các quận/khu vực phổ biến phục vụ định vị công việc
 */
export const POPULAR_DISTRICT_COORDS: Record<string, { lat: number; lng: number }> = {
  // Hà Nội
  'cầu giấy': { lat: 21.0333, lng: 105.7937 },
  'hoàn kiếm': { lat: 21.0285, lng: 105.8542 },
  'đống đa': { lat: 21.0181, lng: 105.8272 },
  'ba đình': { lat: 21.0341, lng: 105.8249 },
  'hai bà trưng': { lat: 21.0069, lng: 105.8524 },
  'nam từ liêm': { lat: 21.0163, lng: 105.7643 },
  'bắc từ liêm': { lat: 21.0631, lng: 105.7562 },
  'thanh xuân': { lat: 20.9937, lng: 105.8118 },
  'hà đông': { lat: 20.9723, lng: 105.7766 },
  'hoàng mai': { lat: 20.9754, lng: 105.8538 },
  'long biên': { lat: 21.0362, lng: 105.8906 },
  'tây hồ': { lat: 21.0667, lng: 105.8167 },
  'gia lâm': { lat: 21.0191, lng: 105.9381 },
  'đông anh': { lat: 21.1365, lng: 105.8466 },
  'thanh trì': { lat: 20.9412, lng: 105.8472 },
  'hoài đức': { lat: 21.0225, lng: 105.7022 },

  // TP. Hồ Chí Minh
  'quận 10': { lat: 10.7746, lng: 106.6669 },
  'quận 11': { lat: 10.7639, lng: 106.6436 },
  'quận 12': { lat: 10.8672, lng: 106.6413 },
  'quận 1': { lat: 10.7758, lng: 106.7004 },
  'quận 2': { lat: 10.7872, lng: 106.7498 },
  'quận 3': { lat: 10.7844, lng: 106.6843 },
  'quận 4': { lat: 10.7578, lng: 106.7013 },
  'quận 5': { lat: 10.7554, lng: 106.6631 },
  'quận 6': { lat: 10.7481, lng: 106.6352 },
  'quận 7': { lat: 10.7340, lng: 106.7218 },
  'quận 8': { lat: 10.7241, lng: 106.6286 },
  'quận 9': { lat: 10.8428, lng: 106.8287 },
  'bình thạnh': { lat: 10.8106, lng: 106.7091 },
  'phú nhuận': { lat: 10.7992, lng: 106.6803 },
  'tân bình': { lat: 10.8015, lng: 106.6558 },
  'tân phú': { lat: 10.7901, lng: 106.6281 },
  'gò vấp': { lat: 10.8387, lng: 106.6653 },
  'bình tân': { lat: 10.7653, lng: 106.6039 },
  'thủ đức': { lat: 10.8494, lng: 106.7537 },

  // Đà Nẵng
  'hải châu': { lat: 16.0667, lng: 108.2167 },
  'thanh khê': { lat: 16.0617, lng: 108.1817 },
  'sơn trà': { lat: 16.0833, lng: 108.2500 },
  'ngũ hành sơn': { lat: 16.0000, lng: 108.2500 },
  'liên chiểu': { lat: 16.0592, lng: 108.1583 },
  'cẩm lệ': { lat: 16.0175, lng: 108.1925 }
};

/**
 * Trích xuất hoặc ước lượng tọa độ dựa trên chuỗi địa chỉ
 */
export function estimateCoordsFromLocation(locationText: string): { lat: number; lng: number } {
  if (!locationText) return { lat: 21.0285, lng: 105.8542 };

  const normalized = locationText.toLowerCase();

  // 1. Kiểm tra trong cache Quận/Huyện đã tải
  for (const units of Object.values(districtCache)) {
    for (const u of units) {
      if (normalized.includes(u.full_name.toLowerCase()) || normalized.includes(u.name.toLowerCase())) {
        return { lat: u.latitude, lng: u.longitude };
      }
    }
  }

  // 2. Kiểm tra theo quận/huyện phổ biến
  for (const [district, coords] of Object.entries(POPULAR_DISTRICT_COORDS)) {
    if (normalized.includes(district)) {
      return coords;
    }
  }

  // 3. Kiểm tra theo tỉnh/thành phố
  for (const province of VIETNAM_PROVINCES) {
    if (
      normalized.includes(province.name.toLowerCase()) ||
      normalized.includes(province.shortName.toLowerCase())
    ) {
      return { lat: province.lat, lng: province.lng };
    }
  }

  return { lat: 21.0285, lng: 105.8542 };
}
