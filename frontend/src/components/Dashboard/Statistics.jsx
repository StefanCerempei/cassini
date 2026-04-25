import React from 'react';
import './Statistics.css';

const Statistics = ({ leaks = [] }) => {
    const stats = {
        total: leaks.length,
        high: leaks.filter(l => l.severity === 'high').length,
        medium: leaks.filter(l => l.severity === 'medium').length,
        low: leaks.filter(l => l.severity === 'low').length,
        totalArea: leaks.reduce((sum, l) => sum + l.area_m2, 0),
        avgScore: leaks.length ? (leaks.reduce((sum, l) => sum + l.score, 0) / leaks.length).toFixed(2) : 0
    };

    return (
        <div className="statistics">
            <h3>📊 Statistici</h3>
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Total scurgeri</div>
                </div>
                <div className="stat-card high">
                    <div className="stat-value">{stats.high}</div>
                    <div className="stat-label">Risc ridicat</div>
                </div>
                <div className="stat-card medium">
                    <div className="stat-value">{stats.medium}</div>
                    <div className="stat-label">Risc mediu</div>
                </div>
                <div className="stat-card low">
                    <div className="stat-value">{stats.low}</div>
                    <div className="stat-label">Risc scăzut</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{Math.round(stats.totalArea)}</div>
                    <div className="stat-label">m² afectați</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats.avgScore * 100}%</div>
                    <div className="stat-label">Scor mediu</div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;