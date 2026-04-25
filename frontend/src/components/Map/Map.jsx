import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Map.css';

// Fix pentru icon-urile Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const getSeverityColor = (severity) => {
    switch(severity) {
        case 'high': return '#ff0000';
        case 'medium': return '#ff8800';
        case 'low': return '#ffcc00';
        default: return '#00cc88';
    }
};

const getRadius = (area) => {
    return Math.min(Math.sqrt(area) * 1.5, 40);
};

const Map = ({ leaks = [], onLeakClick, center = [44.4268, 26.1025], zoom = 13 }) => {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            className="leak-map"
            zoomControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            />
            <ZoomControl position="bottomright" />

            {leaks.map((leak) => (
                <CircleMarker
                    key={leak.id}
                    center={[leak.lat, leak.lon]}
                    radius={getRadius(leak.area_m2)}
                    fillColor={getSeverityColor(leak.severity)}
                    color={getSeverityColor(leak.severity)}
                    weight={2}
                    opacity={0.8}
                    fillOpacity={0.5}
                    eventHandlers={{
                        click: () => onLeakClick(leak),
                        mouseover: (e) => e.target.openPopup(),
                        mouseout: (e) => e.target.closePopup()
                    }}
                >
                    <Popup>
                        <div className="leak-popup">
                            <strong>💧 Scurgere detectată</strong><br/>
                            Severitate: {leak.severity === 'high' ? '🔴 Ridicată' : leak.severity === 'medium' ? '🟠 Medie' : '🟡 Scăzută'}<br/>
                            Arie: ~{leak.area_m2} m²<br/>
                            Scor: {(leak.score * 100).toFixed(0)}%<br/>
                            <small>{new Date(leak.timestamp).toLocaleString()}</small>
                        </div>
                    </Popup>
                </CircleMarker>
            ))}
        </MapContainer>
    );
};

export default Map;