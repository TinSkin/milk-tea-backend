import { FEATURES } from '../config/features.js';

export const shouldVerifyGoogleUser = (user, context = {}) => {
  // Kiểm tra feature flag - nếu tắt thì không bao giờ xác minh
  if (!FEATURES.googleEmailVerification) {
    return false;
  }

  // Danh sách các quy tắc xác minh
  const verificationRules = [
    // Quy tắc 1: Người dùng lần đầu (tài khoản mới)
    () => isNewUser(user),

    // Quy tắc 2: Đơn hàng giá trị cao
    () => context.orderValue > FEATURES.verificationThreshold,

    // Quy tắc 3: Email doanh nghiệp (tùy chọn)
    () => isCorporateEmail(user.email),

    // Quy tắc 4: Môi trường production (mục đích demo)
    () => FEATURES.isProduction,

    // Quy tắc 5: Hoạt động đáng nghi (có thể mở rộng)
    () => hasSuspiciousActivity(user, context)
  ];

  // Áp dụng quy tắc - nếu BẤT KỲ quy tắc nào trả về true, yêu cầu xác minh
  return verificationRules.some(rule => {
    try {
      return rule();
    } catch (error) {
      console.error('Verification rule error:', error);
      return false; // Mặc định không xác minh nếu quy tắc bị lỗi
    }
  });
};

//! Kiểm tra người dùng có mới hay không
const isNewUser = (user) => {
  // Nếu người dùng không có lastLogin hoặc đây là lần đăng nhập đầu tiên
  return !user.lastLogin || isFirstLogin(user);
};

//! Kiểm tra đây có phải lần đăng nhập đầu tiên của người dùng
const isFirstLogin = (user) => {
  // Kiểm tra đơn giản: nếu createdAt và lastLogin rất gần nhau (trong vòng 1 phút)
  if (!user.createdAt || !user.lastLogin) return true;

  const timeDiff = Math.abs(user.lastLogin - user.createdAt);
  return timeDiff < 60000; // Chênh lệch ít hơn 1 phút
};

//! Kiểm tra domain email có phải là doanh nghiệp
const isCorporateEmail = (email) => {
  const corporateDomains = [
    'company.com',
    'enterprise.vn',
    // Thêm các domain doanh nghiệp khác khi cần
  ];

  const domain = email.split('@')[1];
  return corporateDomains.includes(domain);
};

//! Kiểm tra hoạt động đáng nghi (có thể mở rộng)
const hasSuspiciousActivity = (user, context) => {
  // Các quy tắc ví dụ (mở rộng khi cần):

  // Nhiều lần thử đăng nhập nhanh chóng
  if (context.rapidLoginAttempts > 3) {
    return true;
  }

  // Đăng nhập từ vị trí khác (nếu được triển khai)
  if (context.locationMismatch) {
    return true;
  }

  // Mặc định: không có hoạt động đáng nghi
  return false;
};

//! Lấy lý do xác minh để ghi log/debug
export const getVerificationReason = (user, context = {}) => {
  if (!FEATURES.googleEmailVerification) return 'Feature disabled';

  if (isNewUser(user)) return 'New user account';
  if (context.orderValue > FEATURES.verificationThreshold) return 'High-value order';
  if (isCorporateEmail(user.email)) return 'Corporate email domain';
  if (FEATURES.isProduction) return 'Production environment';
  if (hasSuspiciousActivity(user, context)) return 'Suspicious activity detected';

  return 'No verification required';
};

export default {
  shouldVerifyGoogleUser,
  getVerificationReason
};