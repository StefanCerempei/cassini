import React, { useState } from 'react';
import './Header.css';

const Header = ({ onRefresh, lastUpdate, city, onCityChange, isRefreshing, totalLeaks }) => {
    const [showNotifications, setShowNotifications] = useState(false);

    const cities = ['București', 'Cluj-Napoca', 'Timișoara', 'Iași', 'Constanța'];

    const formatDate = (date) => {
        if (!date) return 'Never';
        return date.toLocaleTimeString('ro-RO');
    };

    return (
        <header className="header">
            <div className="header-top">
                <div className="logo">
                    <span className="logo-icon">💧</span>
                    <h1>AquaLeaks<span className="highlight">AI</span></h1>
                </div>

                <div className="city-selector">
                    <label>📍 Oraș:</label>
                    <select value={city} onChange={(e) => onCityChange(e.target.value)}>
                        {cities.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>

                <div className="header-stats">
                    <div className="stat">
                        <span className="stat-value">{totalLeaks || 0}</span>
                        <span className="stat-label">Scurgeri</span>
                    </div>
                    <div className="stat">
                        <span className="stat-value">🛰️</span>
                        <span className="stat-label">Sentinel-2</span>
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={onRefresh}
                        disabled={isRefreshing}
                    >
                        🔄 {isRefreshing ? 'Analiză...' : 'Analizează'}
                    </button>

                    <div className="notifications">
                        <button onClick={() => setShowNotifications(!showNotifications)}>
                            🔔 <span className="badge">3</span>
                        </button>
                        {showNotifications && (
                            <div className="notifications-dropdown">
                                <div className="notif-item">💧 Scurgere nouă în Sector 2</div>
                                <div className="notif-item">⚠️ Alertă risc ridicat</div>
                                <div className="notif-item">📊 Raport săptămânal disponibil</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="header-bottom">
                <div className="status">
                    <span className="status-dot"></span>
                    Sistem activ
                </div>
                <div className="last-update">
                    Ultima scanare: {formatDate(lastUpdate)}
                </div>
                <div className="satellite-info">
                    Rezoluție: 10m | Acoperire: 100%
                </div>
            </div>
        </header>
    );
};

export default Header;