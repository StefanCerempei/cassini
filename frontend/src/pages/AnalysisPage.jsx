import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import './AnalysisPage.css';

const getStatusColor = (status = '') => {
  if (status.includes('DEZASTRU')) return '#e63946';
  if (status.includes('SEVERĂ')) return '#ff4444';
  if (status.includes('MODERATĂ')) return '#ff9800';
  if (status.includes('ANOMALIE')) return '#ffcc00';
  return '#4caf50';
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

const AnalysisPage = ({ onAnalysisComplete }) => {
  const { isDark } = useTheme();

  const [lat, setLat] = useState('45.75');
  const [lng, setLng] = useState('21.22');
  const [anRef, setAnRef] = useState('2020');
  const [anCur, setAnCur] = useState('2026');

  const [status, setStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const logsEndRef = useRef(null);
  const evtSourceRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => () => evtSourceRef.current?.close(), []);

  const startAnalysis = async () => {
    const latV = parseFloat(lat);
    const lngV = parseFloat(lng);
    const refY = parseInt(anRef, 10);
    const curY = parseInt(anCur, 10);

    if (isNaN(latV) || isNaN(lngV) || isNaN(refY) || isNaN(curY)) {
      setErrorMsg('Completați toate câmpurile cu valori valide.');
      return;
    }
    if (refY >= curY) {
      setErrorMsg('Anul de referință trebuie să fie mai mic decât anul curent.');
      return;
    }

    setStatus('running');
    setLogs([
      '⏳ Inițializare analiză...',
      `📍 Coordonate: ${latV}, ${lngV}`,
      `📅 Interval: ${refY} → ${curY}`,
      '📡 Trimit cerere către backend...',
    ]);
    setResult(null);
    setErrorMsg('');

    evtSourceRef.current?.close();

    try {
      const res = await fetch('/api/detect_async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: latV, lng: lngV, an_referinta: refY, an_curent: curY }),
      });
      const data = await res.json();
      const { session_id, error } = data;

      if (!res.ok || error || !session_id) {
        setErrorMsg(error || 'Nu s-a putut porni analiza pe backend.');
        setStatus('error');
        setLogs(prev => [...prev, `❌ Eroare pornire analiză: ${error || `HTTP ${res.status}`}`]);
        return;
      }

      setLogs(prev => [...prev, `✅ Sesiune backend: ${session_id.slice(0, 8)}...`, '🛰️ Aștept loguri live din procesare...']);

      const es = new EventSource(`/api/stream/${session_id}`);
      evtSourceRef.current = es;

      es.onmessage = (e) => {
        const item = JSON.parse(e.data);
        if (item.type === 'log') {
          setLogs(prev => [...prev, item.message]);
        } else if (item.type === 'result') {
          setResult(item.data);
          onAnalysisComplete?.(item.data);
          setStatus('done');
          setLogs(prev => [...prev, '✅ Rezultat final primit.']);
          es.close();
        } else if (item.type === 'error') {
          setErrorMsg(item.message);
          setStatus('error');
          setLogs(prev => [...prev, `❌ Eroare backend: ${item.message}`]);
          es.close();
        } else if (item.type === 'done') {
          setStatus(prev => (prev === 'done' ? prev : 'done'));
          setLogs(prev => [...prev, '✅ Flux de loguri închis de server.']);
          es.close();
        }
      };

      es.onerror = () => {
        setErrorMsg('Conexiunea SSE a eșuat. Verificați că backend-ul rulează pe portul 5000.');
        setStatus('error');
        setLogs(prev => [...prev, '❌ Conexiunea de loguri live (SSE) a eșuat.']);
        es.close();
      };
    } catch (err) {
      setErrorMsg(`Nu s-a putut contacta backend-ul: ${err.message}`);
      setStatus('error');
      setLogs(prev => [...prev, `❌ Nu s-a putut contacta backend-ul: ${err.message}`]);
    }
  };

  const reset = () => {
    evtSourceRef.current?.close();
    setStatus('idle');
    setLogs([]);
    setResult(null);
    setErrorMsg('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`analysis-page ${isDark ? 'dark' : 'light'}`}>
      <div className="analysis-header">
        <h1>🧪 Analiză Satelitară NDWI</h1>
        <p>Analiză comparativă Sentinel-2 cu raport statistic complet (fără hartă în această secțiune)</p>
      </div>

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

        <div className="action-row">
          {status === 'idle' || status === 'error' ? (
            <button className="btn-analyze" onClick={startAnalysis}>🚀 Lansează Analiza</button>
          ) : status === 'running' ? (
            <button className="btn-stop" onClick={reset}>⏹ Oprește</button>
          ) : (
            <button className="btn-new" onClick={reset}>🔄 Analiză nouă</button>
          )}
          {errorMsg && <div className="error-msg">⚠️ {errorMsg}</div>}
        </div>
      </div>

      <AnimatePresence>
        {(status !== 'idle' || logs.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="logs-panel">
            <div className="logs-header">
              <span>📡 Log server</span>
              {status === 'running' && <span className="pulse-dot" />}
              {status === 'done' && <span className="done-tag">✅ Finalizat</span>}
            </div>
            <div className="logs-body">
              {logs.length === 0 && status === 'running' && (
                <div className="log-line log-info">⏳ Backend-ul procesează cererea, aștept primele mesaje...</div>
              )}
              {logs.map((line, i) => (
                <div key={i} className={`log-line ${getLogClass(line)}`}>{line}</div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="results-panel">
            <div className="results-header">
              <h2>📋 Raport Final CASSINI — AquaLeaks AI</h2>
            </div>

            <div className="verdict-card" style={{ '--status-color': getStatusColor(result.status_alerta) }}>
              <div className="verdict-icon">🚨</div>
              <div className="verdict-text">{result.status_alerta}</div>
            </div>

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

            <div className="stats-results">
              <StatCard icon="🌊" label="Apă referință" value={`${result.statistici?.procent_apa_referinta ?? 0}%`} sub="din arie totală" color="#0055AA" />
              <StatCard icon="🌊" label="Apă curentă" value={`${result.statistici?.procent_apa_curenta ?? 0}%`} sub="din arie totală" color="#4488cc" />
              <StatCard icon="⚠️" label="Suprafață degradată" value={`${result.statistici?.procent_suprafata_degradata ?? 0}%`} sub="din arie totală" color="#ff9800" />
              <StatCard icon="📉" label="Degradare din apa inițială" value={`${result.statistici?.procent_din_apa_originala ?? 0}%`} sub="procent critic" color={getStatusColor(result.status_alerta)} />
              <StatCard icon="🔬" label="Intensitate medie" value={result.statistici?.intensitate_medie_degradare ?? 0} sub="NDWI mediu zonă degradată" color="#9c27b0" />
              <StatCard icon="🔴" label="Intensitate maximă" value={result.statistici?.intensitate_maxima_degradare ?? 0} sub="NDWI minim detectat" color="#e63946" />
            </div>

            <div className="pixel-row">
              <div className="pixel-chip">🟦 Pixeli apă referință: <strong>{result.statistici?.pixeli_apa_referinta ?? 0}</strong></div>
              <div className="pixel-chip">🟩 Pixeli apă curentă: <strong>{result.statistici?.pixeli_apa_curenta ?? 0}</strong></div>
              <div className="pixel-chip">🟥 Pixeli degradați: <strong>{result.statistici?.pixeli_degradati ?? 0}</strong></div>
            </div>

            <DegradationBar pct={result.statistici?.procent_din_apa_originala ?? 0} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnalysisPage;
