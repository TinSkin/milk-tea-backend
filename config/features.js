import dotenv from 'dotenv';

dotenv.config();

export const FEATURES = {
  // Feature flag để bật/tắt xác minh email Google
  googleEmailVerification: process.env.GOOGLE_EMAIL_VERIFICATION === 'true',
  
  // Ngưỡng giá trị đơn hàng để yêu cầu bật/tắt xác minh email (tính bằng VND)
  verificationThreshold: parseInt(process.env.VERIFICATION_ORDER_THRESHOLD) || 0,
  
  // Kiểm tra môi trường
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Debug cấu hình feature hiện tại
if (FEATURES.isDevelopment) {
  console.log('Cấu hình Feature:');
  console.log('- Xác minh Email Google:', FEATURES.googleEmailVerification);
  console.log('- Ngưỡng xác minh:', FEATURES.verificationThreshold, 'VND');
  console.log('- Môi trường:', process.env.NODE_ENV);
}

export default FEATURES;