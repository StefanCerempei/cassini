import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

export const fetchLeaksData = async (city = 'București') => {
    try {
        const response = await axios.get(`${API_BASE_URL}/detect`, { params: { city } });
        return response.data;
    } catch (error) {
        console.error('Eroare fetch leaks:', error);
        // Returnăm mock data pentru demo
        return {
            leaks: [
                { id: 1, lat: 44.435, lon: 26.102, severity: 'high', score: 0.85, area_m2: 450, timestamp: new Date().toISOString() },
                { id: 2, lat: 44.420, lon: 26.115, severity: 'medium', score: 0.62, area_m2: 280, timestamp: new Date().toISOString() },
                { id: 3, lat: 44.445, lon: 26.090, severity: 'low', score: 0.38, area_m2: 120, timestamp: new Date().toISOString() }
            ]
        };
    }
};

export const fetchHistoricalData = async (city = 'București', days = 30) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/historical`, { params: { city, days } });
        return response.data;
    } catch (error) {
        console.error('Eroare fetch historical:', error);
        return [];
    }
};

export default { fetchLeaksData, fetchHistoricalData };