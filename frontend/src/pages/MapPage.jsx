import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './AnalysisPage.css';

// ─── Copernicus URL builder ───────────────────────────────────────────────────
const LAYERS = {
    ndwi:       { id: '7-NDWI',        label: '💧 NDWI' },
    truecolor:  { id: '1-TRUE-COLOR',  label: '🎨 True Color' },
    falsecolor: { id: '2-FALSE-COLOR', label: '🔴 False Color' },
};

const buildCopernicusUrl = ({ lat, lng, fromTime, toTime, layerKey = 'ndwi', cloudCoverage = 20 }) => {
    const layer = LAYERS[layerKey];
    const colorRamps = [[-0.8, '0x228B22'], [0, '0xFFFFFF'], [0.8, '0x0055AA']];
    const processGraph = {
        loadcollection: {
            process_id: 'load_collection',
            arguments: { id: 'sentinel-2-l2a', spatial_extent: {}, temporal_extent: null, bands: ['B03', 'B08'] },
        },
        index: {
            process_id: 'ndwi',
            arguments: { data: { from_node: 'loadcollection' }, target_band: 'NDWI', nir: 'B03', red: 'B08' },
        },
        colorRamp: {
            process_id: 'color_ramp',
            arguments: { data: { from_node: 'index' }, minValue: -1, maxValue: 1, colorRamps },
        },
        save: { process_id: 'save_result', arguments: { data: { from_node: 'colorRamp' }, format: 'PNG' }, result: true },
    };
    const params = new URLSearchParams({
        zoom: '13', lat: String(lat), lng: String(lng),
        themeId: 'DEFAULT-THEME', datasetId: 'S2L2ACDAS',
        fromTime, toTime, layerId: layer.id,
        cloudCoverage: String(cloudCoverage), dateMode: 'SINGLE',
        processGraph: JSON.stringify(processGraph),
    });
    return `https://browser.dataspace.copernicus.eu/?${params.toString()}`;
};

const getLogClass = (line) => {
    if (line.includes('❌') || line.includes('EROARE')) return 'log-error';
    if (line.includes('✅')) return 'log-success';
    if (line.includes('🚨') || line.includes('🔴')) return 'log-critical';
    if (line.includes('🟠') || line.includes('⚠️')) return 'log-warn';
    if (line.includes('🟢')) return 'log-ok';
    if (line.includes('⏳') || line.includes('🛰️') || line.includes('🧪')) return 'log-info';
    return 'log-default';
};

// ─── MapPage ──────────────────────────────────────────────────────────────────
const MapPage = ({ onAnalysisComplete, mapOnly = false }) => {
    const { isDark } = useTheme();

    const [lat, setLat] = useState('45.75');
    const [lng, setLng] = useState('21.22');
    const [anRef, setAnRef] = useState('2020');
    const [anCur, setAnCur] = useState('2026');
    const [layerKey, setLayerKey] = useState('ndwi');
    const [cloudCoverage, setCloudCoverage] = useState(20);

    const [status, setStatus] = useState('idle');
    const [logs, setLogs] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [mapsVisible, setMapsVisible] = useState(false);
    const [refUrl, setRefUrl] = useState('');
    const [curUrl, setCurUrl] = useState('');

    const logsEndRef = useRef(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const buildMapUrls = useCallback((latV, lngV, refYear, curYear, lKey, cloud) => {
        const refFrom = `${refYear}-04-01T00:00:00.000Z`;
        const refTo   = `${refYear}-04-30T23:59:59.999Z`;
        const curFrom = `${curYear}-04-01T00:00:00.000Z`;
        const curTo   = `${curYear}-04-30T23:59:59.999Z`;
        setRefUrl(buildCopernicusUrl({ lat: latV, lng: lngV, fromTime: refFrom, toTime: refTo,  layerKey: lKey, cloudCoverage: cloud }));
        setCurUrl(buildCopernicusUrl({ lat: latV, lng: lngV, fromTime: curFrom, toTime: curTo, layerKey: lKey, cloudCoverage: cloud }));
    }, []);

    const validateInputs = () => {
        const latV = parseFloat(lat);
        const lngV = parseFloat(lng);
        const refY = parseInt(anRef);
        const curY = parseInt(anCur);

        if (isNaN(latV) || isNaN(lngV) || isNaN(refY) || isNaN(curY)) {
            setErrorMsg('Completați toate câmpurile cu valori valide.');
            return null;
        }
        if (refY >= curY) {
            setErrorMsg('Anul de referință trebuie să fie mai mic decât anul curent.');
            return null;
        }

        return { latV, lngV, refY, curY };
    };

    const applyFilters = () => {
        const parsed = validateInputs();
        if (!parsed) return;

        setErrorMsg('');
        setMapsVisible(true);
        buildMapUrls(parsed.latV, parsed.lngV, parsed.refY, parsed.curY, layerKey, cloudCoverage);
    };

    useEffect(() => {
        if (!mapOnly) return;
        setMapsVisible(true);
        buildMapUrls(45.75, 21.22, 2020, 2026, 'ndwi', 20);
    }, [mapOnly, buildMapUrls]);

    const startAnalysis = async () => {
        if (mapOnly) {
            applyFilters();
            return;
        }

        const parsed = validateInputs();
        if (!parsed) return;

        setStatus('running');
        setLogs(['⏳ Pregătire analiză...', '🛰️ Conectare la Copernicus DataSpace...']);
        setErrorMsg('');
        setMapsVisible(true);
        buildMapUrls(parsed.latV, parsed.lngV, parsed.refY, parsed.curY, layerKey, cloudCoverage);

        try {
            setLogs(prev => [...prev, '🧪 Procesare imagini Sentinel-2 NDWI...']);

            const res = await fetch('/api/detect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: parsed.latV, lng: parsed.lngV, an_referinta: parsed.refY, an_curent: parsed.curY }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                setErrorMsg(data.error || 'Eroare server');
                setStatus('error');
                return;
            }

            setLogs(prev => [...prev, '✅ Analiză finalizată cu succes!', `🚨 Rezultat: ${data.status_alerta}`]);
            setStatus('done');
            onAnalysisComplete?.(data);

        } catch (err) {
            setErrorMsg(`Nu s-a putut contacta backend-ul: ${err.message}`);
            setStatus('error');
        }
    };

    const reset = () => {
        setStatus('idle');
        setLogs([]);
        setErrorMsg('');
        setMapsVisible(false);
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`analysis-page ${isDark ? 'dark' : 'light'}`}>
            <div className="analysis-header">
                <h1>{mapOnly ? '🗺️ Hartă Satelit' : '🗺️ Hartă Satelit & Analiză NDWI'}</h1>
                <p>
                    {mapOnly
                        ? 'Viewer satelitar Sentinel-2 cu filtre pe coordonate, ani și tip de hartă NDWI.'
                        : 'Vizualizare și comparare imagini Sentinel-2 prin analiza indexului de apă NDWI'}
                </p>
            </div>

            {/* ── Control panel ── */}
            <div className="control-panel">
                <div className="coords-row">
                    <div className="field">
                        <label>📍 Latitudine</label>
                        <input type="number" step="0.0001" value={lat} onChange={e => setLat(e.target.value)} placeholder="45.75" />
                    </div>
                    <div className="field">
                        <label>📍 Longitudine</label>
                        <input type="number" step="0.0001" value={lng} onChange={e => setLng(e.target.value)} placeholder="21.22" />
                    </div>
                    <div className="field">
                        <label>📅 An referință</label>
                        <input type="number" min="2015" max="2029" value={anRef} onChange={e => setAnRef(e.target.value)} />
                    </div>
                    <div className="field">
                        <label>📅 An curent</label>
                        <input type="number" min="2016" max="2030" value={anCur} onChange={e => setAnCur(e.target.value)} />
                    </div>
                </div>

                <div className="options-row">
                    <div className="field">
                        <label>🎨 Strat hartă</label>
                        <div className="layer-btns">
                            {Object.entries(LAYERS).map(([k, v]) => (
                                <button key={k} className={layerKey === k ? 'active' : ''} onClick={() => setLayerKey(k)}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="field slider-field">
                        <label>☁️ Nori max: <strong>{cloudCoverage}%</strong></label>
                        <input
                            type="range" min="0" max="100" value={cloudCoverage}
                            onChange={e => setCloudCoverage(Number(e.target.value))}
                            className="cloud-range"
                        />
                    </div>
                </div>

                <div className="action-row">
                    {mapOnly ? (
                        <button className="btn-analyze" onClick={applyFilters}>🛰️ Aplică filtre</button>
                    ) : (
                        <>
                            {(status === 'idle' || status === 'error') && (
                                <button className="btn-analyze" onClick={startAnalysis}>🚀 Lansează Analiza</button>
                            )}
                            {status === 'running' && (
                                <button className="btn-stop" onClick={reset}>⏹ Oprește</button>
                            )}
                            {status === 'done' && (
                                <button className="btn-new" onClick={reset}>🔄 Analiză nouă</button>
                            )}
                            {status === 'done' && (
                                <span className="done-notice">
                                    ✅ Rezultatele sunt disponibile în secțiunea <strong>Analytics</strong>
                                </span>
                            )}
                        </>
                    )}
                    {errorMsg && <div className="error-msg">⚠️ {errorMsg}</div>}
                </div>
            </div>

            {/* ── Maps side-by-side ── */}
            <AnimatePresence>
                {mapsVisible && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="maps-grid"
                    >
                        <div className="map-card">
                            <div className="map-label">
                                <span className="dot ref" />
                                Referință — {anRef} (April)
                            </div>
                            <iframe title="ref-map" src={refUrl} frameBorder="0" allowFullScreen className="sat-iframe" />
                        </div>
                        <div className="map-card">
                            <div className="map-label">
                                <span className="dot cur" />
                                Curent — {anCur} (April)
                            </div>
                            <iframe title="cur-map" src={curUrl} frameBorder="0" allowFullScreen className="sat-iframe" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Live logs ── */}
            {!mapOnly && (
                <AnimatePresence>
                    {(status === 'running' || logs.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="logs-panel"
                        >
                            <div className="logs-header">
                                <span>📡 Log server</span>
                                {status === 'running' && <span className="pulse-dot" />}
                                {status === 'done' && <span className="done-tag">✅ Finalizat</span>}
                            </div>
                            <div className="logs-body">
                                {logs.map((line, i) => (
                                    <div key={i} className={`log-line ${getLogClass(line)}`}>{line}</div>
                                ))}
                                <div ref={logsEndRef} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </motion.div>
    );
};

export default MapPage;
