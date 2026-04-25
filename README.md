aqualeaks-ai/
│
├── frontend/                          # React App
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
│   │   │   │   ├── Statistics.css
│   │   │   │   ├── AlertsPanel.jsx
│   │   │   │   └── AlertsPanel.css
│   │   │   │
│   │   │   ├── Charts/
│   │   │   │   ├── LeakTrendChart.jsx
│   │   │   │   └── LeakTrendChart.css
│   │   │   │
│   │   │   ├── Common/
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── LoadingSpinner.css
│   │   │   │   ├── ErrorBoundary.jsx
│   │   │   │   └── CitySelector.jsx
│   │   │   │
│   │   │   └── LeakPanel.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── hooks/
│   │   │   └── useLeakData.js
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
├── backend/                          # Python Flask API
│   ├── app.py
│   ├── detector.py
│   ├── requirements.txt
│   └── data/
│
└── README.md
