import fetch from "node-fetch";

//! Test API geocode (ví dụ: /api/test-geocode?address=Hà%20Nội)
export const testGeocode = async (req, res) => {
    try {
        const address = (req.query.address || 'Hà Nội, Việt Nam').trim();
        if (!process.env.DISTANCEMATRIX_API_KEY) {
            return res.status(500).json({ message: 'Missing DISTANCEMATRIX_API_KEY in .env' });
        }

        const url = `https://api.distancematrix.ai/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.DISTANCEMATRIX_API_KEY}`;
        const r = await fetch(url);
        const data = await r.json();

        console.log('Geocode response:', JSON.stringify(data, null, 2));

        if (data.status !== 'OK') {
            return res.status(500).json({ message: 'API status not OK', raw: data });
        }

        if (data.results && data.results.length > 0) {
            const loc = data.results[0].geometry.location;
            return res.json({
                query: address,
                lat: loc.lat,
                lng: loc.lng,
                formatted: data.results[0].formatted_address
            });
        }

        return res.json({ query: address, raw: data });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Lỗi test geocoding' });
    }
};

//! Lấy toạ độ theo địa chỉ (ví dụ: /api/geocode?address=Hà%20Nội)
export const geocodeAddress = async (req, res) => {
    try {
        // Lấy query address và loại bỏ khoảng trắng dư
        const address = (req.query.address || "").trim();
        console.log(`🌍 GEOCODING REQUEST FOR ADDRESS: "${address}"`);

        // Kiểm tra đầu vào
        if (!address) return res.status(400).json({ message: "address is required" });
        if (address.length < 3 || address.length > 150) {
            // Giới hạn độ dài để tránh spam
            return res.status(400).json({ message: "address must be 3–150 characters" });
        }

        // Kiểm tra API key
        if (!process.env.DISTANCEMATRIX_API_KEY) {
            return res.status(500).json({ message: "Missing DISTANCEMATRIX_API_KEY in .env" });
        }
        const url = `https://api.distancematrix.ai/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.DISTANCEMATRIX_API_KEY}`;

        // Thêm timeout (5 giây) để tránh treo request
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let r;

        // Gọi fetch với signal để có thể abort khi timeout
        try {
            r = await fetch(url, { signal: controller.signal });
        } catch (err) {
            // Khi bị timeout hoặc fetch lỗi mạng
            if (err.name === "AbortError") {
                console.error("Geocode API timeout");
                return res.status(504).json({ message: "Geocode API timeout" });
            }
            throw err; // ném tiếp lỗi cho catch ngoài
        } finally {
            clearTimeout(timeout);
        }

        // Kiểm tra lỗi từ upstream
        if (!r.ok) {
            const text = await r.text().catch(() => "");
            return res.status(502).json({
                message: "Geocode upstream API error",
                status: r.status,
                body: text.slice(0, 300),
            });
        }

        // Parse JSON
        let data;
        try {
            data = await r.json();
        } catch {
            return res.status(502).json({ message: "Invalid JSON from geocode API" });
        }
        // ⚙️ Log nhẹ để debug (có thể tắt khi deploy)
        console.log("🌍 GEOCODING RESPONSE:", data.status, data.results?.length);
        // Kiểm tra dữ liệu hợp lệ
        const results = data.results || data.result;
        if (data.status !== "OK" || !results?.length) {
            return res.status(404).json({ message: "Coordinates not found", raw: data });
        }

        const loc = results[0].geometry.location;
        return res.json({ lat: loc.lat, lng: loc.lng });

    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Geocoding error' });
    }
};
