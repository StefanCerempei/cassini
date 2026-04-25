# 🛢️ AquaLeaks AI - Oil Spill Detection System

[![React](https://img.shields.io/badge/React-18.2.0-61dafb?logo=react)](https://reactjs.org/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4-199900?logo=leaflet)](https://leafletjs.com/)
[![Copernicus](https://img.shields.io/badge/Copernicus-Sentinel--2-0066cc?logo=esa)](https://dataspace.copernicus.eu/)

**AquaLeaks AI** este un sistem avansat de monitorizare și detectare a deversărilor de petrol în timp real, folosind imagini satelitare Sentinel-2 și inteligență artificială.

## 📍 Locație Monitorizată

- **Naslavcea, Republica Moldova**
- **Coordonate:** 48.4714° N, 27.5823° E
- **Curs de apă:** Râul Nistru

## ✨ Features

- 🗺️ **Hartă Interactivă** - Vizualizare detaliată cu markeri și popup-uri
- 🛰️ **Hartă Copernicus** - Imagini satelitare în timp real cu multiple layere spectrale
- 📊 **Dashboard** - Statistici și metrici în timp real
- 📈 **Analytics** - Grafice și trenduri istorice
- ⚠️ **Alerts** - Notificări pentru deversări critice
- 🌓 **Dark/Light Mode** - Interfață adaptabilă
- 📱 **Responsive Design** - Funcționează pe toate dispozitivele

## 🛰️ Indicii Spectrali Disponibili

| Index | Nume | Utilizare |
|-------|------|-----------|
| NDWI | Normalized Difference Water Index | Detectare apă curată |
| NDMI | Normalized Difference Moisture Index | Umiditate vegetație |
| MNDWI | Modified NDWI | Detectare apă în zone urbane |
| OSI | Oil Spill Index | Detectare deversări petrol |

## 🚀 Tehnologii Folosite

### Frontend
- **React 18** - Framework UI
- **Leaflet** - Hartă interactivă
- **Recharts** - Grafice și statistici
- **CSS3** - Stilizare avansată

### Date Satelit
- **ESA Copernicus Sentinel-2** - Imagini satelitare
- **OpenStreetMap** - Hartă de bază

## 📦 Instalare și Rulare

### Cerințe
- Node.js 16+ 
- npm 8+

### Pași de instalare

```bash
# 1. Clonează repository-ul
git clone https://github.com/StefanCerempei/cassini.git
cd cassini

# 2. Intră în folderul frontend
cd frontend

# 3. Instalează dependințele
npm install

# 4. Pornește aplicația
npm start
```
aqualeaks-ai/
│
├── frontend/                 # React App
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Header.css
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Footer.css
│   │   │   │
│   │   │   ├── Map/
│   │   │   │   ├── Map.jsx
│   │   │   │   └── Map.css
│   │   │   │
│   │   │   ├── Dashboard/
│   │   │   │   ├── Statistics.jsx
│   │   │   │   └── Statistics.css
│   │   │   │
│   │   │   ├── Charts/
│   │   │   │   ├── LeakTrendChart.jsx
│   │   │   │   └── LeakTrendChart.css
│   │   │   │
│   │   │   ├── Common/
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── LoadingSpinner.css
│   │   │   │   └── ErrorBoundary.jsx
│   │   │   │
│   │   │   ├── AlertsPanel.jsx
│   │   │   ├── AlertsPanel.css
│   │   │   ├── LeakPanel.jsx
│   │   │   └── CitySelector.jsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useLeakData.js
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   └── helpers.js
│   │   │
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   │
│   └── package.json
│
├── backend/                 # Python Flask API
│   ├── app.py
│   ├── detector.py
│   ├── requirements.txt
│   └── data/
│
└── README.md
