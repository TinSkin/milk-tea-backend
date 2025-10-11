import fetch from "node-fetch";

//! Gợi ý địa điểm theo text người dùng nhập (OpenMaps API)
export const autocompletePlace = async (req, res) => {
    try {
        // Lấy 'text' từ query và chuẩn hoá khoảng trắng
        const text = (req.query.text || '').trim();
        console.log(`AUTOCOMPLETE REQUEST FOR TEXT: "${text}"`);

        // Validate input cơ bản: bắt buộc phải có text
        if (!text) return res.status(400).json({ message: 'text is required' });

        // Kiểm tra API key – nếu thiếu thì dừng sớm (Giúp tránh gọi request ra ngoài khi cấu hình chưa đúng)
        console.log('Using OPENMAPS_API_KEY:', process.env.OPENMAPS_API_KEY ? 'YES' : 'NO');
        if (!process.env.OPENMAPS_API_KEY) {
            return res.status(500).json({ message: 'Missing OPENMAPS_API_KEY in .env' });
        }

        // Gọi endpoint Autocomplete của OpenMaps
        const response = await fetch(`https://mapapis.openmap.vn/v1/autocomplete?text=${encodeURIComponent(text)}&apikey=${process.env.OPENMAPS_API_KEY}`);

        // Parse JSON 
        const data = await response.json();
        console.log('AUTOCOMPLETE RESPONSE:', JSON.stringify(data, null, 2));

        // Kiểm tra lỗi trong response
        if (data.errors && data.errors.length > 0) {
            return res.status(500).json({ message: 'API returned errors', raw: data });
        }

        // Kiểm tra có features không
        if (!data.features || !Array.isArray(data.features)) {
            return res.status(404).json({ message: 'No suggestions found', raw: data });
        }

        // Chuẩn hoá dữ liệu gợi ý về format đơn giản hơn cho FE
        const suggestions = data.features.map(feature => ({
            id: feature.properties.id,
            name: feature.properties.name,
            label: feature.properties.label,
            address: feature.properties.short_address || feature.properties.label,
            category: feature.properties.category || [],
            region: feature.properties.region || '',
            country: feature.properties.country || ''
        }));

        return res.json({
            suggestions,
            total: suggestions.length,
            raw: data // Để debug
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Autocomplete error' });
    }
};
