import React, { useState, useEffect } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import Map from './components/Map/Map';
import LeakPanel from './components/LeakPanel';
import Statistics from './components/Dashboard/Statistics';
import AlertsPanel from './components/Dashboard/AlertsPanel';
import LeakTrendChart from './components/Charts/LeakTrendChart';
import LoadingSpinner from './components/Common/LoadingSpinner';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { fetchLeaksData, fetchHistoricalData } from './services/api';
import './App.css';

function App() {
    const [leaks, setLeaks] = useState([]);
    const [historicalData, setHistoricalData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLeak, setSelectedLeak] = useState(null);
    const [city, setCity] = useState('București');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const loadData = async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            const [leaksData, historyData] = await Promise.all([
                fetchLeaksData(city),
                fetchHistoricalData(city, 30)
            ]);

            setLeaks(leaksData.leaks || []);
            setHistoricalData(historyData || []);
            setLastUpdate(new Date());

        } catch (err) {
            console.error('Eroare la încărcare:', err);
            setError('Nu s-a putut conecta la server. Verificați dacă backend-ul rulează.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [city]);

    if (loading) return <LoadingSpinner />;

    return (
        <ErrorBoundary>
            <div className="app">
                <Header
                    onRefresh={loadData}
                    lastUpdate={lastUpdate}
                    city={city}
                    onCityChange={setCity}
                    isRefreshing={isRefreshing}
                    totalLeaks={leaks.length}
                />

                <div className="main-content">
                    {error && (
                        <div className="error-banner">
                            ⚠️ {error}
                            <button onClick={loadData}>Încearcă din nou</button>
                        </div>
                    )}

                    <div className="content-wrapper">
                        <div className="left-panel">
                            <div className="map-section">
                                <Map
                                    leaks={leaks}
                                    onLeakClick={setSelectedLeak}
                                    center={getCityCoordinates(city)}
                                />
                            </div>

                            <div className="charts-section">
                                <LeakTrendChart data={historicalData} />
                            </div>
                        </div>

                        <div className="right-panel">
                            <Statistics leaks={leaks} />
                            <AlertsPanel alerts={leaks.filter(l => l.severity === 'high')} />
                            <LeakPanel leaks={leaks} selectedLeak={selectedLeak} />
                        </div>
                    </div>
                </div>

                <Footer version="1.0.0" />
            </div>
        </ErrorBoundary>
    );
}

const getCityCoordinates = (city) => {
    const coords = {
        'București': [44.4268, 26.1025],
        'Cluj-Napoca': [46.7712, 23.6236],
        'Timișoara': [45.7489, 21.2087],
        'Iași': [47.1585, 27.6014],
        'Constanța': [44.1598, 28.6348]
    };
    return coords[city] || coords['București'];
};

export default App;