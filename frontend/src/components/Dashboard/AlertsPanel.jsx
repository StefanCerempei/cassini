import React from 'react';
import './AlertsPanel.css';

const AlertsPanel = ({ alerts = [] }) => {
    return (
        <div className="alerts-panel">
            <h3>⚠️ Alerte active</h3>
            {alerts.length === 0 ? (
                <div className="no-alerts">✅ Nu există alerte active</div>
            ) : (
                <div className="alerts-list">
                    {alerts.map(alert => (
                        <div key={alert.id} className="alert-item">
                            <span className="alert-icon">🔴</span>
                            <div className="alert-content">
                                <div className="alert-title">Scurgere risc ridicat</div>
                                <div className="alert-details">
                                    Arie: {alert.area_m2} m² | Scor: {(alert.score * 100).toFixed(0)}%
                                </div>
                                <div className="alert-time">{new Date(alert.timestamp).toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AlertsPanel;