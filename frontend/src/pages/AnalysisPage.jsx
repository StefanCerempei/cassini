import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './AnalysisPage.css';

// ─── Copernicus iframe URL builder ─────────────────────────────────────────
const LAYERS = {
  ndwi: { id: '7-NDWI', label: '💧 NDWI', colorRamps: [[-0.8, '0x228B22'], [0, '0xFFFFFF'], [0.8, '0x0055AA']] },
  truecolor: { id: '1-TRUE-COLOR', label: '🎨 True Color', colorRamps: null },
  falsecolor: { id: '2-FALSE-COLOR', label: '🔴 False Color', colorRamps: null },
};

const buildCopernicusUrl = ({ lat, lng, fromTime, toTime, layerKey = 'ndwi', cloudCoverage = 20 }) => {
  const layer = LAYERS[layerKey];
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
    index: {
      process_id: 'ndwi',
      arguments: { data: { from_node: 'loadcollection' }, target_band: 'NDWI', nir: 'B03', red: 'B08' },
    },
    colorRamp: {
      process_id: 'color_ramp',
      arguments: {
        data: { from_node: 'index' },
        minValue: -1, maxValue: 1,
        colorRamps: layer.colorRamps || [[-0.8, '0x228B22'], [0, '0xFFFFFF'], [0.8, '0x0055AA']],
      },
    },
    save: { process_id: 'save_result', arguments: { data: { from_node: 'colorRamp' }, format: 'PNG' }, result: true },
  };

  const params = new URLSearchParams({
    zoom: '13',
    lat: String(lat),
    lng: String(lng),
    themeId: 'DEFAULT-THEME',
    datasetId: 'S2L2ACDAS',
    fromTime,
    toTime,
    layerId: layer.id,
    cloudCoverage: String(cloudCoverage),
    dateMode: 'SINGLE',
    processGraph: JSON.stringify(processGraph),
  });
  return `https://browser.dataspace.copernicus.eu/?${params.toString()}`;
};

// ─── Status badge ────────────────────────────────────────────────────────────
const getStatusColor = (status = '') => {
  if (status.includes('DEZASTRU')) return '#e63946';
  if (status.includes('SEVERĂ')) return '#ff4444';
  if (status.includes('MODERATĂ')) return '#ff9800';
  if (status.includes('ANOMALIE')) return '#ffcc00';
  return '#4caf50';
};

// ─── Main component ───────────────────────────────────────────────────────────
const AnalysisPage = () => {
  const { isDark } = useTheme();

  // Form state
  const [lat, setLat] = useState('45.75');
  const [lng, setLng] = useState('21.22');
  const [anRef, setAnRef] = useState('2020');
  const [anCur, setAnCur] = useState('2026');
  const [layerKey, setLayerKey] = useState('ndwi');
  const [cloudCoverage, setCloudCoverage] = useState(20);

  // Analysis state
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Map frames — show after user triggers analysis
  const [mapsVisible, setMapsVisible] = useState(false);
  const [refUrl, setRefUrl] = useState('');
  const [curUrl, setCurUrl] = useState('');

  const logsEndRef = useRef(null);
  const evtSourceRef = useRef(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => () => evtSourceRef.current?.close(), []);

  const buildMapUrls = useCallback((latV, lngV, refYear, curYear, lKey, cloud) => {
    const refFrom = `${refYear}-04-01T00:00:00.000Z`;
    const refTo   = `${refYear}-04-30T23:59:59.999Z`;
    const curFrom = `${curYear}-04-01T00:00:00.000Z`;
    const curTo   = `${curYear}-04-30T23:59:59.999Z`;
    setRefUrl(buildCopernicusUrl({ lat: latV, lng: lngV, fromTime: refFrom, toTime: refTo, layerKey: lKey, cloudCoverage: cloud }));
    setCurUrl(buildCopernicusUrl({ lat: latV, lng: lngV, fromTime: curFrom, toTime: curTo,  layerKey: lKey, cloudCoverage: cloud }));
  }, []);

  const startAnalysis = async () => {
    const latV = parseFloat(lat);
    const lngV = parseFloat(lng);
    const refY = parseInt(anRef);
    const curY = parseInt(anCur);

    if (isNaN(latV) || isNaN(lngV) || isNaN(refY) || isNaN(curY)) {
      setErrorMsg('Completați toate câmpurile cu valori valide.');
      return;
    }
    if (refY >= curY) {
      setErrorMsg('Anul de referință trebuie să fie mai mic decât anul curent.');
      return;
    }

    setStatus('running');
    setLogs([]);
    setResult(null);
    setErrorMsg('');
    setMapsVisible(true);
    buildMapUrls(latV, lngV, refY, curY, layerKey, cloudCoverage);

    // Close any previous SSE
    evtSourceRef.current?.close();

    try {
      const res = await fetch('http://localhost:5000/api/detect_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latV, lng: lngV, an_referinta: refY, an_curent: curY }),
      });
      const { session_id, error } = await res.json();
      if (error) { setErrorMsg(error); setStatus('error'); return; }

      // SSE
      const es = new EventSource(`http://localhost:5000/api/stream/${session_id}`);
      evtSourceRef.current = es;

      es.onmessage = (e) => {
        const item = JSON.parse(e.data);
        if (item.type === 'log') {
          setLogs(prev => [...prev, item.message]);
        } else if (item.type === 'result') {
          setResult(item.data);
          setStatus('done');
          es.close();
        } else if (item.type === 'error') {
          setErrorMsg(item.message);
          setStatus('error');
          es.close();
        } else if (item.type === 'done') {
          if (status !== 'done') setStatus('done');
          es.close();
        }
      };
      es.onerror = () => {
        setErrorMsg('Conexiunea SSE a eșuat. Verificați că backend-ul rulează pe portul 5000.');
        setStatus('error');
        es.close();
      };
    } catch (err) {
      setErrorMsg(`Nu s-a putut contacta backend-ul: ${err.message}`);
      setStatus('error');
    }
  };

  const reset = () => {
    evtSourceRef.current?.close();
    setStatus('idle');
    setLogs([]);
    setResult(null);
    setErrorMsg('');
    setMapsVisible(false);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`analysis-page ${isDark ? 'dark' : 'light'}`}>
      {/* ── Header ── */}
      <div className="analysis-header">
        <h1>🧪 Analiză Satelitară NDWI</h1>
        <p>Detectare poluare apă prin compararea datelor Sentinel-2 între doi ani</p>
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
                <button key={k} className={layerKey === k ? 'active' : ''} onClick={() => setLayerKey(k)}>{v.label}</button>
              ))}
            </div>
          </div>
          <div className="field slider-field">
            <label>☁️ Nori max: <strong>{cloudCoverage}%</strong></label>
            <input type="range" min="0" max="100" value={cloudCoverage}
              onChange={e => setCloudCoverage(Number(e.target.value))} className="cloud-range" />
          </div>
        </div>

        <div className="action-row">
          {status === 'idle' || status === 'error' ? (
            <button className="btn-analyze" onClick={startAnalysis}>
              🚀 Lansează Analiza
            </button>
          ) : status === 'running' ? (
            <button className="btn-stop" onClick={reset}>⏹ Oprește</button>
          ) : (
            <button className="btn-new" onClick={reset}>🔄 Analiză nouă</button>
          )}
          {errorMsg && <div className="error-msg">⚠️ {errorMsg}</div>}
        </div>
      </div>

      {/* ── Maps side-by-side ── */}
      <AnimatePresence>
        {mapsVisible && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="maps-grid">
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
      <AnimatePresence>
        {(status === 'running' || logs.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="logs-panel">
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

      {/* ── Results panel ── */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} className="results-panel">
            <div className="results-header">
              <h2>📋 Raport Final CASSINI — AquaLeaks AI</h2>
            </div>

            {/* Verdict */}
            <div className="verdict-card" style={{ '--status-color': getStatusColor(result.status_alerta) }}>
              <div className="verdict-icon">🚨</div>
              <div className="verdict-text">{result.status_alerta}</div>
            </div>

            {/* Meta */}
            <div className="meta-row">
              <div className="meta-item">
                <span className="meta-icon">📍</span>
                <span className="meta-label">Coordonate</span>
                <span className="meta-value">{result.meta?.lat}, {result.meta?.lng}</span>
              </div>
              <div className="meta-item">
                <span className="meta-icon">📅</span>
                <span className="meta-label">Referință → Curent</span>
                <span className="meta-value">{result.meta?.an_referinta} → {result.meta?.an_curent}</span>
              </div>
            </div>

            {/* Stats grid */}
            <div className="stats-results">
              <StatCard icon="🌊" label="Apă referință" value={`${result.statistici?.procent_apa_referinta ?? 0}%`} sub="din arie totală" color="#0055AA" />
              <StatCard icon="🌊" label="Apă curentă" value={`${result.statistici?.procent_apa_curenta ?? 0}%`} sub="din arie totală" color="#4488cc" />
              <StatCard icon="⚠️" label="Suprafață degradată" value={`${result.statistici?.procent_suprafata_degradata ?? 0}%`} sub="din arie totală" color="#ff9800" />
              <StatCard icon="📉" label="Degradare din apa inițială" value={`${result.statistici?.procent_din_apa_originala ?? 0}%`} sub="procent critic" color={getStatusColor(result.status_alerta)} />
              <StatCard icon="🔬" label="Intensitate medie" value={result.statistici?.intensitate_medie_degradare ?? 0} sub="NDWI mediu zonă degradată" color="#9c27b0" />
              <StatCard icon="🔴" label="Intensitate maximă" value={result.statistici?.intensitate_maxima_degradare ?? 0} sub="NDWI minim detectat" color="#e63946" />
            </div>

            {/* Pixel counts */}
            <div className="pixel-row">
              <div className="pixel-chip">🟦 Pixeli apă referință: <strong>{result.statistici?.pixeli_apa_referinta ?? 0}</strong></div>
              <div className="pixel-chip">🟩 Pixeli apă curentă: <strong>{result.statistici?.pixeli_apa_curenta ?? 0}</strong></div>
              <div className="pixel-chip">🟥 Pixeli degradați: <strong>{result.statistici?.pixeli_degradati ?? 0}</strong></div>
            </div>

            {/* Degradation bar */}
            <DegradationBar pct={result.statistici?.procent_din_apa_originala ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color }) => (
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
      <div className="deg-bar-label">Progres degradare: <strong style={{ color }}>{clamped.toFixed(1)}%</strong></div>
      <div className="deg-bar-track">
        <motion.div className="deg-bar-fill" style={{ background: color }}
          initial={{ width: 0 }} animate={{ width: `${clamped}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
      </div>
      <div className="deg-bar-ticks">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
      </div>
    </div>
  );
};

// Log line classifier
const getLogClass = (line) => {
  if (line.includes('❌') || line.includes('EROARE')) return 'log-error';
  if (line.includes('✅')) return 'log-success';
  if (line.includes('🚨') || line.includes('🔴')) return 'log-critical';
  if (line.includes('🟠') || line.includes('⚠️')) return 'log-warn';
  if (line.includes('🟢')) return 'log-ok';
  if (line.includes('⏳') || line.includes('🛰️') || line.includes('🧪')) return 'log-info';
  return 'log-default';
};

export default AnalysisPage;