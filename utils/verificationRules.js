import { FEATURES } from '../config/features.js';

/** Determine if a Google user needs additional email verification
@param {Object} user - User object
@param {Object} context - Additional context (order info, etc.)
@returns {boolean} - True if verification is required **/

export const shouldVerifyGoogleUser = (user, context = {}) => {
  // Feature flag check - if disabled, never verify
  if (!FEATURES.googleEmailVerification) {
    return false;
  }

  // List of verification rules
  const verificationRules = [
    // Rule 1: First-time users (new accounts)
    () => isNewUser(user),
    
    // Rule 2: High-value order context
    () => context.orderValue > FEATURES.verificationThreshold,
    
    // Rule 3: Corporate email domains (optional)
    () => isCorporateEmail(user.email),
    
    // Rule 4: Production environment (demo purposes)
    () => FEATURES.isProduction,
    
    // Rule 5: Suspicious activity (can be extended)
    () => hasSuspiciousActivity(user, context)
  ];

  // Apply rules - if ANY rule returns true, verification is required
  return verificationRules.some(rule => {
    try {
      return rule();
    } catch (error) {
      console.error('Verification rule error:', error);
      return false; // Default to no verification if rule fails
    }
  });
};

// Check if user is new or not
const isNewUser = (user) => {
  // If user doesn't have lastLogin or it's their first login
  return !user.lastLogin || isFirstLogin(user);
};

// Check if this is user's first login
const isFirstLogin = (user) => {
  // Simple check: if createdAt and lastLogin are very close (within 1 minute)
  if (!user.createdAt || !user.lastLogin) return true;
  
  const timeDiff = Math.abs(user.lastLogin - user.createdAt);
  return timeDiff < 60000; // Less than 1 minute difference
};

/**
 * Check if email domain is corporate
 */
const isCorporateEmail = (email) => {
  const corporateDomains = [
    'company.com',
    'enterprise.vn',
    // Add more corporate domains as needed
  ];
  
  const domain = email.split('@')[1];
  return corporateDomains.includes(domain);
};

/**
 * Check for suspicious activity (can be extended)
 */
const hasSuspiciousActivity = (user, context) => {
  // Example rules (extend as needed):
  
  // Multiple rapid login attempts
  if (context.rapidLoginAttempts > 3) {
    return true;
  }
  
  // Login from different location (if implemented)
  if (context.locationMismatch) {
    return true;
  }
  
  // Default: no suspicious activity
  return false;
};

/**
 * Get verification reason for logging/debugging
 */
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