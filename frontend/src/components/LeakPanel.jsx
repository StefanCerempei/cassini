import React from 'react';
import './LeakPanel.css';

const LeakPanel = ({ leaks = [], selectedLeak }) => {
    return (
        <div className="leak-panel">
            <h3>📍 Listă scurgeri</h3>
            {leaks.length === 0 ? (
                <div className="no-leaks">✅ Nu s-au detectat scurgeri</div>
            ) : (
                <div className="leaks-list">
                    {leaks.map(leak => (
                        <div
                            key={leak.id}
                            className={`leak-item ${selectedLeak?.id === leak.id ? 'selected' : ''} ${leak.severity}`}
                            onClick={() => window.selectedLeak = leak}
                        >
                            <div className="leak-header">
                                <span className="leak-icon">💧</span>
                                <span className="leak-severity">
                  {leak.severity === 'high' ? '🔴 Ridicat' : leak.severity === 'medium' ? '🟠 Mediu' : '🟡 Scăzut'}
                </span>
                            </div>
                            <div className="leak-details">
                                <div>Arie: ~{leak.area_m2} m²</div>
                                <div>Scor: {(leak.score * 100).toFixed(0)}%</div>
                                <div className="leak-time">{new Date(leak.timestamp).toLocaleDateString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LeakPanel;