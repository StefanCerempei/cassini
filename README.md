aqualeaks-ai/
│
├── frontend/                          # React App
│   ├── public/
│   │   └── index.html
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map.jsx
│   │   │   ├── LeakPanel.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   │
│   └── package.json
│
├── backend/                          # Python Flask API
│   ├── app.py                        # Serverul principal
│   ├── detector.py                   # Algoritmul de detecție
│   ├── requirements.txt
│   └── data/                         # Folder pentru imagini
│       └── (pozele descărcate aici)
│
└── README.md
