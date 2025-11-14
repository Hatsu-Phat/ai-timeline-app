require('dotenv').config(); // Tải biến môi trường từ .env
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 5000; // Cổng mặc định cho backend

// Lấy API Key từ biến môi trường
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('Lỗi: GOOGLE_API_KEY không được định nghĩa trong file .env');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// --- CACHING IMPLEMENTATION ---
const cache = {}; // Đối tượng đơn giản để lưu trữ cache
const CACHE_TTL = 5 * 60 * 1000; // Thời gian sống của cache: 5 phút (tính bằng mili giây)

function getFromCache(key) {
    const entry = cache[key];
    if (entry && Date.now() < entry.expiry) {
        console.log(`[Cache] Trả về dữ liệu từ cache cho: ${key}`);
        return entry.data;
    }
    // Nếu không có hoặc đã hết hạn, xóa khỏi cache
    if (entry) {
        console.log(`[Cache] Dữ liệu cache đã hết hạn cho: ${key}`);
        delete cache[key];
    }
    return null;
}

function setToCache(key, data) {
    cache[key] = {
        data: data,
        expiry: Date.now() + CACHE_TTL // Thời gian hết hạn
    };
    console.log(`[Cache] Đã lưu dữ liệu vào cache cho: ${key}`);
}
// --- END CACHING IMPLEMENTATION ---


// Endpoint API chính để tạo timeline
app.post('/api/timeline', async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Truy vấn không được để trống.' });
    }

    const cacheKey = query.toLowerCase().trim(); // Tạo key cho cache từ query

    // 1. Kiểm tra cache trước
    const cachedResult = getFromCache(cacheKey);
    if (cachedResult) {
        return res.json(cachedResult);
    }

    // 2. Nếu không có trong cache, tiến hành gọi AI với cơ chế thử lại
    const MAX_RETRIES = 5; // Tăng số lần thử lại để đối phó với lỗi tạm thời
    // const RETRY_DELAY_MS = 2000; // Sẽ dùng exponential backoff thay thế

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // DÒNG CODE MỚI (CHUẨN)
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
            // Hoặc bạn có thể thử "gemini-1.0-pro-latest" nếu muốn phiên bản mới nhất
            // const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro-latest" });

            const prompt = `
                Bạn là một chuyên gia phân tích xu hướng công nghệ. Dựa trên khái niệm hoặc các khái niệm sau: '${query}'.
                Hãy tạo một timeline các giai đoạn phát triển chính của nó.
                Đối với mỗi giai đoạn:
                1.  Xác định tên giai đoạn.
                2.  Mô tả ngắn gọn đặc điểm chính của giai đoạn đó.
                3.  Xác định điểm "phủ định" hoặc hạn chế chính của giai đoạn đó, dẫn đến sự xuất hiện của giai đoạn tiếp theo.
                Cuối cùng, dựa trên xu hướng, hãy dự đoán giai đoạn "phủ định" tiếp theo sẽ trông như thế nào, tên của nó và mô tả ngắn gọn.

                Trả về kết quả dưới dạng JSON theo cấu trúc sau:
                {
                    "timeline": [
                        {
                            "phase": "Tên Giai Đoạn 1",
                            "startYear": 1990,
                            "endYear": 1999,
                            "description": "Mô tả giai đoạn 1",
                            "negation": "Điểm phủ định của giai đoạn 1"
                        },
                        {
                            "phase": "Tên Giai Đoạn 2",
                            "startYear": 2000,
                            "endYear": 2010,
                            "description": "Mô tả giai đoạn 2",
                            "negation": "Điểm phủ định của giai đoạn 2"
                        }
                        // ... có thể có nhiều giai đoạn hơn
                    ],
                    "next_negation_prediction": {
                        "phase": "Dự đoán Tên Giai Đoạn Tiếp Theo",
                        "description": "Mô tả dự đoán cho giai đoạn tiếp theo"
                    }
                }
                Đảm bảo rằng kết quả là JSON hợp lệ và không kèm theo bất kỳ văn bản giải thích hoặc định dạng Markdown code block nào bên ngoài JSON.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            console.log(`[AI Response] Phản hồi gốc từ AI (trước khi làm sạch, lần thử ${attempt + 1}/${MAX_RETRIES}):`, text);

            const cleanedText = text
                .replace(/^\s*```json\s*/, '')
                .replace(/\s*```\s*$/, '');

            console.log(`[AI Response] Phản hồi đã làm sạch từ AI (lần thử ${attempt + 1}/${MAX_RETRIES}):`, cleanedText);

            try {
                const parsedResult = JSON.parse(cleanedText);
                setToCache(cacheKey, parsedResult); // Lưu kết quả vào cache trước khi trả về
                return res.json(parsedResult); // Trả về kết quả thành công và thoát
            } catch (jsonError) {
                console.error(`[Error] Lỗi khi phân tích JSON từ AI (Lần thử ${attempt + 1}/${MAX_RETRIES}):`, jsonError);
                console.error('[Error] Phản hồi gốc từ AI (gây lỗi JSON):', text);
                // Nếu lỗi parsing JSON, đây không phải lỗi quá tải/tạm thời của API
                // nên không thử lại cho lỗi này, mà trả về lỗi ngay
                return res.status(500).json({
                    error: 'Không thể phân tích phản hồi từ AI thành JSON hợp lệ. Vui lòng thử lại với query khác.',
                    raw_response: text,
                    cleaned_response: cleanedText
                });
            }

        } catch (error) {
            console.error(`[Error] Lỗi khi gọi Google AI Studio API (Lần thử ${attempt + 1}/${MAX_RETRIES}):`, error.message);

            // Kiểm tra lỗi có phải là lỗi tạm thời (503 Service Unavailable, 429 Too Many Requests)
            if ((error.status === 503 || error.status === 429) && attempt < MAX_RETRIES - 1) {
                const delay = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500); // Exponential backoff + jitter
                console.log(`[Retry] Đang chờ ${delay / 1000} giây trước khi thử lại...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                // Nếu không phải lỗi tạm thời, hoặc đã hết số lần thử lại, thì trả về lỗi
                if (error.status === 503) {
                    return res.status(503).json({ error: 'Dịch vụ AI hiện đang quá tải sau nhiều lần thử. Vui lòng thử lại sau ít phút.', details: error.message });
                } else if (error.status === 429) {
                    return res.status(429).json({ error: 'Đã vượt quá hạn mức yêu cầu API AI. Vui lòng đợi và thử lại sau.', details: error.message });
                } else if (error.status === 404) {
                    return res.status(404).json({ error: 'Mô hình AI không tìm thấy hoặc không được hỗ trợ. Vui lòng kiểm tra lại tên mô hình.', details: error.message });
                } else {
                    return res.status(500).json({ error: 'Đã xảy ra lỗi không xác định khi tạo timeline từ AI.', details: error.message });
                }
            }
        }
    }
    // Nếu vòng lặp kết thúc mà vẫn chưa trả về, có nghĩa là đã hết số lần thử lại
    return res.status(500).json({ error: 'Đã hết số lần thử lại mà vẫn không thể kết nối với dịch vụ AI.', details: 'Unknown error after retries.' });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Backend server đang chạy tại http://localhost:${port}`);
    console.log(`Để truy cập frontend, hãy mở http://localhost:3000 sau khi chạy 'npm start' trong thư mục frontend.`);
});