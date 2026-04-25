import React, { useState, useEffect } from 'react';
import MapPage from './pages/MapPage';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

function AppContent() {
    const [spills, setSpills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [severityFilter, setSeverityFilter] = useState('all');
    const [activePage, setActivePage] = useState('dashboard');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const naslavceaCoords = {
        lat: 48.4714,
        lon: 27.5823,
        name: "Naslavcea, Republica Moldova",
        river: "Râul Nistru"
    };

    const generateMockSpills = () => {
        return [
            { id: 1, lat: 48.4714, lon: 27.5823, severity: 'high', score: 0.92, area_m2: 1250, type: 'petrol', timestamp: new Date().toISOString(), description: 'Deversare petrol detectată pe Nistru' },
            { id: 2, lat: 48.4680, lon: 27.5850, severity: 'medium', score: 0.68, area_m2: 580, type: 'petrol', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), description: 'Pată petrol în aval' },
            { id: 3, lat: 48.4750, lon: 27.5790, severity: 'low', score: 0.42, area_m2: 230, type: 'petrol', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), description: 'Urmă de petrol la suprafață' },
            { id: 4, lat: 48.4650, lon: 27.5880, severity: 'medium', score: 0.71, area_m2: 340, type: 'petrol', timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), description: 'Petrol în derivă' }
        ];
    };

    const historicalData = [
        { date: '01 Apr', spills: 2, area: 450 },
        { date: '05 Apr', spills: 3, area: 680 },
        { date: '10 Apr', spills: 1, area: 230 },
        { date: '15 Apr', spills: 4, area: 890 },
        { date: '20 Apr', spills: 2, area: 510 },
        { date: '25 Apr', spills: 3, area: 720 }
    ];

    useEffect(() => {
        setTimeout(() => {
            setSpills(generateMockSpills());
            setLastUpdate(new Date());
            setLoading(false);
        }, 1500);
    }, []);

    const filteredSpills = severityFilter === 'all' ? spills : spills.filter(s => s.severity === severityFilter);

    const stats = {
        total: spills.length,
        high: spills.filter(s => s.severity === 'high').length,
        medium: spills.filter(s => s.severity === 'medium').length,
        low: spills.filter(s => s.severity === 'low').length,
        totalArea: spills.reduce((sum, s) => sum + s.area_m2, 0),
        avgConfidence: spills.length ? Math.round(spills.reduce((sum, s) => sum + s.score, 0) / spills.length * 100) : 0
    };

    const navItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', desc: 'Prezentare generală' },
        { id: 'map', icon: '🗺️', label: 'Hartă Satelit', desc: 'Monitorizare Copernicus' },
        { id: 'analytics', icon: '📈', label: 'Analytics', desc: 'Trenduri și statistici' },
        { id: 'alerts', icon: '⚠️', label: 'Alerts', desc: 'Notificări active' }
    ];

    if (loading) {
        return (
            <div className={`loading-screen ${isDarkMode ? 'dark' : 'light'}`}>
                <div className="loading-content">
                    <div className="loading-icon">🛢️</div>
                    <p>Scanare satelit pentru deversări petrol...</p>
                    <p className="loading-location">Zona: Naslavcea, Râul Nistru</p>
                    <div className="loading-progress"><div className="progress-bar"></div></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`app ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="logo"><span>🛢️</span><h2>AquaLeaks<span>AI</span></h2></div>
                    <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '◀' : '▶'}</button>
                </div>
                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button key={item.id} className={`nav-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
                            <span className="nav-icon">{item.icon}</span>
                            {sidebarOpen && <div className="nav-text"><span className="nav-label">{item.label}</span><span className="nav-desc">{item.desc}</span></div>}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="satellite-status"><div className="status-dot"></div><span>Sentinel-2 Online</span></div>
                    {sidebarOpen && <div className="sidebar-stats"><div>🛰️ Rezoluție: 10m</div><div>🎯 Precizie: {stats.avgConfidence}%</div></div>}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
                {/* Header */}
                <header className="main-header">
                    <div className="header-left"><h1>{navItems.find(i => i.id === activePage)?.label}</h1><p>{navItems.find(i => i.id === activePage)?.desc}</p></div>
                    <div className="header-right">
                        <button className="theme-toggle" onClick={() => setIsDarkMode(!isDarkMode)}>{isDarkMode ? '☀️' : '🌙'}</button>
                        <div className="header-location"><span>📍</span><span>Naslavcea, RM</span></div>
                        <div className="header-time"><span>🕐</span><span>{lastUpdate?.toLocaleTimeString('ro-RO')}</span></div>
                    </div>
                </header>

                {/* Dashboard Page */}
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
                            <button className={severityFilter === 'all' ? 'active' : ''} onClick={() => setSeverityFilter('all')}>Toate</button>
                            <button className={severityFilter === 'high' ? 'active' : ''} onClick={() => setSeverityFilter('high')}>🔴 Urgență</button>
                            <button className={severityFilter === 'medium' ? 'active' : ''} onClick={() => setSeverityFilter('medium')}>🟠 Risc Mediu</button>
                            <button className={severityFilter === 'low' ? 'active' : ''} onClick={() => setSeverityFilter('low')}>🟡 Risc Scăzut</button>
                        </div>

                        <div className="spills-list">
                            <h3>🛢️ Deversări petrol detectate</h3>
                            {filteredSpills.map(spill => (
                                <div key={spill.id} className={`spill-card ${spill.severity}`}>
                                    <div className="spill-header"><div><div className="spill-title">🛢️ {spill.description}</div><div className="spill-badge">{spill.severity === 'high' ? 'URGENȚĂ' : spill.severity === 'medium' ? 'ATENȚIE' : 'MONITORIZARE'}</div></div><div className="spill-stats"><div className="spill-area">{spill.area_m2} m²</div><div className="spill-score">{(spill.score * 100).toFixed(0)}%</div></div></div>
                                    <div className="spill-footer"><span>📍 {spill.lat}° N, {spill.lon}° E</span><span>🕐 {new Date(spill.timestamp).toLocaleString('ro-RO')}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Map Page - Using the imported MapPage component */}
                {activePage === 'map' && <MapPage />}

                {/* Analytics Page */}
                {activePage === 'analytics' && (
                    <div className="page analytics-page">
                        <div className="analytics-grid">
                            <div className="analytics-card full-width"><h3>📈 Evoluție deversări</h3><div className="chart-container">{historicalData.map((d, i) => (<div key={i} className="chart-bar"><div className="chart-label">{d.date}</div><div className="bar-container"><div className="bar" style={{ height: `${d.spills * 30}px` }}></div></div><div className="chart-value">{d.spills}</div></div>))}</div></div>
                            <div className="analytics-card"><h3>📊 Distribuție</h3><div className="pie-chart"><div className="pie-segment high" style={{ width: `${(stats.high / stats.total) * 100}%` }}>🔴</div><div className="pie-segment medium" style={{ width: `${(stats.medium / stats.total) * 100}%` }}>🟠</div><div className="pie-segment low" style={{ width: `${(stats.low / stats.total) * 100}%` }}>🟡</div></div><div className="pie-legend"><span>🔴 {stats.high}</span><span>🟠 {stats.medium}</span><span>🟡 {stats.low}</span></div></div>
                            <div className="analytics-card"><h3>📐 Suprafață totală</h3><div className="stat-large">{Math.round(stats.totalArea)} m²</div><div className="trend positive">↑ 12% față de săptămâna trecută</div></div>
                        </div>
                    </div>
                )}

                {/* Alerts Page */}
                {activePage === 'alerts' && (
                    <div className="page alerts-page">
                        <div className="alerts-header"><h3>⚠️ Notificări</h3><div className="alert-count">{spills.filter(s => s.severity === 'high').length} urgente</div></div>
                        <div className="alerts-list">
                            {spills.filter(s => s.severity === 'high').map(alert => (<div key={alert.id} className="alert-card critical"><div className="alert-icon">🚨</div><div className="alert-content"><div className="alert-title">ALERTĂ CRITICĂ</div><div className="alert-desc">{alert.description}</div><div className="alert-details"><span>📍 {alert.lat}, {alert.lon}</span><span>📐 {alert.area_m2} m²</span></div></div><button className="alert-action">Intervenție →</button></div>))}
                            {spills.filter(s => s.severity === 'medium').map(alert => (<div key={alert.id} className="alert-card warning"><div className="alert-icon">⚠️</div><div className="alert-content"><div className="alert-title">Alertă poluare</div><div className="alert-desc">{alert.description}</div><div className="alert-details"><span>📍 {alert.lat}, {alert.lon}</span><span>📐 {alert.area_m2} m²</span></div></div><button className="alert-action secondary">Monitorizare →</button></div>))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

// Wrap the app with ThemeProvider
export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}