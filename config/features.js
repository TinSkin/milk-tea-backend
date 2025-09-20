import dotenv from 'dotenv';

dotenv.config();

export const FEATURES = {
  // Feature flag to enable/disable Google email verification
  googleEmailVerification: process.env.GOOGLE_EMAIL_VERIFICATION === 'true',
  
  // Order value threshold for requiring to enable/disable email verification (in VND)
  verificationThreshold: parseInt(process.env.VERIFICATION_ORDER_THRESHOLD) || 0,
  
  // Environment checks
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Debugging current feature configuration
if (FEATURES.isDevelopment) {
  console.log('🎛️  Feature Configuration:');
  console.log('- Google Email Verification:', FEATURES.googleEmailVerification);
  console.log('- Verification Threshold:', FEATURES.verificationThreshold, 'VND');
  console.log('- Environment:', process.env.NODE_ENV);
}

export default FEATURES;