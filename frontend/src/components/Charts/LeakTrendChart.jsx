import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './LeakTrendChart.css';

const LeakTrendChart = ({ data = [] }) => {
    // Dacă nu avem date reale, folosim mock data pentru demo
    const chartData = data.length > 0 ? data : [
        { date: '01 Apr', leaks: 2, waterSaved: 450 },
        { date: '05 Apr', leaks: 3, waterSaved: 680 },
        { date: '10 Apr', leaks: 1, waterSaved: 230 },
        { date: '15 Apr', leaks: 4, waterSaved: 890 },
        { date: '20 Apr', leaks: 2, waterSaved: 510 },
        { date: '25 Apr', leaks: 3, waterSaved: 720 }
    ];

    return (
        <div className="trend-chart">
            <h3>📈 Evoluție săptămânală</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="leaks" stroke="#0066cc" name="Scurgeri detectate" />
                    <Line yAxisId="right" type="monotone" dataKey="waterSaved" stroke="#00cc88" name="Apă salvată (m³)" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LeakTrendChart;