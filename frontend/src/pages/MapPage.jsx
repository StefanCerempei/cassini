import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './Pages.css';

const MapPage = () => {
    const { isDark } = useTheme();
    const [activeLayer, setActiveLayer] = useState('ndwi');
    const [cloudCoverage, setCloudCoverage] = useState(30);
    const [dateRange, setDateRange] = useState('last7');

    // Coordonate Naslavcea, RM
    const naslavceaCoords = { lat: 48.4714, lon: 27.5823 };

    // Diferite layere pentru Copernicus
    const layers = {
        ndwi: '7-NDWI',      // Normalized Difference Water Index
        ndmi: '8-NDMI',      // Normalized Difference Moisture Index
        truecolor: '1-TRUE-COLOR',
        falsecolor: '2-FALSE-COLOR',
        moisture: '4-MOISTURE-INDEX',
        urban: '5-URBAN-THERMAL'
    };

    // Generare URL Copernicus cu parametrii
    const getCopernicusUrl = () => {
        const baseUrl = 'https://browser.dataspace.copernicus.eu/';
        const params = new URLSearchParams({
            zoom: 14,
            lat: naslavceaCoords.lat,
            lng: naslavceaCoords.lon,
            themeId: 'DEFAULT-THEME',
            visualizationUrl: 'U2FsdGVkX19cB3Lb7CbEdR361J6dvKjuG43fANN13y1ERehh0oJ0b7Sjh9sWISNgmy57tW%2BKTGoA8mJWtysQ2gvK%2F11yyLLGUMoiWGBOEE1c2KYM6Gk0ID7kMCDkfShj',
            datasetId: 'S2_L2A_CDAS',
            fromTime: getFromTime(),
            toTime: getToTime(),
            layerId: layers[activeLayer],
            demSource3D: 'MAPZEN',
            cloudCoverage: cloudCoverage,
        });

        return `${baseUrl}?${params.toString()}`;
    };

    const getFromTime = () => {
        const now = new Date();
        switch(dateRange) {
            case 'today':
                return now.toISOString();
            case 'last3':
                now.setDate(now.getDate() - 3);
                return now.toISOString();
            case 'last7':
                now.setDate(now.getDate() - 7);
                return now.toISOString();
            case 'last30':
                now.setDate(now.getDate() - 30);
                return now.toISOString();
            default:
                now.setDate(now.getDate() - 7);
                return now.toISOString();
        }
    };

    const getToTime = () => {
        return new Date().toISOString();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`page-container ${isDark ? 'dark' : 'light'}`}
        >
            <div className="page-header">
                <h1>🛰️ Hartă Satelitară Avansată</h1>
                <p>Monitorizare Copernicus Sentinel-2 | Naslavcea, Râul Nistru</p>
            </div>

            {/* Panou control layere */}
            <div className="map-controls-panel">
                <div className="control-group">
                    <label>🎨 Strat satelit:</label>
                    <div className="layer-buttons">
                        <button className={activeLayer === 'ndwi' ? 'active' : ''} onClick={() => setActiveLayer('ndwi')}>
                            💧 NDWI (Apă)
                        </button>
                        <button className={activeLayer === 'ndmi' ? 'active' : ''} onClick={() => setActiveLayer('ndmi')}>
                            🌿 NDMI (Umiditate)
                        </button>
                        <button className={activeLayer === 'truecolor' ? 'active' : ''} onClick={() => setActiveLayer('truecolor')}>
                            🎨 True Color
                        </button>
                        <button className={activeLayer === 'falsecolor' ? 'active' : ''} onClick={() => setActiveLayer('falsecolor')}>
                            🔴 False Color
                        </button>
                    </div>
                </div>

                <div className="control-group">
                    <label>📅 Perioadă:</label>
                    <div className="date-buttons">
                        <button className={dateRange === 'today' ? 'active' : ''} onClick={() => setDateRange('today')}>Astăzi</button>
                        <button className={dateRange === 'last3' ? 'active' : ''} onClick={() => setDateRange('last3')}>Ultimele 3 zile</button>
                        <button className={dateRange === 'last7' ? 'active' : ''} onClick={() => setDateRange('last7')}>Ultimele 7 zile</button>
                        <button className={dateRange === 'last30' ? 'active' : ''} onClick={() => setDateRange('last30')}>Ultimele 30 zile</button>
                    </div>
                </div>

                <div className="control-group">
                    <label>☁️ Acoperire nori:</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={cloudCoverage}
                        onChange={(e) => setCloudCoverage(e.target.value)}
                        className="cloud-slider"
                    />
                    <span className="cloud-value">{cloudCoverage}%</span>
                </div>
            </div>

            {/* Harta Copernicus */}
            <div className="map-container-copernicus">
                <iframe
                    title="Copernicus Browser - Naslavcea"
                    src={getCopernicusUrl()}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    className="copernicus-iframe"
                />
            </div>

            {/* Legendă și informații */}
            <div className="map-info-panel">
                <div className="info-section">
                    <h4>📍 Locație monitorizată</h4>
                    <p>Naslavcea, Republica Moldova (48.4714° N, 27.5823° E)</p>
                    <p className="location-desc">Râul Nistru - Zonă strategică pentru detectare poluare</p>
                </div>

                <div className="info-section">
                    <h4>📊 Indicii spectrali</h4>
                    <div className="legend-items">
                        <div className="legend-legend">
                            <span className="legend-color water"></span>
                            <span>NDWI > 0.5 - Apă/Poluare</span>
                        </div>
                        <div className="legend-legend">
                            <span className="legend-color oil"></span>
                            <span>Anomalie spectrală - Posibil petrol</span>
                        </div>
                        <div className="legend-legend">
                            <span className="legend-color vegetation"></span>
                            <span>Vegetație sănătoasă</span>
                        </div>
                    </div>
                </div>

                <div className="info-section">
                    <h4>🛰️ Sursă date</h4>
                    <p>ESA Copernicus Sentinel-2 Level-2A</p>
                    <p>Rezoluție: 10m (RGB, NIR, SWIR)</p>
                    <p>Ultima actualizare: {new Date().toLocaleString('ro-RO')}</p>
                </div>
            </div>
        </motion.div>
    );
};

export default MapPage;