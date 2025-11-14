import React, { useState, Fragment } from 'react';
import moment from 'moment'; // Vẫn cần moment, nhưng chỉ để dự phòng
import './App.css'; 
import TimelineModal from './TimelineModal'; // Import component Modal

const App = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentQuery, setCurrentQuery] = useState('');

    const [phases, setPhases] = useState([]); 

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); 
    
    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setCurrentQuery(query);
        setPhases([]); 

        try {
            const response = await fetch('http://localhost:5000/api/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Đã xảy ra lỗi từ server.');
            }

            const data = await response.json();

            if (data && data.timeline) {
                // --- LOGIC CẬP NHẬT ---
                const processedItems = data.timeline.map((item, index) => {
                    // Giờ chúng ta lấy năm trực tiếp từ AI
                    const startYear = item.startYear || (1990 + index * 10); // Lấy năm từ AI, hoặc dùng mặc định
                    const endYear = item.endYear || (startYear + 9); // Lấy năm từ AI, hoặc dùng mặc định

                    return {
                        id: index,
                        phase: item.phase, // Tên giai đoạn giờ đã "sạch", không có năm
                        description: item.description,
                        negation: item.negation,
                        startYear: startYear,
                        endYear: endYear,
                        isPrediction: false
                    };
                });
                
                if (data.next_negation_prediction) {
                    // Lấy năm bắt đầu dự đoán trực tiếp từ AI
                    const predictionStartYear = data.next_negation_prediction.startYear || (moment().year() + 1);
                    
                    processedItems.push({
                        id: processedItems.length,
                        phase: `Dự đoán: ${data.next_negation_prediction.phase}`,
                        description: data.next_negation_prediction.description,
                        negation: "Hạn chế của các giai đoạn hiện tại sẽ bị phủ định.",
                        startYear: predictionStartYear,
                        endYear: null, // Dự đoán không có năm kết thúc
                        isPrediction: true
                    });
                }
                // --- KẾT THÚC LOGIC CẬP NHẬT ---
                
                setPhases(processedItems);

            } else {
                setError("AI không trả về cấu trúc timeline mong muốn.");
            }

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            fetchData();
        }
    };

    const handleOpenModal = (item) => {
        setSelectedItem(item);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setSelectedItem(null); 
        }, 300);
    };

    // Hàm renderYearRange vẫn giữ nguyên, giờ nó sẽ hoạt động chính xác
    const renderYearRange = (item) => {
        if (item.startYear) {
            if (item.endYear) {
                return `(${item.startYear} - ${item.endYear})`;
            } else {
                return `(Từ ${item.startYear})`;
            }
        }
        return '';
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>Timeline Generator</h1>
            </header>
            <main className="App-main">
                <form onSubmit={handleSubmit} className="input-form">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nhập khái niệm (ví dụ: web, smartphone, AI)..."
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Đang tạo...' : 'Tạo Timeline'}
                    </button>
                </form>

                {loading && <div className="loading-spinner"></div>}
                {error && <p className="error-message">Lỗi: {error}</p>}

                <div className="timeline-container">
                    {currentQuery && !loading && <h2>Các giai đoạn phủ định của "{currentQuery}"</h2>}
                    
                    <div className="phases-container">
                        {phases.map((item, index) => (
                            <Fragment key={item.id}>
                                <div 
                                    className={`phase-card ${item.isPrediction ? 'prediction' : ''}`}
                                    onClick={() => handleOpenModal(item)}
                                >
                                    <h3>{item.phase}</h3>
                                    <p className="year-range">
                                        {renderYearRange(item)}
                                    </p>
                                </div>
                                
                                {index < phases.length - 1 && (
                                    <div className="negation-line">
                                        <span>Phủ định lần {index + 1}</span>
                                    </div>
                                )}
                            </Fragment>
                        ))}
                    </div>
                </div>

            </main>

            <TimelineModal 
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
            />
        </div>
    );
};

export default App;