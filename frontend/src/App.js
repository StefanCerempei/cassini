import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MapPage from './pages/MapPage';
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getStatusColor = (status = '') => {
    if (status.includes('DEZASTRU')) return '#e63946';
    if (status.includes('SEVERĂ'))   return '#ff4444';
    if (status.includes('MODERATĂ')) return '#ff9800';
    if (status.includes('ANOMALIE')) return '#ffcc00';
    return '#4caf50';
};

const StatResultCard = ({ icon, label, value, sub, color }) => (
    <div className="stat-result-card" style={{ '--card-color': color }}>
        <div className="src-icon">{icon}</div>
        <div className="src-value">{value}</div>
        <div className="src-label">{label}</div>
        <div className="src-sub">{sub}</div>
    </div>
);

const DegradationBar = ({ pct }) => {
    const clamped = Math.min(100, Math.max(0, pct));
    const color = clamped > 50 ? '#e63946' : clamped > 20 ? '#ff4444' : clamped > 5 ? '#ff9800' : '#4caf50';
    return (
        <div className="deg-bar-wrapper">
            <div className="deg-bar-label">
                Progres degradare: <strong style={{ color }}>{clamped.toFixed(1)}%</strong>
            </div>
            <div className="deg-bar-track">
                <motion.div
                    className="deg-bar-fill"
                    style={{ background: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${clamped}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </div>
            <div className="deg-bar-ticks">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
            </div>
        </div>
    );
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
    const [analysisResult, setAnalysisResult] = useState(null);

    const historicalData = [
        { date: '01 Apr', spills: 2, area: 450 },
        { date: '05 Apr', spills: 3, area: 680 },
        { date: '10 Apr', spills: 1, area: 230 },
        { date: '15 Apr', spills: 4, area: 890 },
        { date: '20 Apr', spills: 2, area: 510 },
        { date: '25 Apr', spills: 3, area: 720 },
    ];

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

    const navItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard',     desc: 'Prezentare generală' },
        { id: 'map',       icon: '🗺️', label: 'Hartă Satelit', desc: 'Analiză NDWI Copernicus' },
        { id: 'analytics', icon: '📈', label: 'Analytics',     desc: 'Rezultate și statistici' },
        { id: 'alerts',    icon: '⚠️', label: 'Alerts',        desc: 'Notificări active' },
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
                                                {spill.severity === 'high' ? 'URGENȚĂ' : spill.severity === 'medium' ? 'ATENȚIE' : 'MONITORIZARE'}
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

                {/* ── Map page ── */}
                {activePage === 'map' && (
                    <MapPage onAnalysisComplete={setAnalysisResult} />
                )}

                {/* ── Analytics ── */}
                {activePage === 'analytics' && (
                    <div className="page analytics-page">
                        <div className="analytics-grid">
                            <div className="analytics-card full-width">
                                <h3>📈 Evoluție deversări</h3>
                                <div className="chart-container">
                                    {historicalData.map((d, i) => (
                                        <div key={i} className="chart-bar">
                                            <div className="chart-label">{d.date}</div>
                                            <div className="bar-container">
                                                <div className="bar" style={{ height: `${d.spills * 30}px` }}></div>
                                            </div>
                                            <div className="chart-value">{d.spills}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="analytics-card">
                                <h3>📊 Distribuție</h3>
                                <div className="pie-chart">
                                    <div className="pie-segment high"   style={{ width: `${(stats.high   / stats.total) * 100}%` }}>🔴</div>
                                    <div className="pie-segment medium" style={{ width: `${(stats.medium / stats.total) * 100}%` }}>🟠</div>
                                    <div className="pie-segment low"    style={{ width: `${(stats.low    / stats.total) * 100}%` }}>🟡</div>
                                </div>
                                <div className="pie-legend">
                                    <span>🔴 {stats.high}</span>
                                    <span>🟠 {stats.medium}</span>
                                    <span>🟡 {stats.low}</span>
                                </div>
                            </div>
                            <div className="analytics-card">
                                <h3>📐 Suprafață totală</h3>
                                <div className="stat-large">{Math.round(stats.totalArea)} m²</div>
                                <div className="trend positive">↑ 12% față de săptămâna trecută</div>
                            </div>
                        </div>

                        {analysisResult ? (
                            <div className={`analysis-page ${isDarkMode ? 'dark' : 'light'}`} style={{ padding: 0, minHeight: 'auto', animation: 'none' }}>
                                <div className="results-panel" style={{ marginTop: 24 }}>
                                    <div className="results-header">
                                        <h2>📋 Raport Satelitar CASSINI — Ultima Analiză</h2>
                                    </div>
                                    <div className="verdict-card" style={{ '--status-color': getStatusColor(analysisResult.status_alerta) }}>
                                        <div className="verdict-icon">🚨</div>
                                        <div className="verdict-text">{analysisResult.status_alerta}</div>
                                    </div>
                                    <div className="meta-row">
                                        <div className="meta-item">
                                            <span className="meta-icon">📍</span>
                                            <span className="meta-label">Coordonate</span>
                                            <span className="meta-value">{analysisResult.meta?.lat}, {analysisResult.meta?.lng}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-icon">📅</span>
                                            <span className="meta-label">Referință → Curent</span>
                                            <span className="meta-value">{analysisResult.meta?.an_referinta} → {analysisResult.meta?.an_curent}</span>
                                        </div>
                                    </div>
                                    <div className="stats-results">
                                        <StatResultCard icon="🌊" label="Apă referință"              value={`${analysisResult.statistici?.procent_apa_referinta ?? 0}%`}       sub="din arie totală"            color="#0055AA" />
                                        <StatResultCard icon="🌊" label="Apă curentă"                value={`${analysisResult.statistici?.procent_apa_curenta ?? 0}%`}          sub="din arie totală"            color="#4488cc" />
                                        <StatResultCard icon="⚠️" label="Suprafață degradată"        value={`${analysisResult.statistici?.procent_suprafata_degradata ?? 0}%`}  sub="din arie totală"            color="#ff9800" />
                                        <StatResultCard icon="📉" label="Degradare din apa inițială" value={`${analysisResult.statistici?.procent_din_apa_originala ?? 0}%`}    sub="procent critic"             color={getStatusColor(analysisResult.status_alerta)} />
                                        <StatResultCard icon="🔬" label="Intensitate medie"          value={analysisResult.statistici?.intensitate_medie_degradare ?? 0}        sub="NDWI mediu zonă degradată"  color="#9c27b0" />
                                        <StatResultCard icon="🔴" label="Intensitate maximă"         value={analysisResult.statistici?.intensitate_maxima_degradare ?? 0}       sub="NDWI minim detectat"        color="#e63946" />
                                    </div>
                                    <div className="pixel-row">
                                        <div className="pixel-chip">🟦 Pixeli apă referință: <strong>{analysisResult.statistici?.pixeli_apa_referinta ?? 0}</strong></div>
                                        <div className="pixel-chip">🟩 Pixeli apă curentă: <strong>{analysisResult.statistici?.pixeli_apa_curenta ?? 0}</strong></div>
                                        <div className="pixel-chip">🟥 Pixeli degradați: <strong>{analysisResult.statistici?.pixeli_degradati ?? 0}</strong></div>
                                    </div>
                                    <DegradationBar pct={analysisResult.statistici?.procent_din_apa_originala ?? 0} />
                                </div>
                            </div>
                        ) : (
                            <div className="no-analysis-placeholder">
                                <div className="placeholder-icon">🛰️</div>
                                <h3>Nicio analiză satelitară disponibilă</h3>
                                <p>Mergi la <strong>Hartă Satelit</strong> și lansează o analiză NDWI pentru a vedea rezultatele detaliate aici.</p>
                                <button className="btn-go-map" onClick={() => setActivePage('map')}>
                                    🗺️ Mergi la Hartă Satelit
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Alerts ── */}
                {activePage === 'alerts' && (
                    <div className="page alerts-page">
                        <div className="alerts-header">
                            <h3>⚠️ Notificări</h3>
                            <div className="alert-count">{spills.filter(s => s.severity === 'high').length} urgente</div>
                        </div>
                        <div className="alerts-list">
                            {spills.filter(s => s.severity === 'high').map(alert => (
                                <div key={alert.id} className="alert-card critical">
                                    <div className="alert-icon">🚨</div>
                                    <div className="alert-content">
                                        <div className="alert-title">ALERTĂ CRITICĂ</div>
                                        <div className="alert-desc">{alert.description}</div>
                                        <div className="alert-details">
                                            <span>📍 {alert.lat}, {alert.lon}</span>
                                            <span>📐 {alert.area_m2} m²</span>
                                        </div>
                                    </div>
                                    <button className="alert-action">Intervenție →</button>
                                </div>
                            ))}
                            {spills.filter(s => s.severity === 'medium').map(alert => (
                                <div key={alert.id} className="alert-card warning">
                                    <div className="alert-icon">⚠️</div>
                                    <div className="alert-content">
                                        <div className="alert-title">Alertă poluare</div>
                                        <div className="alert-desc">{alert.description}</div>
                                        <div className="alert-details">
                                            <span>📍 {alert.lat}, {alert.lon}</span>
                                            <span>📐 {alert.area_m2} m²</span>
                                        </div>
                                    </div>
                                    <button className="alert-action secondary">Monitorizare →</button>
                                </div>
                            ))}
                        </div>
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
