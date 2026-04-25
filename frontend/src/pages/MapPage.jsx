import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './Pages.css';

const PIVOT_DATE = '2026-03-15';

const datePresets = {
    before: {
        label: 'Înainte de 15.03.2026',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-14T23:59:59.999Z',
    },
    pivot: {
        label: '15.03.2026',
        from: '2026-03-15T00:00:00.000Z',
        to: '2026-03-15T23:59:59.999Z',
    },
    after: {
        label: 'După 15.03.2026',
        from: '2026-03-16T00:00:00.000Z',
        to: '2026-03-31T23:59:59.999Z',
    },
};

const layers = {
    ndwi: '7-NDWI',
    ndmi: '8-NDMI',
    truecolor: '1-TRUE-COLOR',
    falsecolor: '2-FALSE-COLOR',
};

const processGraph = {
    loadcollection: {
        process_id: 'load_collection',
        arguments: {
            id: 'sentinel-2-l2a',
            spatial_extent: {},
            temporal_extent: null,
            bands: ['B03', 'B08'],
        },
    },
    save: {
        process_id: 'save_result',
        arguments: {
            data: {
                from_node: 'colorRamp',
            },
            format: 'PNG',
        },
        result: true,
    },
    index: {
        process_id: 'ndwi',
        arguments: {
            data: {
                from_node: 'loadcollection',
            },
            target_band: 'NDWI',
            nir: 'B03',
            red: 'B08',
        },
    },
    colorRamp: {
        process_id: 'color_ramp',
        arguments: {
            data: {
                from_node: 'index',
            },
            minValue: -1,
            maxValue: 1,
            colorRamps: [
                [-0.8, '0x008000'],
                [0, '0xFFFFFF'],
                [0.8, '0x0000CC'],
            ],
        },
    },
};

const MapPage = () => {
    const { isDark } = useTheme();
    const [activeLayer, setActiveLayer] = useState('ndwi');
    const [cloudCoverage, setCloudCoverage] = useState(30);
    const [dateRange, setDateRange] = useState('pivot');
    const [compareMode, setCompareMode] = useState(true);

    const monitoredCoords = { lat: 48.29002, lon: 28.0759 };
    const getCopernicusUrl = (fromTime, toTime) => {
        const baseUrl = 'https://browser.dataspace.copernicus.eu/';
        const params = new URLSearchParams({
            zoom: '12',
            lat: `${monitoredCoords.lat}`,
            lng: `${monitoredCoords.lon}`,
            themeId: 'DEFAULT-THEME',
            datasetId: 'S2L2ACDAS',
            fromTime,
            toTime,
            layerId: layers[activeLayer],
            cloudCoverage: `${cloudCoverage}`,
            dateMode: 'SINGLE',
            processGraph: JSON.stringify(processGraph),
        });

        return `${baseUrl}?${params.toString()}`;
    };
    const currentPreset = useMemo(() => datePresets[dateRange], [dateRange]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`page-container ${isDark ? 'dark' : 'light'}`}
        >
            <div className="page-header">
                <h1>🛰️ Hartă Satelitară Copernicus (înainte / după 15 martie 2026)</h1>
                <p>
                    Sentinel-2 L2A, coordonate 48.29002 N / 28.0759 E, cu acces direct la imagini înainte și după data de {PIVOT_DATE}
                </p>
            </div>
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
                        <button className={dateRange === 'before' ? 'active' : ''} onClick={() => setDateRange('before')}>Înainte</button>
                        <button className={dateRange === 'pivot' ? 'active' : ''} onClick={() => setDateRange('pivot')}>15 martie 2026</button>
                        <button className={dateRange === 'after' ? 'active' : ''} onClick={() => setDateRange('after')}>După</button>
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
                <div className="control-group">
                    <label>🪞 Comparație:</label>
                    <button
                        className={`toggle-button ${compareMode ? 'active' : ''}`}
                        onClick={() => setCompareMode((value) => !value)}
                    >
                        {compareMode ? 'Comparare ON' : 'Comparare OFF'}
                    </button>
                </div>
            </div>
            {compareMode ? (
                <div className="map-compare-grid">
                    <div className="map-compare-card">
                        <h4>{datePresets.before.label}</h4>
                        <iframe
                            title="Copernicus Browser - before 2026-03-15"
                            src={getCopernicusUrl(datePresets.before.from, datePresets.before.to)}
                            frameBorder="0"
                            allowFullScreen
                            className="copernicus-iframe"
                        />
                    </div>
                    <div className="map-compare-card">
                        <h4>{datePresets.after.label}</h4>
                        <iframe
                            title="Copernicus Browser - after 2026-03-15"
                            src={getCopernicusUrl(datePresets.after.from, datePresets.after.to)}
                            frameBorder="0"
                            allowFullScreen
                            className="copernicus-iframe"
                        />
                    </div>
                </div>
            ) : (
                <div className="map-container-copernicus">
                    <iframe
                        title="Copernicus Browser"
                        src={getCopernicusUrl(currentPreset.from, currentPreset.to)}
                        frameBorder="0"
                        allowFullScreen
                        className="copernicus-iframe"
                    />
                </div>
            )}

            <div className="map-info-panel">
                <div className="info-section">
                    <h4>📍 Locație monitorizată</h4>
                    <p>48.29002° N, 28.0759° E</p>
                    <p className="location-desc">Comparație înainte și după 15 martie 2026</p>
                </div>

                <div className="info-section">
                    <h4>📊 Interval selectat</h4>
                    <p>{currentPreset.label}</p>
                    <p>De la: {new Date(currentPreset.from).toLocaleString('ro-RO')}</p>
                    <p>Până la: {new Date(currentPreset.to).toLocaleString('ro-RO')}</p>
                </div>

                <div className="info-section">
                    <h4>🛰️ Sursă date</h4>
                    <p>Copernicus Data Space Browser</p>
                    <p>Dataset: Sentinel-2 L2A (S2L2ACDAS)</p>
                    <p>Ultima actualizare UI: {new Date().toLocaleString('ro-RO')}</p>
                </div>
            </div>
        </motion.div>
    );
};
export default MapPage;