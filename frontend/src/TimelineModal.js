import React from 'react';

const TimelineModal = ({ item, isOpen, onClose }) => {
    // Nếu không có item, không render gì cả (để hỗ trợ animation fade-out)
    if (!item) {
        return null; 
    }

    // Dùng prop "isOpen" để điều khiển class "visible"
    const modalClass = isOpen ? "modal-overlay visible" : "modal-overlay";

    return (
        <div className={modalClass} onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose}>&times;</button>
                
                <h2>{item.phase}</h2>
                
                <p>
                    <strong>Mô tả:</strong> {item.description}
                </p>
                
                {item.negation && (
                    <p className="negation">
                        <strong>Phủ định:</strong> {item.negation}
                    </p>
                )}
            </div>
        </div>
    );
};

export default TimelineModal;