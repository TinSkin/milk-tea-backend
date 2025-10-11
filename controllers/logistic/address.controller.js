import fetch from "node-fetch";

//! Fetch với timeout: tránh trường hợp API provinces.open-api.vn bị treo (không trả về).
const fetchWithTimeout = async (url, ms = 5000, options = {}) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
};

//! Lấy danh sách tỉnh/thành phố
export const getProvinces = async (req, res) => {
    try {
        // validate depth
        const depthRaw = req.query.depth ?? "1";
        const depthNum = Number.parseInt(depthRaw, 10); // Ép kiểu về số nguyên.
        const depth = Number.isFinite(depthNum) && depthNum >= 1 && depthNum <= 3 ? depthNum : 1; // Kiểm tra hợp lệ: chỉ cho phép 1–3, nếu sai thì fallback = 1.

        const url = `https://provinces.open-api.vn/api/v1/?depth=${depth}`;
        const r = await fetchWithTimeout(url, 5000);
        if (!r.ok) {
            const text = await r.text().catch(() => "");
            return res.status(502).json({ message: "Upstream provinces API error", status: r.status, body: text.slice(0, 500) });
        }

        let data;
        try {
            data = await r.json();
        } catch {
            return res.status(502).json({ message: "Invalid JSON from provinces API" });
        }

        res.set("Cache-Control", "public, max-age=300"); // cache 5 phút
        return res.json(data);
    } catch (error) {
        if (error.name === "AbortError") return res.status(504).json({ message: "Provinces API timeout" });
        console.error("getProvinces error:", error);
        return res.status(500).json({ message: "Error fetching provinces" });
    }
};

//! Lấy chi tiết 1 tỉnh theo code (và danh sách huyện nếu depth >= 2)
export const getProvinceByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code || !/^\d+$/.test(code)) {
            return res.status(400).json({ message: "Invalid province code" });
        }

        const depthRaw = req.query.depth ?? "2";
        const depthNum = Number.parseInt(depthRaw, 10);
        const depth = Number.isFinite(depthNum) && depthNum >= 1 && depthNum <= 3 ? depthNum : 2;

        const url = `https://provinces.open-api.vn/api/v1/p/${code}?depth=${depth}`;

        const r = await fetchWithTimeout(url, 5000);
        if (!r.ok) {
            const text = await r.text().catch(() => "");
            return res.status(502).json({ message: "Upstream province API error", status: r.status, body: text.slice(0, 500) });
        }

        let data;
        try {
            data = await r.json();
        } catch {
            return res.status(502).json({ message: "Invalid JSON from province API" });
        }

        res.set("Cache-Control", "public, max-age=300");
        return res.json(data);
    } catch (error) {
        if (error.name === "AbortError") return res.status(504).json({ message: "Province API timeout" });
        console.error("getProvinceByCode error:", error);
        return res.status(500).json({ message: "Error fetching province detail" });
    }
};

//! Lấy chi tiết 1 huyện theo code (và danh sách xã nếu depth >= 2)
export const getDistrictByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code || !/^\d+$/.test(code)) {
            return res.status(400).json({ message: "Invalid district code" });
        }

        const depthRaw = req.query.depth ?? "2";
        const depthNum = Number.parseInt(depthRaw, 10);
        const depth = Number.isFinite(depthNum) && depthNum >= 1 && depthNum <= 3 ? depthNum : 2;

        const url = `https://provinces.open-api.vn/api/v1/d/${code}?depth=${depth}`;

        const r = await fetchWithTimeout(url, 5000);
        if (!r.ok) {
            const text = await r.text().catch(() => "");
            return res.status(502).json({ message: "Upstream district API error", status: r.status, body: text.slice(0, 500) });
        }

        let data;
        try {
            data = await r.json();
        } catch {
            return res.status(502).json({ message: "Invalid JSON from district API" });
        }

        res.set("Cache-Control", "public, max-age=300");
        return res.json(data);
    } catch (error) {
        if (error.name === "AbortError") return res.status(504).json({ message: "District API timeout" });
        console.error("getDistrictByCode error:", error);
        return res.status(500).json({ message: "Error fetching district detail" });
    }
};
