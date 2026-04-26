import React, { useState, useEffect } from 'react';
import MapPage from './pages/MapPage';
import AnalysisPage from './pages/AnalysisPage';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';
import './pages/AnalysisPage.css';

// ─── Location presets ─────────────────────────────────────────────────────────
const LOCATIONS = {
    naslavcea: {
        label: '📍 Naslavcea, RM',
        spills: [
            { id: 1, lat: 48.4714, lon: 27.5823, severity: 'high',   score: 0.92, area_m2: 1250, description: 'Deversare petrol detectată pe Nistru' },
            { id: 2, lat: 48.4680, lon: 27.5850, severity: 'medium', score: 0.68, area_m2: 580,  description: 'Pată petrol în aval' },
            { id: 3, lat: 48.4750, lon: 27.5790, severity: 'low',    score: 0.42, area_m2: 230,  description: 'Urmă de petrol la suprafață' },
            { id: 4, lat: 48.4650, lon: 27.5880, severity: 'medium', score: 0.71, area_m2: 340,  description: 'Petrol în derivă' },
        ],
    },
    timisoara: {
        label: '📍 Timișoara, RO',
        spills: [
            { id: 1, lat: 45.7489, lon: 21.2087, severity: 'medium', score: 0.74, area_m2: 680,  description: 'Poluare detectată pe canalul Bega' },
            { id: 2, lat: 45.7510, lon: 21.2120, severity: 'low',    score: 0.38, area_m2: 190,  description: 'Urmă industrială pe canal' },
        ],
    },
    chisinau: {
        label: '📍 Chișinău, MD',
        spills: [
            { id: 1, lat: 47.0105, lon: 28.8638, severity: 'high',   score: 0.88, area_m2: 1100, description: 'Contaminare severă pe râul Bâc' },
            { id: 2, lat: 47.0080, lon: 28.8670, severity: 'high',   score: 0.81, area_m2: 920,  description: 'Deversare industrială detectată' },
            { id: 3, lat: 47.0130, lon: 28.8600, severity: 'medium', score: 0.55, area_m2: 430,  description: 'Poluare secundară identificată' },
        ],
    },
    iasi: {
        label: '📍 Iași, RO',
        spills: [
            { id: 1, lat: 47.1585, lon: 27.6014, severity: 'low',    score: 0.45, area_m2: 310,  description: 'Monitorizare activă pe Prut' },
        ],
    },
};

const severityDetails = {
    high: { label: 'URGENȚĂ', icon: '🚨', cardClass: 'critical' },
    medium: { label: 'ATENȚIE', icon: '⚠️', cardClass: 'warning' },
    low: { label: 'MONITORIZARE', icon: '🟡', cardClass: 'info' },
};

const statusToAlertClass = (status = '') => {
    if (status.includes('DEZASTRU') || status.includes('SEVERĂ')) return 'critical';
    if (status.includes('MODERATĂ') || status.includes('ANOMALIE')) return 'warning';
    return 'info';
};

const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('ro-RO');
};

// ─── Main app ─────────────────────────────────────────────────────────────────
function AppContent() {
    const [spills, setSpills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [severityFilter, setSeverityFilter] = useState('all');
    const [activePage, setActivePage] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState('naslavcea');
    const [alertsTab, setAlertsTab] = useState('general');
    const [recentAnalyses, setRecentAnalyses] = useState([]);

    const loadSpillsForLocation = (locationKey) => {
        setLoading(true);
        setTimeout(() => {
            const loc = LOCATIONS[locationKey];
            const timestampedSpills = loc.spills.map((s, i) => ({
                ...s,
                timestamp: new Date(Date.now() - i * 2 * 3600 * 1000).toISOString(),
            }));
            setSpills(timestampedSpills);
            setLastUpdate(new Date());
            setLoading(false);
        }, 600);
    };

    useEffect(() => {
        loadSpillsForLocation('naslavcea');
    }, []);

    const handleLocationChange = (locationKey) => {
        setSelectedLocation(locationKey);
        loadSpillsForLocation(locationKey);
    };

    const handleAnalysisComplete = (result) => {
        if (!result) return;
        const entry = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            timestamp: new Date().toISOString(),
            result,
        };
        setRecentAnalyses(prev => [entry, ...prev].slice(0, 12));
    };

    const filteredSpills = severityFilter === 'all'
        ? spills
        : spills.filter(s => s.severity === severityFilter);

    const stats = {
        total: spills.length,
        high: spills.filter(s => s.severity === 'high').length,
        medium: spills.filter(s => s.severity === 'medium').length,
        low: spills.filter(s => s.severity === 'low').length,
        totalArea: spills.reduce((sum, s) => sum + s.area_m2, 0),
        avgConfidence: spills.length
            ? Math.round(spills.reduce((sum, s) => sum + s.score, 0) / spills.length * 100)
            : 0,
    };

    const activeOperationalAlerts = spills.filter(s => s.severity === 'high' || s.severity === 'medium');

    const navItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard',     desc: 'Prezentare generală' },
        { id: 'map',       icon: '🗺️', label: 'Hartă Satelit', desc: 'Doar hartă + filtre' },
        { id: 'analytics', icon: '📈', label: 'Analytics',     desc: 'Analiză satelit + statistici' },
        { id: 'alerts',    icon: '⚠️', label: 'Alerts',        desc: 'Generale + analizate recent' },
    ];

    if (loading) {
        return (
            <div className={`loading-screen ${isDarkMode ? 'dark' : 'light'}`}>
                <div className="loading-content">
                    <div className="loading-icon">🛢️</div>
                    <p>Scanare satelit pentru deversări petrol...</p>
                    <p className="loading-location">Zona: {LOCATIONS[selectedLocation]?.label}</p>
                    <div className="loading-progress"><div className="progress-bar"></div></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            {/* ── Sidebar ── */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo"><span>🛢️</span><h2>AquaLeaks<span>AI</span></h2></div>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => setActivePage(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarOpen && (
                                <div className="nav-text">
                                    <span className="nav-label">{item.label}</span>
                                    <span className="nav-desc">{item.desc}</span>
                                </div>
                            )}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="satellite-status">
                        <div className="status-dot"></div><span>Sentinel-2 Online</span>
                    </div>
                    {sidebarOpen && (
                        <div className="sidebar-stats">
                            <div>🛰️ Rezoluție: 10m</div>
                            <div>🎯 Precizie: {stats.avgConfidence}%</div>
                        </div>
                    )}
                </div>
            </aside>

            {/* ── Main content ── */}
            <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                <header className="main-header">
                    <div className="header-left">
                        <h1>{navItems.find(i => i.id === activePage)?.label}</h1>
                        <p>{navItems.find(i => i.id === activePage)?.desc}</p>
                    </div>
                    <div className="header-right">
                        <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>
                            {isDarkMode ? '☀️' : '🌙'}
                        </button>
                        <select
                            className="location-select"
                            value={selectedLocation}
                            onChange={e => handleLocationChange(e.target.value)}
                        >
                            {Object.entries(LOCATIONS).map(([key, loc]) => (
                                <option key={key} value={key}>{loc.label}</option>
                            ))}
                        </select>
                        <div className="header-time">
                            <span>🕐</span><span>{lastUpdate?.toLocaleTimeString('ro-RO')}</span>
                        </div>
                    </div>
                </header>

                {/* ── Dashboard ── */}
                {activePage === 'dashboard' && (
                    <div className="page dashboard-page">
                        <div className="stats-grid">
                            <div className="stat-card"><div className="stat-icon">🛢️</div><div className="stat-info"><div className="stat-value">{stats.total}</div><div className="stat-label">Total Deversări</div></div></div>
                            <div className="stat-card high"><div className="stat-icon">🔴</div><div className="stat-info"><div className="stat-value">{stats.high}</div><div className="stat-label">Urgență Majoră</div></div></div>
                            <div className="stat-card medium"><div className="stat-icon">🟠</div><div className="stat-info"><div className="stat-value">{stats.medium}</div><div className="stat-label">Risc Mediu</div></div></div>
                            <div className="stat-card low"><div className="stat-icon">🟡</div><div className="stat-info"><div className="stat-value">{stats.low}</div><div className="stat-label">Risc Scăzut</div></div></div>
                            <div className="stat-card"><div className="stat-icon">📐</div><div className="stat-info"><div className="stat-value">{Math.round(stats.totalArea)}</div><div className="stat-label">m² Afectați</div></div></div>
                            <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-info"><div className="stat-value">{stats.avgConfidence}%</div><div className="stat-label">Confidență</div></div></div>
                        </div>
                        <div className="filter-bar">
                            <button className={severityFilter === 'all'    ? 'active' : ''} onClick={() => setSeverityFilter('all')}>Toate</button>
                            <button className={severityFilter === 'high'   ? 'active' : ''} onClick={() => setSeverityFilter('high')}>🔴 Urgență</button>
                            <button className={severityFilter === 'medium' ? 'active' : ''} onClick={() => setSeverityFilter('medium')}>🟠 Risc Mediu</button>
                            <button className={severityFilter === 'low'    ? 'active' : ''} onClick={() => setSeverityFilter('low')}>🟡 Risc Scăzut</button>
                        </div>
                        <div className="spills-list">
                            <h3>🛢️ Deversări detectate — {LOCATIONS[selectedLocation]?.label}</h3>
                            {filteredSpills.map(spill => (
                                <div key={spill.id} className={`spill-card ${spill.severity}`}>
                                    <div className="spill-header">
                                        <div>
                                            <div className="spill-title">🛢️ {spill.description}</div>
                                            <div className="spill-badge">
                                                {severityDetails[spill.severity]?.label || 'ALERTĂ'}
                                            </div>
                                        </div>
                                        <div className="spill-stats">
                                            <div className="spill-area">{spill.area_m2} m²</div>
                                            <div className="spill-score">{(spill.score * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>
                                    <div className="spill-footer">
                                        <span>📍 {spill.lat}° N, {spill.lon}° E</span>
                                        <span>🕐 {new Date(spill.timestamp).toLocaleString('ro-RO')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Map page (doar satelit + filtre) ── */}
                {activePage === 'map' && (
                    <MapPage mapOnly />
                )}

                {/* ── Analytics (analiză + statistici operaționale) ── */}
                {activePage === 'analytics' && (
                    <div className="analytics-workspace">
                        <AnalysisPage onAnalysisComplete={handleAnalysisComplete} />

                        <div className="page analytics-ops-section">
                            <div className="analytics-ops-header">
                                <h3>📊 Date statistice operaționale</h3>
                                <p>Datele de alertare active mutate din secțiunea Alerts.</p>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-card high"><div className="stat-icon">🚨</div><div className="stat-info"><div className="stat-value">{stats.high}</div><div className="stat-label">Alerte critice</div></div></div>
                                <div className="stat-card medium"><div className="stat-icon">⚠️</div><div className="stat-info"><div className="stat-value">{stats.medium}</div><div className="stat-label">Alerte moderate</div></div></div>
                                <div className="stat-card low"><div className="stat-icon">🟡</div><div className="stat-info"><div className="stat-value">{stats.low}</div><div className="stat-label">Monitorizare</div></div></div>
                                <div className="stat-card"><div className="stat-icon">📐</div><div className="stat-info"><div className="stat-value">{Math.round(stats.totalArea)}</div><div className="stat-label">m² afectați</div></div></div>
                                <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-info"><div className="stat-value">{stats.avgConfidence}%</div><div className="stat-label">Confidență medie</div></div></div>
                                <div className="stat-card"><div className="stat-icon">🛰️</div><div className="stat-info"><div className="stat-value">{recentAnalyses.length}</div><div className="stat-label">Analize recente</div></div></div>
                            </div>

                            <div className="analytics-alerts-embedded">
                                <h3>⚠️ Alerte active (monitorizare curentă)</h3>
                                <div className="alerts-list">
                                    {activeOperationalAlerts.length === 0 && (
                                        <div className="empty-card">Nu există alerte active pentru locația selectată.</div>
                                    )}
                                    {activeOperationalAlerts.map(alert => {
                                        const meta = severityDetails[alert.severity] || severityDetails.low;
                                        return (
                                            <div key={`analytics-${alert.id}`} className={`alert-card ${meta.cardClass}`}>
                                                <div className="alert-icon">{meta.icon}</div>
                                                <div className="alert-content">
                                                    <div className="alert-title">{meta.label}</div>
                                                    <div className="alert-desc">{alert.description}</div>
                                                    <div className="alert-details">
                                                        <span>📍 {alert.lat}, {alert.lon}</span>
                                                        <span>📐 {alert.area_m2} m²</span>
                                                        <span>🎯 {(alert.score * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                                <button className="alert-action secondary" onClick={() => setActivePage('alerts')}>Vezi Alerts →</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Alerts ── */}
                {activePage === 'alerts' && (
                    <div className="page alerts-page">
                        <div className="alerts-header">
                            <h3>⚠️ Notificări</h3>
                            <div className="alert-count">{spills.filter(s => s.severity === 'high').length} urgente</div>
                        </div>

                        <div className="alerts-tabs">
                            <button
                                className={alertsTab === 'general' ? 'active' : ''}
                                onClick={() => setAlertsTab('general')}
                            >
                                Alerte generale
                            </button>
                            <button
                                className={alertsTab === 'recent' ? 'active' : ''}
                                onClick={() => setAlertsTab('recent')}
                            >
                                Analizate recent
                            </button>
                        </div>

                        {alertsTab === 'general' && (
                            <div className="alerts-list">
                                {spills.map(alert => {
                                    const meta = severityDetails[alert.severity] || severityDetails.low;
                                    return (
                                        <div key={`general-${alert.id}`} className={`alert-card ${meta.cardClass}`}>
                                            <div className="alert-icon">{meta.icon}</div>
                                            <div className="alert-content">
                                                <div className="alert-title">{meta.label}</div>
                                                <div className="alert-desc">{alert.description}</div>
                                                <div className="alert-details">
                                                    <span>📍 {alert.lat}, {alert.lon}</span>
                                                    <span>📐 {alert.area_m2} m²</span>
                                                    <span>🕐 {formatDateTime(alert.timestamp)}</span>
                                                </div>
                                            </div>
                                            <button className="alert-action secondary">Monitorizare →</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {alertsTab === 'recent' && (
                            <div className="alerts-list">
                                {recentAnalyses.length === 0 && (
                                    <div className="empty-card">
                                        Nu există analize recente încă. Rulează o analiză în tab-ul <strong>Analytics</strong>.
                                    </div>
                                )}
                                {recentAnalyses.map(entry => (
                                    <div key={entry.id} className={`alert-card ${statusToAlertClass(entry.result?.status_alerta)}`}>
                                        <div className="alert-icon">🛰️</div>
                                        <div className="alert-content">
                                            <div className="alert-title">Analiză NDWI recentă</div>
                                            <div className="alert-desc">{entry.result?.status_alerta || 'Fără verdict'}</div>
                                            <div className="alert-details">
                                                <span>📍 {entry.result?.meta?.lat}, {entry.result?.meta?.lng}</span>
                                                <span>📅 {entry.result?.meta?.an_referinta} → {entry.result?.meta?.an_curent}</span>
                                                <span>📉 {entry.result?.statistici?.procent_din_apa_originala ?? 0}% degradare</span>
                                                <span>🕐 {formatDateTime(entry.timestamp)}</span>
                                            </div>
                                        </div>
                                        <button className="alert-action" onClick={() => setActivePage('analytics')}>Vezi în Analytics →</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}
