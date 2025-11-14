require('dotenv').config(); // Đảm bảo nó đọc được file .env
    
const API_KEY = process.env.GOOGLE_API_KEY;
const URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

async function listMyModels() {
    if (!API_KEY) {
        console.error('Lỗi: Không tìm thấy GOOGLE_API_KEY trong file .env');
        return;
    }

    console.log('Đang gọi API để lấy danh sách models của bạn...');
    console.log('Endpoint:', URL.replace(API_KEY, 'AIza...')); // Ẩn key

    try {
        // Node.js v18+ đã tích hợp sẵn fetch
        const response = await fetch(URL);

        if (!response.ok) {
            // Nếu lỗi, in ra chi tiết lỗi
            const errorBody = await response.text();
            console.error(`Lỗi HTTP ${response.status}: ${response.statusText}`);
            console.error('Chi tiết lỗi:', errorBody);
            return;
        }

        const data = await response.json();

        if (data.models && data.models.length > 0) {
            console.log('\n--- DANH SÁCH CÁC MODEL BẠN CÓ THỂ DÙNG ---');
            data.models.forEach(model => {
                // In ra tên model (đây là thứ bạn cần copy)
                // Chú ý: Tên bạn cần dùng là phần sau dấu "/"
                // Ví dụ: nếu in ra "models/text-bison-001", bạn sẽ dùng "text-bison-001"
                console.log(`Tên đầy đủ: ${model.name}`);
                
                // Tách lấy tên ngắn để copy
                const shortName = model.name.split('/')[1];
                console.log(`  ➡️  TÊN ĐỂ DÙNG TRONG CODE: ${shortName}`);
                console.log('------------------------------------------------');
            });
            console.log('\n✅ HÃY COPY MỘT "TÊN ĐỂ DÙNG TRONG CODE" (ví dụ: text-bison-001) VÀ DÁN VÀO server.js.');
        } else {
            console.log('❌ Không tìm thấy model nào cho API key này.');
            console.log('Vui lòng kiểm tra lại dự án Google AI Studio của bạn.');
        }

    } catch (error) {
        console.error('Lỗi nghiêm trọng khi thực thi script:', error);
    }
}

listMyModels();