const resendEmailCache = new Map(); // In-memory cache to store resend email timestamps
const RATE_LIMIT_RESEND_EMAIL = 60 * 1000; // 1 minute in milliseconds
const MAX_PER_HOUR = 10;             // Maximum resend requests per hour
const WINDOW_MS = 60 * 60 * 1000;   // 1 hour in milliseconds

//! Middleware limits the number of resend verification email requests to 1 per minute.
export const rateLimitResendEmail = (req, res, next) => {
    const email = (req.body.email || "").trim().toLowerCase();

    // Check if email is provided
    if (!email) {
        return res.status(400).json({ success: false, message: "Email là bắt buộc" });
    }

    // Check rate limit
    const now = Date.now();
    let data = resendEmailCache.get(email) || { lastSentAt: 0, timestamps: [] };

    // Filter timestamps older than 1 hour
    data.timestamps = data.timestamps.filter(ts => now - ts < WINDOW_MS);

    const usedInWindow = data.timestamps.length;
    const remaining = Math.max(0, MAX_PER_HOUR - usedInWindow);

    // If resend email or OTP is over 5 times/hour
    if (usedInWindow >= MAX_PER_HOUR) {
        const oldest = Math.min(...data.timestamps);
        const resetMs = WINDOW_MS - (now - oldest);
        const resetSec = Math.max(1, Math.ceil(resetMs / 1000));

        res.set({
            "RateLimit-Limit": String(MAX_PER_HOUR),
            "RateLimit-Remaining": "0",
            "RateLimit-Reset": String(resetSec),
            "Retry-After": String(resetSec)
        });

        return res.status(429).json({
            success: false,
            code: "RESEND_HOURLY_LIMIT",
            message: `Bạn đã đạt giới hạn ${MAX_PER_HOUR}/giờ. Vui lòng thử lại sau ${resetSec}s.`,
            meta: { retryAfterSec: resetSec, remainingInWindow: 0 }
        });
    }

    const sinceLast = now - data.lastSentAt;
    if (sinceLast < RATE_LIMIT_RESEND_EMAIL) {
        const waitSec = Math.ceil((RATE_LIMIT_RESEND_EMAIL - sinceLast) / 1000);

        // Calculate time until window reset
        const firstTs = usedInWindow ? Math.min(...data.timestamps) : now;
        const windowResetSec = Math.max(1, Math.ceil((WINDOW_MS - (now - firstTs)) / 1000));

        res.set({
            "RateLimit-Limit": String(MAX_PER_HOUR),
            "RateLimit-Remaining": String(remaining),
            "RateLimit-Reset": String(windowResetSec),
            "Retry-After": String(waitSec)
        });

        return res.status(429).json({
            success: false,
            code: "RESEND_COOLDOWN",
            message: `Vui lòng đợi ${waitSec}s trước khi gửi lại mã xác thực.`,
            meta: { retryAfterSec: waitSec, remainingInWindow: remaining }
        });
    }

    // Update the last sent time for this email
    data.lastSentAt = now;
    data.timestamps.push(now);
    resendEmailCache.set(email, data);

    // Return rate limit headers for show how many times left to resend
    const firstTs = data.timestamps[0] || now;
    const resetSec = Math.max(1, Math.ceil((WINDOW_MS - (now - firstTs)) / 1000));
    res.set({
        "RateLimit-Limit": String(MAX_PER_HOUR),
        "RateLimit-Remaining": String(Math.max(0, MAX_PER_HOUR - data.timestamps.length)),
        "RateLimit-Reset": String(resetSec)
    });

    next();
};